import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { syncProfiles } from "../api/client";
import FieldSection from "../components/FieldSection";
import PrimaryButton from "../components/PrimaryButton";
import SelectButtons from "../components/SelectButtons";
import StatePickerModal from "../components/StatePickerModal";
import {
  CATEGORY_OPTIONS,
  GENDER_OPTIONS,
  INCOME_OPTIONS,
  OCCUPATION_OPTIONS,
  RESIDENCY_OPTIONS,
} from "../constants";
import { useAuth } from "../context/AuthContext";
import { RootScreenProps } from "../navigation";
import { getProfile, listProfiles, MAX_SAVED_PROFILES, saveProfile } from "../storage/profiles";
import { colors, fonts, radius, spacing, typography } from "../theme";
import { Profile } from "../types";

type Props = RootScreenProps<"EligibilityForm">;

const STEP_TITLES = [
  "Personal Details",
  "Location",
  "Category & Income",
  "Additional Info",
  "Review",
];
const TOTAL_STEPS = STEP_TITLES.length;

export default function ProfileFormScreen({ navigation, route }: Props) {
  const editProfileId = route.params?.editProfileId;
  const { identifier } = useAuth();

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
        setSaveError(err.message ?? "Could not save profile");
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
        Step {step + 1} of {TOTAL_STEPS}
      </Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((step + 1) / TOTAL_STEPS) * 100}%` }]} />
      </View>

      <View style={styles.introCard}>
        <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
        <Text style={styles.introText}>
          Tell us a bit about yourself to see matching government schemes.
        </Text>
      </View>

      <Text style={styles.stepTitle}>{STEP_TITLES[step]}</Text>

      {step === 0 ? (
        <>
          <FieldSection icon="person-outline" label="Name" required>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Rohan Kumar"
              placeholderTextColor={colors.textFaint}
            />
          </FieldSection>

          <FieldSection icon="calendar-outline" label="Age" required>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={age}
              onChangeText={setAge}
              placeholder="Enter your age"
              placeholderTextColor={colors.textFaint}
            />
          </FieldSection>

          <FieldSection icon="male-female-outline" label="Gender" required>
            <SelectButtons options={GENDER_OPTIONS} value={gender} onChange={setGender} />
          </FieldSection>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <FieldSection icon="location-outline" label="State" required>
            <Pressable style={styles.input} onPress={() => setStatePickerVisible(true)}>
              <Text style={state ? styles.inputText : styles.placeholderText}>
                {state ?? "Select your state"}
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

          <FieldSection icon="home-outline" label="Residency" required>
            <SelectButtons options={RESIDENCY_OPTIONS} value={residency} onChange={setResidency} />
          </FieldSection>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <FieldSection icon="people-outline" label="Category" required>
            <SelectButtons options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
          </FieldSection>

          <FieldSection icon="cash-outline" label="Annual income">
            <SelectButtons
              options={INCOME_OPTIONS}
              value={incomeBracket}
              onChange={setIncomeBracket}
            />
          </FieldSection>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <FieldSection icon="briefcase-outline" label="Occupation">
            <SelectButtons
              options={OCCUPATION_OPTIONS.map((o) => ({ value: o, label: o }))}
              value={occupation}
              onChange={setOccupation}
            />
          </FieldSection>

          <View style={styles.switchCard}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabelRow}>
                <Ionicons name="card-outline" size={18} color={colors.primary} />
                <Text style={styles.switchLabel}>Below Poverty Line (BPL)?</Text>
              </View>
              <Switch value={isBpl} onValueChange={setIsBpl} trackColor={{ true: colors.primary }} />
            </View>
            <View style={styles.divider} />
            <View style={styles.switchRow}>
              <View style={styles.switchLabelRow}>
                <Ionicons name="accessibility-outline" size={18} color={colors.primary} />
                <Text style={styles.switchLabel}>Do you have a disability?</Text>
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
            <ReviewRow label="Name" value={name.trim() || "—"} />
            <ReviewRow label="Age" value={age || "—"} />
            <ReviewRow label="Gender" value={gender ?? "—"} />
            <ReviewRow label="State" value={state ?? "—"} />
            <ReviewRow label="Residency" value={residency ?? "—"} />
            <ReviewRow label="Category" value={category?.toUpperCase() ?? "—"} />
            <ReviewRow label="Annual income" value={incomeBracket ?? "Not specified"} />
            <ReviewRow label="Occupation" value={occupation ?? "Not specified"} />
            <ReviewRow label="BPL" value={isBpl ? "Yes" : "No"} />
            <ReviewRow label="Disability" value={isDisabled ? "Yes" : "No"} />
          </View>

          <View style={styles.switchCard}>
            {atCap ? (
              <Text style={styles.capText}>
                You've saved {MAX_SAVED_PROFILES} profiles already — delete one from the Saved
                tab to save a new one.
              </Text>
            ) : (
              <View style={styles.switchRow}>
                <View style={styles.switchLabelRow}>
                  <Ionicons name="bookmark-outline" size={18} color={colors.primary} />
                  <Text style={styles.switchLabel}>
                    {editProfileId ? "Save changes to this profile" : "Save this profile"}
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
          <PrimaryButton title="Next" icon="arrow-forward" onPress={handleNext} disabled={!stepValid} />
        ) : (
          <PrimaryButton title="Find matching schemes" icon="arrow-forward" onPress={handleSubmit} />
        )}
        {step > 0 ? (
          <View style={styles.navBackWrap}>
            <PrimaryButton
              title="Back"
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
