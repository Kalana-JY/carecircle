/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#181C1F', // slate neutral
    textSecondary: '#41474F', // on-surface-variant
    background: '#F7FAFD', // serene light background
    card: '#FFFFFF', // surface-container-lowest
    border: '#C1C7D0', // outline-variant
    inputBg: '#EBEEF2', // surface-container (slightly darker than background)
    primary: '#285F8E', // Sky Blue primary
    onPrimary: '#FFFFFF',
    secondary: '#3E6658', // Sage Green secondary
    onSecondary: '#FFFFFF',
    tint: '#285F8E',
    icon: '#727780',
    tabIconDefault: '#727780',
    tabIconSelected: '#285F8E',
  },
  dark: {
    text: '#ECEDEE',
    textSecondary: '#9BA1A6',
    background: '#121517', // dark slate
    card: '#1E2226',
    border: '#2E3236',
    inputBg: '#181C1F',
    primary: '#4478A8',
    onPrimary: '#FFFFFF',
    secondary: '#A5D0BE',
    onSecondary: '#1E1B15',
    tint: '#4478A8',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#4478A8',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
