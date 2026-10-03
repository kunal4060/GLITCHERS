// Theme state: persists the selected theme id and applies its palette
// onto designTokens.colors (which every screen reads at import time).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { designTokens } from './designTokens';
import { THEMES, DEFAULT_THEME_ID, buildPalette, getTheme } from './themes';

const STORAGE_KEY = 'nexa-theme-id';

let currentThemeId: string = DEFAULT_THEME_ID;

/** Apply a theme's palette onto the shared designTokens.colors object. */
export function applyTheme(id: string): void {
  const theme = getTheme(id);
  currentThemeId = theme.id;
  const palette = buildPalette(theme);
  // Mutate in place so existing `const C = designTokens.colors` refs see it.
  const colors = designTokens.colors as Record<string, string>;
  for (const k of Object.keys(colors)) delete colors[k];
  Object.assign(colors, palette);
}

export function getCurrentThemeId(): string {
  return currentThemeId;
}

export function getCurrentTheme() {
  return getTheme(currentThemeId);
}

/** Load saved theme (call once at boot, before screens import). */
export async function initTheme(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    applyTheme(saved || DEFAULT_THEME_ID);
  } catch {
    applyTheme(DEFAULT_THEME_ID);
  }
  return currentThemeId;
}

/** Persist a new theme selection. Caller should reload the app to apply. */
export async function persistThemeId(id: string): Promise<void> {
  currentThemeId = getTheme(id).id;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, currentThemeId);
  } catch {
    // ignore — theme still applies for this session via reload fallback
  }
}

export { THEMES, DEFAULT_THEME_ID };
