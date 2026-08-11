import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../components/Text";
import { useLanguage } from "../context/LanguageContext";
import { Language } from "../i18n/strings";
import { RootStackParamList } from "../navigation";
import { colors, fonts, radius, shadow, spacing, typography } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

const LANGUAGE_OPTIONS: { value: Language; labelKey: "english" | "hindi" }[] = [
  { value: "en", labelKey: "english" },
  { value: "hi", labelKey: "hindi" },
];

export default function SettingsScreen({}: Props) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>{t("language")}</Text>
      <Text style={styles.sectionSubtitle}>{t("languageSubtitle")}</Text>

      <View style={styles.card}>
        {LANGUAGE_OPTIONS.map((opt, i) => (
          <View key={opt.value}>
            <Pressable style={styles.row} onPress={() => setLanguage(opt.value)}>
              <Text style={styles.rowText}>{t(opt.labelKey)}</Text>
              {language === opt.value ? (
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              ) : (
                <Ionicons name="ellipse-outline" size={22} color={colors.textFaint} />
              )}
            </Pressable>
            {i < LANGUAGE_OPTIONS.length - 1 ? <View style={styles.divider} /> : null}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg },
  sectionTitle: { ...typography.heading, marginBottom: spacing.xs },
  sectionSubtitle: { ...typography.caption, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    ...shadow.card,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
  },
  rowText: { fontSize: 15, fontFamily: fonts.semiBold, color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.md },
});
