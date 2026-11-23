import * as SecureStore from 'expo-secure-store';

// The refresh token is the only long-lived credential on the device. It lives in the platform keystore
// (iOS Keychain / Android Keystore) with in-memory fallback if keystore is unavailable.
let memoryToken: string | null = null;
const REFRESH_KEY = 'mrbiryani.refreshToken';

export const readRefreshToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(REFRESH_KEY);
  } catch {
    return memoryToken;
  }
};

export const writeRefreshToken = async (token: string): Promise<void> => {
  memoryToken = token;
  try {
    await SecureStore.setItemAsync(REFRESH_KEY, token, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
  } catch {}
};

export const clearRefreshToken = async (): Promise<void> => {
  memoryToken = null;
  try {
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  } catch {}
};
