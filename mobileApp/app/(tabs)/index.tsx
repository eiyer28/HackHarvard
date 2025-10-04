import { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
} from "react-native";
import { CryptoService } from "../../src/services/CryptoService";
import { AttestationService } from "../../src/services/AttestationService";
import { LocationProofService } from "../../src/services/LocationProofService";
import { webSocketService } from "../../src/services/WebSocketService";

export default function HomeScreen() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [cardToken, setCardToken] = useState("4532-1234-5678-9012");
  const [publicKey, setPublicKey] = useState("");
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);

  useEffect(() => {
    checkRegistration();
    getCurrentLocation();
    connectWebSocket();
  }, []);

  const connectWebSocket = async () => {
    try {
      await webSocketService.connect();
      setIsWebSocketConnected(true);
      console.log("🔌 WebSocket connected");
    } catch (error) {
      console.error("❌ WebSocket connection failed:", error);
      setIsWebSocketConnected(false);
    }
  };

  const checkRegistration = async () => {
    try {
      const key = await CryptoService.getPublicKey();
      setPublicKey(key);
      setIsRegistered(true);
    } catch (error) {
      console.log("Device not registered yet");
    }
  };

  const getCurrentLocation = async () => {
    try {
      const hasPermission =
        await LocationProofService.requestLocationPermission();
      if (hasPermission) {
        const location = await LocationProofService.isLocationAvailable();
        if (location) {
          // Get current location for display
          const { status } = await import("expo-location").then((Location) =>
            Location.getForegroundPermissionsAsync()
          );
          if (status === "granted") {
            const { getCurrentPositionAsync, Accuracy } = await import(
              "expo-location"
            );
            const pos = await getCurrentPositionAsync({
              accuracy: Accuracy.High,
              maximumAge: 10000,
              timeout: 15000,
            } as any);
            setLocation({
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error getting location:", error);
      // Fallback to Boston coordinates for demo
      setLocation({
        lat: 42.3601, // Boston, MA coordinates
        lon: -71.0589,
      });
    }
  };

  const registerDevice = async () => {
    setIsLoading(true);
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
        "http://localhost:5000/api/register-device",
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
        setPublicKey(keyPair.publicKey);
        setIsRegistered(true);

        // Register with WebSocket
        if (isWebSocketConnected) {
          webSocketService.registerPhone(cardToken);
          console.log("📱 Phone registered with WebSocket");
        }

        Alert.alert("Success", "Device registered successfully!");
      } else {
        console.error("❌ Device registration failed");
        Alert.alert("Error", "Device registration failed");
      }
    } catch (error) {
      console.error("❌ Registration error:", error);
      Alert.alert(
        "Error",
        "Registration failed: " +
          (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ProxyPay Mobile</Text>
        <Text style={styles.subtitle}>Location-based transaction security</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Device Status</Text>
        <Text style={styles.statusText}>
          {isRegistered ? "✅ Registered" : "❌ Not Registered"}
        </Text>
        <Text style={styles.statusText}>
          WebSocket: {isWebSocketConnected ? "✅ Connected" : "❌ Disconnected"}
        </Text>
        {publicKey && (
          <Text style={styles.keyText}>
            Public Key: {publicKey.substring(0, 20)}...
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Location</Text>
        {location ? (
          <Text style={styles.locationText}>
            📍 {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
          </Text>
        ) : (
          <Text style={styles.locationText}>📍 Location not available</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Card Token</Text>
        <TextInput
          style={styles.input}
          value={cardToken}
          onChangeText={setCardToken}
          placeholder="Enter card token"
        />
      </View>

      <TouchableOpacity
        style={[styles.button, isRegistered && styles.buttonSecondary]}
        onPress={registerDevice}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? "Loading..." : "Register Device"}
        </Text>
      </TouchableOpacity>

      {!isWebSocketConnected && (
        <TouchableOpacity
          style={[styles.button, styles.buttonWarning]}
          onPress={connectWebSocket}
        >
          <Text style={styles.buttonText}>Reconnect WebSocket</Text>
        </TouchableOpacity>
      )}

      {isRegistered && (
        <TouchableOpacity
          style={[styles.button, styles.buttonDanger]}
          onPress={async () => {
            await CryptoService.clearKeys();
            setIsRegistered(false);
            setPublicKey("");
            Alert.alert("Success", "Device keys cleared");
          }}
        >
          <Text style={styles.buttonText}>Reset Device</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  statusText: {
    fontSize: 16,
    color: "#333",
    marginBottom: 5,
  },
  keyText: {
    fontSize: 12,
    color: "#666",
    fontFamily: "monospace",
  },
  locationText: {
    fontSize: 16,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  button: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 15,
  },
  buttonSecondary: {
    backgroundColor: "#34C759",
  },
  buttonDanger: {
    backgroundColor: "#FF3B30",
  },
  buttonWarning: {
    backgroundColor: "#FF9500",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
