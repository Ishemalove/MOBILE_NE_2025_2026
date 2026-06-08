import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons } from "@expo/vector-icons";

const API_BASE_URL = "https://api.dictionaryapi.dev/api/v2/entries/en";
const DRAWER_WIDTH = Math.min(330, Dimensions.get("window").width * 0.84);
const HISTORY_STORAGE_KEY = "lexitech.dictionary.history";
const THEME_STORAGE_KEY = "lexitech.dictionary.theme";
const SAMPLE_WORDS = [
  ["latest", "#FFD6D6"],
  ["endeavor", "#D9E6FF"],
  ["was", "#BFF2D6"],
  ["quest", "#DDD7FF"],
  ["Lexicon", "#FFC2C7"],
  ["Aeternum", "#FFF0A7"],
  ["legendary", "#CDEFFF"],
  ["meaning", "#D2F7C8"],
  ["word", "#FFD6D6"],
  ["spoken", "#E6E0FF"],
  ["curious", "#C9F2E3"],
  ["power", "#F9D6FF"]
];

function getFriendlyError(error) {
  if (error?.response?.status === 404) {
    return "Word not found. Check the spelling or try another English word.";
  }

  if (error?.code === "ECONNABORTED") {
    return "The request took too long. Please try again.";
  }

  if (error?.message === "MALFORMED_RESPONSE") {
    return "The dictionary returned an unexpected response. Please try a different word.";
  }

  if (!error?.response) {
    return "Network error. Check your connection and try again.";
  }

  return "Something went wrong while searching. Please try again.";
}

function normalizeHistoryItem(word) {
  return word.trim().toLowerCase();
}

function validateSearchTerm(value) {
  const cleanedValue = value.trim();

  if (!cleanedValue) {
    return "Please enter a word to search.";
  }

  if (/\s+/.test(cleanedValue)) {
    return "Please search for one word, not a sentence.";
  }

  if (/\d/.test(cleanedValue)) {
    return "Please search for a word instead of numbers.";
  }

  if (!/^[a-zA-Z]+(?:[-'’][a-zA-Z]+)*$/.test(cleanedValue)) {
    return "Please search for a word instead of characters";
  }

  if (cleanedValue.length > 60) {
    return "Please search for a shorter word.";
  }

  return "";
}

function getPronunciationLabel(audioUrl, index) {
  const url = audioUrl.toLowerCase();

  if (url.includes("-uk") || url.includes("_uk") || url.includes("uk.mp3")) {
    return "UK Pronunciation";
  }

  if (url.includes("-us") || url.includes("_us") || url.includes("us.mp3")) {
    return "US Pronunciation";
  }

  if (
    url.includes("-au") ||
    url.includes("_au") ||
    url.includes("au.mp3") ||
    url.includes("australia")
  ) {
    return "Australian Pronunciation";
  }

  return `Pronunciation ${index + 1}`;
}

function extractAudioOptions(entries) {
  const seen = new Set();

  return entries
    .flatMap((entry) => entry.phonetics || [])
    .filter((phonetic) => phonetic.audio)
    .map((phonetic, index) => ({
      id: `${phonetic.audio}-${index}`,
      label: getPronunciationLabel(phonetic.audio, index),
      phonetic: phonetic.text || "",
      url: phonetic.audio
    }))
    .filter((item) => {
      if (seen.has(item.url)) {
        return false;
      }
      seen.add(item.url);
      return true;
    });
}

function HighlightStory({ styles }) {
  return (
    <View style={styles.storyPanel}>
      <Text style={styles.storyTitle}>Tap your words for definitions</Text>
      <Text style={styles.storyCopy}>
        A quick search turns a difficult paragraph into a readable trail of meanings.
      </Text>
      <View style={styles.highlightWrap}>
        {SAMPLE_WORDS.map(([word, color]) => (
          <Text key={word} style={[styles.highlightWord, { backgroundColor: color }]}>
            {word}
          </Text>
        ))}
      </View>
    </View>
  );
}

function ResultView({ audioPlayback, data, onPauseAudio, onStopAudio, onToggleAudio, styles }) {
  const entry = data?.[0];

  if (!entry) {
    return null;
  }

  const phoneticText =
    entry.phonetic ||
    entry.phonetics?.find((phonetic) => phonetic.text)?.text ||
    "Phonetic spelling not available";
  const audioOptions = extractAudioOptions(data);

  return (
    <View style={styles.resultWrap}>
      <View style={styles.wordHeader}>
        <View style={styles.wordTitleGroup}>
          <Text style={styles.wordLabel}>Dictionary result</Text>
          <Text style={styles.wordTitle}>{entry.word}</Text>
          <Text style={styles.phonetic}>{phoneticText}</Text>
        </View>

      </View>

      {audioOptions.length > 0 ? (
        <View style={styles.pronunciationSection}>
          <View style={styles.pronunciationTitleRow}>
            <MaterialIcons color="#7B5CE6" name="mic" size={18} />
            <Text style={styles.pronunciationTitle}>Pronunciations</Text>
          </View>
          {audioOptions.map((audio) => {
            const isActive = audioPlayback.url === audio.url;
            const isPlaying = isActive && audioPlayback.status === "playing";

            return (
              <View
                key={audio.id}
                style={[styles.pronunciationCard, isActive && styles.pronunciationCardActive]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Play ${audio.label}`}
                  onPress={() => onToggleAudio(audio.url)}
                  style={({ pressed }) => [
                    styles.pronunciationIcon,
                    isActive && styles.pronunciationIconActive,
                    pressed && styles.pressed
                  ]}
                >
                  <MaterialIcons
                    color={isActive ? "#FFFFFF" : "#5546BA"}
                    name={isPlaying ? "graphic-eq" : "volume-up"}
                    size={22}
                  />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onToggleAudio(audio.url)}
                  style={styles.pronunciationTextWrap}
                >
                  <Text style={styles.pronunciationLabel}>{audio.label}</Text>
                  <Text style={styles.pronunciationPhonetic}>{audio.phonetic || phoneticText}</Text>
                </Pressable>
                {isActive ? (
                  <View style={styles.pronunciationControls}>
                    <Pressable
                      accessibilityLabel={isPlaying ? "Pause pronunciation audio" : "Resume pronunciation audio"}
                      disabled={audioPlayback.status === "loading"}
                      onPress={isPlaying ? onPauseAudio : () => onToggleAudio(audio.url)}
                      style={({ pressed }) => [styles.audioControlButton, pressed && styles.pressed]}
                    >
                      <MaterialIcons
                        color="#5546BA"
                        name={isPlaying ? "pause" : "play-arrow"}
                        size={18}
                      />
                    </Pressable>
                    <Pressable
                      accessibilityLabel="Stop pronunciation audio"
                      disabled={audioPlayback.status === "loading"}
                      onPress={onStopAudio}
                      style={({ pressed }) => [styles.audioControlButton, pressed && styles.pressed]}
                    >
                      <MaterialIcons color="#5546BA" name="stop" size={18} />
                    </Pressable>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}

      {(entry.meanings || []).map((meaning, meaningIndex) => (
        <View key={`${meaning.partOfSpeech}-${meaningIndex}`} style={styles.meaningBlock}>
          <Text style={styles.partOfSpeech}>{meaning.partOfSpeech || "meaning"}</Text>

          {(meaning.definitions || []).map((definition, definitionIndex) => (
            <View key={`${definition.definition}-${definitionIndex}`} style={styles.definitionRow}>
              <View style={styles.definitionNumber}>
                <Text style={styles.definitionNumberText}>{definitionIndex + 1}</Text>
              </View>
              <View style={styles.definitionBody}>
                <Text style={styles.definitionText}>
                  {definition.definition || "Definition unavailable."}
                </Text>
                {definition.example ? (
                  <Text style={styles.exampleText}>"{definition.example}"</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function HistoryDrawer({ history, visible, onClose, onSelectHistory, styles, theme }) {
  const slide = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  useEffect(() => {
    Animated.timing(slide, {
      duration: 220,
      toValue: visible ? 0 : -DRAWER_WIDTH,
      useNativeDriver: true
    }).start();
  }, [slide, visible]);

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.drawerScene}>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.drawerBackdrop} />
        <Animated.View style={[styles.drawer, { transform: [{ translateX: slide }] }]}>
          <View style={styles.drawerHeader}>
            <View>
              <Text style={styles.drawerTitle}>Search history</Text>
              <Text style={styles.drawerSubtitle}>
                {history.length ? `${history.length} saved words` : "No words searched yet"}
              </Text>
            </View>
            <Pressable accessibilityLabel="Close history drawer" onPress={onClose} style={styles.iconButton}>
              <MaterialIcons color={theme === "dark" ? "#F8FAF6" : "#182825"} name="close" size={22} />
            </Pressable>
          </View>

          {history.length ? (
            <FlatList
              contentContainerStyle={styles.historyList}
              data={history}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onSelectHistory(item)}
                  style={({ pressed }) => [styles.historyItem, pressed && styles.historyItemPressed]}
                >
                  <MaterialIcons color="#A64253" name="history" size={20} />
                  <Text style={styles.historyWord}>{item}</Text>
                  <MaterialIcons color="#6C7A75" name="chevron-right" size={22} />
                </Pressable>
              )}
            />
          ) : (
            <View style={styles.drawerEmpty}>
              <MaterialIcons color="#A64253" name="travel-explore" size={36} />
              <Text style={styles.drawerEmptyText}>Your successful searches will appear here.</Text>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function App() {
  const [searchTerm, setSearchTerm] = useState("");
  const [lastSubmittedWord, setLastSubmittedWord] = useState("");
  const [wordData, setWordData] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [themeMode, setThemeMode] = useState("light");
  const [validationError, setValidationError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [audioPlayback, setAudioPlayback] = useState({ status: "idle", url: "" });
  const soundRef = useRef(null);

  const hasData = Array.isArray(wordData) && wordData.length > 0;
  const isDarkMode = themeMode === "dark";
  const styles = useMemo(() => createStyles(isDarkMode), [isDarkMode]);

  const statusMessage = useMemo(() => {
    if (isLoading) {
      return `Searching ${lastSubmittedWord || "dictionary"}...`;
    }
    if (feedback) {
      return feedback;
    }
    if (!hasData) {
      return "Search for a word to see definitions, examples, and pronunciation.";
    }
    return "";
  }, [feedback, hasData, isLoading, lastSubmittedWord]);

  useEffect(() => {
    const loadStoredPreferences = async () => {
      try {
        const [storedHistory, storedTheme] = await Promise.all([
          AsyncStorage.getItem(HISTORY_STORAGE_KEY),
          AsyncStorage.getItem(THEME_STORAGE_KEY)
        ]);

        if (storedHistory) {
          const parsedHistory = JSON.parse(storedHistory);

          if (Array.isArray(parsedHistory)) {
            setHistory(parsedHistory.filter((item) => typeof item === "string"));
          }
        }

        if (storedTheme === "dark" || storedTheme === "light") {
          setThemeMode(storedTheme);
        }
      } catch (error) {
        setFeedback("Saved preferences could not be loaded.");
      } finally {
        setHistoryLoaded(true);
      }
    };

    loadStoredPreferences();

    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      interruptionModeAndroid: 1,
      interruptionModeIOS: 1,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: false,
      staysActiveInBackground: false
    }).catch(() => {
      setFeedback("Audio mode could not be prepared. Pronunciation will still try to play.");
    });

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    if (!historyLoaded) {
      return;
    }

    AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history)).catch(() => {
      setFeedback("Search history could not be saved.");
    });
  }, [history, historyLoaded]);

  useEffect(() => {
    if (!historyLoaded) {
      return;
    }

    AsyncStorage.setItem(THEME_STORAGE_KEY, themeMode).catch(() => {
      setFeedback("Theme preference could not be saved.");
    });
  }, [historyLoaded, themeMode]);

  const addToHistory = (word) => {
    const normalizedWord = normalizeHistoryItem(word);

    setHistory((currentHistory) => [
      normalizedWord,
      ...currentHistory.filter((item) => item !== normalizedWord)
    ]);
  };

  const unloadAudio = async (nextPlayback = { status: "idle", url: "" }) => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }

    setAudioPlayback(nextPlayback);
  };

  const searchWord = async (wordToSearch = searchTerm) => {
    const cleanedWord = wordToSearch.trim();

    Keyboard.dismiss();
    setValidationError("");
    setFeedback("");
    await unloadAudio();

    const inputError = validateSearchTerm(cleanedWord);

    if (inputError) {
      setValidationError(inputError);
      setWordData(null);
      return;
    }

    const normalizedWord = normalizeHistoryItem(cleanedWord);
    const requestUrl = `${API_BASE_URL}/${encodeURIComponent(normalizedWord)}`;

    setLastSubmittedWord(normalizedWord);
    setIsLoading(true);

    try {
      const response = await axios.get(requestUrl, { timeout: 10000 });

      if (!Array.isArray(response.data) || response.data.length === 0) {
        throw new Error("MALFORMED_RESPONSE");
      }

      setWordData(response.data);
      setSearchTerm(normalizedWord);
      addToHistory(normalizedWord);
    } catch (error) {
      setWordData(null);
      setFeedback(getFriendlyError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAudio = async (audioUrl) => {
    setFeedback("");

    try {
      if (soundRef.current && audioPlayback.url === audioUrl) {
        const status = await soundRef.current.getStatusAsync();

        if (status.isLoaded && status.isPlaying) {
          await soundRef.current.pauseAsync();
          setAudioPlayback({ status: "paused", url: audioUrl });
          return;
        }

        if (status.isLoaded && audioPlayback.status === "stopped") {
          await soundRef.current.setPositionAsync(0);
          await soundRef.current.setVolumeAsync(1);
          await soundRef.current.playAsync();
          setAudioPlayback({ status: "playing", url: audioUrl });
          return;
        }

        if (status.isLoaded) {
          await soundRef.current.setVolumeAsync(1);
          await soundRef.current.playAsync();
          setAudioPlayback({ status: "playing", url: audioUrl });
          return;
        }
      }

      await unloadAudio({ status: "loading", url: audioUrl });
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { isMuted: false, shouldPlay: true, volume: 1 }
      );
      soundRef.current = sound;
      await sound.setVolumeAsync(1);
      setAudioPlayback({ status: "playing", url: audioUrl });
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish || status.error) {
          setAudioPlayback({ status: "stopped", url: audioUrl });
        }
      });
    } catch (error) {
      setAudioPlayback({ status: "idle", url: "" });
      setFeedback("Pronunciation audio could not be played. Please try another audio option.");
    }
  };

  const pauseAudio = async () => {
    if (!soundRef.current || !audioPlayback.url) {
      return;
    }

    try {
      await soundRef.current.pauseAsync();
      setAudioPlayback({ status: "paused", url: audioPlayback.url });
    } catch (error) {
      setFeedback("Pronunciation audio could not be paused. Please try again.");
    }
  };

  const stopAudio = async () => {
    if (!soundRef.current || !audioPlayback.url) {
      return;
    }

    try {
      await soundRef.current.stopAsync();
      await unloadAudio({ status: "stopped", url: audioPlayback.url });
    } catch (error) {
      setAudioPlayback({ status: "idle", url: "" });
      setFeedback("Pronunciation audio could not be stopped. Please try again.");
    }
  };

  const selectHistoryItem = (word) => {
    setDrawerOpen(false);
    setSearchTerm(word);
    searchWord(word);
  };

  const toggleTheme = () => {
    setThemeMode((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <HistoryDrawer
        history={history}
        onClose={() => setDrawerOpen(false)}
        onSelectHistory={selectHistoryItem}
        styles={styles}
        theme={themeMode}
        visible={drawerOpen}
      />

      <View style={styles.appShell}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityLabel="Open search history drawer"
            onPress={() => setDrawerOpen(true)}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <MaterialIcons color="#101421" name="menu" size={24} />
          </Pressable>
          <View>
            <View style={styles.brandRow}>
              <MaterialIcons color="#FF7A30" name="menu-book" size={20} />
              <Text style={styles.brand}>Open Dictionary</Text>
            </View>
            <Text style={styles.brandSub}>LexiTech Mobile App</Text>
          </View>
          <Pressable
            accessibilityLabel={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
            onPress={toggleTheme}
            style={({ pressed }) => [styles.themeButton, pressed && styles.pressed]}
          >
            <MaterialIcons
              color={isDarkMode ? "#F8E9A5" : "#101421"}
              name={isDarkMode ? "light-mode" : "dark-mode"}
              size={22}
            />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>Find all the definitions to your words in one go</Text>
            <Text style={styles.heroText}>
              Type or paste any English word and get definitions, examples, and pronunciation.
            </Text>
          </View>

          <View style={styles.searchPanel}>
            <View style={[styles.inputWrap, validationError ? styles.inputWrapError : null]}>
              <MaterialIcons color="#6C7A75" name="search" size={22} />
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={(value) => {
                  setSearchTerm(value);
                  if (validationError) {
                    setValidationError("");
                  }
                }}
                onSubmitEditing={() => searchWord()}
                placeholder="Enter an English word"
                placeholderTextColor="#7C8A84"
                returnKeyType="search"
                style={styles.input}
                value={searchTerm}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={isLoading}
              onPress={() => searchWord()}
              style={({ pressed }) => [
                styles.searchButton,
                isLoading && styles.searchButtonDisabled,
                pressed && styles.pressed
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <MaterialIcons color="#FFFFFF" name="arrow-forward" size={22} />
              )}
            </Pressable>
          </View>

          {!hasData && !feedback && !isLoading ? <HighlightStory styles={styles} /> : null}

          {validationError ? <Text style={styles.validationText}>{validationError}</Text> : null}

          {statusMessage ? (
            <View style={[styles.feedbackBox, feedback ? styles.errorBox : null]}>
              {isLoading ? (
                <ActivityIndicator color="#A64253" size="small" />
              ) : (
                <MaterialIcons color={feedback ? "#A64253" : "#29524A"} name={feedback ? "info" : "lightbulb"} size={22} />
              )}
              <Text style={[styles.feedbackText, feedback ? styles.errorText : null]}>{statusMessage}</Text>
              {feedback && lastSubmittedWord ? (
                <Pressable onPress={() => searchWord(lastSubmittedWord)} style={styles.retryButton}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {hasData ? (
            <ResultView
              audioPlayback={audioPlayback}
              data={wordData}
              onPauseAudio={pauseAudio}
              onStopAudio={stopAudio}
              onToggleAudio={toggleAudio}
              styles={styles}
            />
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function createStyles(isDark) {
  const colors = {
    appBg: isDark ? "#101421" : "#EEF6EF",
    heroBg: isDark ? "#22283A" : "#F6E9B9",
    surface: isDark ? "#1A2030" : "#FFFFFF",
    elevated: isDark ? "#22293A" : "#FAFAF7",
    text: isDark ? "#F8FAF6" : "#101421",
    title: isDark ? "#F8E9A5" : "#073E37",
    muted: isDark ? "#B7C0BB" : "#59605D",
    border: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(16, 20, 33, 0.08)",
    inputBg: isDark ? "#101421" : "#FFFFFF",
    primary: isDark ? "#7B5CE6" : "#5546BA",
    primarySoft: isDark ? "#302A55" : "#ECE6FF",
    orange: "#FF7A30",
    danger: isDark ? "#FF8D83" : "#D95047",
    backdrop: isDark ? "rgba(0, 0, 0, 0.68)" : "rgba(16, 20, 33, 0.45)"
  };

  return StyleSheet.create({
  safeArea: {
    backgroundColor: colors.appBg,
    flex: 1
  },
  appShell: {
    backgroundColor: colors.appBg,
    flex: 1
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    marginHorizontal: 18,
    marginTop: 10,
    paddingHorizontal: 8,
    paddingTop: 12,
    zIndex: 2
  },
  themeButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    marginLeft: "auto",
    width: 44
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7
  },
  brand: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900"
  },
  brandSub: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 1
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 38,
    paddingTop: 10
  },
  hero: {
    alignItems: "center",
    backgroundColor: colors.heroBg,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    marginHorizontal: -20,
    marginTop: -74,
    minHeight: 302,
    paddingBottom: 34,
    paddingHorizontal: 34,
    paddingTop: 118,
    shadowColor: "#0C322B",
    shadowOffset: { height: 16, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 30
  },
  heroTitle: {
    color: colors.title,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 38,
    maxWidth: 360,
    textAlign: "center"
  },
  heroText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
    maxWidth: 285,
    textAlign: "center"
  },
  searchPanel: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: -27
  },
  inputWrap: {
    alignItems: "center",
    backgroundColor: colors.inputBg,
    borderColor: isDark ? "#6A5ACD" : "#101421",
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 10,
    height: 46,
    paddingHorizontal: 16,
    shadowColor: "#0D1B1E",
    shadowOffset: { height: 9, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 18
  },
  inputWrapError: {
    backgroundColor: isDark ? "#381F25" : "#FFF7F6",
    borderColor: colors.danger
  },
  input: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    minHeight: 44
  },
  searchButton: {
    alignItems: "center",
    backgroundColor: isDark ? "#7B5CE6" : "#101421",
    borderRadius: 23,
    flexDirection: "row",
    gap: 0,
    justifyContent: "center",
    height: 46,
    width: 46
  },
  searchButtonDisabled: {
    opacity: 0.72
  },
  validationText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10
  },
  storyPanel: {
    marginTop: 32
  },
  storyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8
  },
  storyCopy: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12
  },
  highlightWrap: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  highlightWord: {
    borderRadius: 4,
    color: "#101421",
    fontSize: 15,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 5,
    paddingVertical: 3
  },
  feedbackBox: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
    padding: 14,
    shadowColor: "#0D1B1E",
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 22
  },
  errorBox: {
    backgroundColor: isDark ? "#3A2024" : "#FFF3F0",
    borderColor: isDark ? "#7E3432" : "#FFD1C7"
  },
  feedbackText: {
    color: colors.title,
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  errorText: {
    color: colors.danger
  },
  retryButton: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  retryText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "900"
  },
  resultWrap: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    gap: 16,
    marginHorizontal: -2,
    marginTop: 24,
    padding: 18,
    shadowColor: "#0D1B1E",
    shadowOffset: { height: 18, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 30
  },
  wordHeader: {
    backgroundColor: colors.surface,
    borderBottomColor: "#FF9A3C",
    borderBottomWidth: 2,
    borderRadius: 0,
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
    paddingBottom: 13,
    paddingHorizontal: 2,
    paddingTop: 4
  },
  wordTitleGroup: {
    flex: 1
  },
  wordLabel: {
    color: "#FF7A30",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  wordTitle: {
    color: colors.text,
    fontSize: 38,
    fontWeight: "900",
    lineHeight: 42,
    marginTop: 7
  },
  phonetic: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 8
  },
  audioStack: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
    maxWidth: 112
  },
  audioControls: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
    width: "100%"
  },
  pronunciationSection: {
    gap: 10
  },
  pronunciationTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 2
  },
  pronunciationTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900"
  },
  pronunciationCard: {
    alignItems: "center",
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 66,
    padding: 10
  },
  pronunciationCardActive: {
    borderColor: colors.primary,
    borderWidth: 1.5
  },
  pronunciationIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  pronunciationIconActive: {
    backgroundColor: colors.primary
  },
  pronunciationTextWrap: {
    flex: 1
  },
  pronunciationLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900"
  },
  pronunciationPhonetic: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4
  },
  pronunciationControls: {
    flexDirection: "row",
    gap: 6
  },
  audioButton: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  audioButtonActive: {
    backgroundColor: colors.primary
  },
  audioControlButton: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 17,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  meaningBlock: {
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 16
  },
  partOfSpeech: {
    alignSelf: "flex-start",
    backgroundColor: "transparent",
    borderRadius: 8,
    color: "#FF8A22",
    fontSize: 14,
    fontStyle: "italic",
    fontWeight: "900",
    marginBottom: 12,
    overflow: "hidden",
    paddingHorizontal: 0,
    paddingVertical: 0,
    textTransform: "capitalize"
  },
  definitionRow: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 14
  },
  definitionNumber: {
    alignItems: "center",
    backgroundColor: "#101421",
    borderRadius: 5,
    height: 24,
    justifyContent: "center",
    marginTop: 2,
    width: 24
  },
  definitionNumberText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900"
  },
  definitionBody: {
    flex: 1
  },
  definitionText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 23
  },
  exampleText: {
    backgroundColor: isDark ? "#161B28" : "#F6F5F0",
    borderLeftColor: "#FF9A3C",
    borderLeftWidth: 3,
    borderRadius: 8,
    color: colors.muted,
    fontSize: 14,
    fontStyle: "italic",
    lineHeight: 21,
    marginTop: 8,
    overflow: "hidden",
    padding: 10
  },
  drawerScene: {
    flex: 1,
    flexDirection: "row"
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.backdrop
  },
  drawer: {
    backgroundColor: colors.appBg,
    borderBottomRightRadius: 28,
    borderTopRightRadius: 28,
    height: "100%",
    paddingHorizontal: 16,
    paddingTop: 54,
    shadowColor: "#000000",
    shadowOffset: { height: 0, width: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
    width: DRAWER_WIDTH
  },
  drawerHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16
  },
  drawerTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900"
  },
  drawerSubtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4
  },
  historyList: {
    gap: 10,
    paddingBottom: 24
  },
  historyItem: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 54,
    paddingHorizontal: 12
  },
  historyItemPressed: {
    backgroundColor: isDark ? "#302A55" : "#FFF3D5"
  },
  historyWord: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    textTransform: "capitalize"
  },
  drawerEmpty: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 22
  },
  drawerEmptyText: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 10,
    textAlign: "center"
  },
  pressed: {
    opacity: 0.82
  }
  });
}
