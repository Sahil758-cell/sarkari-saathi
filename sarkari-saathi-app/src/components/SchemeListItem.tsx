import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, fonts, radius, shadow, spacing } from "../theme";
import { Scheme } from "../types";
import { Text } from "./Text";

interface Props {
  scheme: Scheme;
  onPress: () => void;
}

export default function SchemeListItem({ scheme, onPress }: Props) {
  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={handlePress}
    >
      <View style={styles.iconCircle}>
        <Ionicons name="ribbon-outline" size={22} color={colors.primary} />
      </View>
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>
          {scheme.scheme_name}
        </Text>
        {scheme.benefits_summary ? (
          <Text style={styles.summary} numberOfLines={2}>
            {scheme.benefits_summary}
          </Text>
        ) : null}
        {scheme.state ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={12} color={colors.primary} />
            <Text style={styles.meta}>{scheme.state.join(", ")}</Text>
          </View>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  cardPressed: { opacity: 0.7 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  content: { flex: 1, marginRight: spacing.sm },
  name: { fontSize: 15, fontFamily: fonts.bold, color: colors.text, marginBottom: 4 },
  summary: { fontSize: 13, color: colors.textMuted, marginBottom: 6, lineHeight: 18 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  meta: { fontSize: 12, color: colors.primary, fontFamily: fonts.semiBold },
});
