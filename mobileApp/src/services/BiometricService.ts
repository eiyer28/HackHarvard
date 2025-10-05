import * as LocalAuthentication from "expo-local-authentication";

export interface BiometricResult {
  success: boolean;
  error?: string;
}

export class BiometricService {
  /**
   * Check if biometric authentication is available on the device
   */
  static async isAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch (error) {
      console.error("Error checking biometric availability:", error);
      return false;
    }
  }

  /**
   * Get available authentication types
   */
  static async getAvailableTypes(): Promise<
    LocalAuthentication.AuthenticationType[]
  > {
    try {
      return await LocalAuthentication.supportedAuthenticationTypesAsync();
    } catch (error) {
      console.error("Error getting authentication types:", error);
      return [];
    }
  }

  /**
   * Authenticate using Face ID, Touch ID, or other biometric methods
   */
  static async authenticate(
    reason: string = "Authenticate to confirm transaction"
  ): Promise<BiometricResult> {
    try {
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        return {
          success: false,
          error: "Biometric authentication not available on this device",
        };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        cancelLabel: "Cancel",
        fallbackLabel: "Use Passcode",
        disableDeviceFallback: false,
      });

      if (result.success) {
        console.log("✅ Biometric authentication successful");
        return { success: true };
      } else {
        console.log("❌ Biometric authentication failed or cancelled");
        return {
          success: false,
          error: result.error || "Authentication failed",
        };
      }
    } catch (error) {
      console.error("❌ Biometric authentication error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Authentication error",
      };
    }
  }

  /**
   * Check if Face ID is specifically available
   */
  static async isFaceIdAvailable(): Promise<boolean> {
    try {
      const types = await this.getAvailableTypes();
      return types.includes(
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
      );
    } catch (error) {
      console.error("Error checking Face ID availability:", error);
      return false;
    }
  }

  /**
   * Check if Touch ID is available
   */
  static async isTouchIdAvailable(): Promise<boolean> {
    try {
      const types = await this.getAvailableTypes();
      return types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
    } catch (error) {
      console.error("Error checking Touch ID availability:", error);
      return false;
    }
  }
}
