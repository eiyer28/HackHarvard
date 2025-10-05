import * as React from "react";
import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
} from "react-native";
import { useCards } from "../src/contexts/CardContext";

interface CardDropdownProps {
  onCardSelect?: (cardNumber: string) => void;
}

export const CardDropdown: React.FC<CardDropdownProps> = ({ onCardSelect }) => {
  const { cards, selectedCardIndex, setSelectedCardIndex, selectedCard } =
    useCards();
  const [isOpen, setIsOpen] = useState(false);

  const handleCardSelect = (index: number) => {
    setSelectedCardIndex(index);
    setIsOpen(false);
    if (onCardSelect && cards[index]) {
      onCardSelect(cards[index].cardNumber);
    }
  };

  const formatCardNumber = (cardNumber: string) => {
    // Format card number to show only last 4 digits
    const lastFour = cardNumber.slice(-4);
    return `**** **** **** ${lastFour}`;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => setIsOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Select card"
      >
        <View style={styles.dropdownContent}>
          <View style={styles.cardInfo}>
            <Text style={styles.cardType}>{selectedCard?.cardType}</Text>
            <Text style={styles.cardNumber}>
              {selectedCard
                ? formatCardNumber(selectedCard.cardNumber)
                : "Select a card"}
            </Text>
          </View>
          <Text style={styles.arrow}>▼</Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.modalContent}>
            <ScrollView style={styles.scrollView}>
              <Text style={styles.modalTitle}>Select Card</Text>
              {cards.map((card, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.cardOption,
                    index === selectedCardIndex && styles.selectedCardOption,
                  ]}
                  onPress={() => handleCardSelect(index)}
                >
                  <View style={styles.cardOptionContent}>
                    <View style={styles.cardOptionHeader}>
                      <Text style={styles.cardOptionType}>{card.cardType}</Text>
                      <View
                        style={[
                          styles.colorIndicator,
                          { backgroundColor: card.brandColor },
                        ]}
                      />
                    </View>
                    <Text style={styles.cardOptionNumber}>
                      {formatCardNumber(card.cardNumber)}
                    </Text>
                    <Text style={styles.cardOptionHolder}>
                      {card.cardHolder}
                    </Text>
                    <Text style={styles.cardOptionExpiry}>
                      Expires: {card.expiry}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  dropdown: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 7,
    backgroundColor: "#f9f9f9",
    minHeight: 50,
    justifyContent: "center",
  },
  dropdownContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardType: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  cardNumber: {
    fontSize: 16,
    color: "#666",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  arrow: {
    fontSize: 12,
    color: "#666",
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    maxHeight: "80%",
    width: "100%",
    maxWidth: 400,
  },
  scrollView: {
    maxHeight: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  cardOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  selectedCardOption: {
    backgroundColor: "#f0f8ff",
  },
  cardOptionContent: {
    flex: 1,
  },
  cardOptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cardOptionType: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  colorIndicator: {
    width: 20,
    height: 12,
    borderRadius: 2,
  },
  cardOptionNumber: {
    fontSize: 16,
    color: "#666",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginBottom: 2,
  },
  cardOptionHolder: {
    fontSize: 14,
    color: "#888",
    marginBottom: 2,
  },
  cardOptionExpiry: {
    fontSize: 12,
    color: "#999",
  },
});
