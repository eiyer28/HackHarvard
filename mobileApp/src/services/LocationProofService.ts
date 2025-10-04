/**
 * LocationProofService - Creates and manages location proofs for ProxyPay
 *
 * This service:
 * - Collects GPS location data
 * - Creates signed location proofs
 * - Handles transaction nonce binding
 * - Manages proof submission to backend
 */

import { CryptoService, LocationProof } from "./CryptoService";
import { AttestationService } from "./AttestationService";
import * as Location from "expo-location";

export interface TransactionRequest {
  transaction_id: string;
  transaction_nonce: string;
  pos_location: {
    lat: number;
    lon: number;
  };
  amount: number;
  merchant_name: string;
}

export interface ProofSubmissionResult {
  success: boolean;
  result: "ACCEPT" | "CONFIRM_REQUIRED" | "DENY" | "FLAG";
  reason: string;
  distance_meters?: number;
}

export class LocationProofService {
  /**
   * Create a signed location proof for a transaction
   */
  static async createLocationProof(
    transaction: TransactionRequest,
    cardToken: string
  ): Promise<LocationProof> {
    try {
      // Get current GPS location
      const location = await this.getCurrentLocation();

      // Generate device attestation
      const attestation = await AttestationService.generateAttestation();

      // Create location proof object
      const proof: LocationProof = {
        card_token: cardToken,
        transaction_nonce: transaction.transaction_nonce,
        transaction_id: transaction.transaction_id,
        location: {
          lat: location.lat,
          lon: location.lon,
        },
        timestamp: new Date().toISOString(),
        attestation: attestation.attestation_token,
      };

      return proof;
    } catch (error) {
      console.error("Error creating location proof:", error);
      throw new Error("Failed to create location proof");
    }
  }

  /**
   * Submit location proof to backend for verification
   */
  static async submitProof(
    proof: LocationProof,
    signature: string
  ): Promise<ProofSubmissionResult> {
    try {
      const payload = {
        ...proof,
        signature: signature,
      };

      console.log(
        "Submitting proof payload:",
        JSON.stringify(payload, null, 2)
      );

      const response = await fetch("http://localhost:5000/api/prove-location", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Backend error response:", errorText);
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`
        );
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error submitting proof:", error);
      return {
        success: false,
        result: "DENY",
        reason: "Failed to submit proof to server",
      };
    }
  }

  /**
   * Complete transaction flow: create proof, sign, and submit
   */
  static async processTransaction(
    transaction: TransactionRequest,
    cardToken: string
  ): Promise<ProofSubmissionResult> {
    try {
      // Create location proof
      const proof = await this.createLocationProof(transaction, cardToken);

      // Sign the proof
      const signature = await CryptoService.signLocationProof(proof);

      // Submit to backend
      const result = await this.submitProof(proof, signature);

      return result;
    } catch (error) {
      console.error("Error processing transaction:", error);
      return {
        success: false,
        result: "DENY",
        reason: "Transaction processing failed",
      };
    }
  }

  /**
   * Get current GPS location with high accuracy
   */
  static async getCurrentLocation(): Promise<{ lat: number; lon: number }> {
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        throw new Error("Location permission denied");
      }

      // Get current location with high accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 10000, // 10 seconds
        timeout: 15000, // 15 seconds
      } as any);

      return {
        lat: location.coords.latitude,
        lon: location.coords.longitude,
      };
    } catch (error) {
      console.error("Error getting location:", error);
      // For web demo or when location fails, return Boston coordinates as fallback
      // This should be different from the mock POS locations to test validation
      return {
        lat: 42.3601, // Boston, MA coordinates
        lon: -71.0589,
      };
    }
  }

  /**
   * Check if location services are available
   */
  static async isLocationAvailable(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === "granted";
    } catch (error) {
      return false;
    }
  }

  /**
   * Request location permissions
   */
  static async requestLocationPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === "granted";
    } catch (error) {
      console.error("Error requesting location permission:", error);
      return false;
    }
  }
}
