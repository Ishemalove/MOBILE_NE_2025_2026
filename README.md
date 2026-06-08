# LexiTech Dictionary Mobile App

React Native + Expo dictionary application for Android and iOS. It searches English words using the Free Dictionary API and shows definitions, examples, pronunciation audio, and search history.

## Requirements

- Node.js installed
- npm installed
- Expo Go on a physical Android or iOS phone, or an Android/iOS emulator
- Internet access for API requests

On Windows PowerShell, if `npm` is blocked by the execution policy, use `npm.cmd`.

## Install Dependencies

Standard command:

```bash
npm install
```

Windows PowerShell command:

```powershell
npm.cmd install
```

If the npm cache causes permission problems, use a project-local cache:

```powershell
npm.cmd install --cache .\.npm-cache --no-audit --no-fund
```

## Run The App

Start Expo:

```bash
npm run start
```

Windows PowerShell:

```powershell
npm.cmd run start
```

Then use one of these options:

- Scan the QR code with Expo Go.
- Press `a` in the Expo terminal to open Android.
- Press `i` in the Expo terminal to open iOS.

## Testing With Expo CLI

Run on Android:

```bash
npm run android
```

Run on iOS:

```bash
npm run ios
```

Run on web:

```bash
npm run web
```

Run Expo Doctor:

```bash
npm run doctor
```

## Manual Test Steps

1. Open the app and search with an empty input. The app should show a validation message.
2. Search `example`. The app should show the word, phonetic spelling, parts of speech, definitions, examples, and pronunciation controls when audio exists.
3. Tap a speaker icon. The audio should load and play.
4. Tap pause while audio is playing. Playback should pause.
5. Tap play again. Playback should resume.
6. Tap stop. Playback should stop and reset.
7. Search a word with multiple pronunciation URLs. The app should show multiple speaker buttons.
8. Search a word without audio. The pronunciation buttons should be hidden.
9. Search `zzzznotaword`. The app should show a friendly word-not-found message.
10. Turn off the network and search a word. The app should show a network error and should not crash.
11. Search the same valid word twice. The drawer history should show it only once.
12. Open the drawer and tap a searched word. The app should fetch that word again and refresh the details screen.

## Troubleshooting

If install is interrupted, delete the incomplete dependency folders and reinstall:

```powershell
Remove-Item -LiteralPath 'node_modules' -Recurse -Force
Remove-Item -LiteralPath '.npm-cache' -Recurse -Force
npm.cmd install
```

If Metro reports `Cannot find module 'babel-preset-expo'`, reinstall dependencies and restart Expo with a cleared cache:

```powershell
npm.cmd install
npm.cmd run start -- --clear
```

If Metro reports `ENOENT: no such file or directory, scandir 'assets\images'`, make sure the project contains this folder:

```text
assets/images
```

If Expo cannot connect to your phone, make sure the computer and phone are on the same network, then restart Expo.

If the API does not respond, test this URL in a browser:

```text
https://api.dictionaryapi.dev/api/v2/entries/en/example
```

## Design Handoff

Open the design mockup:

```text
design/figma-dictionary-design.html
```

## Separate Documentation

- Data flow diagram: `docs/DATA_FLOW_DIAGRAM.md`
- System architecture: `docs/SYSTEM_ARCHITECTURE.md`
- Activity verification checklist: `docs/ACTIVITY_VERIFICATION.md`
