import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors, fonts, radius, spacing } from "../theme";

interface Props {
  label: string;
  onPress: () => void;
}

export default function Chip({ label, onPress }: Props) {
  function handlePress() {
    Haptics.selectionAsync();
    onPress();
  }

  return (
    <Pressable style={styles.chip} onPress={handlePress}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  label: { color: colors.text, fontSize: 13, fontFamily: fonts.semiBold },
});
