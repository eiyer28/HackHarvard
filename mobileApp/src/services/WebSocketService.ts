import { io, Socket } from "socket.io-client";
import { LocationProofService } from "./LocationProofService";

export interface TransactionRequest {
  transaction_id: string;
  transaction_nonce: string;
  pos_location: {
    lat: number;
    lon: number;
  };
  amount: number;
  merchant_name: string;
}

export interface LocationProofResponse {
  transaction_id: string;
  location_proof: any;
}

class WebSocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private cardToken: string | null = null;

  connect(serverUrl: string = "http://localhost:5000"): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(serverUrl, {
          transports: ["websocket", "polling"],
          timeout: 20000,
        });

        this.socket.on("connect", () => {
          console.log("🔌 Connected to ProxyPay server");
          this.isConnected = true;
          resolve();
        });

        this.socket.on("disconnect", () => {
          console.log("🔌 Disconnected from ProxyPay server");
          this.isConnected = false;
        });

        this.socket.on("error", (error) => {
          console.error("🔌 WebSocket error:", error);
          reject(error);
        });

        this.socket.on("connected", (data) => {
          console.log("🔌 Server message:", data.message);
        });

        this.socket.on("registered", (data) => {
          console.log("📱 Phone registered:", data.message);
        });

        this.socket.on("location_proof_request", (data: TransactionRequest) => {
          console.log("📱 Location proof requested:", data);
          this.handleLocationProofRequest(data);
        });

        this.socket.on("error", (data) => {
          console.error("🔌 Server error:", data.message);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  registerPhone(cardToken: string): void {
    if (!this.socket || !this.isConnected) {
      console.error("❌ WebSocket not connected");
      return;
    }

    this.cardToken = cardToken;
    this.socket.emit("register_phone", { card_token: cardToken });
    console.log("📱 Registering phone for card:", cardToken);
  }

  private async handleLocationProofRequest(
    request: TransactionRequest
  ): Promise<void> {
    try {
      console.log("📱 Processing location proof request...");

      // Create location proof directly (bypass HTTP API)
      const locationProof = await this.createLocationProof(request);

      console.log("📱 Location proof created:", locationProof);

      // Send the location proof response back to server
      if (this.socket && this.isConnected) {
        this.socket.emit("location_proof_response", {
          transaction_id: request.transaction_id,
          location_proof: locationProof,
        });
        console.log("📱 Location proof sent to server");
      }
    } catch (error) {
      console.error("❌ Error processing location proof request:", error);

      // Send error response
      if (this.socket && this.isConnected) {
        this.socket.emit("location_proof_response", {
          transaction_id: request.transaction_id,
          location_proof: null,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private async createLocationProof(request: TransactionRequest): Promise<any> {
    // Import services
    const { CryptoService } = await import("./CryptoService");
    const { AttestationService } = await import("./AttestationService");
    const { LocationProofService } = await import("./LocationProofService");

    // Get current phone location - this should be the real GPS location
    const location = await LocationProofService.getCurrentLocation();

    // Generate attestation
    const attestation = await AttestationService.generateAttestation();

    // Create location proof object
    const locationProof = {
      card_token: this.cardToken!,
      transaction_nonce: request.transaction_nonce,
      transaction_id: request.transaction_id,
      location: {
        lat: location.lat,
        lon: location.lon,
      },
      timestamp: new Date().toISOString(),
      attestation: attestation.attestation_token,
    };

    // Sign the location proof
    const signature = await CryptoService.signLocationProof(locationProof);

    return {
      ...locationProof,
      signature: signature,
    };
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  getCardToken(): string | null {
    return this.cardToken;
  }
}

export const webSocketService = new WebSocketService();
