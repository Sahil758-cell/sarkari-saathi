import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { searchSchemes } from "../api/client";
import Chip from "../components/Chip";
import SchemeListItem from "../components/SchemeListItem";
import SectionHeader from "../components/SectionHeader";
import { CATEGORIES, POPULAR_SEARCHES } from "../constants";
import { TabScreenProps } from "../navigation";
import {
  addSearchHistory,
  clearSearchHistory,
  listSearchHistory,
  relativeTime,
  SearchHistoryEntry,
} from "../storage/searchHistory";
import { colors, fonts, gradients, radius, shadow, spacing, typography } from "../theme";
import { Scheme } from "../types";
import { LinearGradient } from "expo-linear-gradient";

type Props = TabScreenProps<"Search">;

const DEBOUNCE_MS = 300;

export default function SearchScreen({ navigation, route }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [results, setResults] = useState<Scheme[]>([]);
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      listSearchHistory().then(setHistory);
      if (route.params?.initialQuery) {
        setQuery(route.params.initialQuery);
        navigation.setParams({ initialQuery: undefined });
      }
    }, [route.params?.initialQuery])
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      searchSchemes(trimmed)
        .then((res) => {
          setResults(res.results);
          addSearchHistory(trimmed).then(() => listSearchHistory().then(setHistory));
        })
        .catch((err) => setError(err.message ?? "Something went wrong"))
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const showDiscovery = !query.trim();

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={colors.textFaint} />
        <TextInput
          style={styles.input}
          placeholder="Search for schemes..."
          placeholderTextColor={colors.textFaint}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {loading ? <ActivityIndicator style={styles.loader} color={colors.primary} /> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {showDiscovery ? (
        <FlatList
          contentContainerStyle={styles.list}
          data={[]}
          renderItem={null}
          ListHeaderComponent={
            <>
              <LinearGradient
                colors={gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
              >
                <View style={styles.heroIcon}>
                  <Ionicons name="compass-outline" size={24} color="#fff" />
                </View>
                <Text style={styles.heroTitle}>Find the right scheme for you</Text>
                <Text style={styles.heroSubtitle}>
                  Search by name, state, category and more
                </Text>
              </LinearGradient>

              <SectionHeader title="Popular Searches" />
              <View style={styles.chipRow}>
                {POPULAR_SEARCHES.map((term) => (
                  <Chip key={term} label={term} onPress={() => setQuery(term)} />
                ))}
              </View>

              <SectionHeader title="Categories" />
              <View style={styles.categoryList}>
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.key}
                    style={styles.categoryRow}
                    onPress={() => setQuery(cat.label)}
                  >
                    <View style={styles.categoryIcon}>
                      <Ionicons name={cat.icon} size={18} color={colors.primary} />
                    </View>
                    <Text style={styles.categoryLabel}>{cat.label}</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
                  </Pressable>
                ))}
              </View>

              {history.length > 0 ? (
                <>
                  <SectionHeader
                    title="Recent Searches"
                    onViewAll={() => {
                      clearSearchHistory().then(() => setHistory([]));
                    }}
                  />
                  {history.map((entry) => (
                    <Pressable
                      key={entry.timestamp}
                      style={styles.historyRow}
                      onPress={() => setQuery(entry.query)}
                    >
                      <Ionicons name="time-outline" size={16} color={colors.textFaint} />
                      <Text style={styles.historyText}>{entry.query}</Text>
                      <Text style={styles.historyTime}>{relativeTime(entry.timestamp)}</Text>
                    </Pressable>
                  ))}
                </>
              ) : null}
            </>
          }
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={results}
          keyExtractor={(item) => item.slug}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Ionicons name="search-outline" size={32} color={colors.textFaint} />
                <Text style={styles.emptyText}>No schemes found for "{query}"</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <SchemeListItem
              scheme={item}
              onPress={() => navigation.navigate("SchemeDetail", { slug: item.slug })}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  input: { flex: 1, paddingVertical: spacing.md, color: colors.text, fontFamily: fonts.regular },
  list: { paddingBottom: 40 },
  loader: { marginVertical: spacing.sm },
  errorText: { color: colors.error, marginVertical: spacing.sm, textAlign: "center" },
  empty: { alignItems: "center", marginTop: spacing.xl, gap: spacing.sm },
  emptyText: { color: colors.textMuted },
  heroCard: { borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  heroTitle: { fontSize: 17, fontFamily: fonts.bold, color: "#fff", marginBottom: 4 },
  heroSubtitle: { fontSize: 12, fontFamily: fonts.regular, color: "rgba(255,255,255,0.85)" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
  categoryList: { marginBottom: spacing.lg },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  categoryIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  categoryLabel: { ...typography.body, flex: 1 },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  historyText: { ...typography.body, flex: 1 },
  historyTime: { ...typography.caption },
});
