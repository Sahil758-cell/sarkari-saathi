import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { CompositeScreenProps } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Profile } from "./types";

export type MainTabParamList = {
  Home: undefined;
  Search: { initialQuery?: string } | undefined;
  AIAssistant: { initialQuery?: string } | undefined;
  Saved: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  Results: { profile: Profile };
  SchemeDetail: { slug: string };
  Documents: undefined;
  Login: undefined;
  EligibilityForm: { editProfileId?: string } | undefined;
  PrivacySecurity: undefined;
  AboutApp: undefined;
  HelpSupport: undefined;
  LatestSchemes: undefined;
  Notifications: undefined;
};

// Screens that live inside a tab but need to push root-level screens
// (Results, SchemeDetail, Documents) use this composite prop type.
export type TabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
