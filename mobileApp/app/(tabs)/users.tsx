import { Image } from "expo-image";
import React, { useState } from "react";
import { StyleSheet, View, Modal, TextInput, Pressable } from "react-native";

import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import User from "@/components/user";

export default function Users() {
  const initialUsers = [
    {
      id: "u1",
      name: "Jane Doe",
      phone: "+1 (555) 111-2222",
      email: "jane@example.com",
    },
    {
      id: "u2",
      name: "John Smith",
      phone: "+1 (555) 333-4444",
      email: "john@example.com",
    },
    {
      id: "u3",
      name: "Alex Johnson",
      phone: "+1 (555) 555-6666",
      email: "alex@example.com",
    },
  ];

  const [users, setUsers] = useState(initialUsers);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });

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
      <ThemedText type="title">Users</ThemedText>

      <Pressable
        style={styles.addButton}
        onPress={() => setAdding(true)}
        accessibilityRole="button"
      >
        <ThemedText type="subtitle">+ Add User</ThemedText>
      </Pressable>

      <View style={styles.list}>
        {users.map((u) => (
          <User key={u.id} name={u.name} phone={u.phone} email={u.email} />
        ))}
      </View>

      <Modal visible={adding} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalInner}>
            <ThemedText type="title">Add a new user</ThemedText>

            <TextInput
              placeholder="Name"
              value={form.name}
              onChangeText={(t) => setForm({ ...form, name: t })}
              style={styles.input}
            />
            <TextInput
              placeholder="Phone"
              value={form.phone}
              onChangeText={(t) => setForm({ ...form, phone: t })}
              keyboardType="phone-pad"
              style={styles.input}
            />
            <TextInput
              placeholder="Email"
              value={form.email}
              onChangeText={(t) => setForm({ ...form, email: t })}
              keyboardType="email-address"
              style={styles.input}
              autoCapitalize="none"
            />

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalButton}
                onPress={() => {
                  if (!form.name) return setAdding(false);
                  setUsers((prev) => [
                    ...prev,
                    {
                      id: `u${Date.now()}`,
                      name: form.name,
                      phone: form.phone || "",
                      email: form.email || "",
                    },
                  ]);
                  setForm({ name: "", phone: "", email: "" });
                  setAdding(false);
                }}
                accessibilityRole="button"
              >
                <ThemedText type="subtitle">Add</ThemedText>
              </Pressable>

              <Pressable
                style={styles.modalButton}
                onPress={() => setAdding(false)}
                accessibilityRole="button"
              >
                <ThemedText type="subtitle">Cancel</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  addButton: {
    width: "90%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    marginVertical: 8,
    alignSelf: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 16,
  },
  modalInner: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
  },
  input: {
    width: "100%",
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginTop: 8,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
});
