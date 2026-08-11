import { Pressable, StyleSheet, View } from "react-native";
import { useLanguage } from "../context/LanguageContext";
import { colors, spacing, typography } from "../theme";
import { Text } from "./Text";

interface Props {
  title: string;
  onViewAll?: () => void;
}

export default function SectionHeader({ title, onViewAll }: Props) {
  const { t } = useLanguage();
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {onViewAll ? (
        <Pressable onPress={onViewAll}>
          <Text style={styles.viewAll}>{t("viewAll")}</Text>
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
