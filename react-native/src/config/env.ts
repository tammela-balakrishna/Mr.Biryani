import { Platform } from 'react-native';

// Non-secret configuration only. Anything in EXPO_PUBLIC_* is shipped inside the app bundle,
// so never put keys, signing secrets or provider credentials here.
//
// Android emulators reach the host machine at http://10.0.2.2:8081; iOS simulators and web use http://localhost:8081.
const DEFAULT_API_BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8081' : 'http://localhost:8081';

export const API_BASE_URL: string = (process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, '');
