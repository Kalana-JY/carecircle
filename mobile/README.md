# CareCircle Mobile App 📱

React Native & Expo client for CareCircle, the Community Mental Health Peer-Support Network.

---

## 📥 Download Standalone Preview APK

To test on an Android device without needing Expo Go or local developer tools:

- **Direct APK Download**: [Download Latest CareCircle Preview APK](https://expo.dev/accounts/kaij789/projects/carecircle/builds/e9c369bb-cc8f-4ce4-bfaf-91562d3580b7)

> **Installation Note**: When installing the `.apk` file on Android, allow installation from unknown sources in your browser settings if prompted.

---

## 🛠️ Local Development

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Start the development server**:

   ```bash
   npm start
   ```

3. **Run on specific devices**:
   - **Android Emulator**: `npm run android`
   - **iOS Simulator**: `npm run ios`
   - **Web**: `npm run web`

---

## 📦 Building with EAS

To create a new standalone build via Expo Application Services:

- **Preview Android APK**:

  ```bash
  eas build --platform android --profile preview
  ```

- **Production Android App Bundle (AAB for Play Store)**:

  ```bash
  eas build --platform android --profile production
  ```

- **Production iOS App Store Package (IPA)**:
  ```bash
  eas build --platform ios --profile production
  ```
