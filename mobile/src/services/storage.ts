import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const memoryStorage = new Map<string, string>();

/**
 * Phone and tablet builds keep the session in the device secure store.
 * The web build still uses localStorage. Expo SecureStore has no browser
 * keychain, and moving the web session to an httpOnly cookie needs the API
 * to set that cookie itself. Until that change, do not put the web app on a
 * shared computer, and sign out when finished. A future web migration should:
 * 1. Add a cookie-based session route that sets HttpOnly, Secure, and SameSite.
 * 2. Stop writing the token into localStorage.
 * 3. Send requests with credentials: 'include' on the same site as the API.
 * Memory is only a last resort if the secure store call fails.
 */
const useSecureStore = Platform.OS !== 'web';

export const tokenStorage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (!useSecureStore) {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        } else {
          memoryStorage.set(key, value);
        }
        return;
      }

      await SecureStore.setItemAsync(key, value);
    } catch {
      memoryStorage.set(key, value);
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      if (!useSecureStore) {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return memoryStorage.get(key) || null;
      }

      return (await SecureStore.getItemAsync(key)) ?? memoryStorage.get(key) ?? null;
    } catch {
      return memoryStorage.get(key) || null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (!useSecureStore) {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        } else {
          memoryStorage.delete(key);
        }
        return;
      }

      await SecureStore.deleteItemAsync(key);
      memoryStorage.delete(key);
    } catch {
      memoryStorage.delete(key);
    }
  },
};
