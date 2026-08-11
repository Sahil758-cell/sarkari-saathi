import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, fonts, radius, spacing } from "../theme";
import { Text } from "./Text";

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: Option<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
}

export default function SelectButtons<T extends string>({
  options,
  value,
  onChange,
}: Props<T>) {
  function handlePress(v: T) {
    Haptics.selectionAsync();
    onChange(v);
  }

  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => handlePress(opt.value)}
            style={[styles.button, selected && styles.buttonSelected]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  button: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  buttonSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { color: colors.text, fontSize: 13, fontFamily: fonts.semiBold },
  labelSelected: { color: "#fff" },
});
