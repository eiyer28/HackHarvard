export interface Transaction {
  id: string;
  card_token: string;
  amount: number;
  merchant_name: string;
  timestamp: string;
  completed_at: string;
  status: string;
  result: {
    success: boolean;
    result: string;
    reason: string;
    distance_meters?: number;
  };
  pos_location?: {
    lat: number;
    lon: number;
  };
}

export interface TransactionHistoryResponse {
  transactions: Transaction[];
  total: number;
  card_token: string;
}

export class TransactionService {
  private static readonly BASE_URL = "http://3.17.71.163:5000/api";

  /**
   * Fetch transaction history for a specific card
   */
  static async getTransactionHistory(
    cardToken: string,
    limit: number = 50
  ): Promise<TransactionHistoryResponse> {
    try {
      console.log(`📱 Fetching transaction history for card: ${cardToken}`);

      const response = await fetch(
        `${this.BASE_URL}/transactions/history?card_token=${encodeURIComponent(
          cardToken
        )}&limit=${limit}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`📱 Received ${data.transactions.length} transactions`);

      return data;
    } catch (error) {
      console.error("❌ Error fetching transaction history:", error);
      throw error;
    }
  }

  /**
   * Format transaction for display
   */
  static formatTransaction(transaction: Transaction) {
    const date = new Date(transaction.timestamp);
    const formattedDate = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const formattedTime = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Extract card type from card number
    const cardNumber = transaction.card_token;
    let cardType = "Unknown";
    if (cardNumber.startsWith("4")) {
      cardType = "Visa";
    } else if (cardNumber.startsWith("5")) {
      cardType = "Mastercard";
    } else if (cardNumber.startsWith("3")) {
      cardType = "Amex";
    }

    // Format amount
    const formattedAmount = `$${transaction.amount.toFixed(2)}`;

    // Determine transaction status
    let statusIcon = "✅";
    let statusText = "Approved";

    if (transaction.result) {
      if (transaction.result.result === "ACCEPT") {
        statusIcon = "✅";
        statusText = "Approved";
      } else if (transaction.result.result === "DENY") {
        statusIcon = "❌";
        statusText = "Denied";
      } else if (transaction.result.result === "CONFIRM_REQUIRED") {
        statusIcon = "⚠️";
        statusText = "Confirmed";
      }
    }

    return {
      id: transaction.id,
      cardType,
      cardNumber: transaction.card_token,
      date: formattedDate,
      time: formattedTime,
      location: transaction.merchant_name,
      amount: formattedAmount,
      statusIcon,
      statusText,
      result: transaction.result,
    };
  }

  /**
   * Get transaction status color for UI
   */
  static getStatusColor(result: Transaction["result"]): string {
    if (!result) return "#666";

    switch (result.result) {
      case "ACCEPT":
        return "#34C759"; // Green
      case "DENY":
        return "#FF3B30"; // Red
      case "CONFIRM_REQUIRED":
        return "#FF9500"; // Orange
      default:
        return "#666"; // Gray
    }
  }
}
