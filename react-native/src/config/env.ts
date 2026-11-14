// Non-secret configuration only. Anything in EXPO_PUBLIC_* is shipped inside the app bundle,
// so never put keys, signing secrets or provider credentials here.
//
// Android emulators reach the host machine at http://10.0.2.2:8080; iOS simulators use localhost.
const DEFAULT_API_BASE_URL = 'http://localhost:8080';

export const API_BASE_URL: string = (process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, '');
