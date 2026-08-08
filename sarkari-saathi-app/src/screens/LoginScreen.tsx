import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { getOtpMode, sendOtp, verifyOtp } from "../api/client";
import FieldSection from "../components/FieldSection";
import PrimaryButton from "../components/PrimaryButton";
import { useAuth } from "../context/AuthContext";
import { RootScreenProps } from "../navigation";
import { colors, fonts, radius, spacing, typography } from "../theme";

type Props = RootScreenProps<"Login">;

const RESEND_COOLDOWN_SECONDS = 30;

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [mode, setMode] = useState<"phone" | "email" | null>(null);
  const [step, setStep] = useState<"identifier" | "otp">("identifier");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sessionId, setSessionId] = useState<string>();
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string>();
  const [cooldown, setCooldown] = useState(0);

  const phoneDigitsValid = phone.trim().length === 10;
  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const identifierValid = mode === "phone" ? phoneDigitsValid : emailValid;
  const codeValid = code.trim().length === 6;

  useEffect(() => {
    getOtpMode()
      .then((res) => setMode(res.mode))
      .catch(() => setMode("phone"));
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown > 0]);

  async function handleSendOtp() {
    if (!identifierValid || !mode) return;
    setError(undefined);
    setSending(true);
    try {
      const result = await sendOtp(
        mode === "phone" ? { phone: phone.trim() } : { email: email.trim() }
      );
      setSessionId(result.session_id);
      setStep("otp");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err: any) {
      setError(err.message ?? "Could not send OTP. Please try again.");
    } finally {
      setSending(false);
    }
  }

  async function handleVerifyOtp() {
    if (!codeValid || !sessionId) return;
    setError(undefined);
    setVerifying(true);
    try {
      const result = await verifyOtp(sessionId, code.trim());
      if (!result.verified) {
        setError("Incorrect code, please try again.");
        return;
      }
      await login(mode === "phone" ? `+91${phone.trim()}` : email.trim());
      navigation.goBack();
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.headerIconCircle}>
        <Ionicons
          name={step === "otp" ? "keypad-outline" : "shield-checkmark-outline"}
          size={32}
          color={colors.primary}
        />
      </View>
      <Text style={styles.headerTitle}>
        {step === "otp"
          ? "Enter Verification Code"
          : mode === "email"
            ? "Verify Your Email"
            : "Verify Your Phone Number"}
      </Text>
      <Text style={styles.headerSubtitle}>
        {step === "identifier"
          ? mode === "email"
            ? "Enter your email address to receive a one-time code."
            : "Enter your phone number to receive a one-time code."
          : mode === "email"
            ? `Enter the 6-digit code sent to ${email.trim()}.`
            : `Enter the 6-digit code sent to +91 ${phone.trim()}.`}
      </Text>

      {step === "identifier" ? (
        mode === "email" ? (
          <FieldSection icon="mail-outline" label="Email address" required>
            <TextInput
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textFaint}
              autoFocus
            />
          </FieldSection>
        ) : (
          <FieldSection icon="call-outline" label="Phone number" required>
            <View style={styles.phoneRow}>
              <Text style={styles.prefix}>+91</Text>
              <TextInput
                style={styles.phoneInput}
                keyboardType="number-pad"
                maxLength={10}
                value={phone}
                onChangeText={(v) => setPhone(v.replace(/[^0-9]/g, ""))}
                placeholder="10-digit mobile number"
                placeholderTextColor={colors.textFaint}
                autoFocus
              />
            </View>
          </FieldSection>
        )
      ) : (
        <FieldSection icon="keypad-outline" label="One-time code" required>
          <TextInput
            style={styles.input}
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={(v) => setCode(v.replace(/[^0-9]/g, ""))}
            placeholder="6-digit code"
            placeholderTextColor={colors.textFaint}
            autoFocus
          />
        </FieldSection>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.navColumn}>
        {step === "identifier" ? (
          <PrimaryButton
            title="Send OTP"
            icon="arrow-forward"
            onPress={handleSendOtp}
            disabled={!identifierValid || !mode}
            loading={sending}
          />
        ) : (
          <>
            <PrimaryButton
              title="Verify"
              icon="checkmark"
              onPress={handleVerifyOtp}
              disabled={!codeValid}
              loading={verifying}
            />
            <View style={styles.navBackWrap}>
              <PrimaryButton
                title={cooldown > 0 ? `Resend OTP (${cooldown}s)` : "Resend OTP"}
                variant="outline"
                onPress={handleSendOtp}
                disabled={cooldown > 0}
                loading={sending}
              />
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: 60 },
  headerIconCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: spacing.xl,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 15,
  },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  prefix: { fontSize: 15, color: colors.text, fontWeight: "600" },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 15,
  },
  errorText: { color: colors.error, marginBottom: spacing.md, textAlign: "center" },
  navColumn: { marginTop: spacing.sm },
  navBackWrap: { marginTop: spacing.sm },
});
