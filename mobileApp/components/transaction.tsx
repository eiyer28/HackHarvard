import React, { useState } from "react";
import { StyleSheet, View, Pressable, Modal } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

type Props = {
  card: string; // e.g. "Visa 4111111111111111" or "Visa •••• 1111"
  date: string; // ISO or display string
  location?: string;
  amount?: string; // optional display amount like "$12.34"
  onPress?: () => void;
};

export function Transaction({ card, date, location, amount }: Props) {
  const [visible, setVisible] = useState(false);
  const background = useThemeColor({}, "background") ?? "#fff";

  const { cardLabel, cardNumberRaw } = parseCard(card);
  const masked = maskCardNumber(cardNumberRaw);

  return (
    <>
      <Pressable onPress={() => setVisible(true)} accessibilityRole="button">
        <ThemedView style={[styles.container, { backgroundColor: background }]}>
          <View style={styles.leftColumn}>
            {/* Location on top */}
            <ThemedText type="subtitle" style={styles.location}>
              {location ?? "Unknown location"}
            </ThemedText>

            {/* Card info below location */}
            <View style={styles.cardInfo}>
              <ThemedText type="subtitle" style={styles.cardLabel}>
                {cardLabel}
              </ThemedText>
              <ThemedText
                type="defaultSemiBold"
                style={styles.masked}
                numberOfLines={1}
              >
                {masked}
              </ThemedText>
            </View>
          </View>

          {/* Date and amount on the right */}
          <View style={styles.rightColumn}>
            {amount ? (
              <ThemedText type="defaultSemiBold" style={styles.amount}>
                {amount}
              </ThemedText>
            ) : null}
            <ThemedText type="default" style={styles.date}>
              {date}
            </ThemedText>
          </View>
        </ThemedView>
      </Pressable>

      <Modal visible={visible} animationType="slide" transparent>
        <ThemedView style={styles.modalOverlay}>
          <ThemedView
            style={[styles.modalContent, { backgroundColor: background }]}
          >
            <ThemedText type="title">{cardLabel} Transaction</ThemedText>

            <ThemedText
              type="defaultSemiBold"
              style={styles.fullCard}
              numberOfLines={1}
            >
              {formatCardNumber(cardNumberRaw)}
            </ThemedText>

            <View style={styles.detailRow}>
              <ThemedText type="default">Location</ThemedText>
              <ThemedText type="default">{location ?? "—"}</ThemedText>
            </View>

            <View style={styles.detailRow}>
              <ThemedText type="default">Date</ThemedText>
              <ThemedText type="default">{date}</ThemedText>
            </View>

            <View style={styles.detailRow}>
              <ThemedText type="default">Amount</ThemedText>
              <ThemedText type="default">{amount ?? "—"}</ThemedText>
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

function parseCard(card: string) {
  // Allow inputs like "Visa 4111111111111111" or "Visa •••• 1111"
  const parts = card.split(" ");
  const label = parts[0] ?? "Card";
  const maybeNumber = parts.slice(1).join(" ");
  // extract digits if present
  const digits = (maybeNumber.match(/\d+/g) || []).join("");
  return { cardLabel: label, cardNumberRaw: digits || maybeNumber };
}

function maskCardNumber(num: string) {
  const digits = (num || "").replace(/\s+/g, "");
  if (!digits) return num;
  if (digits.length <= 4) return digits;
  const last4 = digits.slice(-4);
  const nbsp = "\u00A0";
  return `••••${nbsp}••••${nbsp}••••${nbsp}${last4}`;
}

function formatCardNumber(num: string) {
  const digits = (num || "").replace(/\s+/g, "");
  if (!digits) return num;
  const groups = digits.match(/.{1,4}/g) || [];
  return groups.join("\u00A0");
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginVertical: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  leftColumn: {
    flex: 1,
    paddingRight: 12,
  },
  rightColumn: {
    width: 120,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  location: {
    fontSize: 14,
    marginBottom: 8,
  },
  cardInfo: {
    // stacked card label and masked number
  },
  cardLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  masked: {
    fontSize: 16,
    flexShrink: 0, // prevent break
  },
  amount: {
    fontSize: 16,
    marginBottom: 6,
  },
  date: {
    color: "#666",
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
  fullCard: {
    fontSize: 18,
    marginVertical: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  closeButton: {
    marginTop: 12,
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
});

export default Transaction;
