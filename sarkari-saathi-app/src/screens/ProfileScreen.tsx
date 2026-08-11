import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "../components/Text";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { TabScreenProps } from "../navigation";
import { listProfiles } from "../storage/profiles";
import { colors, fonts, gradients, radius, shadow, spacing, typography } from "../theme";
import { SavedProfile } from "../types";

type Props = TabScreenProps<"Profile">;

function deriveDisplayName(email: string): string {
  const local = email.split("@")[0];
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatMemberSince(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function ProfileScreen({ navigation }: Props) {
  const { identifier, memberSince, initializing, logout } = useAuth();
  const { t } = useLanguage();
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);

  useFocusEffect(
    useCallback(() => {
      listProfiles().then(setProfiles);
    }, [])
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{t("yourProfile")}</Text>
          <Text style={styles.headerSubtitle}>{t("manageAccount")}</Text>
        </View>
        <View style={styles.headerIcons}>
          <Pressable
            style={styles.headerIconButton}
            onPress={() => navigation.navigate("Notifications", undefined)}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
          </Pressable>
          <Pressable
            style={styles.headerIconButton}
            onPress={() => navigation.navigate("Settings", undefined)}
          >
            <Ionicons name="settings-outline" size={20} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {initializing ? null : !identifier ? (
        <View style={styles.loggedOutState}>
          <View style={styles.loggedOutIconCircle}>
            <Ionicons name="lock-closed-outline" size={36} color={colors.primary} />
          </View>
          <Text style={styles.loggedOutHeading}>{t("notLoggedIn")}</Text>
          <Text style={styles.loggedOutSubtitle}>
            {t("notLoggedInSubtitle")}
          </Text>
          <Pressable style={styles.loginButtonLarge} onPress={() => navigation.navigate("Login")}>
            <Text style={styles.loginButtonLargeText}>{t("logIn")}</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </Pressable>
        </View>
      ) : (
        <>
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroCard, shadow.button]}
        >
          <View style={styles.heroTop}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={26} color={colors.primary} />
            </View>
            <View style={styles.heroText}>
              <Text style={styles.heroName}>{deriveDisplayName(identifier)}</Text>
              <Text style={styles.heroIdentifier}>{identifier}</Text>
              <View style={styles.verifiedPill}>
                <Ionicons name="shield-checkmark" size={12} color="#fff" />
                <Text style={styles.verifiedPillText}>{t("verifiedAccount")}</Text>
              </View>
            </View>
            <Pressable style={styles.logoutButton} onPress={() => logout()}>
              <Text style={styles.logoutText}>{t("logOut")}</Text>
              <Ionicons name="log-out-outline" size={14} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#fff" />
              <Text style={styles.statLabel}>{t("accountStatus")}</Text>
              <Text style={styles.statValue}>{t("verified")}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="calendar-outline" size={16} color="#fff" />
              <Text style={styles.statLabel}>{t("memberSince")}</Text>
              <Text style={styles.statValue}>{formatMemberSince(memberSince)}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="ribbon-outline" size={16} color="#fff" />
              <Text style={styles.statLabel}>{t("trustScore")}</Text>
              <Text style={styles.statValue}>100%</Text>
            </View>
          </View>
        </LinearGradient>

      <View style={styles.actionCard}>
        <View style={styles.iconCircle}>
          <Ionicons name="locate" size={22} color={colors.primary} />
        </View>
        <View style={styles.actionText}>
          <Text style={styles.actionTitle}>{t("updateEligibilityProfile")}</Text>
          <Text style={styles.actionSubtitle}>{t("updateEligibilityProfileSubtitle")}</Text>
        </View>
        <Pressable
          style={styles.updateNowButton}
          onPress={() => navigation.navigate("EligibilityForm", undefined)}
        >
          <Text style={styles.updateNowText}>{t("updateNow")}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeaderTitle}>{t("savedProfiles")}</Text>
        <Pressable onPress={() => navigation.navigate("Saved", undefined)}>
          <Text style={styles.sectionHeaderLink}>{t("viewAll")}</Text>
        </Pressable>
      </View>

      {profiles.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="folder-open-outline" size={30} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>{t("noSavedProfilesYet")}</Text>
          <Text style={styles.emptySubtitle}>
            {t("noSavedProfilesSubtitle")}
          </Text>
          <Pressable
            style={styles.createProfileButton}
            onPress={() => navigation.navigate("EligibilityForm", undefined)}
          >
            <Text style={styles.createProfileText}>{t("createProfile")}</Text>
            <Ionicons name="add-circle-outline" size={16} color="#fff" />
          </Pressable>
        </View>
      ) : (
        profiles.slice(0, 3).map((p) => (
          <Pressable
            key={p.id}
            style={styles.savedRow}
            onPress={() => navigation.navigate("Results", { profile: p.profile })}
          >
            <View style={styles.iconCircleSmall}>
              <Ionicons name="person-outline" size={16} color={colors.primary} />
            </View>
            <View style={styles.savedTextCol}>
              <Text style={styles.savedName}>{p.name}</Text>
              <Text style={styles.savedLabel}>{p.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
          </Pressable>
        ))
      )}

      <Text style={styles.moreHeader}>{t("more")}</Text>
      <View style={styles.moreCard}>
        <Pressable style={styles.moreRow} onPress={() => navigation.navigate("Settings", undefined)}>
          <View style={styles.iconCircle}>
            <Ionicons name="language-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.actionText}>
            <Text style={styles.moreTitle}>{t("language")}</Text>
            <Text style={styles.actionSubtitle}>{t("languageSubtitle")}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </Pressable>
        <View style={styles.divider} />
        <Pressable style={styles.moreRow} onPress={() => navigation.navigate("PrivacySecurity")}>
          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.actionText}>
            <Text style={styles.moreTitle}>{t("privacySecurity")}</Text>
            <Text style={styles.actionSubtitle}>{t("privacySecuritySubtitle")}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </Pressable>
        <View style={styles.divider} />
        <Pressable style={styles.moreRow} onPress={() => navigation.navigate("AboutApp")}>
          <View style={styles.iconCircle}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.actionText}>
            <Text style={styles.moreTitle}>{t("aboutApp")}</Text>
            <Text style={styles.actionSubtitle}>{t("aboutAppSubtitle")}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </Pressable>
        <View style={styles.divider} />
        <Pressable style={styles.moreRow} onPress={() => navigation.navigate("HelpSupport")}>
          <View style={styles.iconCircle}>
            <Ionicons name="headset-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.actionText}>
            <Text style={styles.moreTitle}>{t("helpSupport")}</Text>
            <Text style={styles.actionSubtitle}>{t("helpSupportSubtitle")}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </Pressable>
      </View>
        </>
      )}
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingBottom: 60 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.lg,
  },
  headerTitle: { ...typography.title, fontSize: 22 },
  headerSubtitle: { ...typography.caption, marginTop: 2 },
  headerIcons: { flexDirection: "row", gap: spacing.sm },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  loggedOutState: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xxl,
    marginTop: spacing.xl,
    ...shadow.card,
  },
  loggedOutIconCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  loggedOutHeading: { fontSize: 17, fontFamily: fonts.bold, color: colors.text, marginBottom: spacing.xs },
  loggedOutSubtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: spacing.lg,
  },
  loginButtonLarge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  loginButtonLargeText: { color: "#fff", fontFamily: fonts.semiBold, fontSize: 15 },
  heroCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.lg },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  heroText: { flex: 1 },
  heroName: { fontSize: 18, fontFamily: fonts.bold, color: "#fff" },
  heroIdentifier: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: "rgba(255,255,255,0.85)",
    marginBottom: spacing.xs,
  },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  verifiedPillText: { fontSize: 11, fontFamily: fonts.semiBold, color: "#fff" },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  logoutText: { color: "#fff", fontFamily: fonts.semiBold, fontSize: 12 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
    paddingTop: spacing.md,
  },
  statItem: { alignItems: "center", flex: 1, gap: 2 },
  statLabel: { fontSize: 10, fontFamily: fonts.regular, color: "rgba(255,255,255,0.75)" },
  statValue: { fontSize: 13, fontFamily: fonts.bold, color: "#fff" },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  actionText: { flex: 1 },
  actionTitle: { fontSize: 14, fontFamily: fonts.bold, color: colors.text, marginBottom: 2 },
  actionSubtitle: { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted },
  updateNowButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  updateNowText: { color: colors.primary, fontFamily: fonts.semiBold, fontSize: 12 },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  sectionHeaderTitle: { ...typography.heading },
  sectionHeaderLink: { ...typography.subheading, color: colors.primary },
  emptyCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: { fontSize: 15, fontFamily: fonts.bold, color: colors.text, marginBottom: 4 },
  emptySubtitle: {
    ...typography.caption,
    textAlign: "center",
    marginBottom: spacing.lg,
    lineHeight: 17,
  },
  createProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  createProfileText: { color: "#fff", fontFamily: fonts.semiBold, fontSize: 13 },
  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  iconCircleSmall: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  savedTextCol: { flex: 1 },
  savedName: { fontSize: 15, fontFamily: fonts.bold, color: colors.text, marginBottom: 2 },
  savedLabel: { ...typography.body },
  moreHeader: { ...typography.heading, marginBottom: spacing.sm, marginTop: spacing.sm },
  moreCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadow.card,
  },
  moreRow: { flexDirection: "row", alignItems: "center" },
  moreTitle: { fontSize: 14, fontFamily: fonts.bold, color: colors.text, marginBottom: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
});
