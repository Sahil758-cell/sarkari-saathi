import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../theme";

interface Props {
  title: string;
  onViewAll?: () => void;
}

export default function SectionHeader({ title, onViewAll }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {onViewAll ? (
        <Pressable onPress={onViewAll}>
          <Text style={styles.viewAll}>View All</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  title: { ...typography.heading },
  viewAll: { ...typography.subheading, color: colors.primary },
});
