# PRnote Android App

PRnote is a minimal Android-focused Capacitor project. The native Android wrapper lives in `android/`, and the editable app UI lives in `src/`.

## Requirements

- Node.js 22+
- npm
- Java 21
- Android SDK / Android Studio
- `adb` for device installs

## Main Commands

Start the fast web preview while editing UI:

```sh
npm run dev
```

Sync web changes into the Android project:

```sh
npm run android:sync
```

Build the Android debug APK:

```sh
cd android
./gradlew assembleDebug
```

Install the debug APK on a connected phone:

```sh
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## Daily Android Workflow

```sh
npm run android:sync
cd android
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## Kept In This Repo

- `android/` for the native Android project
- `src/` for the app screens, hooks, and core UI
- `public/favicon.ico`
- `capacitor.config.ts`
- Vite, TypeScript, Tailwind, and npm config files needed to keep editing the app

## Notes

- After changing app code in `src/`, run `npm run android:sync` before rebuilding the APK.
- This repo was trimmed to remove test files, Playwright files, Bun lockfiles, and unused generated UI components.
