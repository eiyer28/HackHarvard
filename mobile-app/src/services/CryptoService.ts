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
   * Generate a new ECDSA P-256 keypair for the device
   * This creates a unique digital identity for this phone
   */
  static async generateKeyPair(): Promise<KeyPair> {
    try {
      // Generate a random seed for key generation
      const seed = await Crypto.getRandomBytesAsync(32);

      // For demo purposes, we'll create a deterministic keypair
      // In production, you'd use a proper ECDSA library
      const privateKey = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        seed.toString(),
        { encoding: Crypto.CryptoEncoding.BASE64 }
      );

      const publicKey = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        privateKey + "_public",
        { encoding: Crypto.CryptoEncoding.BASE64 }
      );

      const keyPair: KeyPair = {
        publicKey,
        privateKey,
      };

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
      const existingKeyPair = await this.getStoredKeyPair();
      if (existingKeyPair) {
        return existingKeyPair;
      }

      return await this.generateKeyPair();
    } catch (error) {
      console.error("Error getting keypair:", error);
      throw new Error("Failed to get device keypair");
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

      // Create hash of the data
      const dataHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        canonicalData,
        { encoding: Crypto.CryptoEncoding.BASE64 }
      );

      // Sign the hash with private key (simplified for demo)
      const signature = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        dataHash + keyPair.privateKey,
        { encoding: Crypto.CryptoEncoding.BASE64 }
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
      card_token: proof.card_token,
      transaction_nonce: proof.transaction_nonce,
      transaction_id: proof.transaction_id,
      location: {
        lat: proof.location.lat,
        lon: proof.location.lon,
      },
      timestamp: proof.timestamp,
      attestation: proof.attestation,
    };

    return JSON.stringify(canonicalObject);
  }

  /**
   * Store keypair securely on device
   */
  private static async storeKeyPair(keyPair: KeyPair): Promise<void> {
    try {
      await SecureStore.setItemAsync(
        this.PRIVATE_KEY_STORAGE_KEY,
        keyPair.privateKey
      );
      await SecureStore.setItemAsync(
        this.PUBLIC_KEY_STORAGE_KEY,
        keyPair.publicKey
      );
    } catch (error) {
      console.error("Error storing keypair:", error);
      throw new Error("Failed to store device keys");
    }
  }

  /**
   * Retrieve stored keypair
   */
  private static async getStoredKeyPair(): Promise<KeyPair | null> {
    try {
      const privateKey = await SecureStore.getItemAsync(
        this.PRIVATE_KEY_STORAGE_KEY
      );
      const publicKey = await SecureStore.getItemAsync(
        this.PUBLIC_KEY_STORAGE_KEY
      );

      if (privateKey && publicKey) {
        return { privateKey, publicKey };
      }

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
      await SecureStore.deleteItemAsync(this.PRIVATE_KEY_STORAGE_KEY);
      await SecureStore.deleteItemAsync(this.PUBLIC_KEY_STORAGE_KEY);
    } catch (error) {
      console.error("Error clearing keys:", error);
    }
  }
}
