import { Ionicons } from "@expo/vector-icons";
import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/poppins";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { AuthProvider } from "./src/context/AuthContext";
import { MainTabParamList, RootStackParamList } from "./src/navigation";
import { navigateToSchemeFromNotificationData, navigationRef } from "./src/navigationRef";
import {
  addNotificationResponseListener,
  ensureAndroidChannel,
  getLastNotificationResponse,
} from "./src/notifications/push";
import AboutScreen from "./src/screens/AboutScreen";
import AskScreen from "./src/screens/AskScreen";
import DocumentsScreen from "./src/screens/DocumentsScreen";
import HelpSupportScreen from "./src/screens/HelpSupportScreen";
import HomeScreen from "./src/screens/HomeScreen";
import LatestSchemesScreen from "./src/screens/LatestSchemesScreen";
import LoginScreen from "./src/screens/LoginScreen";
import NotificationsScreen from "./src/screens/NotificationsScreen";
import PrivacySecurityScreen from "./src/screens/PrivacySecurityScreen";
import ProfileFormScreen from "./src/screens/ProfileFormScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import ResultsListScreen from "./src/screens/ResultsListScreen";
import SavedScreen from "./src/screens/SavedScreen";
import SchemeDetailScreen from "./src/screens/SchemeDetailScreen";
import SearchScreen from "./src/screens/SearchScreen";
import { colors, fonts } from "./src/theme";

SplashScreen.preventAutoHideAsync();

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: "home",
  Search: "search",
  AIAssistant: "sparkles",
  Saved: "heart",
  Profile: "person",
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: fonts.bold },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: { fontFamily: fonts.semiBold, fontSize: 11 },
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons
            name={focused ? TAB_ICONS[route.name] : (`${TAB_ICONS[route.name]}-outline` as any)}
            color={color}
            size={size}
          />
        ),
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false, tabBarLabel: "Home" }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: "Search Schemes", tabBarLabel: "Search" }}
      />
      <Tab.Screen
        name="AIAssistant"
        component={AskScreen}
        options={{ title: "AI Assistant", tabBarLabel: "Assistant" }}
      />
      <Tab.Screen
        name="Saved"
        component={SavedScreen}
        options={{ title: "Saved", tabBarLabel: "Saved" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerShown: false, tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    ensureAndroidChannel();

    // Tap that launched the app from a fully killed state — a separate path
    // from the listener below, both are needed.
    getLastNotificationResponse().then((response) => {
      if (response) navigateToSchemeFromNotificationData(response.notification.request.content.data);
    });

    // Tap while backgrounded or foregrounded.
    const subscription = addNotificationResponseListener((response) => {
      navigateToSchemeFromNotificationData(response.notification.request.content.data);
    });
    return () => subscription.remove();
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider>
      <NavigationContainer ref={navigationRef}>
        <StatusBar style="auto" />
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            headerShadowVisible: false,
            headerTitleStyle: { fontFamily: fonts.bold },
          }}
        >
          <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen
            name="Results"
            component={ResultsListScreen}
            options={{ title: "Matching Schemes" }}
          />
          <Stack.Screen
            name="SchemeDetail"
            component={SchemeDetailScreen}
            options={{ title: "Scheme Details" }}
          />
          <Stack.Screen
            name="Documents"
            component={DocumentsScreen}
            options={{ title: "Documents You May Need" }}
          />
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Log In" }} />
          <Stack.Screen
            name="EligibilityForm"
            component={ProfileFormScreen}
            options={{ title: "Your Profile" }}
          />
          <Stack.Screen
            name="PrivacySecurity"
            component={PrivacySecurityScreen}
            options={{ title: "Privacy & Security" }}
          />
          <Stack.Screen name="AboutApp" component={AboutScreen} options={{ title: "About" }} />
          <Stack.Screen
            name="HelpSupport"
            component={HelpSupportScreen}
            options={{ title: "Help & Support" }}
          />
          <Stack.Screen
            name="LatestSchemes"
            component={LatestSchemesScreen}
            options={{ title: "Latest Schemes" }}
          />
          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{ title: "Notifications" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}
