import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import { syncProfiles } from "../api/client";
import FieldSection from "../components/FieldSection";
import PrimaryButton from "../components/PrimaryButton";
import SelectButtons from "../components/SelectButtons";
import StatePickerModal from "../components/StatePickerModal";
import { Text } from "../components/Text";
import {
  getCategoryOptions,
  getGenderOptions,
  getIncomeOptions,
  getOccupationOptions,
  getResidencyOptions,
} from "../constants";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { stateLabel } from "../i18n/options";
import { RootScreenProps } from "../navigation";
import { getProfile, listProfiles, MAX_SAVED_PROFILES, saveProfile } from "../storage/profiles";
import { colors, fonts, radius, spacing, typography } from "../theme";
import { Profile } from "../types";

type Props = RootScreenProps<"EligibilityForm">;

export default function ProfileFormScreen({ navigation, route }: Props) {
  const editProfileId = route.params?.editProfileId;
  const { identifier } = useAuth();
  const { language, t } = useLanguage();

  const STEP_TITLES = [
    t("personalDetails"),
    t("location"),
    t("categoryIncome"),
    t("additionalInfo"),
    t("review"),
  ];
  const TOTAL_STEPS = STEP_TITLES.length;

  const [step, setStep] = useState(0);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<Profile["gender"]>();
  const [state, setState] = useState<string>();
  const [statePickerVisible, setStatePickerVisible] = useState(false);
  const [category, setCategory] = useState<Profile["category"]>();
  const [incomeBracket, setIncomeBracket] = useState<Profile["income_bracket"]>();
  const [isBpl, setIsBpl] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [residency, setResidency] = useState<Profile["residency"]>();
  const [occupation, setOccupation] = useState<string>();

  const [shouldSave, setShouldSave] = useState(true);
  const [savedCount, setSavedCount] = useState(0);
  const [saveError, setSaveError] = useState<string>();

  function resetFields() {
    setName("");
    setAge("");
    setGender(undefined);
    setState(undefined);
    setCategory(undefined);
    setIncomeBracket(undefined);
    setIsBpl(false);
    setIsDisabled(false);
    setResidency(undefined);
    setOccupation(undefined);
    setShouldSave(true);
    setSaveError(undefined);
  }

  // Resets on every focus so re-navigating here (e.g. editing a different
  // saved profile) never shows stale data from a previous visit.
  useFocusEffect(
    useCallback(() => {
      listProfiles().then((all) => setSavedCount(all.length));
      setStep(0);
      if (!editProfileId) {
        resetFields();
        return;
      }
      getProfile(editProfileId).then((saved) => {
        if (!saved) return;
        const p = saved.profile;
        setName(saved.name);
        setAge(String(p.age));
        setGender(p.gender);
        setState(p.state);
        setCategory(p.category);
        setIncomeBracket(p.income_bracket);
        setIsBpl(p.is_bpl);
        setIsDisabled(p.is_disabled);
        setResidency(p.residency);
        setOccupation(p.occupation);
      });
    }, [editProfileId])
  );

  const nameValid = name.trim().length > 0;
  const ageNumber = Number(age);
  const ageValid =
    age.trim().length > 0 && Number.isFinite(ageNumber) && ageNumber >= 1 && ageNumber <= 120;

  const atCap = !editProfileId && savedCount >= MAX_SAVED_PROFILES;

  const stepValid = [
    nameValid && ageValid && !!gender,
    !!state && !!residency,
    !!category,
    true,
    true,
  ][step];

  async function handleSubmit() {
    if (!nameValid || !ageValid || !gender || !state || !category || !residency) return;
    const profile: Profile = {
      age: ageNumber,
      gender,
      state,
      category,
      income_bracket: incomeBracket,
      is_bpl: isBpl,
      is_disabled: isDisabled,
      residency,
      occupation,
    };
    setSaveError(undefined);
    if (shouldSave && !atCap) {
      try {
        await saveProfile(profile, name.trim(), editProfileId);
        if (identifier) {
          const all = await listProfiles();
          syncProfiles(all.map((p) => p.profile)).catch(() => {});
        }
      } catch (err: any) {
        setSaveError(err.message ?? t("somethingWentWrong"));
        return;
      }
    }
    navigation.navigate("Results", { profile });
  }

  function handleNext() {
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.stepLabel}>
        {t("review")} {step + 1} / {TOTAL_STEPS}
      </Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((step + 1) / TOTAL_STEPS) * 100}%` }]} />
      </View>

      <View style={styles.introCard}>
        <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
        <Text style={styles.introText}>
          {t("findMySchemesSubtitle")}
        </Text>
      </View>

      <Text style={styles.stepTitle}>{STEP_TITLES[step]}</Text>

      {step === 0 ? (
        <>
          <FieldSection icon="person-outline" label={t("name")} required>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t("namePlaceholder")}
              placeholderTextColor={colors.textFaint}
            />
          </FieldSection>

          <FieldSection icon="calendar-outline" label={t("age")} required>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={age}
              onChangeText={setAge}
              placeholder={t("agePlaceholder")}
              placeholderTextColor={colors.textFaint}
            />
          </FieldSection>

          <FieldSection icon="male-female-outline" label={t("gender")} required>
            <SelectButtons options={getGenderOptions(language)} value={gender} onChange={(v) => setGender(v as Profile["gender"])} />
          </FieldSection>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <FieldSection icon="location-outline" label={t("state")} required>
            <Pressable style={styles.input} onPress={() => setStatePickerVisible(true)}>
              <Text style={state ? styles.inputText : styles.placeholderText}>
                {state ? stateLabel(state, language) : t("selectState")}
              </Text>
            </Pressable>
            <StatePickerModal
              visible={statePickerVisible}
              onSelect={(s) => {
                setState(s);
                setStatePickerVisible(false);
              }}
              onClose={() => setStatePickerVisible(false)}
            />
          </FieldSection>

          <FieldSection icon="home-outline" label={t("residency")} required>
            <SelectButtons options={getResidencyOptions(language)} value={residency} onChange={(v) => setResidency(v as Profile["residency"])} />
          </FieldSection>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <FieldSection icon="people-outline" label={t("category")} required>
            <SelectButtons options={getCategoryOptions(language)} value={category} onChange={(v) => setCategory(v as Profile["category"])} />
          </FieldSection>

          <FieldSection icon="cash-outline" label={t("annualIncome")}>
            <SelectButtons
              options={getIncomeOptions(language)}
              value={incomeBracket}
              onChange={(v) => setIncomeBracket(v as Profile["income_bracket"])}
            />
          </FieldSection>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <FieldSection icon="briefcase-outline" label={t("occupation")}>
            <SelectButtons
              options={getOccupationOptions(language)}
              value={occupation}
              onChange={setOccupation}
            />
          </FieldSection>

          <View style={styles.switchCard}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabelRow}>
                <Ionicons name="card-outline" size={18} color={colors.primary} />
                <Text style={styles.switchLabel}>{t("belowPovertyLine")}</Text>
              </View>
              <Switch value={isBpl} onValueChange={setIsBpl} trackColor={{ true: colors.primary }} />
            </View>
            <View style={styles.divider} />
            <View style={styles.switchRow}>
              <View style={styles.switchLabelRow}>
                <Ionicons name="accessibility-outline" size={18} color={colors.primary} />
                <Text style={styles.switchLabel}>{t("haveDisability")}</Text>
              </View>
              <Switch
                value={isDisabled}
                onValueChange={setIsDisabled}
                trackColor={{ true: colors.primary }}
              />
            </View>
          </View>
        </>
      ) : null}

      {step === 4 ? (
        <>
          <View style={styles.reviewCard}>
            <ReviewRow label={t("name")} value={name.trim() || "—"} />
            <ReviewRow label={t("age")} value={age || "—"} />
            <ReviewRow label={t("gender")} value={gender ? getGenderOptions(language).find((o) => o.value === gender)?.label ?? gender : "—"} />
            <ReviewRow label={t("state")} value={state ? stateLabel(state, language) : "—"} />
            <ReviewRow label={t("residency")} value={residency ? getResidencyOptions(language).find((o) => o.value === residency)?.label ?? residency : "—"} />
            <ReviewRow label={t("category")} value={category ? getCategoryOptions(language).find((o) => o.value === category)?.label ?? category : "—"} />
            <ReviewRow label={t("annualIncome")} value={incomeBracket ? getIncomeOptions(language).find((o) => o.value === incomeBracket)?.label ?? incomeBracket : t("skip")} />
            <ReviewRow label={t("occupation")} value={occupation ? getOccupationOptions(language).find((o) => o.value === occupation)?.label ?? occupation : t("skip")} />
            <ReviewRow label={t("belowPovertyLine")} value={isBpl ? t("yes") : t("no")} />
            <ReviewRow label={t("haveDisability")} value={isDisabled ? t("yes") : t("no")} />
          </View>

          <View style={styles.switchCard}>
            {atCap ? (
              <Text style={styles.capText}>
                {MAX_SAVED_PROFILES} — {t("savedProfiles")}
              </Text>
            ) : (
              <View style={styles.switchRow}>
                <View style={styles.switchLabelRow}>
                  <Ionicons name="bookmark-outline" size={18} color={colors.primary} />
                  <Text style={styles.switchLabel}>
                    {editProfileId ? t("saveChangesToProfile") : t("saveThisProfile")}
                  </Text>
                </View>
                <Switch
                  value={shouldSave}
                  onValueChange={setShouldSave}
                  trackColor={{ true: colors.primary }}
                />
              </View>
            )}
          </View>
          {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
        </>
      ) : null}

      <View style={styles.navColumn}>
        {step < TOTAL_STEPS - 1 ? (
          <PrimaryButton title={t("next")} icon="arrow-forward" onPress={handleNext} disabled={!stepValid} />
        ) : (
          <PrimaryButton title={t("findMatchingSchemes")} icon="arrow-forward" onPress={handleSubmit} />
        )}
        {step > 0 ? (
          <View style={styles.navBackWrap}>
            <PrimaryButton
              title={t("back")}
              icon="arrow-back"
              iconPosition="left"
              variant="outline"
              onPress={handleBack}
            />
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingBottom: 60 },
  stepLabel: { ...typography.caption, marginBottom: spacing.xs },
  progressTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: "hidden",
    marginBottom: spacing.lg,
  },
  progressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: radius.pill },
  introCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  introText: { ...typography.body, flex: 1, lineHeight: 18 },
  stepTitle: { ...typography.heading, marginBottom: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  inputText: { fontSize: 15, color: colors.text },
  placeholderText: { fontSize: 15, color: colors.textFaint },
  switchCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  switchLabelRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  switchLabel: { ...typography.body },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  capText: { ...typography.caption, color: colors.textMuted },
  errorText: { color: colors.error, marginBottom: spacing.md, textAlign: "center" },
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  reviewLabel: { ...typography.caption },
  reviewValue: { fontSize: 13, fontFamily: fonts.semiBold, color: colors.text },
  navColumn: { marginTop: spacing.sm },
  navBackWrap: { marginTop: spacing.sm },
});
