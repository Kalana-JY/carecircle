import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Resolves the backend base URL dynamically depending on the current platform and environment.
 * - Web: http://localhost:5000 (or current host)
 * - Android Emulator: http://10.0.2.2:5000
 * - iOS Simulator / Physical Device: Expo hostUri IP address (or fallback http://localhost:5000)
 */
const getBaseUrl = (): string => {
  if (Platform.OS === 'web') {
    return 'http://localhost:5000';
  }

  // expoConfig?.hostUri is usually like "192.168.1.50:8081"
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip) {
      return `http://${ip}:5000`;
    }
  }

  // Fallback for Android emulator vs iOS simulator
  return Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';
};

export const API_URL = getBaseUrl();
console.log('[API] Base URL configured to:', API_URL);
