from flask import Flask, request, jsonify
from flask_cors import CORS
from flasgger import Swagger
from flask_socketio import SocketIO, emit, join_room, leave_room
import sys
import os
import hashlib
import hmac
import json
from datetime import datetime, timedelta
import uuid
from dotenv import load_dotenv
from twilio.rest import Client
import secrets

# Load environment variables
load_dotenv()

# Add parent directory to path to import geospatial module
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from geospatial.validator import LocationValidator

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests
socketio = SocketIO(app, cors_allowed_origins="*")  # Enable WebSocket with CORS

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
# Updated to use actual phone location from debug output
mock_user_locations = {
    "4532-1234-5678-9012": {
        'location': (42.380992732253446, -71.1251378073866),  # Actual phone location (near Harvard)
        'phone': '+1234567890'
    },
    "5412-9876-5432-1098": {
        'location': (37.7749, -122.4194),  # San Francisco
        'phone': '+1234567891'
    }
}

# Mock device registry (card_token -> key_info mapping)
# For demo purposes, we'll use deterministic keys that match the mobile app
import hashlib

def generate_demo_keys():
    """Generate deterministic demo keys that match mobile app"""
    import base64
    seed = "demo_seed_for_consistent_keys"
    
    # Generate private key: SHA256(seed) -> base64 encode (matching mobile app)
    private_key_raw = hashlib.sha256(seed.encode()).digest()
    private_key_b64_str = base64.b64encode(private_key_raw).decode('utf-8')
    
    # Generate public key: SHA256(private_key + "_public") -> base64 encode
    public_key_raw = hashlib.sha256((private_key_b64_str + "_public").encode()).digest()
    public_key_b64_str = base64.b64encode(public_key_raw).decode('utf-8')
    
    print(f"Generated demo keys:")
    print(f"  Private key: {private_key_b64_str}")
    print(f"  Public key: {public_key_b64_str}")
    
    return private_key_b64_str, public_key_b64_str

demo_private_key, demo_public_key = generate_demo_keys()

device_registry = {
    "4532-1234-5678-9012": {
        "public_key": demo_public_key,
        "private_key": demo_private_key
    },
    "5412-9876-5432-1098": {
        "public_key": demo_public_key, 
        "private_key": demo_private_key
    },
}

# Active WebSocket connections by card token
active_connections = {}

# Pending transactions waiting for location proofs
pending_transactions = {}

# Completed transaction history (persistent storage)
completed_transactions = {}

# Pending 2FA transactions
pending_2fa_transactions = {}

# Mock attestation verification (for hackathon)
def verify_attestation(attestation_token):
    """Verify device attestation token (mock for hackathon)"""
    return attestation_token and attestation_token.startswith('mock_attestation_')

def verify_signature(data, signature, private_key):
    """Verify digital signature (simplified for demo)"""
    try:
        import base64
        
        # Create canonical JSON string (sorted keys to match mobile app)
        if isinstance(data, dict):
            canonical_data = json.dumps(data, sort_keys=True)
        else:
            canonical_data = data
        
        # Create hash and encode as base64 (matching mobile app exactly)
        data_hash_raw = hashlib.sha256(canonical_data.encode()).digest()
        data_hash_b64 = base64.b64encode(data_hash_raw).decode('utf-8')
        
        # Mobile app algorithm: SHA256(base64HashString + privateKey) -> hex
        expected_signature = hashlib.sha256(
            (data_hash_b64 + private_key).encode()
        ).hexdigest()
        
        print(f"Backend verification:")
        print(f"  Canonical data: {canonical_data}")
        print(f"  Data hash (raw bytes): {data_hash_raw.hex()}")
        print(f"  Data hash (base64): {data_hash_b64}")
        print(f"  Private key: {private_key}")
        print(f"  Concatenated string: '{data_hash_b64 + private_key}'")
        print(f"  Expected signature: {expected_signature}")
        print(f"  Received signature: {signature}")
        print(f"  Signatures match: {signature == expected_signature}")
        
        return signature == expected_signature
    except Exception as e:
        print(f"Signature verification error: {e}")
        return False

# WebSocket event handlers
@socketio.on('connect')
def handle_connect():
    """Handle WebSocket connection"""
    print(f"\n=== WEBSOCKET CONNECTION DEBUG ===")
    print(f"✅ Client connected: {request.sid}")
    print(f"Current active connections: {list(active_connections.keys())}")
    print(f"=== END CONNECTION DEBUG ===\n")
    emit('connected', {'message': 'Connected to ProxyPay server'})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle WebSocket disconnection"""
    print(f"Client disconnected: {request.sid}")
    # Remove from active connections
    for card_token, sid in list(active_connections.items()):
        if sid == request.sid:
            del active_connections[card_token]
            break

@socketio.on('join_room')
def handle_join_room(data):
    """Join a room for transaction communication"""
    try:
        room = data.get('room')
        if room:
            join_room(room)
            print(f"Client {request.sid} joined room: {room}")
    except Exception as e:
        emit('error', {'message': f'Join room error: {str(e)}'})

@socketio.on('register_phone')
def handle_register_phone(data):
    """Register a phone with its card token"""
    try:
        print(f"\n=== PHONE REGISTRATION DEBUG ===")
        print(f"Received data: {data}")
        print(f"Session ID: {request.sid}")
        print(f"Current active connections: {list(active_connections.keys())}")
        print(f"Device registry keys: {list(device_registry.keys())}")
        
        card_token = data.get('card_token')
        if not card_token:
            print(f"ERROR: No card token provided")
            emit('error', {'message': 'Card token required'})
            return
        
        # Check if device is registered
        if card_token not in device_registry:
            print(f"ERROR: Device not registered for card {card_token}")
            emit('error', {'message': 'Device not registered. Please register device first.'})
            return
        
        # Store connection
        active_connections[card_token] = request.sid
        join_room(f"card_{card_token}")
        
        print(f"✅ Phone registered for card: {card_token}")
        print(f"✅ Session ID: {request.sid}")
        print(f"✅ Active connections now: {list(active_connections.keys())}")
        print(f"=== END PHONE REGISTRATION DEBUG ===\n")
        
        emit('registered', {'message': f'Phone registered for card {card_token}'})
        
    except Exception as e:
        print(f"❌ Registration error: {str(e)}")
        emit('error', {'message': f'Registration error: {str(e)}'})

@socketio.on('request_location_proof')
def handle_request_location_proof(data):
    """Request location proof from phone"""
    try:
        card_token = data.get('card_token')
        transaction_id = data.get('transaction_id')
        transaction_nonce = data.get('transaction_nonce')
        pos_location = data.get('pos_location')
        amount = data.get('amount')
        merchant_name = data.get('merchant_name')
        
        if not all([card_token, transaction_id, transaction_nonce, pos_location]):
            emit('error', {'message': 'Missing required fields'})
            return
        
        # Check if phone is connected
        if card_token not in active_connections:
            print(f"ERROR: Phone not connected for card {card_token}")
            print(f"Active connections: {list(active_connections.keys())}")
            emit('error', {'message': 'Phone not connected for this card'})
            return
        
        # Store pending transaction
        pending_transactions[transaction_id] = {
            'card_token': card_token,
            'transaction_nonce': transaction_nonce,
            'pos_location': pos_location,
            'amount': amount,
            'merchant_name': merchant_name,
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'pending'
        }
        
        # Send request to phone
        socketio.emit('location_proof_request', {
            'transaction_id': transaction_id,
            'transaction_nonce': transaction_nonce,
            'pos_location': pos_location,
            'amount': amount,
            'merchant_name': merchant_name
        }, room=f"card_{card_token}")
        
        print(f"Location proof requested for transaction: {transaction_id}")
        
    except Exception as e:
        emit('error', {'message': f'Request error: {str(e)}'})

@socketio.on('location_proof_response')
def handle_location_proof_response(data):
    """Handle location proof response from phone"""
    try:
        transaction_id = data.get('transaction_id')
        location_proof = data.get('location_proof')
        
        if not transaction_id or not location_proof:
            emit('error', {'message': 'Missing transaction ID or location proof'})
            return
        
        # Get pending transaction
        if transaction_id not in pending_transactions:
            emit('error', {'message': 'Transaction not found'})
            return
        
        pending_tx = pending_transactions[transaction_id]
        card_token = pending_tx['card_token']
        
        # Verify the location proof
        verification_result = verify_location_proof(location_proof, pending_tx)
        
        # Update transaction status
        pending_transactions[transaction_id]['status'] = 'completed'
        pending_transactions[transaction_id]['result'] = verification_result
        
        # Store completed transaction in history
        completed_transactions[transaction_id] = {
            **pending_transactions[transaction_id],
            'completed_at': datetime.utcnow().isoformat()
        }
        
        # Handle different result types
        if verification_result['result'] == 'CONFIRM_REQUIRED':
            # Send confirmation request to mobile app
            socketio.emit('confirmation_request', {
                'transaction_id': transaction_id,
                'amount': pending_tx.get('amount', 0),
                'merchant_name': pending_tx.get('merchant_name', 'Unknown'),
                'distance_meters': verification_result.get('distance_meters', 0),
                'reason': verification_result.get('reason', 'Location verification required')
            }, room=f"card_{card_token}")
            
            # Store as pending confirmation
            pending_transactions[transaction_id]['status'] = 'pending_confirmation'
            print(f"Confirmation requested for transaction: {transaction_id}")
            
            # Set timeout for confirmation (30 seconds)
            def timeout_confirmation():
                import time
                time.sleep(30)  # Wait 30 seconds
                if transaction_id in pending_transactions and pending_transactions[transaction_id]['status'] == 'pending_confirmation':
                    print(f"⏰ Confirmation timeout for transaction: {transaction_id}")
                    # Auto-deny after timeout
                    result = {
                        'success': True,
                        'result': 'DENY',
                        'reason': 'Confirmation timeout - user did not respond',
                        'distance_meters': verification_result.get('distance_meters', 0)
                    }
                    pending_transactions[transaction_id]['status'] = 'completed'
                    pending_transactions[transaction_id]['result'] = result
                    
                    socketio.emit('transaction_result', {
                        'transaction_id': transaction_id,
                        'result': result
                    }, room=f"pos_{transaction_id}")
            
            # Start timeout in background
            import threading
            timeout_thread = threading.Thread(target=timeout_confirmation)
            timeout_thread.daemon = True
            timeout_thread.start()
        else:
            # Send result to POS
            socketio.emit('transaction_result', {
                'transaction_id': transaction_id,
                'result': verification_result
            }, room=f"pos_{transaction_id}")
            
            # Notify mobile app of new completed transaction
            socketio.emit('transaction_completed', {
                'transaction_id': transaction_id,
                'card_token': card_token,
                'transaction': completed_transactions[transaction_id]
            }, room=f"card_{card_token}")
        
        print(f"Location proof processed for transaction: {transaction_id}")
        
    except Exception as e:
        emit('error', {'message': f'Processing error: {str(e)}'})

@socketio.on('confirmation_response')
def handle_confirmation_response(data):
    """Handle confirmation response from mobile device"""
    try:
        transaction_id = data.get('transaction_id')
        confirmed = data.get('confirmed')
        
        if not transaction_id:
            emit('error', {'message': 'Missing transaction ID'})
            return
        
        # Get pending transaction
        if transaction_id not in pending_transactions:
            emit('error', {'message': 'Transaction not found'})
            return
        
        pending_tx = pending_transactions[transaction_id]
        
        # Update transaction based on confirmation
        if confirmed:
            # User confirmed - approve transaction
            result = {
                'success': True,
                'result': 'ACCEPT',
                'reason': 'User confirmed transaction',
                'distance_meters': pending_tx.get('result', {}).get('distance_meters', 0)
            }
        else:
            # User denied - reject transaction
            result = {
                'success': True,
                'result': 'DENY',
                'reason': 'User denied transaction',
                'distance_meters': pending_tx.get('result', {}).get('distance_meters', 0)
            }
        
        # Update transaction status
        pending_transactions[transaction_id]['status'] = 'completed'
        pending_transactions[transaction_id]['result'] = result
        
        # Store completed transaction in history
        completed_transactions[transaction_id] = {
            **pending_transactions[transaction_id],
            'completed_at': datetime.utcnow().isoformat()
        }
        
        # Send result to POS
        socketio.emit('transaction_result', {
            'transaction_id': transaction_id,
            'result': result
        }, room=f"pos_{transaction_id}")
        
        # Notify mobile app of new completed transaction
        socketio.emit('transaction_completed', {
            'transaction_id': transaction_id,
            'card_token': pending_tx['card_token'],
            'transaction': completed_transactions[transaction_id]
        }, room=f"card_{pending_tx['card_token']}")
        
        print(f"Confirmation response processed for transaction: {transaction_id} - {'APPROVED' if confirmed else 'DENIED'}")
        
    except Exception as e:
        emit('error', {'message': f'Confirmation processing error: {str(e)}'})

def verify_location_proof(location_proof, pending_transaction):
    """Verify a location proof from mobile device"""
    try:
        # Extract proof data
        card_token = location_proof.get('card_token')
        transaction_nonce = location_proof.get('transaction_nonce')
        transaction_id = location_proof.get('transaction_id')
        location = location_proof.get('location')
        timestamp = location_proof.get('timestamp')
        attestation = location_proof.get('attestation')
        signature = location_proof.get('signature')

        # Validate required fields
        if not all([card_token, transaction_nonce, transaction_id, location, timestamp, attestation, signature]):
            return {
                'success': False,
                'result': 'DENY',
                'reason': 'Missing required fields'
            }

        # Get device key info
        device_info = device_registry.get(card_token)
        if not device_info:
            return {
                'success': False,
                'result': 'DENY',
                'reason': 'Device not registered'
            }
        
        private_key = device_info.get('private_key')
        public_key = device_info.get('public_key')
        if not private_key or not public_key:
            return {
                'success': False,
                'result': 'DENY',
                'reason': 'Device keys not available'
            }

        # Verify attestation
        if not verify_attestation(attestation):
            return {
                'success': False,
                'result': 'DENY',
                'reason': 'Invalid device attestation'
            }

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
        print(f"\n=== SIGNATURE VERIFICATION DEBUG ===")
        print(f"Card token: {card_token}")
        print(f"Public key: {public_key}")
        print(f"Private key: {private_key}")
        print(f"Received signature: {signature}")
        print(f"Proof data: {json.dumps(proof_data, indent=2)}")
        
        signature_valid = verify_signature(proof_data, signature, private_key)
        print(f"Signature valid: {signature_valid}")
        print(f"=== END SIGNATURE VERIFICATION DEBUG ===\n")
        
        if not signature_valid:
            return {
                'success': False,
                'result': 'DENY',
                'reason': 'Invalid digital signature'
            }

        # Check timestamp freshness (within 5 minutes)
        try:
            proof_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            now = datetime.utcnow().replace(tzinfo=proof_time.tzinfo)
            if (now - proof_time).total_seconds() > 300:  # 5 minutes
                return {
                    'success': False,
                    'result': 'DENY',
                    'reason': 'Proof timestamp too old'
                }
        except:
            return {
                'success': False,
                'result': 'DENY',
                'reason': 'Invalid timestamp format'
            }

        # Get POS location from pending transaction
        pos_location = pending_transaction.get('pos_location')
        if not pos_location:
            return {
                'success': False,
                'result': 'DENY',
                'reason': 'POS location not available'
            }

        # Validate location proximity - compare mobile app location vs POS location
        mobile_app_coords = (round(float(location['lat']), 8), round(float(location['lon']), 8))
        pos_coords = (round(float(pos_location['lat']), 8), round(float(pos_location['lon']), 8))
        
        # DEBUG: Log the coordinates being used
        print(f"\n=== LOCATION VALIDATION DEBUG (verify_location_proof) ===")
        print(f"Mobile app location (from location proof): {mobile_app_coords}")
        print(f"POS location (from pending transaction): {pos_coords}")
        print(f"Card token: {card_token}")
        print(f"=== END LOCATION VALIDATION DEBUG ===\n")
        
        validation_result = validator.validate_transaction(mobile_app_coords, pos_coords)
        
        distance_meters = validation_result['distance_miles'] * 1609.34  # Convert to meters

        # Decision logic based on distance and amount
        amount = pending_transaction.get('amount', 0)
        
        if distance_meters <= 20:
            if amount < 100:
                result = 'ACCEPT'
                reason = 'Co-located low-value transaction'
            else:
                result = 'CONFIRM_REQUIRED'
                reason = 'High-value co-located transaction requires confirmation'
        elif distance_meters <= 500:  # Within 500 meters
            result = 'CONFIRM_REQUIRED'
            reason = 'Location mismatch - confirmation required'
        else:  # Too far
            result = 'DENY'
            reason = 'Location too far from phone'

        return {
            'success': True,
            'result': result,
            'reason': reason,
            'distance_meters': round(distance_meters, 2)
        }

    except Exception as e:
        return {
            'success': False,
            'result': 'DENY',
            'reason': f'Verification error: {str(e)}'
        }

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
            # For demo purposes, create a default location for any new card
            # In production, this would require proper registration
            default_location = (42.3770, -71.1167)  # Harvard Square default
            mock_user_locations[card_number] = {
                'location': default_location,
                'phone': '+1234567890'
            }
            user_data = mock_user_locations[card_number]

        phone_location = user_data['location']
        phone_number = user_data['phone']

        # Extract transaction coordinates with 8 decimal precision
        trans_lat = round(float(transaction_location.get('latitude')), 8)
        trans_lon = round(float(transaction_location.get('longitude')), 8)

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

        # Register device (for demo, use the same key generation as mobile app)
        # The mobile app sends its public key, we need to use the matching private key
        device_registry[card_token] = {
            'public_key': public_key,
            'private_key': demo_private_key  # Use the same demo private key
        }

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
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - card_token
            - transaction_nonce
            - transaction_id
            - location
            - timestamp
            - attestation
            - signature
          properties:
            card_token:
              type: string
              example: "4532-1234-5678-9012"
            transaction_nonce:
              type: string
              example: "nonce123"
            transaction_id:
              type: string
              example: "tx_001"
            location:
              type: object
              properties:
                lat:
                  type: number
                  example: 42.3770
                lon:
                  type: number
                  example: -71.1167
            timestamp:
              type: string
              example: "2025-10-04T14:12:00Z"
            attestation:
              type: string
              example: "mock_attestation_123"
            signature:
              type: string
              example: "signature_hash"
    responses:
      200:
        description: Location proof verification result
      400:
        description: Invalid proof
    """
    try:
        data = request.get_json()
        
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

        # Get device key info
        device_info = device_registry.get(card_token)
        if not device_info:
            return jsonify({
                'success': False,
                'result': 'DENY',
                'reason': 'Device not registered'
            }), 400
        
        public_key = device_info.get('public_key')
        private_key = device_info.get('private_key')
        if not public_key or not private_key:
            return jsonify({
                'success': False,
                'result': 'DENY',
                'reason': 'Device keys not available'
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
        if not verify_signature(proof_data, signature, private_key):
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
        user_data = mock_user_locations.get(card_token)
        if not user_data:
            # For demo purposes, create a default location for any new card
            default_location = (42.3770, -71.1167)  # Harvard Square default
            mock_user_locations[card_token] = {
                'location': default_location,
                'phone': '+1234567890'
            }
            user_data = mock_user_locations[card_token]
        
        phone_location = user_data['location']

        # Validate location proximity with 8 decimal precision
        trans_coords = (round(float(location['lat']), 8), round(float(location['lon']), 8))
        
        # DEBUG: Log the coordinates being used
        print(f"\n=== LOCATION VALIDATION DEBUG (prove_location) ===")
        print(f"Phone location (from mock_user_locations): {phone_location}")
        print(f"Transaction location (from location proof): {trans_coords}")
        print(f"Card token: {card_token}")
        print(f"=== END LOCATION VALIDATION DEBUG ===\n")
        
        validation_result = validator.validate_transaction(phone_location, trans_coords)
        
        distance_meters = validation_result['distance_miles'] * 1609.34  # Convert to meters

        # Decision logic based on distance and amount
        amount = data.get('amount', 0)  # Get amount from request data
        
        if distance_meters <= 20:  # Within 20 meters
            if amount > 100:  # High-value transaction requires confirmation
                result = 'CONFIRM_REQUIRED'
                reason = 'High-value transaction - confirmation required'
            else:
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

@app.route('/api/transactions/history', methods=['GET'])
def get_transaction_history():
    """
    Get transaction history for a card
    ---
    tags:
      - Transactions
    parameters:
      - in: query
        name: card_token
        required: true
        type: string
        description: Card token to get history for
        example: "4532-1234-5678-9012"
      - in: query
        name: limit
        required: false
        type: integer
        description: Maximum number of transactions to return
        example: 50
    responses:
      200:
        description: Transaction history
        schema:
          type: object
          properties:
            transactions:
              type: array
              items:
                type: object
                properties:
                  transaction_id:
                    type: string
                  card_token:
                    type: string
                  amount:
                    type: number
                  merchant_name:
                    type: string
                  timestamp:
                    type: string
                  completed_at:
                    type: string
                  status:
                    type: string
                  result:
                    type: object
      400:
        description: Missing card token
    """
    try:
        card_token = request.args.get('card_token')
        limit = int(request.args.get('limit', 50))
        
        if not card_token:
            return jsonify({
                'error': 'Missing required parameter',
                'required': ['card_token']
            }), 400
        
        # Filter transactions for the specific card
        card_transactions = []
        for tx_id, tx_data in completed_transactions.items():
            if tx_data.get('card_token') == card_token:
                # Format transaction for mobile app
                formatted_tx = {
                    'id': tx_id,
                    'card_token': tx_data.get('card_token'),
                    'amount': tx_data.get('amount', 0),
                    'merchant_name': tx_data.get('merchant_name', 'Unknown'),
                    'timestamp': tx_data.get('timestamp'),
                    'completed_at': tx_data.get('completed_at'),
                    'status': tx_data.get('status', 'completed'),
                    'result': tx_data.get('result', {}),
                    'pos_location': tx_data.get('pos_location', {})
                }
                card_transactions.append(formatted_tx)
        
        # Sort by timestamp (most recent first) and limit
        card_transactions.sort(key=lambda x: x['timestamp'], reverse=True)
        card_transactions = card_transactions[:limit]
        
        return jsonify({
            'transactions': card_transactions,
            'total': len(card_transactions),
            'card_token': card_token
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
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
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
