import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, shadow, spacing, typography } from "../theme";

const PRIVACY_POLICY_URL = "https://sarkari-saathi-2gg7.onrender.com/privacy-policy";

const SECTIONS = [
  {
    icon: "mail-outline" as const,
    title: "Email Verification",
    detail:
      "When you log in, we send a one-time code to your email. The code is only used to verify it's really you and expires after 10 minutes.",
  },
  {
    icon: "phone-portrait-outline" as const,
    title: "Login Session",
    detail:
      "Your email is saved on your device to keep you logged in. If you save an eligibility profile or enable notifications while logged in, that profile is also synced to our servers so we can match you against newly added schemes — it's deleted from our servers as soon as you log out.",
  },
  {
    icon: "document-text-outline" as const,
    title: "Eligibility Profile",
    detail:
      "Details you enter (age, gender, state, category, income, etc.) are always stored on your device. They're only sent to our backend to find matching schemes, or — if you're logged in and choose to enable notifications — to check for new matches. Never sold or shared for advertising.",
  },
  {
    icon: "shield-checkmark-outline" as const,
    title: "No Third-Party Sharing",
    detail:
      "We don't share your personal data with advertisers. The only external services involved are the ones needed to run the app (sending your login code, generating AI assistant answers, and delivering push notifications).",
  },
];

export default function PrivacySecurityScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.subtitle}>
        A plain-language summary of what Sarkari Saathi actually does with your data.
      </Text>
      {SECTIONS.map((s) => (
        <View key={s.title} style={styles.card}>
          <View style={styles.icon}>
            <Ionicons name={s.icon} size={20} color={colors.primary} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.detail}>{s.detail}</Text>
          </View>
        </View>
      ))}

      <Pressable style={styles.linkRow} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
        <Ionicons name="open-outline" size={18} color={colors.primary} />
        <Text style={styles.linkText}>View full Privacy Policy</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingBottom: 60 },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.lg, lineHeight: 19 },
  card: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  cardText: { flex: 1 },
  title: { fontSize: 14, fontFamily: fonts.bold, color: colors.text, marginBottom: 2 },
  detail: { ...typography.caption, lineHeight: 16 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    justifyContent: "center",
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  linkText: { color: colors.primary, fontFamily: fonts.semiBold, fontSize: 14 },
});
