import { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Platform,
  Image,
} from "react-native";
import { CryptoService } from "../../src/services/CryptoService";
import { AttestationService } from "../../src/services/AttestationService";
import { LocationProofService } from "../../src/services/LocationProofService";
import { webSocketService } from "../../src/services/WebSocketService";
import ParallaxScrollView from "@/components/parallax-scroll-view";

export default function HomeScreen() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [cardToken, setCardToken] = useState("4532-1234-5678-9012");
  const [publicKey, setPublicKey] = useState("");
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [locationUpdateCount, setLocationUpdateCount] = useState(0);
  const [phoneRegistered, setPhoneRegistered] = useState(false);

  useEffect(() => {
    checkRegistration();
    getCurrentLocation();
    connectWebSocket();
  }, []);

  // Set up real-time location updates every 5 seconds
  useEffect(() => {
    const locationInterval = setInterval(() => {
      getCurrentLocation();
    }, 5000);

    return () => clearInterval(locationInterval);
  }, []);

  const connectWebSocket = async () => {
    try {
      await webSocketService.connect();
      setIsWebSocketConnected(true);
      console.log("🔌 WebSocket connected");

      // If device is already registered, try to register phone again
      if (isRegistered) {
        try {
          await webSocketService.registerPhone(cardToken);
          setPhoneRegistered(true);
          console.log("📱 Phone auto-registered after WebSocket reconnection");
        } catch (error) {
          console.error("❌ Auto phone registration failed:", error);
          setPhoneRegistered(false);
        }
      }
    } catch (error) {
      console.error("❌ WebSocket connection failed:", error);
      setIsWebSocketConnected(false);
      setPhoneRegistered(false);
    }
  };

  const checkRegistration = async () => {
    try {
      // Test SecureStore availability first
      const isSecureStoreWorking = await CryptoService.testSecureStore();
      console.log("🔐 SecureStore test result:", isSecureStoreWorking);

      if (!isSecureStoreWorking) {
        console.warn("⚠️ SecureStore not working properly on this platform");
        Alert.alert(
          "Storage Issue",
          "Secure storage is not available. This may affect key persistence on iOS."
        );
      }

      const key = await CryptoService.getPublicKey();
      setPublicKey(key);
      setIsRegistered(true);
    } catch (error) {
      console.log("Device not registered yet:", error);
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
              accuracy: Accuracy.High, // High accuracy but faster than BestForNavigation
              maximumAge: 3000, // 3 seconds - fresh but not too restrictive
              timeout: 8000, // 8 seconds - reasonable timeout
            } as any);
            setLocation({
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
            });
            setLocationUpdateCount((prev) => prev + 1);
            console.log(
              `📍 Location updated: ${pos.coords.latitude.toFixed(
                8
              )}, ${pos.coords.longitude.toFixed(8)} (Update #${
                locationUpdateCount + 1
              })`
            );
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
      setLocationUpdateCount((prev) => prev + 1);
      console.log(
        `📍 Location fallback used (Update #${locationUpdateCount + 1})`
      );
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
        setPublicKey(keyPair.publicKey);
        setIsRegistered(true);

        // Register with WebSocket
        if (isWebSocketConnected) {
          try {
            await webSocketService.registerPhone(cardToken);
            console.log("📱 Phone registered with WebSocket successfully");
            setPhoneRegistered(true);
          } catch (error) {
            console.error("❌ Failed to register phone with WebSocket:", error);
            setPhoneRegistered(false);
            Alert.alert(
              "WebSocket Registration Failed",
              "Device registered but phone registration failed. Please try reconnecting."
            );
          }
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

  const retryPhoneRegistration = async () => {
    console.log("📱 Retry phone registration called");
    console.log("📱 WebSocket connected:", isWebSocketConnected);
    console.log("📱 Device registered:", isRegistered);
    console.log("📱 Card token:", cardToken);

    if (!isWebSocketConnected || !isRegistered) {
      Alert.alert(
        "Error",
        "Please ensure WebSocket is connected and device is registered first"
      );
      return;
    }

    setIsLoading(true);
    try {
      console.log("📱 Calling webSocketService.registerPhone...");
      await webSocketService.registerPhone(cardToken);
      setPhoneRegistered(true);
      console.log("📱 Phone registration retry successful");
      Alert.alert("Success", "Phone registered successfully!");
    } catch (error) {
      console.error("❌ Phone registration retry failed:", error);
      setPhoneRegistered(false);
      Alert.alert(
        "Registration Failed",
        "Failed to register phone: " +
          (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#ffffff", dark: "#FFFFFF" }}
      headerImage={
        <Image
          source={require("@/assets/images/logo.jpeg")}
          style={styles.logo}
        />
      }
    >
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
        <View style={styles.locationHeader}>
          <Text style={styles.cardTitle}>Location (Live Updates)</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={getCurrentLocation}
          >
            <Text style={styles.refreshButtonText}>🔄</Text>
          </TouchableOpacity>
        </View>
        {location ? (
          <>
            <Text style={styles.locationText}>
              📍 {location.lat.toFixed(8)}, {location.lon.toFixed(8)}
            </Text>
            <Text style={styles.updateInfo}>
              Updates every 5 seconds • Count: {locationUpdateCount}
            </Text>
          </>
        ) : (
          <Text style={styles.locationText}>📍 Location not available</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Connection Status</Text>
        <Text style={styles.statusText}>
          🔌 WebSocket:{" "}
          {isWebSocketConnected ? "✅ Connected" : "❌ Disconnected"}
        </Text>
        <Text style={styles.statusText}>
          📱 Phone: {phoneRegistered ? "✅ Registered" : "❌ Not Registered"}
        </Text>
        <Text style={styles.statusText}>
          🔐 Device: {isRegistered ? "✅ Registered" : "❌ Not Registered"}
        </Text>
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

      {isRegistered && isWebSocketConnected && !phoneRegistered && (
        <TouchableOpacity
          style={[styles.button, styles.buttonWarning]}
          onPress={retryPhoneRegistration}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? "Registering..." : "Retry Phone Registration"}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.button, styles.buttonSecondary]}
        onPress={async () => {
          try {
            const isWorking = await CryptoService.testSecureStore();
            Alert.alert(
              "Storage Test",
              `SecureStore is ${isWorking ? "working" : "not working"} on ${
                Platform.OS
              }`
            );
          } catch (error) {
            Alert.alert("Storage Test Failed", String(error));
          }
        }}
      >
        <Text style={styles.buttonText}>Test Storage</Text>
      </TouchableOpacity>

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
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 17, // 15% smaller (20 -> 17)
  },
  header: {
    alignItems: "center",
    marginBottom: 26, // 15% smaller (30 -> 25.5 -> 26)
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4, // 15% smaller (5 -> 4.25 -> 4)
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 10, // 15% smaller (12 -> 10.2 -> 10)
    padding: 17, // 15% smaller (20 -> 17)
    marginBottom: 17, // 15% smaller (20 -> 17)
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
    marginBottom: 9, // 15% smaller (10 -> 8.5 -> 9)
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
  updateInfo: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginTop: 3, // 15% smaller (4 -> 3.4 -> 3)
  },
  statusText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 5,
    fontFamily: "monospace",
  },
  locationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 9, // 15% smaller (10 -> 8.5 -> 9)
  },
  refreshButton: {
    backgroundColor: "#007AFF",
    borderRadius: 17, // 15% smaller (20 -> 17)
    width: 34, // 15% smaller (40 -> 34)
    height: 34, // 15% smaller (40 -> 34)
    justifyContent: "center",
    alignItems: "center",
  },
  refreshButtonText: {
    fontSize: 18,
    color: "white",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 7, // 15% smaller (8 -> 6.8 -> 7)
    padding: 10, // 15% smaller (12 -> 10.2 -> 10)
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  button: {
    backgroundColor: "#007AFF",
    borderRadius: 10, // 15% smaller (12 -> 10.2 -> 10)
    padding: 14, // 15% smaller (16 -> 13.6 -> 14)
    alignItems: "center",
    marginBottom: 13, // 15% smaller (15 -> 12.75 -> 13)
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
  logo: {
    height: 85, // 15% smaller (100 -> 85)
    width: 247, // 15% smaller (290 -> 246.5 -> 247)
    alignSelf: "center",
    marginTop: 43, // 15% smaller (50 -> 42.5 -> 43)
  },
});
