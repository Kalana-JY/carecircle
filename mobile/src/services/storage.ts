import { Platform } from 'react-native';

const memoryStorage = new Map<string, string>();

/**
 * Cross-platform helper to store, retrieve, and delete authentication tokens.
 * Handles Web, Expo SecureStore, and fallback memory storage gracefully.
 */
export const tokenStorage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        } else {
          memoryStorage.set(key, value);
        }
        return;
      }

      // Dynamically load expo-secure-store to avoid compilation errors if not installed
      try {
        const SecureStore = require('expo-secure-store');
        if (SecureStore && typeof SecureStore.setItemAsync === 'function') {
          await SecureStore.setItemAsync(key, value);
          return;
        }
      } catch {
        // Fall through to memory storage
      }

      memoryStorage.set(key, value);
    } catch (error) {
      console.warn('[Storage] Failed to setItem, falling back to memory:', error);
      memoryStorage.set(key, value);
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return memoryStorage.get(key) || null;
      }

      try {
        const SecureStore = require('expo-secure-store');
        if (SecureStore && typeof SecureStore.getItemAsync === 'function') {
          return await SecureStore.getItemAsync(key);
        }
      } catch {
        // Fall through to memory storage
      }

      return memoryStorage.get(key) || null;
    } catch (error) {
      console.warn('[Storage] Failed to getItem, falling back to memory:', error);
      return memoryStorage.get(key) || null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        } else {
          memoryStorage.delete(key);
        }
        return;
      }

      try {
        const SecureStore = require('expo-secure-store');
        if (SecureStore && typeof SecureStore.deleteItemAsync === 'function') {
          await SecureStore.deleteItemAsync(key);
          return;
        }
      } catch {
        // Fall through to memory storage
      }

      memoryStorage.delete(key);
    } catch (error) {
      console.warn('[Storage] Failed to removeItem, falling back to memory:', error);
      memoryStorage.delete(key);
    }
  }
};
