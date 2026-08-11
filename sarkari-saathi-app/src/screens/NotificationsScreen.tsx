import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { getNotificationHistory } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { RootStackParamList } from "../navigation";
import { colors, fonts, radius, shadow, spacing, typography } from "../theme";
import { NotificationEntry } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Notifications">;

function formatSentAt(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NotificationsScreen({ navigation }: Props) {
  const { initializing } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [entries, setEntries] = useState<NotificationEntry[]>([]);

  useEffect(() => {
    // AuthContext restores the session token from AsyncStorage asynchronously
    // on app boot — firing this request before that finishes means the
    // request goes out with no Authorization header at all (401 "Missing
    // session token"), even for an already-logged-in user.
    if (initializing) return;
    let cancelled = false;
    getNotificationHistory()
      .then((res) => {
        if (!cancelled) setEntries(res);
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
  }, [initializing]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={colors.error} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="notifications-off-outline" size={40} color={colors.textFaint} />
        <Text style={styles.empty}>No notifications yet.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.list}
      data={entries}
      keyExtractor={(item, i) => `${item.slug ?? "x"}-${item.sent_at}-${i}`}
      renderItem={({ item }) => (
        <Pressable
          style={styles.row}
          disabled={!item.slug}
          onPress={() => item.slug && navigation.navigate("SchemeDetail", { slug: item.slug })}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="megaphone-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.textCol}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.time}>{formatSentAt(item.sent_at)}</Text>
          </View>
          {item.slug ? (
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          ) : null}
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
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
  textCol: { flex: 1 },
  title: { fontSize: 14, fontFamily: fonts.bold, color: colors.text, marginBottom: 2 },
  body: { ...typography.body, marginBottom: 2 },
  time: { ...typography.caption },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl, gap: spacing.sm },
  errorText: { color: colors.error, textAlign: "center" },
  empty: { ...typography.body, color: colors.textMuted, textAlign: "center" },
});
