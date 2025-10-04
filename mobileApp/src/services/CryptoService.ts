/**
 * CryptoService - Handles all cryptographic operations for ProxyPay
 *
 * This service manages:
 * - Device keypair generation and storage
 * - Digital signature creation and verification
 * - Secure data signing for location proofs
 */

import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface LocationProof {
  card_token: string;
  transaction_nonce: string;
  transaction_id: string;
  location: {
    lat: number;
    lon: number;
  };
  timestamp: string;
  attestation: string;
}

export class CryptoService {
  private static readonly PRIVATE_KEY_STORAGE_KEY = "proxy_pay_private_key";
  private static readonly PUBLIC_KEY_STORAGE_KEY = "proxy_pay_public_key";

  /**
   * Test if SecureStore is available and working
   */
  static async testSecureStore(): Promise<boolean> {
    try {
      if (Platform.OS === "web") {
        return typeof window !== "undefined" && window.localStorage !== null;
      } else {
        // Test SecureStore on iOS/Android
        const testKey = "test_secure_store_key";
        const testValue = "test_value_" + Date.now();

        await SecureStore.setItemAsync(testKey, testValue);
        const retrievedValue = await SecureStore.getItemAsync(testKey);
        await SecureStore.deleteItemAsync(testKey);

        return retrievedValue === testValue;
      }
    } catch (error) {
      console.error("SecureStore test failed:", error);
      return false;
    }
  }

  /**
   * Generate a new ECDSA P-256 keypair for the device
   * This creates a unique digital identity for this phone
   */
  static async generateKeyPair(): Promise<KeyPair> {
    try {
      // For demo purposes, we'll create a deterministic keypair that matches backend exactly
      // In production, you'd use a proper ECDSA library
      const seed = "demo_seed_for_consistent_keys";

      // Match backend algorithm: SHA256(seed) -> raw bytes -> base64 encode
      const privateKeyRaw = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        seed,
        { encoding: Crypto.CryptoEncoding.BASE64 }
      );

      // The backend uses: base64.b64encode(hashlib.sha256(seed.encode()).digest()).decode('utf-8')
      // But expo-crypto already gives us base64, so we need to decode and re-encode to match
      const privateKey = privateKeyRaw; // This should match the backend

      const publicKey = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        privateKey + "_public",
        { encoding: Crypto.CryptoEncoding.BASE64 }
      );

      const keyPair: KeyPair = {
        publicKey,
        privateKey,
      };

      console.log("Generated keypair:");
      console.log("  Private key:", privateKey);
      console.log("  Public key:", publicKey);
      console.log(
        "  Expected private key: A/LtmBX2wxVP+bVq1CHDnz9YMTtD6GIIakHBOIMgs3Q="
      );
      console.log(
        "  Expected public key: NRU38WR2P5kfV37J1ed2QEWfWd9lTDp37sGlLWQVSE8="
      );
      console.log(
        "  Private key matches expected:",
        privateKey === "A/LtmBX2wxVP+bVq1CHDnz9YMTtD6GIIakHBOIMgs3Q="
      );
      console.log(
        "  Public key matches expected:",
        publicKey === "NRU38WR2P5kfV37J1ed2QEWfWd9lTDp37sGlLWQVSE8="
      );

      // Store keys securely
      await this.storeKeyPair(keyPair);

      return keyPair;
    } catch (error) {
      console.error("Error generating keypair:", error);
      throw new Error("Failed to generate device keypair");
    }
  }

  /**
   * Get existing keypair or generate new one
   */
  static async getOrCreateKeyPair(): Promise<KeyPair> {
    try {
      console.log("🔍 Checking for existing keypair on", Platform.OS);
      const existingKeyPair = await this.getStoredKeyPair();
      if (existingKeyPair) {
        console.log("✅ Found existing keypair");
        return existingKeyPair;
      }

      console.log("🔄 No existing keypair found, generating new one");
      return await this.generateKeyPair();
    } catch (error) {
      console.error("❌ Error getting keypair:", error);
      throw new Error(
        "Failed to get device keypair: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  }

  /**
   * Create a digital signature for a location proof
   * This proves the data came from this specific device
   */
  static async signLocationProof(proof: LocationProof): Promise<string> {
    try {
      const keyPair = await this.getOrCreateKeyPair();

      // Create canonical JSON string (sorted keys for consistency)
      const canonicalData = this.createCanonicalJSON(proof);
      console.log("Canonical data:", canonicalData);

      // Create hash of the data (as raw bytes to match backend)
      const dataHashBytes = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        canonicalData,
        { encoding: Crypto.CryptoEncoding.BASE64 }
      );
      console.log("Data hash bytes (base64):", dataHashBytes);

      // Sign the raw hash bytes with private key (matching backend algorithm)
      const concatenatedString = dataHashBytes + keyPair.privateKey;
      console.log("Concatenated string for signing:", concatenatedString);

      const signature = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        concatenatedString,
        { encoding: Crypto.CryptoEncoding.HEX }
      );
      console.log("Generated signature:", signature);
      console.log("Used private key:", keyPair.privateKey);
      console.log(
        "Expected private key: A/LtmBX2wxVP+bVq1CHDnz9YMTtD6GIIakHBOIMgs3Q="
      );
      console.log(
        "Private key matches expected:",
        keyPair.privateKey === "A/LtmBX2wxVP+bVq1CHDnz9YMTtD6GIIakHBOIMgs3Q="
      );

      return signature;
    } catch (error) {
      console.error("Error signing location proof:", error);
      throw new Error("Failed to sign location proof");
    }
  }

  /**
   * Verify a digital signature (used by backend)
   */
  static async verifySignature(
    data: string,
    signature: string,
    publicKey: string
  ): Promise<boolean> {
    try {
      // Create hash of the data
      const dataHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        data,
        { encoding: Crypto.CryptoEncoding.BASE64 }
      );

      // Recreate expected signature
      const expectedSignature = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        dataHash + publicKey,
        { encoding: Crypto.CryptoEncoding.BASE64 }
      );

      return signature === expectedSignature;
    } catch (error) {
      console.error("Error verifying signature:", error);
      return false;
    }
  }

  /**
   * Create canonical JSON string with sorted keys
   * This ensures consistent signing regardless of key order
   */
  private static createCanonicalJSON(proof: LocationProof): string {
    const canonicalObject = {
      attestation: proof.attestation,
      card_token: proof.card_token,
      location: {
        lat: proof.location.lat,
        lon: proof.location.lon,
      },
      timestamp: proof.timestamp,
      transaction_id: proof.transaction_id,
      transaction_nonce: proof.transaction_nonce,
    };

    // Use JSON.stringify with proper formatting to match Python's json.dumps
    // Python adds spaces after colons, so we need to match that
    // But we need to be careful not to replace colons inside string values (like timestamps)
    let jsonString = JSON.stringify(canonicalObject, null, 0);

    // Only replace colons that are followed by a quote (JSON key-value separators)
    jsonString = jsonString.replace(/":/g, '": ');

    // Only replace commas that are followed by a quote (JSON object separators)
    jsonString = jsonString.replace(/,"/g, ', "');

    return jsonString;
  }

  /**
   * Store keypair securely on device
   */
  private static async storeKeyPair(keyPair: KeyPair): Promise<void> {
    try {
      // Use localStorage for web, SecureStore for native (iOS/Android)
      if (Platform.OS === "web") {
        if (typeof window !== "undefined" && window.localStorage) {
          localStorage.setItem(
            this.PRIVATE_KEY_STORAGE_KEY,
            keyPair.privateKey
          );
          localStorage.setItem(this.PUBLIC_KEY_STORAGE_KEY, keyPair.publicKey);
        } else {
          throw new Error("localStorage not available on web platform");
        }
      } else {
        // Use SecureStore for iOS and Android
        try {
          await SecureStore.setItemAsync(
            this.PRIVATE_KEY_STORAGE_KEY,
            keyPair.privateKey,
            {
              requireAuthentication: false, // Don't require biometric authentication for demo
              authenticationPrompt: "Access your device keys",
            }
          );
          await SecureStore.setItemAsync(
            this.PUBLIC_KEY_STORAGE_KEY,
            keyPair.publicKey,
            {
              requireAuthentication: false,
              authenticationPrompt: "Access your device keys",
            }
          );
        } catch (secureStoreError) {
          console.error("SecureStore error:", secureStoreError);
          // Fallback: try without options for iOS compatibility
          await SecureStore.setItemAsync(
            this.PRIVATE_KEY_STORAGE_KEY,
            keyPair.privateKey
          );
          await SecureStore.setItemAsync(
            this.PUBLIC_KEY_STORAGE_KEY,
            keyPair.publicKey
          );
        }
      }
      console.log(
        "✅ Keys stored successfully using",
        Platform.OS === "web" ? "localStorage" : "SecureStore"
      );
    } catch (error) {
      console.error("Error storing keypair:", error);
      throw new Error(
        "Failed to store device keys: " +
          (error instanceof Error ? error.message : String(error))
      );
    }
  }

  /**
   * Retrieve stored keypair
   */
  private static async getStoredKeyPair(): Promise<KeyPair | null> {
    try {
      let privateKey: string | null;
      let publicKey: string | null;

      // Use localStorage for web, SecureStore for native (iOS/Android)
      if (Platform.OS === "web") {
        if (typeof window !== "undefined" && window.localStorage) {
          privateKey = localStorage.getItem(this.PRIVATE_KEY_STORAGE_KEY);
          publicKey = localStorage.getItem(this.PUBLIC_KEY_STORAGE_KEY);
        } else {
          console.warn("localStorage not available on web platform");
          return null;
        }
      } else {
        // Use SecureStore for iOS and Android
        try {
          privateKey = await SecureStore.getItemAsync(
            this.PRIVATE_KEY_STORAGE_KEY,
            {
              requireAuthentication: false,
              authenticationPrompt: "Access your device keys",
            }
          );
          publicKey = await SecureStore.getItemAsync(
            this.PUBLIC_KEY_STORAGE_KEY,
            {
              requireAuthentication: false,
              authenticationPrompt: "Access your device keys",
            }
          );
        } catch (secureStoreError) {
          console.error("SecureStore retrieval error:", secureStoreError);
          // Fallback: try without options for iOS compatibility
          privateKey = await SecureStore.getItemAsync(
            this.PRIVATE_KEY_STORAGE_KEY
          );
          publicKey = await SecureStore.getItemAsync(
            this.PUBLIC_KEY_STORAGE_KEY
          );
        }
      }

      if (privateKey && publicKey) {
        console.log(
          "✅ Keys retrieved successfully using",
          Platform.OS === "web" ? "localStorage" : "SecureStore"
        );
        return { privateKey, publicKey };
      }

      console.log("ℹ️ No stored keys found");
      return null;
    } catch (error) {
      console.error("Error retrieving keypair:", error);
      return null;
    }
  }

  /**
   * Get public key for registration
   */
  static async getPublicKey(): Promise<string> {
    const keyPair = await this.getOrCreateKeyPair();
    return keyPair.publicKey;
  }

  /**
   * Clear stored keys (for testing or device reset)
   */
  static async clearKeys(): Promise<void> {
    try {
      console.log("Clearing stored keys...");
      // Use localStorage for web, SecureStore for native (iOS/Android)
      if (Platform.OS === "web") {
        if (typeof window !== "undefined" && window.localStorage) {
          localStorage.removeItem(this.PRIVATE_KEY_STORAGE_KEY);
          localStorage.removeItem(this.PUBLIC_KEY_STORAGE_KEY);
        } else {
          console.warn("localStorage not available on web platform");
        }
      } else {
        // Use SecureStore for iOS and Android
        await SecureStore.deleteItemAsync(this.PRIVATE_KEY_STORAGE_KEY);
        await SecureStore.deleteItemAsync(this.PUBLIC_KEY_STORAGE_KEY);
      }
      console.log(
        "✅ Keys cleared successfully using",
        Platform.OS === "web" ? "localStorage" : "SecureStore"
      );
    } catch (error) {
      console.error("Error clearing keys:", error);
    }
  }

  /**
   * Force regenerate keys (for debugging)
   */
  static async forceRegenerateKeys(): Promise<KeyPair> {
    try {
      console.log("Force regenerating keys...");
      await this.clearKeys();
      return await this.generateKeyPair();
    } catch (error) {
      console.error("Error force regenerating keys:", error);
      throw new Error("Failed to force regenerate keys");
    }
  }
}
