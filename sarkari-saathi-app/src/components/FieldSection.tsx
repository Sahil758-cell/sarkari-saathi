import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { colors, radius, shadow, spacing, typography } from "../theme";
import { Text } from "./Text";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  required?: boolean;
  children: ReactNode;
}

export default function FieldSection({ icon, label, required, children }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name={icon} size={18} color={colors.primary} style={styles.icon} />
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  header: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  icon: { marginRight: spacing.sm },
  label: { ...typography.subheading, color: colors.text },
  required: { color: colors.accent },
});
