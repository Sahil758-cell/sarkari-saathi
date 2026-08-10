import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SectionHeader from "../components/SectionHeader";
import { CATEGORIES } from "../constants";
import { TabScreenProps } from "../navigation";
import { listProfiles } from "../storage/profiles";
import { colors, fonts, gradients, radius, shadow, spacing, typography } from "../theme";
import { SavedProfile } from "../types";

type Props = TabScreenProps<"Home">;

export default function HomeScreen({ navigation }: Props) {
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);

  useFocusEffect(
    useCallback(() => {
      listProfiles().then(setProfiles);
    }, [])
  );

  function tap() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoCircle}>
            <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.appName}>Sarkari Saathi</Text>
            <Text style={styles.tagline}>Your Guide to Government Schemes</Text>
          </View>
        </View>
        <Pressable
          style={styles.bellButton}
          onPress={() => {
            tap();
            navigation.navigate("Notifications", undefined);
          }}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.greetingRow}>
        <View style={styles.greetingText}>
          <Text style={styles.greeting}>Namaste! 🙏</Text>
          <Text style={styles.greetingSubtitle}>
            Find government schemes you're eligible for, in just a few steps.
          </Text>
        </View>
        <View style={styles.greetingIcon}>
          <Ionicons name="business" size={40} color={colors.primary} />
        </View>
      </View>

      <Pressable
        onPress={() => {
          tap();
          navigation.navigate("EligibilityForm", undefined);
        }}
      >
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, shadow.button]}
        >
          <View style={styles.iconCircleLight}>
            <Ionicons name="locate" size={26} color={colors.primary} />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitleLight}>Find My Schemes</Text>
            <Text style={styles.cardSubtitleLight}>
              Answer a few simple questions and discover schemes you may be eligible for.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#fff" />
        </LinearGradient>
      </Pressable>

      <SectionHeader
        title="Quick Actions"
        onViewAll={() => {
          tap();
          navigation.navigate("Search", undefined);
        }}
      />
      <View style={styles.quickActionsGrid}>
        <Pressable
          style={styles.quickAction}
          onPress={() => {
            tap();
            navigation.navigate("Search", undefined);
          }}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: "#e6f0ea" }]}>
            <Ionicons name="search-outline" size={22} color={colors.primary} />
          </View>
          <Text style={styles.quickActionTitle}>Search Scheme</Text>
          <Text style={styles.quickActionSubtitle}>Find any scheme</Text>
        </Pressable>

        <Pressable
          style={styles.quickAction}
          onPress={() => {
            tap();
            navigation.navigate("AIAssistant", undefined);
          }}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: "#e8eefc" }]}>
            <Ionicons name="sparkles-outline" size={22} color="#3b5bdb" />
          </View>
          <Text style={styles.quickActionTitle}>Ask AI</Text>
          <Text style={styles.quickActionSubtitle}>Get answers in seconds</Text>
        </Pressable>

        <Pressable
          style={styles.quickAction}
          onPress={() => {
            tap();
            navigation.navigate("Documents");
          }}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: "#fdf3e3" }]}>
            <Ionicons name="document-text-outline" size={22} color="#b8860b" />
          </View>
          <Text style={styles.quickActionTitle}>Documents</Text>
          <Text style={styles.quickActionSubtitle}>Learn what you need</Text>
        </Pressable>

        <Pressable
          style={styles.quickAction}
          onPress={() => {
            tap();
            navigation.navigate("Saved", undefined);
          }}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: "#fbe9ec" }]}>
            <Ionicons name="heart-outline" size={22} color="#c2255c" />
          </View>
          <Text style={styles.quickActionTitle}>Saved</Text>
          <Text style={styles.quickActionSubtitle}>Your preferences</Text>
        </Pressable>
      </View>

      <SectionHeader
        title="Popular Categories"
        onViewAll={() => {
          tap();
          navigation.navigate("Search", undefined);
        }}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat.key}
            style={styles.categoryItem}
            onPress={() => {
              tap();
              navigation.navigate("Search", { initialQuery: cat.label });
            }}
          >
            <View style={styles.categoryIconCircle}>
              <Ionicons name={cat.icon} size={22} color={colors.primary} />
            </View>
            <Text style={styles.categoryLabel} numberOfLines={2}>
              {cat.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <SectionHeader title="Government Updates" />
      <Pressable
        style={styles.updateCard}
        onPress={() => {
          tap();
          navigation.navigate("LatestSchemes", undefined);
        }}
      >
        <View style={styles.updateIcon}>
          <Ionicons name="megaphone-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.cardText}>
          <Text style={styles.updateTitle}>Latest Schemes</Text>
          <Text style={styles.updateSubtitle}>Explore new government initiatives</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
      </Pressable>

      {profiles.length > 0 ? (
        <>
          <SectionHeader
            title="Your Saved Profiles"
            onViewAll={() => {
              tap();
              navigation.navigate("Saved", undefined);
            }}
          />
          {profiles.slice(0, 2).map((p) => (
            <Pressable
              key={p.id}
              style={styles.savedRow}
              onPress={() => navigation.navigate("Results", { profile: p.profile })}
            >
              <View style={styles.iconCircle}>
                <Ionicons name="person-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.savedTextCol}>
                <Text style={styles.savedName}>{p.name}</Text>
                <Text style={styles.savedLabel}>{p.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </Pressable>
          ))}
        </>
      ) : null}
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
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  appName: { fontSize: 18, fontFamily: fonts.bold, color: colors.text },
  tagline: { fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  greetingText: { flex: 1 },
  greeting: { fontSize: 22, fontFamily: fonts.extraBold, color: colors.text, marginBottom: 4 },
  greetingSubtitle: { ...typography.body, color: colors.textMuted, lineHeight: 19 },
  greetingIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.md,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  iconCircleLight: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  cardText: { flex: 1 },
  cardTitleLight: { fontSize: 18, fontFamily: fonts.bold, color: "#fff", marginBottom: 2 },
  cardSubtitleLight: { fontSize: 12, fontFamily: fonts.regular, color: "rgba(255,255,255,0.85)", lineHeight: 16 },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  quickAction: {
    width: "47%",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadow.card,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  quickActionTitle: { fontSize: 14, fontFamily: fonts.bold, color: colors.text, marginBottom: 2 },
  quickActionSubtitle: { fontSize: 11, fontFamily: fonts.regular, color: colors.textMuted },
  categoryScroll: { marginBottom: spacing.lg },
  categoryItem: { alignItems: "center", marginRight: spacing.md, width: 78 },
  categoryIconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  categoryLabel: { fontSize: 12, fontFamily: fonts.semiBold, color: colors.text, textAlign: "center" },
  updateCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  updateIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  updateTitle: { fontSize: 14, fontFamily: fonts.bold, color: colors.text },
  updateSubtitle: { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted },
  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  savedTextCol: { flex: 1 },
  savedName: { fontSize: 15, fontFamily: fonts.bold, color: colors.text, marginBottom: 2 },
  savedLabel: { ...typography.body },
});
