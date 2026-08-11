import { StyleSheet, Text as RNText, TextProps } from "react-native";
import { useLanguage } from "../context/LanguageContext";

// Poppins (the app's only loaded font, see theme.ts) has no Devanagari
// glyphs. Rather than making every screen's module-scope StyleSheet.create()
// reactive to language (a huge structural refactor touching every screen),
// this wrapper swaps fontFamily on the flattened style at render time —
// every other screen keeps using its existing static styles untouched, only
// importing Text from here instead of react-native.
const POPPINS_TO_DEVANAGARI: Record<string, string> = {
  Poppins_400Regular: "NotoSansDevanagari_400Regular",
  Poppins_600SemiBold: "NotoSansDevanagari_600SemiBold",
  Poppins_700Bold: "NotoSansDevanagari_700Bold",
  Poppins_800ExtraBold: "NotoSansDevanagari_800ExtraBold",
};

export function Text({ style, ...props }: TextProps) {
  const { language } = useLanguage();

  if (language !== "hi") {
    return <RNText style={style} {...props} />;
  }

  const flat = StyleSheet.flatten(style) || {};
  const mappedFamily = flat.fontFamily ? POPPINS_TO_DEVANAGARI[flat.fontFamily] : undefined;

  return <RNText style={[style, mappedFamily ? { fontFamily: mappedFamily } : null]} {...props} />;
}
