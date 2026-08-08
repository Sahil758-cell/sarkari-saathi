import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, shadow, spacing, typography } from "../theme";

const SECTIONS = [
  {
    icon: "call-outline" as const,
    title: "Phone & Email Verification",
    detail:
      "When you log in, we send a one-time code to your phone (via SMS/call) or email. The code is used only to verify it's really you and isn't stored beyond the short verification window.",
  },
  {
    icon: "phone-portrait-outline" as const,
    title: "Login Session",
    detail:
      "Once verified, your phone number or email is saved only on your own device, to keep you logged in. We don't run a server-side account database — logging out or reinstalling the app clears it.",
  },
  {
    icon: "document-text-outline" as const,
    title: "Eligibility Profile",
    detail:
      "Details you enter (age, gender, state, category, income, etc.) are stored locally on your device. They're sent to our backend only at the moment you search for matching schemes — never sold or shared for any other purpose.",
  },
  {
    icon: "shield-checkmark-outline" as const,
    title: "No Third-Party Sharing",
    detail:
      "We don't share your personal data with advertisers or other third parties. The only external services involved are the ones needed to deliver your OTP.",
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
});
