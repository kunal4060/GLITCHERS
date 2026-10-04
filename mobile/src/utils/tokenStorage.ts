import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'nexa-auth-token-secure';

/**
 * Secure token storage backed by expo-secure-store (Keychain / Keystore).
 * Auth tokens must never live in plain AsyncStorage.
 */
export async function saveAuthToken(token: string): Promise<void> {
  // M15: failures propagate — callers (setToken/migration) decide how loud to
  // be. Swallowing here made "saved" a lie and logged users out on relaunch.
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function loadAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (err) {
    console.warn('SecureStore load failed:', err);
    return null;
  }
}

export async function clearAuthToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (err) {
    console.warn('SecureStore delete failed:', err);
  }
}

/** RFC-4122 v4 UUID without extra dependencies (React Native has crypto.getRandomValues). */
export function newUuid(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
