import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { STATES } from "../constants";
import { colors, fonts, radius, spacing } from "../theme";

interface Props {
  visible: boolean;
  onSelect: (state: string) => void;
  onClose: () => void;
}

export default function StatePickerModal({ visible, onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");
  const filtered = STATES.filter((s) =>
    s.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <TextInput
          style={styles.search}
          placeholder="Search state..."
          value={query}
          onChangeText={setQuery}
          autoFocus
        />
        <FlatList
          data={filtered}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => {
                onSelect(item);
                setQuery("");
              }}
            >
              <Ionicons name="location-outline" size={16} color={colors.primary} />
              <Text style={styles.rowText}>{item}</Text>
            </Pressable>
          )}
        />
        <Pressable style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: spacing.lg, backgroundColor: colors.background },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowText: { fontSize: 16, color: colors.text },
  closeButton: { paddingVertical: spacing.md, alignItems: "center" },
  closeText: { color: colors.primary, fontFamily: fonts.semiBold },
});
