export const colors = {
  primary: "#1a5f3f",
  primaryLight: "#e6f0ea",
  primaryDark: "#0f3d28",
  accent: "#d97706",
  background: "#f7f8f6",
  surface: "#ffffff",
  border: "#e4e7e2",
  text: "#1c1f1d",
  textMuted: "#6b716d",
  textFaint: "#9aa19c",
  error: "#b00020",
  errorLight: "#fdecee",
  success: "#1a5f3f",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  button: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const gradients = {
  primary: [colors.primary, colors.primaryDark] as const,
};

export const fonts = {
  regular: "Poppins_400Regular",
  semiBold: "Poppins_600SemiBold",
  bold: "Poppins_700Bold",
  extraBold: "Poppins_800ExtraBold",
};

export const typography = {
  title: { fontSize: 26, fontFamily: fonts.extraBold, color: colors.text },
  heading: { fontSize: 18, fontFamily: fonts.bold, color: colors.text },
  subheading: { fontSize: 14, fontFamily: fonts.semiBold, color: colors.textMuted },
  body: { fontSize: 14, fontFamily: fonts.regular, color: colors.text },
  caption: { fontSize: 12, fontFamily: fonts.regular, color: colors.textMuted },
};
