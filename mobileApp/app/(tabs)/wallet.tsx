import { Image } from "react-native";
import * as React from "react";
import { useState } from "react";
import {
  Platform,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  View,
} from "react-native";
import { useCards } from "../../src/contexts/CardContext";

import { Collapsible } from "@/components/ui/collapsible";
import { ExternalLink } from "@/components/external-link";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Fonts } from "@/constants/theme";
import CardInfo from "@/components/cardInfo";

export default function Wallet() {
  const { cards, addCard } = useCards();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    cardType: "",
    cardNumber: "",
    cardHolder: "",
    expiry: "",
    brandColor: "",
  });
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

      <Pressable
        style={styles.addButton}
        onPress={() => setAdding(true)}
        accessibilityRole="button"
      >
        <ThemedText type="subtitle">+ Add Card</ThemedText>
      </Pressable>

      {/* Render cards from state */}
      {cards.map((c, idx) => (
        <CardInfo
          key={idx}
          cardType={c.cardType}
          cardNumber={c.cardNumber}
          cardHolder={c.cardHolder}
          expiry={c.expiry}
          brandColor={c.brandColor}
          onPress={() => {
            /* keep current behavior: show modal inside CardInfo */
          }}
        />
      ))}

      {/* Add card modal */}
      <Modal visible={adding} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalInner}>
            <ThemedText type="title">Add a new card</ThemedText>
            <TextInput
              placeholder="Card Type (Visa, Mastercard)"
              placeholderTextColor="#666666"
              value={form.cardType}
              onChangeText={(t: string) => setForm({ ...form, cardType: t })}
              style={styles.input}
            />
            <TextInput
              placeholder="Card Number"
              placeholderTextColor="#666666"
              value={form.cardNumber}
              onChangeText={(t: string) => setForm({ ...form, cardNumber: t })}
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              placeholder="Cardholder Name"
              placeholderTextColor="#666666"
              value={form.cardHolder}
              onChangeText={(t: string) => setForm({ ...form, cardHolder: t })}
              style={styles.input}
            />
            <TextInput
              placeholder="Expiry (MM/YY)"
              placeholderTextColor="#666666"
              value={form.expiry}
              onChangeText={(t: string) => setForm({ ...form, expiry: t })}
              style={styles.input}
            />
            <TextInput
              placeholder="Brand color (hex)"
              placeholderTextColor="#666666"
              value={form.brandColor}
              onChangeText={(t: string) => setForm({ ...form, brandColor: t })}
              style={styles.input}
            />

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalButton}
                onPress={() => {
                  // simple validation
                  if (!form.cardNumber || !form.cardType)
                    return setAdding(false);
                  addCard({
                    cardType: form.cardType || "Card",
                    cardNumber: form.cardNumber || "",
                    cardHolder: form.cardHolder || "Cardholder",
                    expiry: form.expiry || "MM/YY",
                    brandColor: form.brandColor || "#666",
                  });
                  setForm({
                    cardType: "",
                    cardNumber: "",
                    cardHolder: "",
                    expiry: "",
                    brandColor: "",
                  });
                  setAdding(false);
                }}
                accessibilityRole="button"
              >
                <ThemedText type="subtitle">Add</ThemedText>
              </Pressable>

              <Pressable
                style={styles.modalButton}
                onPress={() => setAdding(false)}
                accessibilityRole="button"
              >
                <ThemedText type="subtitle">Cancel</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  title: {
    textAlign: "center",
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addButton: {
    width: "90%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    marginVertical: 8,
    alignSelf: "center", // centered horizontally
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 16,
  },
  modalInner: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
  },
  input: {
    width: "100%",
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginTop: 8,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
});
