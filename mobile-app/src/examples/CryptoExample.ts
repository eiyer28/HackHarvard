/**
 * CryptoExample - Simple example showing how to use the cryptographic services
 *
 * This demonstrates:
 * - Device registration
 * - Location proof creation
 * - Digital signature generation
 * - Proof submission to backend
 */

import { CryptoService } from "../services/CryptoService";
import { AttestationService } from "../services/AttestationService";
import { LocationProofService } from "../services/LocationProofService";

export class CryptoExample {
  /**
   * Example: Register a device with the backend
   */
  static async registerDevice(cardToken: string): Promise<boolean> {
    try {
      console.log("🔐 Registering device...");

      // Get or create device keypair
      const keyPair = await CryptoService.getOrCreateKeyPair();
      console.log("✅ Device keypair generated");

      // Generate device attestation
      const attestation = await AttestationService.generateAttestation();
      console.log("✅ Device attestation generated");

      // Register with backend
      const response = await fetch(
        "http://3.17.71.163:5000/api/register-device",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            card_token: cardToken,
            public_key: keyPair.publicKey,
            attestation: attestation.attestation_token,
          }),
        }
      );

      if (response.ok) {
        console.log("✅ Device registered successfully");
        return true;
      } else {
        console.error("❌ Device registration failed");
        return false;
      }
    } catch (error) {
      console.error("❌ Registration error:", error);
      return false;
    }
  }

  /**
   * Example: Process a transaction with location proof
   */
  static async processTransaction(
    cardToken: string,
    transactionId: string,
    transactionNonce: string,
    posLocation: { lat: number; lon: number },
    amount: number,
    merchantName: string
  ): Promise<void> {
    try {
      console.log("📱 Processing transaction...");

      // Create transaction request
      const transaction = {
        transaction_id: transactionId,
        transaction_nonce: transactionNonce,
        pos_location: posLocation,
        amount: amount,
        merchant_name: merchantName,
      };

      // Process transaction with location proof
      const result = await LocationProofService.processTransaction(
        transaction,
        cardToken
      );

      // Handle result
      switch (result.result) {
        case "ACCEPT":
          console.log("✅ Transaction approved automatically");
          console.log(`📍 Distance: ${result.distance_meters}m`);
          break;

        case "CONFIRM_REQUIRED":
          console.log("⚠️ Manual confirmation required");
          console.log(`📍 Distance: ${result.distance_meters}m`);
          console.log("📱 Push notification sent to phone");
          break;

        case "DENY":
          console.log("❌ Transaction denied");
          console.log(`Reason: ${result.reason}`);
          break;

        default:
          console.log("❓ Unknown result:", result.result);
      }
    } catch (error) {
      console.error("❌ Transaction processing error:", error);
    }
  }

  /**
   * Example: Complete demo flow
   */
  static async runDemo(): Promise<void> {
    console.log("🚀 Starting ProxyPay Demo...");

    // Step 1: Register device
    const cardToken = "4532-1234-5678-9012";
    const registered = await this.registerDevice(cardToken);

    if (!registered) {
      console.error("❌ Demo failed: Device registration failed");
      return;
    }

    // Step 2: Process co-located transaction (should auto-approve)
    console.log("\n📍 Testing co-located transaction...");
    await this.processTransaction(
      cardToken,
      "tx_001",
      "nonce123",
      { lat: 42.377, lon: -71.1167 }, // Harvard campus
      25.0,
      "Harvard Square Coffee"
    );

    // Step 3: Process distant transaction (should require confirmation)
    console.log("\n📍 Testing distant transaction...");
    await this.processTransaction(
      cardToken,
      "tx_002",
      "nonce456",
      { lat: 40.7128, lon: -74.006 }, // NYC
      50.0,
      "NYC Coffee Shop"
    );

    console.log("\n✅ Demo completed!");
  }
}

// Example usage:
// CryptoExample.runDemo();
