import { useEffect, useState, useCallback } from "react";

// Preferred female voice names in order of priority (platform-specific).
// "female" catches any voice with that word in its name; the rest are
// well-known female voices on macOS/iOS, Windows, and Android.
const FEMALE_VOICE_HINTS = [
  "female",
  "samantha",
  "victoria",
  "karen",
  "moira",
  "tessa",
  "zira",
  "google us english",
];

function pickFemaleVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  for (const hint of FEMALE_VOICE_HINTS) {
    const match = voices.find((v) => v.name.toLowerCase().includes(hint));
    if (match) return match;
  }
  return null;
}

/**
 * Thin wrapper around the Web Speech API.
 * Prefers a female voice; falls back to browser default if none is found.
 * `supported` is false in environments where speechSynthesis isn't available.
 * All calls are no-ops when unsupported or when the user has toggled voice off.
 */
export function useSpeech(enabled: boolean) {
  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;
  const [femaleVoice, setFemaleVoice] = useState<SpeechSynthesisVoice | null>(
    null,
  );

  // Voices load asynchronously — populate on voiceschanged or immediately if
  // the list is already available (Chrome fires the event; Safari doesn't).
  useEffect(() => {
    if (!supported) return;
    function loadVoices() {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) setFemaleVoice(pickFemaleVoice(voices));
    }
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported || !enabled || !text) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (femaleVoice) utterance.voice = femaleVoice;
      window.speechSynthesis.speak(utterance);
    },
    [supported, enabled, femaleVoice],
  );

  const cancel = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  return { supported, speak, cancel };
}
