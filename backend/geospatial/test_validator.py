from validator import LocationValidator

def test_validator():
    """Test the location validator with real-world scenarios."""

    validator = LocationValidator(max_distance_miles=0.25)

    # Test 1: Same location (Harvard campus)
    print("Test 1: Same location")
    harvard_coords = (42.3770, -71.1167)
    result = validator.validate_transaction(harvard_coords, harvard_coords)
    print(f"Valid: {result['valid']}, Distance: {result['distance_miles']} miles")
    print(f"Reason: {result['reason']}\n")

    # Test 2: Close locations (Harvard to MIT - ~2 miles)
    print("Test 2: Close locations (should fail)")
    mit_coords = (42.3601, -71.0942)
    result = validator.validate_transaction(harvard_coords, mit_coords)
    print(f"Valid: {result['valid']}, Distance: {result['distance_miles']} miles")
    print(f"Reason: {result['reason']}\n")

    # Test 3: Very close locations (0.1 miles apart - should pass)
    print("Test 3: Very close locations (should pass)")
    nearby = (42.3780, -71.1170)
    result = validator.validate_transaction(harvard_coords, nearby)
    print(f"Valid: {result['valid']}, Distance: {result['distance_miles']} miles")
    print(f"Reason: {result['reason']}\n")

    # Test 4: Across country (Harvard to San Francisco - should fail)
    print("Test 4: Cross-country transaction (should fail)")
    sf_coords = (37.7749, -122.4194)
    result = validator.validate_transaction(harvard_coords, sf_coords)
    print(f"Valid: {result['valid']}, Distance: {result['distance_miles']} miles")
    print(f"Reason: {result['reason']}\n")

if __name__ == "__main__":
    test_validator()
