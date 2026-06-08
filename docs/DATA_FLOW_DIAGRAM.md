# Data Flow Diagram

```mermaid
flowchart TD
  A["User enters a word"] --> B["Validate search input"]
  B -->|Input is empty or too long| C["Show validation message"]
  B -->|Input is valid| D["Normalize and encode searched word"]
  D --> E["Build API URL: /entries/en/{word}"]
  E --> F["Send axios HTTP GET request"]
  F --> G["Show loading indicator"]
  F -->|200 response| H["Receive and parse JSON response"]
  H --> I["Store fetched word data temporarily in React state"]
  I --> J["Display searched word prominently at top"]
  I --> K["Display phonetics, meanings, definitions, and examples"]
  I --> L["Check whether pronunciation audio URLs exist"]
  L -->|Audio exists| M["Display speaker icon next to word or phonetics"]
  M --> N["User taps speaker icon"]
  N --> O["Load audio with expo-av"]
  O --> P["Manage playback state: play, pause, stop"]
  L -->|No audio exists| Q["Hide pronunciation audio buttons"]
  I --> R["Add successful searched word to duplicate-free history"]
  R --> S["Display searched words in drawer menu"]
  S --> T["User taps history word"]
  T --> E
  F -->|404 response| U["Show word not found message"]
  F -->|Network or malformed response| V["Show friendly error and retry action"]
  U --> W["Hide loading indicator"]
  V --> W
```

## Main Data Stores

- `searchTerm`: Current text input value.
- `wordData`: Temporary API response used for the detail screen.
- `history`: Duplicate-free list of successfully searched words.
- `audioPlayback`: Current pronunciation URL and playback status.
- `feedback`: User-facing validation, error, and playback messages.
