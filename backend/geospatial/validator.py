from geopy.distance import geodesic
from typing import Tuple, Dict

class LocationValidator:
    """Validates if a transaction location matches the user's phone location."""

    def __init__(self, max_distance_miles: float = 0.25):
        """
        Initialize validator with maximum allowed distance.

        Args:
            max_distance_miles: Maximum distance in miles between locations to be considered valid
        """
        self.max_distance_miles = max_distance_miles

    def validate_transaction(
        self,
        phone_location: Tuple[float, float],
        transaction_location: Tuple[float, float]
    ) -> Dict[str, any]:
        """
        Validate if transaction location is within acceptable range of phone location.

        Args:
            phone_location: Tuple of (latitude, longitude) for user's phone
            transaction_location: Tuple of (latitude, longitude) for transaction

        Returns:
            Dict with 'valid' (bool), 'distance_miles' (float), and 'reason' (str)
        """
        # Calculate distance between two points
        distance = geodesic(phone_location, transaction_location).miles

        is_valid = distance <= self.max_distance_miles

        return {
            'valid': is_valid,
            'distance_miles': round(distance, 6),
            'reason': f'Transaction within {self.max_distance_miles} miles' if is_valid
                     else f'Transaction {round(distance, 6)} miles away (max: {self.max_distance_miles})'
        }

    def set_max_distance(self, miles: float):
        """Update maximum allowed distance."""
        self.max_distance_miles = miles
