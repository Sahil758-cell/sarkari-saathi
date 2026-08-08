import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { matchProfile } from "../api/client";
import SchemeListItem from "../components/SchemeListItem";
import { RootStackParamList } from "../navigation";
import { colors, spacing, typography } from "../theme";
import { Scheme } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Results">;

export default function ResultsListScreen({ route, navigation }: Props) {
  const { profile } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [results, setResults] = useState<Scheme[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);
    matchProfile(profile)
      .then((res) => {
        if (!cancelled) setResults(res.results);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "Something went wrong");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profile]);

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
      ListHeaderComponent={
        <Text style={styles.header}>{results.length} matching schemes</Text>
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Ionicons name="file-tray-outline" size={40} color={colors.textFaint} />
          <Text style={styles.empty}>No matching schemes found for this profile.</Text>
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
