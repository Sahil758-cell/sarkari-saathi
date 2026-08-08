import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, shadow, spacing, typography } from "../theme";

export default function AboutScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.logoCircle}>
        <Ionicons name="shield-checkmark" size={36} color={colors.primary} />
      </View>
      <Text style={styles.appName}>Sarkari Saathi</Text>
      <Text style={styles.version}>Version 1.0.0</Text>

      <View style={styles.card}>
        <Text style={styles.detail}>
          Sarkari Saathi helps you find Indian government schemes you may be eligible for.
          Answer a few questions about yourself once, and it matches you against a database
          of schemes based on your age, state, category, income, and other criteria.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>AI Assistant</Text>
        <Text style={styles.detail}>
          The Assistant tab lets you ask questions in plain language. It answers from the same
          scheme database, and can also look up official gov.in websites for questions the local
          database doesn't cover.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Your Data</Text>
        <Text style={styles.detail}>
          Your eligibility answers stay on your device. See Privacy & Security for details.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingBottom: 60, alignItems: "center" },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  appName: { fontSize: 20, fontFamily: fonts.bold, color: colors.text },
  version: { ...typography.caption, marginBottom: spacing.lg },
  card: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  title: { fontSize: 14, fontFamily: fonts.bold, color: colors.text, marginBottom: spacing.xs },
  detail: { ...typography.body, color: colors.textMuted, lineHeight: 19 },
});
