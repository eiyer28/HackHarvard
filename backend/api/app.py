from flask import Flask, request, jsonify
from flask_cors import CORS
from flasgger import Swagger
import sys
import os
import hashlib
import hmac
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv
from twilio.rest import Client
import secrets
import requests

# Load environment variables
load_dotenv()

# Add parent directory to path to import geospatial module
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from geospatial.validator import LocationValidator

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# Configure Swagger UI
swagger_config = {
    "headers": [],
    "specs": [
        {
            "endpoint": 'apispec',
            "route": '/apispec.json',
            "rule_filter": lambda rule: True,
            "model_filter": lambda tag: True,
        }
    ],
    "static_url_path": "/flasgger_static",
    "swagger_ui": True,
    "specs_route": "/api/docs"
}

swagger_template = {
    "info": {
        "title": "ProxyPay API",
        "description": "Location-based credit card transaction validation API",
        "version": "1.0.0"
    }
}

swagger = Swagger(app, config=swagger_config, template=swagger_template)

# Initialize validator
validator = LocationValidator(max_distance_miles=0.25)

# Initialize Twilio client (will be None if credentials not set)
try:
    twilio_client = Client(
        os.getenv('TWILIO_ACCOUNT_SID'),
        os.getenv('TWILIO_AUTH_TOKEN')
    )
    twilio_verify_service = os.getenv('TWILIO_VERIFY_SERVICE_SID')
except Exception as e:
    print(f"Warning: Twilio not configured - {e}")
    twilio_client = None
    twilio_verify_service = None

# Mock user location database (in production, this would be real-time from mobile app)
mock_user_locations = {
    "4532-1234-5678-9012": {
        "location": (42.3770, -71.1167),  # Harvard campus
        "phone": "+19738678884"
    },
    "5412-9876-5432-1098": {
        "location": (37.7749, -122.4194),  # San Francisco
        "phone": "+19738678884"
    }
}

# In-memory storage for pending 2FA transactions
pending_2fa_transactions = {}

# Mock device registry (card_token -> public_key mapping)
device_registry = {
    "4532-1234-5678-9012": "mock_public_key_1",
    "5412-9876-5432-1098": "mock_public_key_2",
}

# Mock attestation verification (for hackathon)
def verify_attestation(attestation_token):
    """Verify device attestation token (mock for hackathon)"""
    return attestation_token and attestation_token.startswith('mock_attestation_')
    # make a call to an api that will take in the attestation token and return a boolean
    response = requests.post("http://localhost:5000/api/verify-attestation", json={"attestation_token": attestation_token})
    return response.json()

def verify_signature(data, signature, public_key):
    """Verify digital signature (simplified for demo)"""
    try:
        # Create canonical JSON string
        if isinstance(data, dict):
            canonical_data = json.dumps(data, sort_keys=True)
        else:
            canonical_data = data
        
        # Create hash
        data_hash = hashlib.sha256(canonical_data.encode()).digest()
        
        # Create expected signature (simplified)
        expected_signature = hashlib.sha256(
            data_hash + public_key.encode()
        ).hexdigest()
        
        return signature == expected_signature
    except Exception as e:
        print(f"Signature verification error: {e}")
        return False

@app.route('/api/transaction/validate', methods=['POST'])
def validate_transaction():
    """
    Validate a credit card transaction based on location
    ---
    tags:
      - Transactions
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - card_number
            - amount
            - transaction_location
          properties:
            card_number:
              type: string
              example: "4532-1234-5678-9012"
            amount:
              type: number
              example: 50.00
            merchant_name:
              type: string
              example: "Coffee Shop"
            transaction_location:
              type: object
              properties:
                latitude:
                  type: number
                  example: 42.3770
                longitude:
                  type: number
                  example: -71.1167
    responses:
      200:
        description: Transaction validation result
        schema:
          type: object
          properties:
            transaction_approved:
              type: boolean
            card_number:
              type: string
            amount:
              type: number
            merchant_name:
              type: string
            validation_details:
              type: object
      404:
        description: Card not registered
      400:
        description: Missing or invalid fields
    """
    try:
        data = request.get_json()

        # Extract request data
        card_number = data.get('card_number')
        amount = data.get('amount')
        merchant_name = data.get('merchant_name')
        transaction_location = data.get('transaction_location')

        # Validate required fields
        if not all([card_number, amount, transaction_location]):
            return jsonify({
                'error': 'Missing required fields',
                'required': ['card_number', 'amount', 'transaction_location']
            }), 400

        # Get user data
        user_data = mock_user_locations.get(card_number)

        if not user_data:
            return jsonify({
                'error': 'Card not registered',
                'message': 'This card is not linked to a phone location'
            }), 404

        phone_location = user_data['location']
        phone_number = user_data['phone']

        # Extract transaction coordinates
        trans_lat = transaction_location.get('latitude')
        trans_lon = transaction_location.get('longitude')

        if trans_lat is None or trans_lon is None:
            return jsonify({
                'error': 'Invalid transaction location',
                'message': 'Latitude and longitude required'
            }), 400

        # Validate transaction
        trans_coords = (trans_lat, trans_lon)
        validation_result = validator.validate_transaction(phone_location, trans_coords)

        # Check if 2FA is required for high-value transactions
        if amount > 100:
            # Generate transaction ID
            transaction_id = secrets.token_urlsafe(16)

            # Store pending transaction
            pending_2fa_transactions[transaction_id] = {
                'card_number': card_number,
                'amount': amount,
                'merchant_name': merchant_name,
                'phone_location': phone_location,
                'transaction_location': trans_coords,
                'validation_result': validation_result,
                'phone_number': phone_number,
                'timestamp': datetime.utcnow()
            }

            # Send SMS verification if Twilio is configured
            if twilio_client and twilio_verify_service:
                try:
                    verification = twilio_client.verify.v2.services(twilio_verify_service) \
                        .verifications.create(
                            to=phone_number,
                            channel='sms'
                        )

                    return jsonify({
                        'requires_2fa': True,
                        'transaction_id': transaction_id,
                        'message': f'Verification code sent to {phone_number}',
                        'amount': amount,
                        'merchant_name': merchant_name
                    }), 200
                except Exception as e:
                    return jsonify({
                        'error': 'Failed to send verification code',
                        'message': str(e)
                    }), 500
            else:
                return jsonify({
                    'error': 'Twilio not configured',
                    'message': 'Please set up Twilio credentials in .env file'
                }), 500

        # Build response for transactions not requiring 2FA
        response = {
            'transaction_approved': validation_result['valid'],
            'requires_2fa': False,
            'card_number': card_number,
            'amount': amount,
            'merchant_name': merchant_name,
            'validation_details': {
                'phone_location': {
                    'latitude': phone_location[0],
                    'longitude': phone_location[1]
                },
                'transaction_location': {
                    'latitude': trans_lat,
                    'longitude': trans_lon
                },
                'distance_miles': validation_result['distance_miles'],
                'reason': validation_result['reason']
            }
        }

        return jsonify(response), 200

    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@app.route('/api/card/register', methods=['POST'])
def register_card():
    """
    Register a card with a phone location
    ---
    tags:
      - Cards
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - card_number
            - phone_location
          properties:
            card_number:
              type: string
              example: "4532-1234-5678-9012"
            phone_location:
              type: object
              properties:
                latitude:
                  type: number
                  example: 42.3770
                longitude:
                  type: number
                  example: -71.1167
    responses:
      201:
        description: Card registered successfully
      400:
        description: Missing or invalid fields
    """
    try:
        data = request.get_json()
        card_number = data.get('card_number')
        phone_location = data.get('phone_location')

        if not all([card_number, phone_location]):
            return jsonify({
                'error': 'Missing required fields',
                'required': ['card_number', 'phone_location']
            }), 400

        lat = phone_location.get('latitude')
        lon = phone_location.get('longitude')

        if lat is None or lon is None:
            return jsonify({
                'error': 'Invalid phone location',
                'message': 'Latitude and longitude required'
            }), 400

        phone_number = data.get('phone_number', '+1234567890')  # Default for now

        # Store in mock database
        mock_user_locations[card_number] = {
            'location': (lat, lon),
            'phone': phone_number
        }

        return jsonify({
            'message': 'Card registered successfully',
            'card_number': card_number,
            'location': {'latitude': lat, 'longitude': lon},
            'phone': phone_number
        }), 201

    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@app.route('/api/transaction/verify-2fa', methods=['POST'])
def verify_2fa():
    """
    Verify 2FA code for high-value transaction
    ---
    tags:
      - Transactions
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - transaction_id
            - verification_code
          properties:
            transaction_id:
              type: string
              example: "abc123def456"
            verification_code:
              type: string
              example: "123456"
    responses:
      200:
        description: Transaction validation result after 2FA
        schema:
          type: object
          properties:
            transaction_approved:
              type: boolean
            verification_status:
              type: string
      404:
        description: Transaction not found
      400:
        description: Invalid verification code
    """
    try:
        data = request.get_json()
        transaction_id = data.get('transaction_id')
        verification_code = data.get('verification_code')

        if not all([transaction_id, verification_code]):
            return jsonify({
                'error': 'Missing required fields',
                'required': ['transaction_id', 'verification_code']
            }), 400

        # Get pending transaction
        pending_tx = pending_2fa_transactions.get(transaction_id)

        if not pending_tx:
            return jsonify({
                'error': 'Transaction not found',
                'message': 'Invalid or expired transaction ID'
            }), 404

        # Check if transaction is too old (5 minutes timeout)
        if (datetime.utcnow() - pending_tx['timestamp']).total_seconds() > 300:
            del pending_2fa_transactions[transaction_id]
            return jsonify({
                'error': 'Transaction expired',
                'message': 'Please initiate a new transaction'
            }), 400

        # Verify code with Twilio
        if twilio_client and twilio_verify_service:
            try:
                verification_check = twilio_client.verify.v2.services(twilio_verify_service) \
                    .verification_checks.create(
                        to=pending_tx['phone_number'],
                        code=verification_code
                    )

                if verification_check.status == 'approved':
                    # Get validation result from pending transaction
                    validation_result = pending_tx['validation_result']
                    phone_location = pending_tx['phone_location']
                    trans_coords = pending_tx['transaction_location']

                    # Build final response
                    response = {
                        'transaction_approved': validation_result['valid'],
                        'verification_status': 'approved',
                        'card_number': pending_tx['card_number'],
                        'amount': pending_tx['amount'],
                        'merchant_name': pending_tx['merchant_name'],
                        'validation_details': {
                            'phone_location': {
                                'latitude': phone_location[0],
                                'longitude': phone_location[1]
                            },
                            'transaction_location': {
                                'latitude': trans_coords[0],
                                'longitude': trans_coords[1]
                            },
                            'distance_miles': validation_result['distance_miles'],
                            'reason': validation_result['reason']
                        }
                    }

                    # Clean up pending transaction
                    del pending_2fa_transactions[transaction_id]

                    return jsonify(response), 200
                else:
                    return jsonify({
                        'error': 'Verification failed',
                        'message': 'Invalid verification code',
                        'verification_status': verification_check.status
                    }), 400

            except Exception as e:
                return jsonify({
                    'error': 'Verification error',
                    'message': str(e)
                }), 500
        else:
            return jsonify({
                'error': 'Twilio not configured',
                'message': 'Please set up Twilio credentials'
            }), 500

    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@app.route('/api/register-device', methods=['POST'])
def register_device():
    """
    Register a mobile device with its public key
    ---
    tags:
      - Devices
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - card_token
            - public_key
            - attestation
          properties:
            card_token:
              type: string
              example: "4532-1234-5678-9012"
            public_key:
              type: string
              example: "mock_public_key_1"
            attestation:
              type: string
              example: "mock_attestation_123"
    responses:
      201:
        description: Device registered successfully
      400:
        description: Invalid request
    """
    try:
        data = request.get_json()
        card_token = data.get('card_token')
        public_key = data.get('public_key')
        attestation = data.get('attestation')

        if not all([card_token, public_key, attestation]):
            return jsonify({
                'error': 'Missing required fields',
                'required': ['card_token', 'public_key', 'attestation']
            }), 400

        # Verify attestation
        if not verify_attestation(attestation):
            return jsonify({
                'error': 'Invalid attestation',
                'message': 'Device attestation verification failed'
            }), 400

        # Register device
        device_registry[card_token] = public_key

        return jsonify({
            'message': 'Device registered successfully',
            'card_token': card_token,
            'public_key': public_key
        }), 201

    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@app.route('/api/prove-location', methods=['POST'])
def prove_location():
    """
    Verify a signed location proof from mobile device
    ---
    tags:
      - Location Proofs
    parameters:
      - in: formData
        name: proof_data
        type: string
        required: true
        description: JSON string containing proof data
      - in: formData
        name: attestation_cbor
        type: file
        required: true
        description: CBOR attestation file
    responses:
      200:
        description: Location proof verification result
      400:
        description: Invalid proof
    """
    try:
        # Get JSON proof data from form
        proof_json = request.form.get('proof_data')
        if not proof_json:
            return jsonify({
                'success': False,
                'result': 'DENY',
                'reason': 'Missing proof_data'
            }), 400

        data = json.loads(proof_json)

        # Get CBOR attestation file
        if 'attestation_cbor' not in request.files:
            return jsonify({
                'success': False,
                'result': 'DENY',
                'reason': 'Missing attestation_cbor file'
            }), 400

        attestation_file = request.files['attestation_cbor']
        attestation_cbor_bytes = attestation_file.read()

        # Log receipt of CBOR file
        import sys
        sys.stdout.write(f"Received CBOR attestation file: {len(attestation_cbor_bytes)} bytes\n")
        sys.stdout.flush()

        # Extract proof data
        card_token = data.get('card_token')
        transaction_nonce = data.get('transaction_nonce')
        transaction_id = data.get('transaction_id')
        location = data.get('location')
        timestamp = data.get('timestamp')
        attestation = data.get('attestation')
        signature = data.get('signature')

        # Validate required fields
        if not all([card_token, transaction_nonce, transaction_id, location, timestamp, attestation, signature]):
            return jsonify({
                'success': False,
                'result': 'DENY',
                'reason': 'Missing required fields'
            }), 400

        # Get device public key
        public_key = device_registry.get(card_token)
        if not public_key:
            return jsonify({
                'success': False,
                'result': 'DENY',
                'reason': 'Device not registered'
            }), 400

        # Verify attestation
        
        if not verify_attestation(attestation):
            return jsonify({
                'success': False,
                'result': 'DENY',
                'reason': 'Invalid device attestation'
            }), 400

        # Create proof data for signature verification
        proof_data = {
            'card_token': card_token,
            'transaction_nonce': transaction_nonce,
            'transaction_id': transaction_id,
            'location': location,
            'timestamp': timestamp,
            'attestation': attestation
        }

        # Verify signature
        if not verify_signature(proof_data, signature, public_key):
            return jsonify({
                'success': False,
                'result': 'DENY',
                'reason': 'Invalid digital signature'
            }), 400

        # Check timestamp freshness (within 5 minutes)
        try:
            proof_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            now = datetime.utcnow().replace(tzinfo=proof_time.tzinfo)
            if (now - proof_time).total_seconds() > 300:  # 5 minutes
                return jsonify({
                    'success': False,
                    'result': 'DENY',
                    'reason': 'Proof timestamp too old'
                }), 400
        except:
            return jsonify({
                'success': False,
                'result': 'DENY',
                'reason': 'Invalid timestamp format'
            }), 400

        # Get stored phone location
        phone_location = mock_user_locations.get(card_token)
        if not phone_location:
            return jsonify({
                'success': False,
                'result': 'DENY',
                'reason': 'Phone location not available'
            }), 400

        # Validate location proximity
        trans_coords = (location['lat'], location['lon'])
        validation_result = validator.validate_transaction(phone_location, trans_coords)
        
        distance_meters = validation_result['distance_miles'] * 1609.34  # Convert to meters

        # Decision logic based on distance
        if distance_meters <= 15:  # Within 15 meters
            result = 'ACCEPT'
            reason = 'Co-located transaction'
        elif distance_meters <= 500:  # Within 500 meters
            result = 'CONFIRM_REQUIRED'
            reason = 'Location mismatch - confirmation required'
        else:  # Too far
            result = 'DENY'
            reason = 'Location too far from phone'

        return jsonify({
            'success': True,
            'result': result,
            'reason': reason,
            'distance_meters': round(distance_meters, 2)
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'result': 'DENY',
            'reason': f'Server error: {str(e)}'
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """
    Health check endpoint
    ---
    tags:
      - System
    responses:
      200:
        description: Service is healthy
        schema:
          type: object
          properties:
            status:
              type: string
              example: ok
            service:
              type: string
              example: ProxyPay API
    """
    return jsonify({'status': 'ok', 'service': 'ProxyPay API'}), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
