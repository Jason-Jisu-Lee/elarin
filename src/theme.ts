import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Theme Colors ───

export interface ThemeColors {
  // Surfaces
  surface: string;
  surfaceContainerLowest: string;
  surfaceContainer: string;
  surfaceContainerLow: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  surfaceVariant: string;
  surfaceDim: string;

  // Content
  onSurface: string;
  onSurfaceVariant: string;

  // Primary
  primary: string;
  primaryContainer: string;
  onPrimary: string;
  onPrimaryContainer: string;

  // Secondary (harvest gold)
  secondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;

  // Tertiary (green)
  tertiary: string;
  tertiaryContainer: string;

  // Outline
  outline: string;
  outlineVariant: string;

  // Error
  error: string;
  errorContainer: string;

  // Special
  scribbleYellow: string;
  scribbleRed: string;

  // Inverse
  inverseSurface: string;
  inverseOnSurface: string;
}

export const lightColors: ThemeColors = {
  surface: "#fbf9f6",
  surfaceContainerLowest: "#ffffff",
  surfaceContainer: "#efeeeb",
  surfaceContainerLow: "#f5f3f0",
  surfaceContainerHigh: "#eae8e5",
  surfaceContainerHighest: "#e4e2df",
  surfaceVariant: "#e4e2df",
  surfaceDim: "#dbdad7",

  onSurface: "#1b1c1a",
  onSurfaceVariant: "#40484e",

  primary: "#00658d",
  primaryContainer: "#5ba4cf",
  onPrimary: "#ffffff",
  onPrimaryContainer: "#003850",

  secondary: "#745b00",
  secondaryContainer: "#fed663",
  onSecondaryContainer: "#755c00",

  tertiary: "#006c48",
  tertiaryContainer: "#4bae81",

  outline: "#70787f",
  outlineVariant: "#bfc7cf",

  error: "#ba1a1a",
  errorContainer: "#ffdad6",

  scribbleYellow: "#C4A032",
  scribbleRed: "#FF4C4C",

  inverseSurface: "#30312f",
  inverseOnSurface: "#f2f0ed",
};

export const darkColors: ThemeColors = {
  surface: "#131312",
  surfaceContainerLowest: "#0e0e0d",
  surfaceContainer: "#1f201e",
  surfaceContainerLow: "#1b1c1a",
  surfaceContainerHigh: "#2a2a28",
  surfaceContainerHighest: "#353432",
  surfaceVariant: "#40484e",
  surfaceDim: "#131312",

  onSurface: "#e4e2df",
  onSurfaceVariant: "#bfc7cf",

  primary: "#87cffc",
  primaryContainer: "#004c6b",
  onPrimary: "#003548",
  onPrimaryContainer: "#c6e7ff",

  secondary: "#e9c251",
  secondaryContainer: "#584400",
  onSecondaryContainer: "#ffe08d",

  tertiary: "#77d9a9",
  tertiaryContainer: "#005236",

  outline: "#8a9299",
  outlineVariant: "#40484e",

  error: "#ffb4ab",
  errorContainer: "#93000a",

  scribbleYellow: "#e9c251",
  scribbleRed: "#ff6b6b",

  inverseSurface: "#e4e2df",
  inverseOnSurface: "#30312f",
};

// ─── Font Family Constants ───

export const fonts = {
  headlineBold: "Manrope_700Bold",
  headlineExtraBold: "Manrope_800ExtraBold",
  bodyRegular: "PlusJakartaSans_400Regular",
  bodyMedium: "PlusJakartaSans_500Medium",
  bodySemiBold: "PlusJakartaSans_600SemiBold",
  bodyBold: "PlusJakartaSans_700Bold",
  bodyItalic: "PlusJakartaSans_400Regular_Italic",
  handwritten: "Caveat_400Regular",
};

// ─── Storage ───

const THEME_KEY = "elarin:theme";

export type ThemeName = "light" | "dark";

export async function getStoredTheme(): Promise<ThemeName> {
  const val = await AsyncStorage.getItem(THEME_KEY);
  return val === "dark" ? "dark" : "light";
}

export async function storeTheme(theme: ThemeName): Promise<void> {
  await AsyncStorage.setItem(THEME_KEY, theme);
}

// ─── Context ───

interface ThemeContextValue {
  theme: ThemeName;
  colors: ThemeColors;
  isDark: boolean;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  colors: lightColors,
  isDark: false,
  setTheme: () => {},
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

// ─── Provider (created as a function, used in _layout.tsx) ───

export { ThemeContext };
