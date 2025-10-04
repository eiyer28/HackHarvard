import { Image } from "expo-image";
import { Platform, StyleSheet } from "react-native";

import { HelloWave } from "@/components/hello-wave";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useNavigation } from "@react-navigation/native";
import { Link } from "expo-router";

export default function HomeScreen() {
  const navigation = useNavigation();

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "white", dark: "white" }}
      headerImage={
        <Image
          source={require("@/assets/images/logo.jpeg")}
          style={styles.logo}
        />
      }
    >
      <ThemedText style={styles.title} type="title">
        Welcome!
      </ThemedText>

      {/* Buttons grid: each button navigates to a route/tab */}
      <ThemedView style={styles.buttonsGrid}>
        <Link href="/wallet" asChild>
          <ThemedView style={styles.button} accessibilityRole="button">
            <ThemedText type="subtitle">Wallet</ThemedText>
          </ThemedView>
        </Link>
        <Link href="/transactions" asChild>
          <ThemedView style={styles.button} accessibilityRole="button">
            <ThemedText type="subtitle">Past Transactions</ThemedText>
          </ThemedView>
        </Link>
        <Link href="/users" asChild>
          <ThemedView style={styles.button} accessibilityRole="button">
            <ThemedText type="subtitle">Authorized Users</ThemedText>
          </ThemedView>
        </Link>
        <ThemedText type="subtitle" style={styles.moreSoon}>
          And more features coming soon!
        </ThemedText>
        {/* Add more buttons/routes as needed */}
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  logo: {
    height: 100,
    width: 290,
    alignSelf: "center",
    marginTop: 50,
  },
  title: {
    textAlign: "center",
    marginBottom: 12,
  },
  buttonsGrid: {
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "center",
    width: "100%",
    marginBottom: 16,
  },
  button: {
    width: "90%",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    marginVertical: 6,
  },
  moreSoon: {
    marginTop: 20,
  },
});
