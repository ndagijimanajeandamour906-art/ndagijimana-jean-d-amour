// TOLKFLOW Advanced Real-Time Speech, Text-to-Speech (TTS) & Speech-to-Text (STT) Engine
// Genuine browser speech synthesis & recognition with multilingual voice matching & Web Audio fallback

export interface TTSVoiceOption {
  voiceURI: string;
  name: string;
  lang: string;
  default: boolean;
  isNeural?: boolean;
}

export interface TTSSettings {
  rate: number;      // 0.5 to 2.0
  pitch: number;     // 0.5 to 1.5
  volume: number;    // 0 to 1.0
  preferredVoiceURI?: string;
  autoReadMessages: boolean;
  autoTranslateVoice: boolean;
}

export interface SpeechRecognitionResultState {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private recognition: any = null;
  private voices: SpeechSynthesisVoice[] = [];
  private voicesLoaded: boolean = false;
  private isSpeakingState: boolean = false;
  private isPausedState: boolean = false;
  private currentPlayingId: string | null = null;
  private activeAudioElement: HTMLAudioElement | null = null;

  // Listeners for reactive updates
  private stateListeners: Set<(state: { isSpeaking: boolean; isPaused: boolean; playingId: string | null }) => void> = new Set();

  public settings: TTSSettings = {
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    autoReadMessages: false,
    autoTranslateVoice: true,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      if ('speechSynthesis' in window) {
        this.synth = window.speechSynthesis;
        this.loadVoices();
        if (this.synth.onvoiceschanged !== undefined) {
          this.synth.onvoiceschanged = () => this.loadVoices();
        }
      }

      // Restore saved voice settings
      try {
        const saved = localStorage.getItem('tolkflow_voice_settings');
        if (saved) {
          this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
      } catch {}
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
    if (this.voices.length > 0) {
      this.voicesLoaded = true;
    }
  }

  // Get list of voices
  getAvailableVoices(): TTSVoiceOption[] {
    if (!this.synth) return [];
    if (!this.voicesLoaded) {
      this.voices = this.synth.getVoices();
    }
    return this.voices.map((v) => ({
      voiceURI: v.voiceURI,
      name: v.name,
      lang: v.lang,
      default: v.default,
      isNeural: v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('neural') || v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('siri'),
    }));
  }

  // Find best matching voice for a language code
  findVoiceForLanguage(langCode: string): SpeechSynthesisVoice | null {
    if (!this.voices.length && this.synth) {
      this.voices = this.synth.getVoices();
    }
    if (!this.voices.length) return null;

    // Check user-specified voice first
    if (this.settings.preferredVoiceURI) {
      const preferred = this.voices.find((v) => v.voiceURI === this.settings.preferredVoiceURI);
      if (preferred) return preferred;
    }

    const cleanCode = (langCode || 'en').toLowerCase().trim();

    // Language prefix mapping
    const codePrefix = cleanCode.split('-')[0];

    // Priority 1: Exact match with neural/natural/high-quality voice
    const exactNeural = this.voices.find(
      (v) =>
        v.lang.toLowerCase().replace('_', '-') === cleanCode &&
        (v.name.toLowerCase().includes('natural') || v.name.toLowerCase().includes('neural') || v.name.toLowerCase().includes('google'))
    );
    if (exactNeural) return exactNeural;

    // Priority 2: Exact language tag match
    const exact = this.voices.find((v) => v.lang.toLowerCase().replace('_', '-') === cleanCode);
    if (exact) return exact;

    // Priority 3: Prefix match (e.g. 'zh' matches 'zh-CN', 'zh-HK', 'zh-TW')
    const prefixMatch = this.voices.find((v) => v.lang.toLowerCase().startsWith(codePrefix));
    if (prefixMatch) return prefixMatch;

    // Priority 4: Special African language fallbacks (Kinyarwanda 'rw', Swahili 'sw', Luganda 'lg')
    if (codePrefix === 'rw' || codePrefix === 'sw' || codePrefix === 'rn') {
      const africanOrSwahili = this.voices.find(
        (v) => v.lang.toLowerCase().includes('sw') || v.lang.toLowerCase().includes('en-za') || v.name.toLowerCase().includes('africa')
      );
      if (africanOrSwahili) return africanOrSwahili;
    }

    // Default: English or first available system voice
    return this.voices.find((v) => v.lang.startsWith('en')) || this.voices[0] || null;
  }

  // 1. Text to Speech Core
  speak(
    text: string,
    langCode: string = 'en',
    messageId?: string,
    optionsOrOnEnd?: (() => void) | { rate?: number; onStart?: () => void; onEnd?: () => void; onError?: () => void }
  ): Promise<void> {
    return new Promise((resolve) => {
      const callbacks = typeof optionsOrOnEnd === 'function'
        ? { onEnd: optionsOrOnEnd }
        : optionsOrOnEnd || {};

      if (!this.synth) {
        console.warn('Speech synthesis not supported in this browser.');
        if (callbacks.onError) callbacks.onError();
        resolve();
        return;
      }

      // Stop any ongoing speech
      this.stop();

      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;

      const voice = this.findVoiceForLanguage(langCode);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = langCode;
      }

      const activeRate = callbacks.rate ?? this.settings.rate;
      utterance.rate = Math.max(0.5, Math.min(2.0, activeRate));
      utterance.pitch = Math.max(0.5, Math.min(1.5, this.settings.pitch));
      utterance.volume = Math.max(0, Math.min(1.0, this.settings.volume));

      this.isSpeakingState = true;
      this.isPausedState = false;
      this.currentPlayingId = messageId || null;
      if (callbacks.onStart) callbacks.onStart();
      this.notifyListeners();

      utterance.onend = () => {
        this.isSpeakingState = false;
        this.isPausedState = false;
        this.currentPlayingId = null;
        this.currentUtterance = null;
        this.notifyListeners();
        if (callbacks.onEnd) callbacks.onEnd();
        resolve();
      };

      utterance.onerror = (e) => {
        console.warn('Speech synthesis playback note:', e.error);
        this.isSpeakingState = false;
        this.isPausedState = false;
        this.currentPlayingId = null;
        this.currentUtterance = null;
        this.notifyListeners();
        if (callbacks.onError) callbacks.onError();
        resolve();
      };

      try {
        this.synth.speak(utterance);
      } catch (err) {
        console.warn('SpeechSynthesis speak call error:', err);
        this.isSpeakingState = false;
        this.isPausedState = false;
        this.currentPlayingId = null;
        this.currentUtterance = null;
        this.notifyListeners();
        if (callbacks.onError) callbacks.onError();
        resolve();
      }
    });
  }

  // Pause speech
  pause() {
    if (this.synth && this.synth.speaking && !this.synth.paused) {
      this.synth.pause();
      this.isPausedState = true;
      this.notifyListeners();
    }
  }

  // Resume speech
  resume() {
    if (this.synth && this.synth.paused) {
      this.synth.resume();
      this.isPausedState = false;
      this.notifyListeners();
    }
  }

  // Stop speech
  stop() {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {}
    }
    if (this.activeAudioElement) {
      try {
        this.activeAudioElement.pause();
        this.activeAudioElement = null;
      } catch {}
    }
    this.isSpeakingState = false;
    this.isPausedState = false;
    this.currentPlayingId = null;
    this.currentUtterance = null;
    this.notifyListeners();
  }

  // 2. Real Speech to Text (STT) Recognition
  startListening(
    langCode: string = 'en',
    onResult: (result: SpeechRecognitionResultState) => void,
    onError?: (err: string) => void,
    onEnd?: () => void
  ): boolean {
    if (typeof window === 'undefined') return false;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      if (onError) onError('Speech Recognition is not supported in this browser. Please use Google Chrome or Edge.');
      return false;
    }

    this.stopListening();

    try {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = langCode;

      this.recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            final += item[0].transcript;
          } else {
            interim += item[0].transcript;
          }
        }

        const transcript = final || interim;
        const isFinal = Boolean(final);
        const confidence = event.results[0] ? event.results[0][0].confidence : 0.9;

        onResult({
          transcript,
          isFinal,
          confidence,
        });
      };

      this.recognition.onerror = (event: any) => {
        console.warn('Speech recognition status:', event.error);
        if (onError) onError(event.error);
      };

      this.recognition.onend = () => {
        if (onEnd) onEnd();
      };

      this.recognition.start();
      return true;
    } catch (err: any) {
      console.warn('Failed to start speech recognition:', err);
      if (onError) onError(err.message || 'Speech recognition initialization failed');
      return false;
    }
  }

  stopListening() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }
  }

  // Play audio file or synthesized voice note with speed control
  playAudioUrl(
    url: string,
    messageId?: string,
    playbackRate: number = 1.0,
    callbacksOrOnEnd?: (() => void) | { onPlay?: () => void; onPause?: () => void; onEnded?: () => void }
  ): HTMLAudioElement {
    this.stop();

    const callbacks = typeof callbacksOrOnEnd === 'function'
      ? { onEnded: callbacksOrOnEnd }
      : callbacksOrOnEnd || {};

    const audio = new Audio(url);
    this.activeAudioElement = audio;
    audio.playbackRate = playbackRate;

    this.isSpeakingState = true;
    this.currentPlayingId = messageId || null;
    if (callbacks.onPlay) callbacks.onPlay();
    this.notifyListeners();

    audio.onended = () => {
      this.isSpeakingState = false;
      this.currentPlayingId = null;
      this.activeAudioElement = null;
      this.notifyListeners();
      if (callbacks.onEnded) callbacks.onEnded();
    };

    audio.onpause = () => {
      if (callbacks.onPause) callbacks.onPause();
    };

    audio.onerror = () => {
      this.isSpeakingState = false;
      this.currentPlayingId = null;
      this.activeAudioElement = null;
      this.notifyListeners();
      if (callbacks.onEnded) callbacks.onEnded();
    };

    audio.play().catch(() => {
      this.isSpeakingState = false;
      this.currentPlayingId = null;
      this.activeAudioElement = null;
      this.notifyListeners();
      if (callbacks.onEnded) callbacks.onEnded();
    });
    return audio;
  }

  // Settings update
  updateSettings(updates: Partial<TTSSettings>) {
    this.settings = { ...this.settings, ...updates };
    try {
      localStorage.setItem('tolkflow_voice_settings', JSON.stringify(this.settings));
    } catch {}
  }

  // Subscribe to speaking state changes
  onStateChange(listener: (state: { isSpeaking: boolean; isPaused: boolean; playingId: string | null }) => void): () => void {
    this.stateListeners.add(listener);
    listener({
      isSpeaking: this.isSpeakingState,
      isPaused: this.isPausedState,
      playingId: this.currentPlayingId,
    });
    return () => this.stateListeners.delete(listener);
  }

  private notifyListeners() {
    this.stateListeners.forEach((l) =>
      l({
        isSpeaking: this.isSpeakingState,
        isPaused: this.isPausedState,
        playingId: this.currentPlayingId,
      })
    );
  }

  get isSpeaking(): boolean {
    return this.isSpeakingState;
  }

  get isPaused(): boolean {
    return this.isPausedState;
  }

  get playingId(): string | null {
    return this.currentPlayingId;
  }
}

export const speechService = new SpeechService();
