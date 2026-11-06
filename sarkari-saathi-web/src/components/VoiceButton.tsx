"use client";

import { Mic, MicOff } from "lucide-react";
import { useRef, useState, useSyncExternalStore } from "react";
import { useLanguage } from "@/context/LanguageContext";
import type { Language } from "@/lib/i18n/strings";

// The browser's speech recognition isn't in TypeScript's DOM types yet.
interface RecognitionResult {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: RecognitionResult) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type RecognitionConstructor = new () => Recognition;

const SPEECH_LANG: Record<Language, string> = { en: "en-IN", hi: "hi-IN", mr: "mr-IN" };

function getRecognition(): RecognitionConstructor | undefined {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

const noSubscribe = () => () => {};

/** Microphone button: speak a question in English, Hindi or Marathi and get the
 *  text. Hidden in browsers without speech recognition. */
export default function VoiceButton({ onText }: { onText: (text: string) => void }) {
  const { language, t } = useLanguage();
  const supported = useSyncExternalStore(
    noSubscribe,
    () => !!getRecognition(),
    () => false
  );
  const [listening, setListening] = useState(false);
  const active = useRef<Recognition | null>(null);

  if (!supported) return null;

  function toggle() {
    if (active.current) {
      active.current.stop();
      return;
    }
    const Ctor = getRecognition();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = SPEECH_LANG[language];
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript;
      if (text) onText(text);
    };
    const finish = () => {
      active.current = null;
      setListening(false);
    };
    rec.onend = finish;
    rec.onerror = finish;
    active.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      finish();
    }
  }

  const label = listening ? t("voiceStop") : t("voiceStart");
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={listening}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
        listening ? "animate-pulse bg-danger text-white" : "text-muted hover:bg-primary-light hover:text-primary"
      }`}
    >
      {listening ? <MicOff size={18} aria-hidden /> : <Mic size={18} aria-hidden />}
    </button>
  );
}
