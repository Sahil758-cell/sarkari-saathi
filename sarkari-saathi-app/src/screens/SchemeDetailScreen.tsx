import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { checkEligibility, getQuestions, getScheme } from "../api/client";
import DynamicQuestionForm from "../components/DynamicQuestionForm";
import PrimaryButton from "../components/PrimaryButton";
import ProfilePickerModal from "../components/ProfilePickerModal";
import { RootStackParamList } from "../navigation";
import { listProfiles } from "../storage/profiles";
import { colors, fonts, gradients, radius, shadow, spacing, typography } from "../theme";
import { EligibilityOut, PartialProfile, QuestionSpec, SavedProfile, Scheme } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "SchemeDetail">;

const REASON_LABELS: Record<string, string> = {
  age_min: "Minimum age not met",
  age_max: "Maximum age exceeded",
  gender: "Gender does not match",
  state: "Not available in your state",
  category: "Category does not match",
  income: "Income exceeds the limit",
  bpl: "Requires BPL status",
  disability: "Requires disability status",
  residency: "Residency does not match",
};

function DetailSection({
  icon,
  title,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={16} color={colors.primary} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export default function SchemeDetailScreen({ route }: Props) {
  const { slug } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [scheme, setScheme] = useState<Scheme>();

  const [pickerVisible, setPickerVisible] = useState(false);
  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>([]);
  const [questions, setQuestions] = useState<QuestionSpec[]>();
  const [questionsLoading, setQuestionsLoading] = useState(false);

  const [eligibility, setEligibility] = useState<EligibilityOut>();
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [eligibilityError, setEligibilityError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    getScheme(slug)
      .then((s) => {
        if (!cancelled) setScheme(s);
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
  }, [slug]);

  async function runCheck(profile: PartialProfile) {
    setEligibilityError(undefined);
    setCheckingEligibility(true);
    try {
      const result = await checkEligibility(slug, profile);
      setEligibility(result);
      setQuestions(undefined);
    } catch (err: any) {
      setEligibilityError(err.message ?? "Something went wrong");
    } finally {
      setCheckingEligibility(false);
    }
  }

  async function loadQuestionsAndAsk() {
    setPickerVisible(false);
    setEligibility(undefined);
    setEligibilityError(undefined);
    setQuestionsLoading(true);
    try {
      const q = await getQuestions(slug);
      if (q.length === 0) {
        // Scheme states no restrictions matcher can check — eligible by default.
        await runCheck({});
      } else {
        setQuestions(q);
      }
    } catch (err: any) {
      setEligibilityError(err.message ?? "Something went wrong");
    } finally {
      setQuestionsLoading(false);
    }
  }

  async function handleCheckEligibilityPress() {
    setEligibility(undefined);
    setEligibilityError(undefined);
    const profiles = await listProfiles();
    setSavedProfiles(profiles);
    if (profiles.length > 0) {
      setPickerVisible(true);
    } else {
      await loadQuestionsAndAsk();
    }
  }

  function handlePickProfile(profile: SavedProfile) {
    setPickerVisible(false);
    runCheck(profile.profile);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !scheme) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
        <Text style={styles.errorText}>{error ?? "Scheme not found"}</Text>
      </View>
    );
  }

  const link = scheme.application_link ?? scheme.portal_url;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.titleCard}
      >
        <View style={styles.titleIcon}>
          <Ionicons name="ribbon-outline" size={26} color="#fff" />
        </View>
        <Text style={styles.title}>{scheme.scheme_name}</Text>
      </LinearGradient>

      {scheme.benefits_summary ? (
        <DetailSection icon="gift-outline" title="Benefits">
          <Text style={styles.text}>{scheme.benefits_summary}</Text>
        </DetailSection>
      ) : null}

      {scheme.documents_required.length > 0 ? (
        <DetailSection icon="document-text-outline" title="Documents required">
          {scheme.documents_required.map((doc, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{doc}</Text>
            </View>
          ))}
        </DetailSection>
      ) : null}

      {scheme.other_conditions.length > 0 ? (
        <DetailSection icon="information-circle-outline" title="Conditions">
          {scheme.other_conditions.map((cond, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{cond}</Text>
            </View>
          ))}
        </DetailSection>
      ) : null}

      {link ? (
        <View style={styles.buttonSpacing}>
          <PrimaryButton
            title="Open application page"
            icon="open-outline"
            onPress={() => Linking.openURL(link)}
          />
        </View>
      ) : null}

      <View style={styles.buttonSpacing}>
        <PrimaryButton
          title={questionsLoading ? "Loading..." : "Check my eligibility"}
          icon="checkmark-circle-outline"
          iconPosition="left"
          variant="outline"
          onPress={handleCheckEligibilityPress}
          disabled={questionsLoading || checkingEligibility}
        />
      </View>

      {eligibilityError ? <Text style={styles.errorText}>{eligibilityError}</Text> : null}

      {questions && questions.length > 0 ? (
        <View style={styles.questionCard}>
          <DynamicQuestionForm
            questions={questions}
            onSubmit={runCheck}
            submitting={checkingEligibility}
          />
        </View>
      ) : null}

      {eligibility ? (
        <View
          style={[
            styles.eligibilityResult,
            eligibility.eligible ? styles.eligibleBg : styles.notEligibleBg,
          ]}
        >
          <View style={styles.eligibilityHeader}>
            <Ionicons
              name={eligibility.eligible ? "checkmark-circle" : "close-circle"}
              size={20}
              color={eligibility.eligible ? colors.success : colors.error}
            />
            <Text
              style={[
                styles.eligibilityVerdict,
                { color: eligibility.eligible ? colors.success : colors.error },
              ]}
            >
              {eligibility.eligible ? "You appear eligible" : "You may not be eligible"}
            </Text>
          </View>
          {eligibility.reasons.map((reason, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>
                {REASON_LABELS[reason.field] ?? reason.field}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <ProfilePickerModal
        visible={pickerVisible}
        profiles={savedProfiles}
        onSelect={handlePickProfile}
        onAnswerQuestions={loadQuestionsAndAsk}
        onClose={() => setPickerVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingBottom: 60 },
  titleCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  titleIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  title: { fontSize: 20, fontFamily: fonts.extraBold, color: "#fff" },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm, gap: spacing.sm },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { ...typography.subheading },
  text: { ...typography.body, lineHeight: 20 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 6, gap: spacing.sm },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    marginTop: 7,
  },
  bulletText: { ...typography.body, flex: 1, lineHeight: 20 },
  buttonSpacing: { marginTop: spacing.sm },
  questionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadow.card,
  },
  eligibilityResult: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  eligibleBg: { backgroundColor: colors.primaryLight },
  notEligibleBg: { backgroundColor: colors.errorLight },
  eligibilityHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  eligibilityVerdict: { fontSize: 15, fontFamily: fonts.bold },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.sm, padding: spacing.xl },
  errorText: { color: colors.error, padding: spacing.md, textAlign: "center" },
});
