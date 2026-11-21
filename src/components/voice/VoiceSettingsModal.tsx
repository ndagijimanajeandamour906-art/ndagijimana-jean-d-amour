import React, { useState, useEffect } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import { speechService, TTSVoiceOption } from '../../services/speechService';
import { getLanguageByCode, SUPPORTED_LANGUAGES } from '../../data/languages';
import {
  X,
  Volume2,
  Mic,
  Sliders,
  Check,
  Play,
  Square,
  Sparkles,
  Globe,
  Radio,
  Languages,
} from 'lucide-react';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useTolkflow();

  const [voices, setVoices] = useState<TTSVoiceOption[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(speechService.settings.preferredVoiceURI || '');
  const [rate, setRate] = useState<number>(speechService.settings.rate || 1.0);
  const [pitch, setPitch] = useState<number>(speechService.settings.pitch || 1.0);
  const [volume, setVolume] = useState<number>(speechService.settings.volume || 1.0);
  const [autoRead, setAutoRead] = useState<boolean>(speechService.settings.autoReadMessages || false);
  const [autoTranslateVoice, setAutoTranslateVoice] = useState<boolean>(speechService.settings.autoTranslateVoice ?? true);
  const [testLanguage, setTestLanguage] = useState<string>(currentUser.preferredLanguage || 'en');
  const [isPlayingTest, setIsPlayingTest] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const avail = speechService.getAvailableVoices();
      setVoices(avail);
      if (!selectedVoiceURI && avail.length > 0) {
        const matching = speechService.findVoiceForLanguage(currentUser.preferredLanguage || 'en');
        if (matching) setSelectedVoiceURI(matching.voiceURI);
      }
    }
  }, [isOpen, currentUser.preferredLanguage]);

  if (!isOpen) return null;

  const testPhrases: Record<string, string> = {
    rw: 'Muraho! Twishimiye kubagezaho ijwi rigezweho rya TOLKFLOW muri Kinyarwanda.',
    en: 'Hello! Welcome to TOLKFLOW natural speech and real-time voice communication.',
    'zh-CN': '您好！欢迎使用 TOLKFLOW 实时语音和高保真人工智能朗读系统。',
    fr: 'Bonjour ! Bienvenue sur TOLKFLOW, communication vocale et traduction en temps réel.',
    sw: 'Jambo! Karibu kwenye mfumo wa sauti na mawasiliano ya moja kwa moja ya TOLKFLOW.',
    es: '¡Hola! Bienvenido al sistema de voz inteligente y traducción en vivo de TOLKFLOW.',
    ar: 'مرحباً بكم في نظام تولك فلو الصوتي المتطور للتواصل الفوري والترجمة الحية.',
    de: 'Hallo! Willkommen beim natürlichen Sprachsystem von TOLKFLOW.',
    ja: 'こんにちは！TOLKFLOWのリアルタイム音声および高精度AI音声合成へようこそ。',
  };

  const handleTestVoice = () => {
    if (isPlayingTest) {
      speechService.stop();
      setIsPlayingTest(false);
      return;
    }

    // Apply temporary test settings
    speechService.updateSettings({
      rate,
      pitch,
      volume,
      preferredVoiceURI: selectedVoiceURI || undefined,
    });

    const phrase = testPhrases[testLanguage] || testPhrases.en;
    setIsPlayingTest(true);

    speechService.speak(phrase, testLanguage, 'test_sample', () => {
      setIsPlayingTest(false);
    });
  };

  const handleSave = () => {
    speechService.updateSettings({
      rate,
      pitch,
      volume,
      preferredVoiceURI: selectedVoiceURI || undefined,
      autoReadMessages: autoRead,
      autoTranslateVoice,
    });
    onClose();
  };

  const currentLangObj = getLanguageByCode(testLanguage);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#0A1124] border border-cyan-500/40 rounded-3xl shadow-[0_0_50px_rgba(0,102,255,0.3)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 bg-[#060B18] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm">
              <Volume2 className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>AI Voice & Speech Settings</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-600/40 text-cyan-300 font-mono">
                  HD TTS
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Configure natural human speech, speaking speed, pitch, and voice translation.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              speechService.stop();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300">
          {/* Test Voice Section */}
          <div className="p-4 rounded-2xl bg-blue-950/30 border border-cyan-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Live Voice Test</span>
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={testLanguage}
                  onChange={(e) => setTestLanguage(e.target.value)}
                  className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-cyan-400"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleTestVoice}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                    isPlayingTest
                      ? 'bg-rose-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.5)]'
                      : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-[0_0_15px_rgba(0,102,255,0.4)] hover:brightness-110'
                  }`}
                >
                  {isPlayingTest ? <Square className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                  <span>{isPlayingTest ? 'Stop Voice' : 'Test Voice'}</span>
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 italic">
              "{testPhrases[testLanguage] || testPhrases.en}"
            </p>
          </div>

          {/* Voice Selection */}
          <div className="space-y-2">
            <label className="font-bold text-white block">Preferred Speech Voice</label>
            <select
              value={selectedVoiceURI}
              onChange={(e) => setSelectedVoiceURI(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white outline-none focus:border-cyan-400 font-sans"
            >
              <option value="">Default (Auto-select best voice matching language)</option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang}) {v.isNeural ? '★ Natural Neural' : ''}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400">
              Select from your device's installed natural voices. TOLKFLOW automatically matches Kinyarwanda, Chinese, Swahili, English, French, and other languages.
            </p>
          </div>

          {/* Speaking Rate / Speed */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-white">Speaking Speed</label>
              <span className="font-mono text-cyan-400 font-bold">{rate.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.05"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0.5x (Slow)</span>
              <span>1.0x (Normal)</span>
              <span>1.5x (Fast)</span>
              <span>2.0x (Ultra Fast)</span>
            </div>
          </div>

          {/* Pitch Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-white">Voice Pitch</label>
              <span className="font-mono text-cyan-400 font-bold">{pitch.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.05"
              value={pitch}
              onChange={(e) => setPitch(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Deeper (0.5)</span>
              <span>Natural (1.0)</span>
              <span>Higher (1.5)</span>
            </div>
          </div>

          {/* Volume Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-white">Speech Volume</label>
              <span className="font-mono text-cyan-400 font-bold">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Automation Toggles */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/60 border border-slate-800 cursor-pointer hover:border-cyan-500/30 transition-colors">
              <div>
                <span className="font-bold text-white block">Auto-read Incoming Messages</span>
                <span className="text-[11px] text-slate-400">
                  Automatically speak new text messages aloud as they arrive.
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoRead}
                onChange={(e) => setAutoRead(e.target.checked)}
                className="w-4 h-4 accent-cyan-400 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/60 border border-slate-800 cursor-pointer hover:border-cyan-500/30 transition-colors">
              <div>
                <span className="font-bold text-white block">AI Voice Translation</span>
                <span className="text-[11px] text-slate-400">
                  Allow one-click spoken translation in the recipient's preferred native language.
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoTranslateVoice}
                onChange={(e) => setAutoTranslateVoice(e.target.checked)}
                className="w-4 h-4 accent-cyan-400 rounded"
              />
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#060B18] flex items-center justify-end gap-3">
          <button
            onClick={() => {
              speechService.stop();
              onClose();
            }}
            className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold shadow-[0_0_20px_rgba(0,102,255,0.4)] flex items-center gap-1.5 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Save & Apply Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
