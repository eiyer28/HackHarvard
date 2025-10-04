import React from "react";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

type Props = {
  name: string;
  phone?: string;
  email?: string;
};

export default function User({ name, phone, email }: Props) {
  const background = useThemeColor({}, "background") ?? "#fff";

  return (
    <ThemedView style={[styles.container, { backgroundColor: background }]}>
      <ThemedText type="subtitle" style={styles.name}>
        {name}
      </ThemedText>

      <View style={styles.row}>
        <ThemedText type="default" style={styles.label}>
          Phone
        </ThemedText>
        <ThemedText type="default">{phone ?? "—"}</ThemedText>
      </View>

      <View style={styles.row}>
        <ThemedText type="default" style={styles.label}>
          Email
        </ThemedText>
        <ThemedText type="default">{email ?? "—"}</ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginVertical: 8,
  },
  name: {
    fontSize: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    color: "#666",
  },
});
