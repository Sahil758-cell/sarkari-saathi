import AsyncStorage from "@react-native-async-storage/async-storage";
import { Language } from "../i18n/strings";

const KEY = "sarkari-saathi:language";

export async function getStoredLanguage(): Promise<Language | null> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw === "en" || raw === "hi" ? raw : null;
}

export async function setStoredLanguage(language: Language): Promise<void> {
  await AsyncStorage.setItem(KEY, language);
}
