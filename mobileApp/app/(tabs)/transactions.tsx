import * as React from "react";
import { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  RefreshControl,
  ScrollView,
  Alert,
  Image,
} from "react-native";

import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import Transaction from "@/components/transaction";
import {
  TransactionService,
  Transaction as TransactionType,
} from "../../src/services/TransactionService";
import { useCards } from "../../src/contexts/CardContext";
import { webSocketService } from "../../src/services/WebSocketService";

export default function Transactions() {
  const { selectedCard } = useCards();
  const [transactions, setTransactions] = useState<TransactionType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch transactions from server
  const fetchTransactions = async (showLoading = true) => {
    if (!selectedCard) {
      setError("No card selected");
      setIsLoading(false);
      return;
    }

    try {
      if (showLoading) {
        setIsLoading(true);
      }
      setError(null);

      console.log(
        `📱 Fetching transactions for card: ${selectedCard.cardNumber}`
      );
      const response = await TransactionService.getTransactionHistory(
        selectedCard.cardNumber
      );

      console.log(`📱 Received ${response.transactions.length} transactions`);
      setTransactions(response.transactions);
    } catch (error) {
      console.error("❌ Error fetching transactions:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch transactions"
      );

      // Show fallback demo transactions if server is unavailable
      const demoTransactions = [
        {
          id: "demo1",
          card_token: selectedCard.cardNumber,
          amount: 4.5,
          merchant_name: "Coffee Shop",
          timestamp: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          status: "completed",
          result: {
            success: true,
            result: "ACCEPT",
            reason: "Demo transaction",
          },
        },
        {
          id: "demo2",
          card_token: selectedCard.cardNumber,
          amount: 72.12,
          merchant_name: "Grocery Store",
          timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          completed_at: new Date(Date.now() - 86400000).toISOString(),
          status: "completed",
          result: {
            success: true,
            result: "ACCEPT",
            reason: "Demo transaction",
          },
        },
      ];
      setTransactions(demoTransactions);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchTransactions();
  }, [selectedCard]);

  // Handle pull-to-refresh
  const onRefresh = () => {
    setIsRefreshing(true);
    fetchTransactions(false);
  };

  // Listen for new transactions via WebSocket
  useEffect(() => {
    const handleNewTransaction = (event: any) => {
      console.log("📱 New transaction completed, refreshing list...", event);
      // Refresh the transaction list when a new transaction is completed
      fetchTransactions(false);
    };

    // Set up WebSocket listener for new transactions
    webSocketService.setTransactionCompletedCallback(handleNewTransaction);

    // Also set up a fallback interval in case WebSocket events are missed
    const interval = setInterval(() => {
      fetchTransactions(false);
    }, 60000); // Refresh every 60 seconds as fallback

    return () => {
      webSocketService.setTransactionCompletedCallback(() => {});
      clearInterval(interval);
    };
  }, [selectedCard]);

  // Format transactions for display
  const formattedTransactions = transactions.map(
    TransactionService.formatTransaction
  );

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

      {selectedCard && (
        <ThemedText style={styles.cardInfo}>
          Card: {selectedCard.cardType} •••• {selectedCard.cardNumber.slice(-4)}
        </ThemedText>
      )}

      {error && <ThemedText style={styles.errorText}>⚠️ {error}</ThemedText>}

      <View style={styles.list}>
        {isLoading ? (
          <ThemedText style={styles.loadingText}>
            Loading transactions...
          </ThemedText>
        ) : formattedTransactions.length === 0 ? (
          <ThemedText style={styles.emptyText}>
            No transactions found
          </ThemedText>
        ) : (
          formattedTransactions.map((t) => (
            <Transaction
              key={t.id}
              card={`${t.cardType} •••• ${t.cardNumber.slice(-4)}`}
              date={t.date}
              location={t.location}
              amount={t.amount}
              status={t.statusIcon}
            />
          ))
        )}
      </View>

      {formattedTransactions.length > 0 && (
        <ThemedText style={styles.footerText}>
          {formattedTransactions.length} transaction
          {formattedTransactions.length !== 1 ? "s" : ""} • Pull down to refresh
        </ThemedText>
      )}
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
  cardInfo: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
    fontFamily: "monospace",
  },
  list: {
    width: "100%",
    paddingHorizontal: 16,
    marginTop: 8,
    alignItems: "stretch",
  },
  loadingText: {
    textAlign: "center",
    color: "#666",
    fontSize: 16,
    marginTop: 20,
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
    fontSize: 16,
    marginTop: 20,
    fontStyle: "italic",
  },
  errorText: {
    textAlign: "center",
    color: "#FF3B30",
    fontSize: 14,
    marginBottom: 16,
    backgroundColor: "#FFE5E5",
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
  },
  footerText: {
    textAlign: "center",
    color: "#999",
    fontSize: 12,
    marginTop: 16,
    marginBottom: 8,
    fontStyle: "italic",
  },
});
