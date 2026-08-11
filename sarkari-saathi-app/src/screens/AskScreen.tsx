import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { askAssistant } from "../api/client";
import SchemeListItem from "../components/SchemeListItem";
import SectionHeader from "../components/SectionHeader";
import { Text } from "../components/Text";
import { EXAMPLE_QUESTIONS } from "../constants";
import { useLanguage } from "../context/LanguageContext";
import { TabScreenProps } from "../navigation";
import { colors, fonts, radius, shadow, spacing, typography } from "../theme";
import { AskResponse } from "../types";

type Props = TabScreenProps<"AIAssistant">;

export default function AskScreen({ navigation, route }: Props) {
  const { language, t } = useLanguage();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<AskResponse>();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Manual keyboard tracking instead of KeyboardAvoidingView — the latter
  // proved unreliable in this tab-navigator + Samsung-keyboard combination
  // (tried both "height" behavior and native windowSoftInputMode="resize",
  // neither actually pushed the input bar above the keyboard on-device).
  // app.json sets softwareKeyboardLayoutMode to "pan" so the OS does no
  // automatic adjustment at all — this is the single source of truth.
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (route.params?.initialQuery) {
        const q = route.params.initialQuery;
        navigation.setParams({ initialQuery: undefined });
        runAsk(q);
      }
    }, [route.params?.initialQuery])
  );

  async function runAsk(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setQuery("");
    Keyboard.dismiss();
    setLoading(true);
    setError(undefined);
    setResult(undefined);
    try {
      const res = await askAssistant(trimmed, language);
      setResult(res);
    } catch (err: any) {
      setError(err.message ?? t("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.screen, { paddingBottom: keyboardHeight }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.greetingCard}>
          <View style={styles.avatar}>
            <Ionicons name="sparkles" size={22} color="#fff" />
          </View>
          <View style={styles.greetingText}>
            <Text style={styles.greetingTitle}>{t("hiThere")}</Text>
            <Text style={styles.greetingSubtitle}>{t("howCanIHelp")}</Text>
          </View>
        </View>

        {!result && !loading ? (
          <>
            <SectionHeader title={t("exampleQuestions")} />
            {EXAMPLE_QUESTIONS.map((q) => (
              <Pressable key={q} style={styles.exampleRow} onPress={() => runAsk(q)}>
                <Text style={styles.exampleText}>{q}</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.primary} />
              </Pressable>
            ))}
          </>
        ) : null}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {result ? (
          <>
            <View style={styles.answerCard}>
              <View style={styles.answerHeader}>
                <Ionicons name="sparkles" size={16} color={colors.primary} />
                <Text style={styles.answerHeaderText}>{t("answer")}</Text>
              </View>
              <Text style={styles.answerText}>{result.answer}</Text>
            </View>

            {result.sources.length > 0 ? (
              <View style={styles.sourcesSection}>
                <Text style={styles.sourcesTitle}>{t("sources")}</Text>
                {result.sources.map((scheme) => (
                  <SchemeListItem
                    key={scheme.slug}
                    scheme={scheme}
                    onPress={() =>
                      navigation.navigate("SchemeDetail", { slug: scheme.slug })
                    }
                  />
                ))}
              </View>
            ) : null}

            {result.web_sources.length > 0 ? (
              <View style={styles.sourcesSection}>
                <Text style={styles.sourcesTitle}>{t("fromOfficialGovSites")}</Text>
                {result.web_sources.map((web) => (
                  <Pressable
                    key={web.url}
                    style={styles.webSourceRow}
                    onPress={() => Linking.openURL(web.url)}
                  >
                    <View style={styles.webBadge}>
                      <Ionicons name="globe-outline" size={16} color={colors.primary} />
                    </View>
                    <Text style={styles.webSourceText} numberOfLines={2}>
                      {web.title}
                    </Text>
                    <Ionicons name="open-outline" size={16} color={colors.textFaint} />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder={t("typeYourQuestion")}
          placeholderTextColor={colors.textFaint}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => runAsk(query)}
        />
        <Pressable
          style={[styles.sendButton, !query.trim() && styles.sendButtonDisabled]}
          onPress={() => runAsk(query)}
          disabled={!query.trim() || loading}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  container: { padding: spacing.lg, paddingBottom: 20 },
  greetingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  greetingText: { flex: 1 },
  greetingTitle: { fontSize: 16, fontFamily: fonts.bold, color: colors.text, marginBottom: 2 },
  greetingSubtitle: { ...typography.body, color: colors.textMuted },
  exampleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  exampleText: { ...typography.body, flex: 1, marginRight: spacing.sm },
  loadingBox: { alignItems: "center", marginTop: spacing.xl },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  errorText: { color: colors.error, flex: 1 },
  answerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    ...shadow.card,
  },
  answerHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  answerHeaderText: { ...typography.subheading },
  answerText: { ...typography.body, lineHeight: 21 },
  sourcesSection: { marginTop: spacing.lg },
  sourcesTitle: { ...typography.subheading, marginBottom: spacing.sm },
  webSourceRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  webBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  webSourceText: { ...typography.body, flex: 1, marginRight: spacing.sm },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    color: colors.text,
    fontFamily: fonts.regular,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: { backgroundColor: colors.textFaint },
});
