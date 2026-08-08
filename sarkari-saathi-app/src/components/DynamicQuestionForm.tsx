import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { CATEGORY_OPTIONS, GENDER_OPTIONS, INCOME_OPTIONS } from "../constants";
import { colors, radius, spacing, typography } from "../theme";
import { PartialProfile, QuestionSpec } from "../types";
import PrimaryButton from "./PrimaryButton";
import SelectButtons from "./SelectButtons";

interface Props {
  questions: QuestionSpec[];
  onSubmit: (profile: PartialProfile) => void;
  submitting?: boolean;
}

const YES_NO_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const INCOME_OPTIONS_WITH_SKIP = [...INCOME_OPTIONS, { value: "skip", label: "Skip" }];

function promptFor(question: QuestionSpec): string {
  switch (question.key) {
    case "age":
      return "What is your age?";
    case "gender":
      return "What is your gender?";
    case "category":
      return "What is your category?";
    case "income_bracket":
      return "What is your annual income?";
    case "is_bpl":
      return "Do you have a Below Poverty Line (BPL) card?";
    case "is_disabled":
      return "Do you have a disability?";
    case "state_confirm":
      return `Is your state one of: ${(question.states ?? []).join(", ")}?`;
    case "residency_confirm":
      return `Are you a ${question.residency} resident?`;
    default:
      return question.key;
  }
}

export default function DynamicQuestionForm({ questions, onSubmit, submitting }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  function setAnswer(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  const allAnswered = questions.every((q) => answers[q.key] !== undefined);

  function handleSubmit() {
    const profile: PartialProfile = {};
    for (const q of questions) {
      const value = answers[q.key];
      if (value === undefined) continue;
      switch (q.key) {
        case "age":
          profile.age = Number(value);
          break;
        case "gender":
          profile.gender = value as PartialProfile["gender"];
          break;
        case "category":
          profile.category = value as PartialProfile["category"];
          break;
        case "income_bracket":
          profile.income_bracket =
            value === "skip" ? undefined : (value as PartialProfile["income_bracket"]);
          break;
        case "is_bpl":
          profile.is_bpl = value === "yes";
          break;
        case "is_disabled":
          profile.is_disabled = value === "yes";
          break;
        case "state_confirm":
          profile.state = value === "yes" ? q.states?.[0] : "_NOT_LISTED_";
          break;
        case "residency_confirm":
          profile.residency =
            value === "yes" ? (q.residency as PartialProfile["residency"]) : "_MISMATCH_";
          break;
      }
    }
    onSubmit(profile);
  }

  return (
    <View style={styles.container}>
      {questions.map((q) => (
        <View key={q.key} style={styles.question}>
          <Text style={styles.prompt}>{promptFor(q)}</Text>
          {q.key === "age" ? (
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={answers.age ?? ""}
              onChangeText={(v) => setAnswer("age", v)}
              placeholder="e.g. 32"
              placeholderTextColor={colors.textFaint}
            />
          ) : q.key === "gender" ? (
            <SelectButtons
              options={GENDER_OPTIONS}
              value={answers.gender as any}
              onChange={(v) => setAnswer("gender", v)}
            />
          ) : q.key === "category" ? (
            <SelectButtons
              options={CATEGORY_OPTIONS}
              value={answers.category as any}
              onChange={(v) => setAnswer("category", v)}
            />
          ) : q.key === "income_bracket" ? (
            <SelectButtons
              options={INCOME_OPTIONS_WITH_SKIP}
              value={answers.income_bracket as any}
              onChange={(v) => setAnswer("income_bracket", v)}
            />
          ) : (
            <SelectButtons
              options={YES_NO_OPTIONS}
              value={answers[q.key] as any}
              onChange={(v) => setAnswer(q.key, v)}
            />
          )}
        </View>
      ))}

      <View style={styles.submitButtonWrap}>
        <PrimaryButton
          title="Check eligibility"
          icon="checkmark"
          onPress={handleSubmit}
          disabled={!allAnswered}
          loading={submitting}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.sm },
  question: { marginBottom: spacing.md },
  prompt: { ...typography.subheading, color: colors.text, marginBottom: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  submitButtonWrap: { marginTop: spacing.sm },
});
