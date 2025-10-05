import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import "./App.css";

const API_URL = "http://3.17.71.163:5000/api/transaction/validate";
const WS_URL = "http://localhost:5000";

function App() {
  const [formData, setFormData] = useState({
    cardNumber: "4532-1234-5678-9012",
    merchantName: "Harvard Square Coffee",
    amount: "25.00",
    latitude: "42.3770",
    longitude: "-71.1167",
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [locationError, setLocationError] = useState(false);
  const [socket, setSocket] = useState(null);
  const [currentTransactionId, setCurrentTransactionId] = useState(null);

  useEffect(() => {
    // Initialize WebSocket connection
    const newSocket = io(WS_URL);

    newSocket.on("connect", () => {
      console.log("Connected to ProxyPay server");
    });

    newSocket.on("transaction_result", (data) => {
      console.log("Transaction result received:", data);
      handleTransactionResult(data);
    });

    newSocket.on("error", (data) => {
      console.error("WebSocket error:", data);
      showError(data.message);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  const handleTransactionResult = (data) => {
    const result = data.result;
    setLoading(false);

    if (result.success) {
      setResult({
        type: result.result === "ACCEPT" ? "approved" : "denied",
        header:
          result.result === "ACCEPT"
            ? "✓ Transaction Approved"
            : result.result === "CONFIRM_REQUIRED"
            ? "⚠️ Manual Confirmation Required"
            : "✗ Transaction Denied",
        details: {
          result: result.result,
          reason: result.reason,
          distance: result.distance_meters,
        },
      });
    } else {
      setResult({
        type: "denied",
        header: "✗ Transaction Failed",
        details: {
          error: result.reason,
        },
      });
    }
  };

  const showError = (message) => {
    setResult({
      type: "denied",
      header: "Error",
      details: { error: message },
    });
    setLoading(false);
  };

  const setLocation = (lat, lon) => {
    setFormData((prev) => ({
      ...prev,
      latitude: lat.toString(),
      longitude: lon.toString(),
    }));
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        setFormData((prev) => ({
          ...prev,
          latitude: lat.toFixed(8),
          longitude: lon.toFixed(8),
        }));
      },
      (error) => {
        let errorMsg = "Unable to get your location";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg =
              "Location permission denied. Please enable location access in your browser.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = "Location information unavailable.";
            break;
          case error.TIMEOUT:
            errorMsg = "Location request timed out.";
            break;
        }

        alert(errorMsg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Format credit card number with spaces
    if (name === "cardNumber") {
      const formatted = value
        .replace(/\s/g, "")
        .replace(/(.{4})/g, "$1 ")
        .trim()
        .substring(0, 19); // Max length: 4444 4444 4444 4444
      setFormData((prev) => ({
        ...prev,
        [name]: formatted,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const latitude = parseFloat(formData.latitude);
    const longitude = parseFloat(formData.longitude);

    // Validate inputs
    if (isNaN(latitude) || isNaN(longitude)) {
      setLocationError(true);
      return;
    }
    setLocationError(false);

    // Show loading
    setLoading(true);
    setResult(null);

    try {
      // Generate unique transaction ID and nonce
      const transactionId =
        "tx_" + Date.now() + "_" + Math.random().toString(36).substring(2);
      const transactionNonce =
        "nonce_" + Math.random().toString(36).substring(2);

      setCurrentTransactionId(transactionId);

      // Join room for this transaction
      socket.emit("join_room", { room: `pos_${transactionId}` });

      // Request location proof from phone
      socket.emit("request_location_proof", {
        card_token: formData.cardNumber,
        transaction_id: transactionId,
        transaction_nonce: transactionNonce,
        pos_location: {
          lat: parseFloat(latitude.toFixed(8)),
          lon: parseFloat(longitude.toFixed(8)),
        },
        amount: parseFloat(formData.amount),
        merchant_name: formData.merchantName,
      });

      console.log("Location proof requested for transaction:", transactionId);
    } catch (error) {
      console.error("Transaction error:", error);
      showError(
        "Failed to request location proof. Make sure the backend is running on http://localhost:5000"
      );
    }
  };

  return (
    <div className="container">
      <div className="demo-badge">DEMO MODE</div>
      <div className="header-section">
        <img
          src="/assets/proxypaylogo.png"
          alt="ProxyPay Logo"
          className="logo"
        />
        <h1>ProxyPay Transaction Simulator</h1>
      </div>
      <p className="subtitle">Test location-based transaction validation</p>

      {socket && (
        <div className="connection-status">
          <span className="status-dot"></span>
          Connected to server
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="cardNumber">💳 Credit Card Number</label>
          <input
            type="text"
            id="cardNumber"
            name="cardNumber"
            placeholder="Enter any credit card number"
            value={formData.cardNumber}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="merchantName">🏪 Merchant Name</label>
          <input
            type="text"
            id="merchantName"
            name="merchantName"
            placeholder="e.g., Coffee Shop"
            value={formData.merchantName}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="amount">💵 Transaction Amount</label>
          <input
            type="number"
            id="amount"
            name="amount"
            placeholder="0.00"
            step="0.01"
            value={formData.amount}
            onChange={handleInputChange}
          />
        </div>

        <div className="form-group">
          <label>📍 Transaction Location</label>
          <div className="preset-buttons">
            <button
              type="button"
              className="preset-btn"
              onClick={() => setLocation(42.377, -71.1167)}
            >
              Harvard Campus
            </button>
            <button
              type="button"
              className="preset-btn"
              onClick={() => setLocation(42.3736, -71.1097)}
            >
              MIT Campus
            </button>
            <button
              type="button"
              className="preset-btn"
              onClick={() => setLocation(40.7128, -74.006)}
            >
              New York City
            </button>
            <button
              type="button"
              className="preset-btn"
              onClick={() => setLocation(37.7749, -122.4194)}
            >
              San Francisco
            </button>
            <button
              type="button"
              className="preset-btn use-location-btn"
              onClick={useMyLocation}
            >
              📍 Use My Location
            </button>
          </div>
        </div>

        <div className="form-group">
          <div className="location-grid">
            <div>
              <label htmlFor="latitude">Latitude</label>
              <input
                type="number"
                id="latitude"
                name="latitude"
                placeholder="42.3770"
                step="any"
                value={formData.latitude}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label htmlFor="longitude">Longitude</label>
              <input
                type="number"
                id="longitude"
                name="longitude"
                placeholder="-71.1167"
                step="any"
                value={formData.longitude}
                onChange={handleInputChange}
              />
            </div>
          </div>
          {locationError && (
            <div className="error">Please enter valid coordinates</div>
          )}
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          Validate Transaction
        </button>
      </form>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p style={{ marginTop: "10px", color: "#666" }}>
            Processing transaction...
          </p>
        </div>
      )}

      {result && (
        <div className={`result ${result.type}`}>
          <div className="result-header">{result.header}</div>
          <div className="result-details">
            {result.details.result && (
              <>
                <div className="result-detail-item">
                  <span className="result-detail-label">Result:</span>{" "}
                  {result.details.result}
                </div>
                <div className="result-detail-item">
                  <span className="result-detail-label">Reason:</span>{" "}
                  {result.details.reason}
                </div>
                <div className="result-detail-item">
                  <span className="result-detail-label">Distance:</span>{" "}
                  {result.details.distance}m
                </div>
              </>
            )}
            {result.details.error && (
              <div className="result-detail-item">
                <span className="result-detail-label">Error:</span>{" "}
                {result.details.error}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="footer">
        <p>
          Built for HackHarvard 2025 • Securing transactions through location
          intelligence
        </p>
        {currentTransactionId && (
          <p className="transaction-id">
            Transaction ID: <code>{currentTransactionId}</code>
          </p>
        )}
      </div>
    </div>
  );
}

export default App;
