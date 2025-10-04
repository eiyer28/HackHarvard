from flask import Flask, request, jsonify
from flask_cors import CORS
from flasgger import Swagger
import sys
import os

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
validator = LocationValidator(max_distance_miles=0.5)

# Mock user location database (in production, this would be real-time from mobile app)
mock_user_locations = {
    "4532-1234-5678-9012": (42.3770, -71.1167),  # Harvard campus
    "5412-9876-5432-1098": (37.7749, -122.4194),  # San Francisco
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

        # Get user's phone location (mock)
        phone_location = mock_user_locations.get(card_number)

        if not phone_location:
            return jsonify({
                'error': 'Card not registered',
                'message': 'This card is not linked to a phone location'
            }), 404

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

        # Build response
        response = {
            'transaction_approved': validation_result['valid'],
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

        # Store in mock database
        mock_user_locations[card_number] = (lat, lon)

        return jsonify({
            'message': 'Card registered successfully',
            'card_number': card_number,
            'location': {'latitude': lat, 'longitude': lon}
        }), 201

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
    app.run(debug=True, host='0.0.0.0', port=5000)
