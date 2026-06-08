# Activity Verification Checklist

## Activity 1: Word Search & API Integration

- Done: Search screen has a text input and search button.
- Done: User input is validated so the search field is not empty.
- Done: The entered word is captured when the user submits the search field.
- Done: The API request URL is constructed dynamically using the entered word.
- Done: axios sends an HTTP GET request to `https://api.dictionaryapi.dev/api/v2/entries/en/{word}`.
- Done: Loading indicators display while the API request is in progress.
- Done: JSON responses are received, checked, and parsed.
- Done: Fetched word data is stored temporarily in React state for display and navigation.

## Activity 2: Display Word Details

- Done: Main word, phonetics, meanings, and definitions are extracted from the API response.
- Done: The searched word is displayed prominently at the top of the screen.
- Done: Phonetic spelling is shown when available.
- Done: Each part of speech is displayed.
- Done: Definitions are listed under their respective parts of speech.
- Done: Example sentences are displayed when provided by the API.
- Done: Multiple meanings and long definitions are supported with a scroll layout.
- Done: Consistent styling and spacing are applied for readability.

## Activity 3: Audio Pronunciation Feature

- Done: The app checks whether an audio pronunciation URL exists in the API response.
- Done: A pronunciation speaker icon is displayed next to the word or phonetics.
- Done: The audio file is loaded from the provided URL using `expo-av`.
- Done: Audio plays when the user taps the pronunciation icon.
- Done: Multiple audio pronunciations are handled with separate speaker buttons.
- Done: The audio button is disabled or hidden if no pronunciation is provided.
- Done: Audio playback states are managed: play, pause, and stop.
- Done: Audio playback errors are handled gracefully with a friendly message.

## Activity 4: Drawer Navigation & Search History

- Done: A drawer navigator is implemented in the application layout.
- Done: A search history data structure stores previously searched words.
- Done: Each successfully searched word is added to the history list.
- Done: The list of searched words is displayed in the drawer menu.
- Done: Users can tap a word from the drawer.
- Done: Tapping a history item triggers a new API request.
- Done: The word detail screen refreshes with the selected word data.
- Done: Duplicate entries are prevented.

## Activity 5: Error Handling & User Feedback

- Done: The app detects when the API returns a word-not-found response.
- Done: A clear and user-friendly word-not-found message is displayed.
- Done: Network connectivity issues are handled gracefully.
- Done: API request failures show an error message.
- Done: Loading indicators are hidden when an error occurs.
- Done: Malformed responses are handled without crashing.
- Done: Users can retry the search after an error.
- Done: Empty-state messages are shown when no data is available.
