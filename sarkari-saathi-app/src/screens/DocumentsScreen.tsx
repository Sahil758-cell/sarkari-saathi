import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, shadow, spacing, typography } from "../theme";

const COMMON_DOCUMENTS = [
  { title: "Aadhaar Card", detail: "Primary identity proof required by almost every scheme." },
  { title: "Income Certificate", detail: "Needed for schemes with an annual income limit." },
  { title: "Caste Certificate", detail: "Required for SC/ST/OBC/EWS category-specific schemes." },
  { title: "Domicile / Residence Certificate", detail: "Proves you belong to the state offering the scheme." },
  { title: "Bank Passbook", detail: "For direct benefit transfer (DBT) of scheme payments." },
  { title: "Passport-size Photograph", detail: "Commonly required with most applications." },
  { title: "BPL Card", detail: "Required for schemes targeted at Below Poverty Line families." },
  { title: "Disability Certificate", detail: "Required for schemes targeted at persons with disabilities." },
];

export default function DocumentsScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.subtitle}>
        Most government schemes ask for some combination of these documents. Exact
        requirements vary by scheme — check a scheme's detail page for its specific list.
      </Text>
      {COMMON_DOCUMENTS.map((doc) => (
        <View key={doc.title} style={styles.card}>
          <View style={styles.icon}>
            <Ionicons name="document-text-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.title}>{doc.title}</Text>
            <Text style={styles.detail}>{doc.detail}</Text>
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
