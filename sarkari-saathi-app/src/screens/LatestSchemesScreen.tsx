import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { getLatestSchemes } from "../api/client";
import SchemeListItem from "../components/SchemeListItem";
import { Text } from "../components/Text";
import { useLanguage } from "../context/LanguageContext";
import { RootStackParamList } from "../navigation";
import { colors, spacing, typography } from "../theme";
import { Scheme } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "LatestSchemes">;

export default function LatestSchemesScreen({ navigation }: Props) {
  const { language, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [results, setResults] = useState<Scheme[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    getLatestSchemes(20, language)
      .then((res) => {
        if (!cancelled) setResults(res.results);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? t("somethingWentWrong"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [language]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={colors.error} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.list}
      data={results}
      keyExtractor={(item) => item.slug}
      ListHeaderComponent={<Text style={styles.header}>{t("newlyAddedSchemes")}</Text>}
      ListEmptyComponent={
        <View style={styles.center}>
          <Ionicons name="file-tray-outline" size={40} color={colors.textFaint} />
          <Text style={styles.empty}>{t("noSchemesYet")}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <SchemeListItem
          scheme={item}
          onPress={() => navigation.navigate("SchemeDetail", { slug: item.slug })}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg },
  header: { ...typography.caption, marginBottom: spacing.md },
  empty: { ...typography.body, color: colors.textMuted, marginTop: spacing.md, textAlign: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl, gap: spacing.sm },
  errorText: { color: colors.error, textAlign: "center" },
});
