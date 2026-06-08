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
2. Search `hello world`. The app should show `Please search for one word, not a sentence.`
3. Search `hello123` or `42`. The app should show `Please search for a word instead of numbers.`
4. Search `@hello` or `test!`. The app should show `Please search for a word instead of characters`
5. Search `ice-cream` or `o'clock`. The app should allow valid English word punctuation and search normally.
6. Search a non-English or unknown word. The app should let the API decide and show a friendly word-not-found message when the word does not exist.
7. Search `example`. The app should show the word, phonetic spelling, parts of speech, definitions, examples, and labeled pronunciation controls when audio exists.
8. Tap a speaker icon. The audio should load and play.
9. Tap pause while audio is playing. Playback should pause.
10. Tap play again. Playback should resume.
11. Tap stop. Playback should stop and reset.
12. Search a word with multiple pronunciation URLs. The app should show labeled pronunciation cards such as UK Pronunciation, US Pronunciation, or Australian Pronunciation when the API URL identifies the region.
13. Search a word without audio. The pronunciation section should be hidden.
14. Toggle dark mode and light mode. The app should switch theme colors and remember the selected theme after reload.
15. Search `zzzznotaword`. The app should show a friendly word-not-found message.
16. Turn off the network and search a word. The app should show a network error and should not crash.
17. Search the same valid word twice. The drawer history should show it only once.
18. Reload the app. The drawer history should still be available.
19. Open the drawer and tap a searched word. The app should fetch that word again and refresh the details screen.

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

