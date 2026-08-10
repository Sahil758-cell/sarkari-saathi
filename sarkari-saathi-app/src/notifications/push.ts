import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Must be set before any notification arrives, or foreground notifications
// won't display — set at module load (App.tsx imports this file at startup).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Android requires a notification channel to exist BEFORE the permission
// prompt is requested, or the OS can silently no-op the prompt on Android 13+.
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "default",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

// Requests permission and returns an Expo push token, or null if permission
// was denied or no EAS project id is configured (e.g. in Expo Go / dev).
export async function requestPushToken(): Promise<string | null> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return null;

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

export function getLastNotificationResponse() {
  return Notifications.getLastNotificationResponseAsync();
}
