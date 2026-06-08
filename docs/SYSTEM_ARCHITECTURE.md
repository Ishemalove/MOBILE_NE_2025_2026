# System Architecture

## Application Type

The app is a cross-platform React Native application built with Expo. It runs on Android and iOS and uses axios for API communication.

## External API

```text
https://api.dictionaryapi.dev/api/v2/entries/en/{word}
```

The `{word}` parameter is created dynamically from the validated search input.

## Main Modules

```text
App.js
  Constants
    API_BASE_URL
    DRAWER_WIDTH

  Helper Functions
    getFriendlyError()
    normalizeHistoryItem()
    extractAudioOptions()

  UI Components
    ResultView
      Displays searched word, phonetic spelling, definitions, examples, and audio controls.

    HistoryDrawer
      Displays duplicate-free searched words inside the drawer menu.

  App State
    searchTerm
    lastSubmittedWord
    wordData
    history
    validationError
    feedback
    isLoading
    drawerOpen
    audioPlayback

  Feature Functions
    searchWord()
      Validates input, builds the endpoint URL, fetches data with axios, handles errors, and stores data.

    toggleAudio()
      Loads pronunciation audio, plays audio, pauses active audio, or resumes paused audio.

    pauseAudio()
      Pauses current pronunciation playback.

    stopAudio()
      Stops current pronunciation playback and unloads the audio resource.

    selectHistoryItem()
      Runs a new API request when a searched word is selected from the drawer menu.
```

## Pages And Layout

Search and details screen:
- Search input and search button
- Loading indicator
- Empty state
- Error state with retry
- Word detail result
- Audio pronunciation controls

Drawer navigator layout:
- Menu button in the app header
- Slide-in drawer panel
- List of searched words in the drawer menu
- Empty drawer state when no searches exist

## Error Handling

- Empty input is blocked before API request.
- Very long input is blocked before API request.
- `404` API responses show a word-not-found message.
- Network errors show a connection message.
- Malformed responses are caught and converted into a friendly error.
- Audio playback failures show a clear pronunciation error message.
