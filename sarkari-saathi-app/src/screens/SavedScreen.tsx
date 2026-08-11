import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { syncProfiles } from "../api/client";
import { Text } from "../components/Text";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { TabScreenProps } from "../navigation";
import { deleteProfile, listProfiles } from "../storage/profiles";
import { colors, fonts, radius, shadow, spacing, typography } from "../theme";
import { SavedProfile } from "../types";

type Props = TabScreenProps<"Saved">;

export default function SavedScreen({ navigation }: Props) {
  const { identifier } = useAuth();
  const { t } = useLanguage();
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);

  useFocusEffect(
    useCallback(() => {
      listProfiles().then(setProfiles);
    }, [])
  );

  function handleDelete(profile: SavedProfile) {
    Alert.alert(t("deleteProfileTitle"), t("deleteProfileConfirm", { name: profile.name }), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          await deleteProfile(profile.id);
          const all = await listProfiles();
          setProfiles(all);
          if (identifier) syncProfiles(all.map((p) => p.profile)).catch(() => {});
        },
      },
    ]);
  }

  if (profiles.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="bookmark-outline" size={40} color={colors.textFaint} />
        <Text style={styles.emptyText}>
          {t("noSavedProfiles")}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      {profiles.map((p) => (
        <View key={p.id} style={styles.row}>
          <Pressable
            style={styles.rowMain}
            onPress={() => navigation.navigate("Results", { profile: p.profile })}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="person-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.textCol}>
              <Text style={styles.name}>{p.name}</Text>
              <Text style={styles.label}>{p.label}</Text>
            </View>
          </Pressable>
          <Pressable
            style={styles.iconButton}
            onPress={() => navigation.navigate("EligibilityForm", { editProfileId: p.id })}
          >
            <Ionicons name="create-outline" size={20} color={colors.textMuted} />
          </Pressable>
          <Pressable style={styles.iconButton} onPress={() => handleDelete(p)}>
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  rowMain: { flex: 1, flexDirection: "row", alignItems: "center" },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  textCol: { flex: 1 },
  name: { fontSize: 16, fontFamily: fonts.bold, color: colors.text, marginBottom: 2 },
  label: { ...typography.body },
  iconButton: { padding: spacing.sm },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: "center" },
});
