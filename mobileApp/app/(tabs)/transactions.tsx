import { Image } from "expo-image";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";

import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import Transaction from "@/components/transaction";

export default function Transactions() {
  const initialTransactions = [
    {
      id: "t1",
      cardType: "Visa",
      cardNumber: "4111111111111111",
      date: "2025-09-01",
      location: "Coffee Shop",
      amount: "$4.50",
    },
    {
      id: "t2",
      cardType: "Mastercard",
      cardNumber: "5555555555554444",
      date: "2025-08-28",
      location: "Grocery Store",
      amount: "$72.12",
    },
    {
      id: "t3",
      cardType: "Amex",
      cardNumber: "378282246310005",
      date: "2025-08-20",
      location: "Online Purchase",
      amount: "$19.99",
    },
  ];

  const [transactions, setTransactions] = useState(initialTransactions);

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
      <ThemedText type="title">Transactions</ThemedText>

      <View style={styles.list}>
        {transactions.map((t) => (
          <Transaction
            key={t.id}
            card={`${t.cardType} ${t.cardNumber}`}
            date={t.date}
            location={t.location}
            amount={t.amount}
          />
        ))}
      </View>
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
  list: {
    width: "100%",
    paddingHorizontal: 16,
    marginTop: 8,
    alignItems: "stretch",
  },
});
