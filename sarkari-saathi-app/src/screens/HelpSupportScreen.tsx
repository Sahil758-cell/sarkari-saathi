import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, shadow, spacing, typography } from "../theme";

const SUPPORT_EMAIL = "sahidesh02@gmail.com";

const FAQS = [
  {
    question: "Schemes aren't matching what I expect?",
    answer: "Update your eligibility profile from the Profile tab — matches are based on your latest answers.",
  },
  {
    question: "Didn't receive your OTP?",
    answer: "Wait for the 30-second cooldown to end, then tap Resend OTP. Some numbers receive a phone call instead of an SMS.",
  },
  {
    question: "Want to remove your saved profiles?",
    answer: "Open the Saved tab and delete any profile using the trash icon.",
  },
];

export default function HelpSupportScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Pressable
        style={styles.contactCard}
        onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
      >
        <View style={styles.icon}>
          <Ionicons name="mail-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.contactText}>
          <Text style={styles.title}>Email Support</Text>
          <Text style={styles.detail}>{SUPPORT_EMAIL}</Text>
        </View>
        <Ionicons name="open-outline" size={18} color={colors.textFaint} />
      </Pressable>

      <Text style={styles.sectionHeader}>Common Questions</Text>
      {FAQS.map((f) => (
        <View key={f.question} style={styles.card}>
          <Text style={styles.title}>{f.question}</Text>
          <Text style={styles.detail}>{f.answer}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingBottom: 60 },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
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
  contactText: { flex: 1 },
  sectionHeader: { ...typography.heading, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  title: { fontSize: 14, fontFamily: fonts.bold, color: colors.text, marginBottom: 2 },
  detail: { ...typography.caption, lineHeight: 16 },
});
