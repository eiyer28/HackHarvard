import requests
import json

BASE_URL = "http://localhost:5000/api"

def test_health():
    """Test health check endpoint."""
    print("Testing health check...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}\n")

def test_valid_transaction():
    """Test a valid transaction (same location)."""
    print("Test 1: Valid transaction (same location)")
    payload = {
        "card_number": "4532-1234-5678-9012",
        "amount": 50.00,
        "merchant_name": "Harvard Bookstore",
        "transaction_location": {
            "latitude": 42.3770,
            "longitude": -71.1167
        }
    }
    response = requests.post(f"{BASE_URL}/transaction/validate", json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}\n")

def test_invalid_transaction():
    """Test an invalid transaction (different location)."""
    print("Test 2: Invalid transaction (cross-country)")
    payload = {
        "card_number": "4532-1234-5678-9012",  # Phone in Harvard
        "amount": 500.00,
        "merchant_name": "SF Electronics",
        "transaction_location": {
            "latitude": 37.7749,  # San Francisco
            "longitude": -122.4194
        }
    }
    response = requests.post(f"{BASE_URL}/transaction/validate", json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}\n")

def test_register_card():
    """Test registering a new card."""
    print("Test 3: Register new card")
    payload = {
        "card_number": "4111-1111-1111-1111",
        "phone_location": {
            "latitude": 40.7128,  # New York
            "longitude": -74.0060
        }
    }
    response = requests.post(f"{BASE_URL}/card/register", json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}\n")

def test_unregistered_card():
    """Test transaction with unregistered card."""
    print("Test 4: Unregistered card")
    payload = {
        "card_number": "9999-9999-9999-9999",
        "amount": 100.00,
        "merchant_name": "Unknown Store",
        "transaction_location": {
            "latitude": 42.3770,
            "longitude": -71.1167
        }
    }
    response = requests.post(f"{BASE_URL}/transaction/validate", json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}\n")

if __name__ == "__main__":
    print("=== ProxyPay API Tests ===\n")
    print("Make sure the server is running: py app.py\n")

    try:
        test_health()
        test_valid_transaction()
        test_invalid_transaction()
        test_register_card()
        test_unregistered_card()
        print("✅ All tests completed!")
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to server.")
        print("Make sure to run 'py app.py' in another terminal first.")
