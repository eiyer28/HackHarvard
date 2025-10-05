import * as React from "react";
import { createContext, useContext, useState, ReactNode } from "react";

export interface Card {
  cardType: string;
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  brandColor: string;
}

interface CardContextType {
  cards: Card[];
  setCards: (cards: Card[]) => void;
  addCard: (card: Card) => void;
  selectedCardIndex: number;
  setSelectedCardIndex: (index: number) => void;
  selectedCard: Card | null;
}

const CardContext = createContext<CardContextType | undefined>(undefined);

export const useCards = () => {
  const context = useContext(CardContext);
  if (context === undefined) {
    throw new Error("useCards must be used within a CardProvider");
  }
  return context;
};

interface CardProviderProps {
  children: ReactNode;
}

export const CardProvider: React.FC<CardProviderProps> = ({ children }) => {
  const initialCards: Card[] = [
    {
      cardType: "Visa",
      cardNumber: "4111111111111111",
      cardHolder: "Jane Doe",
      expiry: "12/26",
      brandColor: "#1a73e8",
    },
    {
      cardType: "Mastercard",
      cardNumber: "5555555555554444",
      cardHolder: "Jane Doe",
      expiry: "09/25",
      brandColor: "#ff5f00",
    },
    {
      cardType: "Amex",
      cardNumber: "378282246310005",
      cardHolder: "Jane Doe",
      expiry: "03/27",
      brandColor: "#2ecc71",
    },
  ];

  const [cards, setCards] = useState<Card[]>(initialCards);
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);

  const addCard = (card: Card) => {
    setCards((prev) => [...prev, card]);
  };

  const selectedCard = cards[selectedCardIndex] || null;

  const value: CardContextType = {
    cards,
    setCards,
    addCard,
    selectedCardIndex,
    setSelectedCardIndex,
    selectedCard,
  };

  return <CardContext.Provider value={value}>{children}</CardContext.Provider>;
};
