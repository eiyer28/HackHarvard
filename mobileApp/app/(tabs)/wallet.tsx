import { Image } from "expo-image";
import { Platform, StyleSheet } from "react-native";

import { Collapsible } from "@/components/ui/collapsible";
import { ExternalLink } from "@/components/external-link";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Fonts } from "@/constants/theme";
import CardInfo from "@/components/cardInfo";

export default function Wallet() {
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
      <ThemedText type="title">Cards</ThemedText>

      {/* Example card list */}
      <CardInfo
        cardType="Visa"
        cardNumber="4111111111111111"
        cardHolder="Jane Doe"
        expiry="12/26"
        brandColor="#1a73e8"
      />
      <CardInfo
        cardType="Mastercard"
        cardNumber="5555555555554444"
        cardHolder="Jane Doe"
        expiry="09/25"
        brandColor="#ff5f00"
      />
      <CardInfo
        cardType="Amex"
        cardNumber="378282246310005"
        cardHolder="Jane Doe"
        expiry="03/27"
        brandColor="#2ecc71"
      />
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  logo: {
    height: 100,
    width: 290,
    alignSelf: "center",
    marginTop: 50,
  },
  titleContainer: {
    flexDirection: "row",
    gap: 8,
  },
});
