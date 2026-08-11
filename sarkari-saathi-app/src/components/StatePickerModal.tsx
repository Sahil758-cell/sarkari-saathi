import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useLanguage } from "../context/LanguageContext";
import { STATES, stateLabel } from "../i18n/options";
import { colors, fonts, radius, spacing } from "../theme";
import { Text } from "./Text";

interface Props {
  visible: boolean;
  onSelect: (state: string) => void;
  onClose: () => void;
}

export default function StatePickerModal({ visible, onSelect, onClose }: Props) {
  const { language, t } = useLanguage();
  const [query, setQuery] = useState("");
  const queryLower = query.trim().toLowerCase();
  const filtered = STATES.filter(
    ([en, hi]) => en.toLowerCase().includes(queryLower) || hi.includes(query.trim())
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <TextInput
          style={styles.search}
          placeholder={t("selectState")}
          value={query}
          onChangeText={setQuery}
          autoFocus
        />
        <FlatList
          data={filtered}
          keyExtractor={([en]) => en}
          renderItem={({ item: [en] }) => (
            <Pressable
              style={styles.row}
              onPress={() => {
                onSelect(en);
                setQuery("");
              }}
            >
              <Ionicons name="location-outline" size={16} color={colors.primary} />
              <Text style={styles.rowText}>{stateLabel(en, language)}</Text>
            </Pressable>
          )}
        />
        <Pressable style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>{t("cancel")}</Text>
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
