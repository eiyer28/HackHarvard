import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { BiometricService } from "../src/services/BiometricService";

interface TransactionConfirmationModalProps {
  visible: boolean;
  transactionData: {
    transaction_id: string;
    amount: number;
    merchant_name: string;
    distance_meters: number;
  } | null;
  onConfirm: (transactionId: string) => void;
  onDeny: (transactionId: string) => void;
  onClose: () => void;
}

export default function TransactionConfirmationModal({
  visible,
  transactionData,
  onConfirm,
  onDeny,
  onClose,
}: TransactionConfirmationModalProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string>("");

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const isAvailable = await BiometricService.isAvailable();
      setBiometricAvailable(isAvailable);

      if (isAvailable) {
        const isFaceId = await BiometricService.isFaceIdAvailable();
        const isTouchId = await BiometricService.isTouchIdAvailable();

        if (isFaceId) {
          setBiometricType("Face ID");
        } else if (isTouchId) {
          setBiometricType("Touch ID");
        } else {
          setBiometricType("Biometric");
        }
      }
    } catch (error) {
      console.error("Error checking biometric availability:", error);
    }
  };

  const handleConfirm = async () => {
    if (!transactionData) return;

    console.log("🔐 Starting biometric authentication...");
    setIsAuthenticating(true);
    try {
      const result = await BiometricService.authenticate(
        `Confirm transaction of $${transactionData.amount} at ${transactionData.merchant_name}`
      );

      console.log("🔐 Biometric result:", result);

      if (result.success) {
        console.log(
          "✅ Biometric authentication successful, confirming transaction"
        );
        onConfirm(transactionData.transaction_id);
      } else {
        console.log("❌ Biometric authentication failed:", result.error);
        Alert.alert(
          "Authentication Failed",
          result.error || "Biometric authentication failed. Please try again.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("❌ Biometric authentication error:", error);
      Alert.alert(
        "Error",
        "An error occurred during authentication. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleDeny = () => {
    if (!transactionData) return;
    onDeny(transactionData.transaction_id);
  };

  if (!transactionData) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Transaction Confirmation</Text>
            <Text style={styles.subtitle}>Location verification required</Text>
          </View>

          <View style={styles.content}>
            <View style={styles.transactionInfo}>
              <Text style={styles.merchantName}>
                {transactionData.merchant_name}
              </Text>
              <Text style={styles.amount}>
                ${transactionData.amount.toFixed(2)}
              </Text>
              <Text style={styles.distance}>
                Distance: {transactionData.distance_meters.toFixed(1)}m from
                your location
              </Text>
            </View>

            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⚠️ This transaction is outside your normal range. Please confirm
                it's legitimate.
              </Text>
            </View>

            {biometricAvailable && (
              <View style={styles.biometricInfo}>
                <Text style={styles.biometricText}>
                  Use {biometricType} to confirm this transaction
                </Text>
              </View>
            )}
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.button, styles.denyButton]}
              onPress={handleDeny}
              disabled={isAuthenticating}
            >
              <Text style={styles.denyButtonText}>Deny</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={handleConfirm}
              disabled={isAuthenticating}
            >
              {isAuthenticating ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.confirmButtonText}>
                  {biometricAvailable
                    ? `Confirm with ${biometricType}`
                    : "Confirm"}
                </Text>
              )}
            </TouchableOpacity>

            {biometricAvailable && (
              <TouchableOpacity
                style={[styles.button, styles.skipButton]}
                onPress={() => {
                  console.log("⏭️ Skipping biometric authentication");
                  onConfirm(transactionData.transaction_id);
                }}
                disabled={isAuthenticating}
              >
                <Text style={styles.skipButtonText}>Skip & Confirm</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "white",
    borderRadius: 20,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 4,
  },
  content: {
    padding: 24,
  },
  transactionInfo: {
    alignItems: "center",
    marginBottom: 20,
  },
  merchantName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  amount: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 8,
  },
  distance: {
    fontSize: 14,
    color: "#666",
  },
  warningBox: {
    backgroundColor: "#FFF3CD",
    borderColor: "#FFEAA7",
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  warningText: {
    fontSize: 14,
    color: "#856404",
    textAlign: "center",
  },
  biometricInfo: {
    backgroundColor: "#E3F2FD",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  biometricText: {
    fontSize: 14,
    color: "#1976D2",
    textAlign: "center",
    fontWeight: "500",
  },
  buttons: {
    flexDirection: "row",
    padding: 24,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  denyButton: {
    backgroundColor: "#FF3B30",
  },
  denyButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButton: {
    backgroundColor: "#34C759",
  },
  confirmButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  skipButton: {
    backgroundColor: "#FF9500",
  },
  skipButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
