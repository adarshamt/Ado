# Ado

Ado is a React Native todo app with Firebase Authentication, per-user todo storage, map-based location selection, background geofencing, and local notifications.

## Stack

- Expo React Native with TypeScript
- React Navigation native stack
- Firebase Authentication
- AsyncStorage for per-user todos
- react-native-maps for location selection
- expo-location and expo-task-manager for geofencing
- expo-notifications for local reminders

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your Firebase web app config.

3. Enable Email/Password sign-in in Firebase Authentication.

4. Add a Google Maps API key if you want Google Maps in production builds.

5. Start the app:

   ```bash
   npm run start
   ```

Background geofencing requires a development build on iOS and reliable device behavior on Android. Expo's location docs note that iOS needs the `location` background mode and that Android behavior can vary after the app is force-stopped. This project configures the required Expo config plugins and permissions.

## Useful Commands

```bash
npm run typecheck
npm run android
npm run ios
```
