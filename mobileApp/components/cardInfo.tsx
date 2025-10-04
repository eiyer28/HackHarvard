import React, { useState } from "react";
import { StyleSheet, View, Pressable, Modal } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

type Props = {
  cardType: "Visa" | "Mastercard" | "Amex" | string;
  cardNumber: string; // full or masked
  cardHolder?: string;
  expiry?: string; // MM/YY
  brandColor?: string; // optional color for accent
  onPress?: () => void;
};

export function CardInfo({
  cardType,
  cardNumber,
  cardHolder,
  expiry,
  brandColor
}: Props) {
  const [visible, setVisible] = useState(false);
  const background = useThemeColor({}, "background") ?? "#fff";
  const accent = brandColor ?? "#1E90FF";

  const maskedNumber = maskCardNumber(cardNumber);

  const content = (
    <ThemedView style={[styles.card, { backgroundColor: background }]}>
      <View style={styles.row}>
        <ThemedText type="subtitle" style={[styles.type, { color: accent }]}>
          {cardType}
        </ThemedText>
        <ThemedText type="defaultSemiBold">{maskedNumber}</ThemedText>
      </View>

      <View style={styles.row}>
        <ThemedText type="default">{cardHolder ?? "Cardholder"}</ThemedText>
        <ThemedText type="default">{expiry ?? "MM/YY"}</ThemedText>
      </View>
    </ThemedView>
  );

  return (
    <>
      <Pressable onPress={() => setVisible(true)} accessibilityRole="button">
        {content}
      </Pressable>

      <Modal visible={visible} animationType="slide" transparent>
        <ThemedView style={styles.modalOverlay}>
          <ThemedView
            style={[styles.modalContent, { backgroundColor: background }]}
          >
            <ThemedText type="title">{cardType} Card</ThemedText>
            <ThemedText style={styles.fullNumber} type="defaultSemiBold">
              {formatCardNumber(cardNumber)}
            </ThemedText>
            <View style={styles.row}>
              <ThemedText type="default">Holder</ThemedText>
              <ThemedText type="default">
                {cardHolder ?? "Cardholder"}
              </ThemedText>
            </View>
            <View style={styles.row}>
              <ThemedText type="default">Expiry</ThemedText>
              <ThemedText type="default">{expiry ?? "MM/YY"}</ThemedText>
            </View>

            <Pressable
              onPress={() => setVisible(false)}
              style={styles.closeButton}
              accessibilityRole="button"
            >
              <ThemedText type="subtitle">Close</ThemedText>
            </Pressable>
          </ThemedView>
        </ThemedView>
      </Modal>
    </>
  );
}

function maskCardNumber(num: string) {
  // keep last 4 digits visible
  const digits = num.replace(/\s+/g, "");
  if (digits.length <= 4) return digits;
  const last4 = digits.slice(-4);
  return "•••• •••• •••• " + last4;
}

function formatCardNumber(num: string) {
  const digits = num.replace(/\s+/g, "");
  // group into 4s for display
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

const styles = StyleSheet.create({
  card: {
    width: "90%",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginVertical: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  type: {
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 16,
  },
  modalContent: {
    width: "95%",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  fullNumber: {
    fontSize: 20,
    marginVertical: 12,
  },
  closeButton: {
    marginTop: 12,
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
});

export default CardInfo;
