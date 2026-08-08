import { StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../theme";

interface Props {
  completed: number;
  total: number;
}

export default function ProgressBar({ completed, total }: Props) {
  const fraction = total > 0 ? Math.min(completed / total, 1) : 0;
  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${fraction * 100}%` }]} />
      </View>
      <Text style={styles.label}>
        {completed} of {total} required fields
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.lg },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  fill: { height: "100%", backgroundColor: colors.primary, borderRadius: radius.pill },
  label: { ...typography.caption, marginTop: spacing.xs },
});
