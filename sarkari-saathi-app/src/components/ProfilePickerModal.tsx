import { Ionicons } from "@expo/vector-icons";
import { FlatList, Modal, Pressable, StyleSheet, View } from "react-native";
import { useLanguage } from "../context/LanguageContext";
import { colors, fonts, radius, spacing, typography } from "../theme";
import { SavedProfile } from "../types";
import { Text } from "./Text";

interface Props {
  visible: boolean;
  profiles: SavedProfile[];
  onSelect: (profile: SavedProfile) => void;
  onAnswerQuestions: () => void;
  onClose: () => void;
}

export default function ProfilePickerModal({
  visible,
  profiles,
  onSelect,
  onAnswerQuestions,
  onClose,
}: Props) {
  const { t } = useLanguage();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{t("checkEligibilityUsing")}</Text>

          <FlatList
            data={profiles}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable style={styles.row} onPress={() => onSelect(item)}>
                <View style={styles.iconCircle}>
                  <Ionicons name="person-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.rowTextCol}>
                  <Text style={styles.rowName}>{item.name}</Text>
                  <Text style={styles.rowText}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
              </Pressable>
            )}
          />

          <Pressable style={styles.altRow} onPress={onAnswerQuestions}>
            <Ionicons name="help-circle-outline" size={18} color={colors.primary} />
            <Text style={styles.altText}>{t("answerQuestionsForScheme")}</Text>
          </Pressable>

          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>{t("cancel")}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: "70%",
  },
  title: { ...typography.heading, marginBottom: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTextCol: { flex: 1 },
  rowName: { fontSize: 15, fontFamily: fonts.bold, color: colors.text, marginBottom: 2 },
  rowText: { ...typography.body },
  altRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  altText: { ...typography.body, color: colors.primary, fontFamily: fonts.semiBold },
  cancelButton: { paddingVertical: spacing.md, alignItems: "center" },
  cancelText: { color: colors.textMuted, fontFamily: fonts.semiBold },
});
