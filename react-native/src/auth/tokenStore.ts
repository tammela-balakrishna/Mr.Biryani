import * as SecureStore from 'expo-secure-store';

// The refresh token is the only long-lived credential on the device. It lives in the platform keystore
// (iOS Keychain / Android Keystore). Passwords and access tokens are never written to disk.
const REFRESH_KEY = 'mrbiryani.refreshToken';

export const readRefreshToken = (): Promise<string | null> => SecureStore.getItemAsync(REFRESH_KEY);

export const writeRefreshToken = (token: string): Promise<void> =>
  SecureStore.setItemAsync(REFRESH_KEY, token, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });

export const clearRefreshToken = (): Promise<void> => SecureStore.deleteItemAsync(REFRESH_KEY);
