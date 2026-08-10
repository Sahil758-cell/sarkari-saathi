import { createNavigationContainerRef } from "@react-navigation/native";
import { RootStackParamList } from "./navigation";

// Notification tap listeners live outside the NavigationContainer's render
// tree (registered once in App.tsx), so they need this ref instead of a
// `navigation` prop to route taps to SchemeDetail.
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateToSchemeFromNotificationData(data: unknown): void {
  if (!data || typeof data !== "object" || !("slug" in data)) return;
  const slug = (data as { slug?: unknown }).slug;
  if (typeof slug !== "string" || !navigationRef.isReady()) return;
  navigationRef.navigate("SchemeDetail", { slug });
}
