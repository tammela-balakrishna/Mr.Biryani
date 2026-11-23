import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Non-secret configuration only. Anything in EXPO_PUBLIC_* is shipped inside the app bundle,
// so never put keys, signing secrets or provider credentials here.
//
// Dynamic dev host resolution:
// In Expo Go on physical device over Wi-Fi, hostUri matches the PC's LAN IP (e.g. 192.168.x.x:8082).
// In USB debugging with adb reverse, localhost:8081 routes directly to the PC backend port 8081.
const getDevHost = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as any).manifest?.debuggerHost ??
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:8081`;
    }
  }

  return Platform.OS === 'android' ? 'http://localhost:8081' : 'http://localhost:8081';
};

const DEFAULT_API_BASE_URL = getDevHost();

export const API_BASE_URL: string = (process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, '');

