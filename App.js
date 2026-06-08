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
import { Audio } from "expo-av";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons } from "@expo/vector-icons";

const API_BASE_URL = "https://api.dictionaryapi.dev/api/v2/entries/en";
const DRAWER_WIDTH = Math.min(330, Dimensions.get("window").width * 0.84);
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

function extractAudioOptions(entries) {
  const seen = new Set();

  return entries
    .flatMap((entry) => entry.phonetics || [])
    .filter((phonetic) => phonetic.audio)
    .map((phonetic, index) => ({
      id: `${phonetic.audio}-${index}`,
      label: phonetic.text || `Audio ${index + 1}`,
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

function HighlightStory() {
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

function ResultView({ audioPlayback, data, onPauseAudio, onStopAudio, onToggleAudio }) {
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

        {audioOptions.length > 0 ? (
          <View style={styles.audioStack}>
            {audioOptions.map((audio) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Play pronunciation ${audio.label}`}
                key={audio.id}
                onPress={() => onToggleAudio(audio.url)}
                style={({ pressed }) => [
                  styles.audioButton,
                  audioPlayback.url === audio.url && styles.audioButtonActive,
                  pressed && styles.pressed
                ]}
              >
                <MaterialIcons
                  color={audioPlayback.url === audio.url ? "#FFFFFF" : "#29524A"}
                  name={
                    audioPlayback.url === audio.url && audioPlayback.status === "playing"
                      ? "graphic-eq"
                      : "volume-up"
                  }
                  size={22}
                />
              </Pressable>
            ))}
            {audioPlayback.url ? (
              <View style={styles.audioControls}>
                <Pressable
                  accessibilityLabel={
                    audioPlayback.status === "playing"
                      ? "Pause pronunciation audio"
                      : "Resume pronunciation audio"
                  }
                  disabled={audioPlayback.status === "loading"}
                  onPress={
                    audioPlayback.status === "playing"
                      ? onPauseAudio
                      : () => onToggleAudio(audioPlayback.url)
                  }
                  style={({ pressed }) => [styles.audioControlButton, pressed && styles.pressed]}
                >
                  <MaterialIcons
                    color="#29524A"
                    name={audioPlayback.status === "playing" ? "pause" : "play-arrow"}
                    size={18}
                  />
                </Pressable>
                <Pressable
                  accessibilityLabel="Stop pronunciation audio"
                  disabled={audioPlayback.status === "loading"}
                  onPress={onStopAudio}
                  style={({ pressed }) => [styles.audioControlButton, pressed && styles.pressed]}
                >
                  <MaterialIcons color="#29524A" name="stop" size={18} />
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

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

function HistoryDrawer({ history, visible, onClose, onSelectHistory }) {
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
              <MaterialIcons color="#182825" name="close" size={22} />
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
  const [validationError, setValidationError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [audioPlayback, setAudioPlayback] = useState({ status: "idle", url: "" });
  const soundRef = useRef(null);

  const hasData = Array.isArray(wordData) && wordData.length > 0;

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

    if (!cleanedWord) {
      setValidationError("Please enter a word before searching.");
      setWordData(null);
      return;
    }

    if (cleanedWord.length > 60) {
      setValidationError("Please search for a shorter word or phrase.");
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <HistoryDrawer
        history={history}
        onClose={() => setDrawerOpen(false)}
        onSelectHistory={selectHistoryItem}
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

          {!hasData && !feedback && !isLoading ? <HighlightStory /> : null}

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
            />
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#EEF6EF",
    flex: 1
  },
  appShell: {
    backgroundColor: "#EEF6EF",
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
  iconButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.78)",
    borderColor: "rgba(16, 20, 33, 0.08)",
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
    color: "#101421",
    fontSize: 17,
    fontWeight: "900"
  },
  brandSub: {
    color: "#7B7F88",
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
    backgroundColor: "#F6E9B9",
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
    color: "#073E37",
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 38,
    maxWidth: 360,
    textAlign: "center"
  },
  heroText: {
    color: "#46504D",
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
    backgroundColor: "#FFFFFF",
    borderColor: "#101421",
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
    backgroundColor: "#FFF7F6",
    borderColor: "#FF615E"
  },
  input: {
    color: "#101421",
    flex: 1,
    fontSize: 16,
    minHeight: 44
  },
  searchButton: {
    alignItems: "center",
    backgroundColor: "#101421",
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
    color: "#D95047",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 10
  },
  storyPanel: {
    marginTop: 32
  },
  storyTitle: {
    color: "#101421",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8
  },
  storyCopy: {
    color: "#59605D",
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
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(16, 20, 33, 0.08)",
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
    backgroundColor: "#FFF3F0",
    borderColor: "#FFD1C7"
  },
  feedbackText: {
    color: "#073E37",
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  errorText: {
    color: "#BA3B32"
  },
  retryButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  retryText: {
    color: "#D95047",
    fontSize: 13,
    fontWeight: "900"
  },
  resultWrap: {
    backgroundColor: "#FFFFFF",
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
    backgroundColor: "#FFFFFF",
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
    color: "#383A3F",
    fontSize: 38,
    fontWeight: "900",
    lineHeight: 42,
    marginTop: 7
  },
  phonetic: {
    color: "#A3A8A6",
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
  audioButton: {
    alignItems: "center",
    backgroundColor: "#EAF5FF",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  audioButtonActive: {
    backgroundColor: "#078576"
  },
  audioControlButton: {
    alignItems: "center",
    backgroundColor: "#F7F2DF",
    borderRadius: 17,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  meaningBlock: {
    backgroundColor: "#FAFAF7",
    borderColor: "#EFEDE7",
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
    color: "#202226",
    fontSize: 15,
    lineHeight: 23
  },
  exampleText: {
    backgroundColor: "#F6F5F0",
    borderLeftColor: "#FF9A3C",
    borderLeftWidth: 3,
    borderRadius: 8,
    color: "#626761",
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
    backgroundColor: "rgba(16, 20, 33, 0.45)"
  },
  drawer: {
    backgroundColor: "#F7F7F4",
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
    color: "#101421",
    fontSize: 24,
    fontWeight: "900"
  },
  drawerSubtitle: {
    color: "#7B7F88",
    fontSize: 13,
    marginTop: 4
  },
  historyList: {
    gap: 10,
    paddingBottom: 24
  },
  historyItem: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(16, 20, 33, 0.06)",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 54,
    paddingHorizontal: 12
  },
  historyItemPressed: {
    backgroundColor: "#FFF3D5"
  },
  historyWord: {
    color: "#101421",
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    textTransform: "capitalize"
  },
  drawerEmpty: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(16, 20, 33, 0.06)",
    borderRadius: 8,
    borderWidth: 1,
    padding: 22
  },
  drawerEmptyText: {
    color: "#59605D",
    fontSize: 15,
    lineHeight: 21,
    marginTop: 10,
    textAlign: "center"
  },
  pressed: {
    opacity: 0.82
  }
});
