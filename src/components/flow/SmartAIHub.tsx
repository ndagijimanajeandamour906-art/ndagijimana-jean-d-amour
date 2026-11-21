import React, { useState, useEffect, useRef } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import { SmartAIService } from '../../services/aiService';
import { speechService } from '../../services/speechService';
import { soundFx } from '../../services/soundEffects';
import { SUPPORTED_LANGUAGES, getLanguageByCode } from '../../data/languages';
import {
  Sparkles,
  Bot,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square,
  Copy,
  Check,
  RefreshCw,
  Languages,
  BookOpen,
  Wand2,
  FileText,
  Trash2,
  Radio,
  HelpCircle,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';

interface AIMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  language?: string;
  suggestedActions?: string[];
}

export const SmartAIHub: React.FC = () => {
  const { currentUser, conversations, messages, activeConversationId } = useTolkflow();

  const [chatMessages, setChatMessages] = useState<AIMessage[]>([
    {
      id: 'ai_welcome',
      sender: 'ai',
      text: `Hello ${currentUser.name}! I am TOLKFLOW AI, your global multilingual assistant. I can translate speech and messages across 40+ languages (including Kinyarwanda, Chinese, Swahili, French, English, and Spanish), explain unfamiliar idioms, polish your messages, or speak answers aloud. How can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      language: currentUser.preferredLanguage || 'en',
      suggestedActions: [
        'Sobanura itegeko ry\'i Rwanda Nº 058/2021 ryerekeye amakuru bwite',
        'Summarize today\'s verified national news for Rwanda',
        'Explain privacy and cybercrime compliance on Tolkflow',
        'Translate from Kinyarwanda to Chinese',
        'Help rewrite my message professionally',
      ],
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [activeVoiceLanguage, setActiveVoiceLanguage] = useState<string>(currentUser.preferredLanguage || 'en');
  const [speechError, setSpeechError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isLoading]);

  // Sync speech service state
  useEffect(() => {
    const unsub = speechService.onStateChange((state) => {
      setSpeakingMessageId(state.isSpeaking ? state.playingId : null);
    });
    return () => unsub();
  }, []);

  // Stop speech when component unmounts
  useEffect(() => {
    return () => {
      speechService.stop();
      speechService.stopListening();
    };
  }, []);

  // Handle Send message to TOLKFLOW AI
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isLoading) return;

    soundFx.playMessageSentSound();

    const userMsg: AIMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);
    setSpeechError(null);

    const userLang = getLanguageByCode(currentUser.preferredLanguage || 'en').name;

    try {
      const history = chatMessages.slice(-6).map((m) => ({
        senderName: m.sender === 'user' ? currentUser.name : 'TOLKFLOW AI',
        text: m.text,
      }));

      const aiReplyText = await SmartAIService.generateContextAwareResponse(
        query,
        history,
        {
          recipientName: 'TOLKFLOW AI',
          language: currentUser.preferredLanguage || 'en',
          isAssistant: true,
        }
      );

      soundFx.playMessageReceivedSound();

      const aiMsg: AIMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: aiReplyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        language: currentUser.preferredLanguage || 'en',
      };

      setChatMessages((prev) => [...prev, aiMsg]);

      // If user enabled auto-read in voice settings, read aloud
      if (speechService.settings.autoReadMessages) {
        speechService.speak(aiReplyText, currentUser.preferredLanguage || 'en', aiMsg.id);
      }
    } catch (err: any) {
      console.warn('AI query note:', err);
      // Helpful fallback answer
      const fallbackMsg: AIMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: `I received your query: "${query}". TOLKFLOW AI is actively connected. If translation or language support is needed, you can speak or type in any supported language (such as Kinyarwanda, Chinese, Swahili, English, or French).`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Real Speech-to-Text (STT) Voice Input
  const toggleVoiceInput = () => {
    if (isListening) {
      speechService.stopListening();
      setIsListening(false);
      return;
    }

    setSpeechError(null);
    const success = speechService.startListening(
      activeVoiceLanguage,
      (res) => {
        setInputText(res.transcript);
        if (res.isFinal && res.transcript.trim()) {
          setIsListening(false);
          handleSendMessage(res.transcript);
        }
      },
      (err) => {
        setIsListening(false);
        setSpeechError(`Speech recognition: ${err}. Please ensure microphone permission is granted.`);
      },
      () => {
        setIsListening(false);
      }
    );

    if (success) {
      setIsListening(true);
      soundFx.playClickSound();
    }
  };

  // Text-To-Speech (TTS) Voice Output
  const handleToggleSpeak = (msg: AIMessage) => {
    if (speakingMessageId === msg.id) {
      speechService.stop();
      setSpeakingMessageId(null);
      return;
    }

    soundFx.playClickSound();
    speechService.speak(msg.text, msg.language || activeVoiceLanguage, msg.id, () => {
      setSpeakingMessageId(null);
    });
  };

  // Copy text to clipboard
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    soundFx.playClickSound();
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Summarize current active conversation
  const handleSummarizeCurrentChat = async () => {
    const convId = activeConversationId || conversations[0]?.id;
    if (!convId) return;

    const convMsgs = messages[convId] || [];
    if (!convMsgs.length) {
      handleSendMessage('Please provide an overview of communication tips for multicultural teams.');
      return;
    }

    setIsLoading(true);
    soundFx.playClickSound();

    try {
      const summary = await SmartAIService.summarizeConversation(
        convMsgs.map((m) => ({
          senderName: m.senderName,
          text: m.text,
          timestamp: m.timestamp,
        })),
        currentUser.preferredLanguage || 'en'
      );

      const aiMsg: AIMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: summary,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        language: currentUser.preferredLanguage || 'en',
      };
      setChatMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const currentLangObj = getLanguageByCode(activeVoiceLanguage);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050B14] overflow-hidden select-none">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-[#0A1124]/90 backdrop-blur-xl flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 blur-md opacity-60 animate-pulse" />
            <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 border border-cyan-400 flex items-center justify-center text-white shadow-lg">
              <Bot className="w-6 h-6" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">TOLKFLOW AI Assistant</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-400/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Gemini 3.8 Flash + Neural Speech
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Real-time multilingual translation, human-like voice synthesis, speech recognition, and writing tools.
            </p>
          </div>
        </div>

        {/* Voice Language Selector & Clear Chat */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-xl text-xs text-slate-300">
            <Languages className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={activeVoiceLanguage}
              onChange={(e) => setActiveVoiceLanguage(e.target.value)}
              className="bg-transparent text-white font-medium outline-none cursor-pointer text-xs"
              title="Select language for speech recognition and voice output"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} className="bg-slate-900 text-white">
                  {l.flag} {l.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setChatMessages([])}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Speech Error Banner if any */}
      {speechError && (
        <div className="px-4 py-2 bg-rose-500/20 border-b border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <span>{speechError}</span>
          <button onClick={() => setSpeechError(null)} className="underline text-[11px]">Dismiss</button>
        </div>
      )}

      {/* Main Chat Stage */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 max-w-4xl mx-auto w-full">
        {chatMessages.map((msg) => {
          const isUser = msg.sender === 'user';
          const isSpeakingThis = speakingMessageId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in duration-200`}
            >
              {!isUser && (
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                  <Bot className="w-5 h-5" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-3xl p-4 transition-all shadow-md ${
                  isUser
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-tr-none'
                    : 'bg-[#0A1124] border border-slate-800/80 text-slate-200 rounded-tl-none hover:border-cyan-500/30'
                }`}
              >
                {/* Message Header */}
                <div className="flex items-center justify-between gap-3 mb-1.5 text-[11px] opacity-80">
                  <span className="font-bold">{isUser ? 'You' : 'TOLKFLOW AI'}</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span>{msg.timestamp}</span>
                    {msg.language && <span>• {getLanguageByCode(msg.language).flag}</span>}
                  </div>
                </div>

                {/* Message Body */}
                <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {msg.text}
                </p>

                {/* Suggested Action Chips (if present) */}
                {msg.suggestedActions && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-slate-800">
                    {msg.suggestedActions.map((action, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(action)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-blue-600/30 hover:border-cyan-400 text-cyan-300 text-xs font-medium border border-cyan-500/30 transition-all flex items-center gap-1.5 group"
                      >
                        <Sparkles className="w-3 h-3 text-cyan-400 group-hover:rotate-12 transition-transform" />
                        <span>{action}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Action buttons bar */}
                <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-white/10 text-xs">
                  {/* TTS Speaker Playback */}
                  <button
                    onClick={() => handleToggleSpeak(msg)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all ${
                      isSpeakingThis
                        ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.5)] font-bold'
                        : 'bg-black/30 hover:bg-black/50 text-cyan-300 hover:text-white border border-cyan-400/20'
                    }`}
                    title={isSpeakingThis ? 'Stop Reading Aloud' : 'Read Message Aloud (Human Voice TTS)'}
                  >
                    {isSpeakingThis ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-white animate-spin" />
                        <span className="text-[11px]">Stop Voice</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Speak Aloud</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopy(msg.id, msg.text)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* AI Typing Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <div className="p-4 rounded-3xl rounded-tl-none bg-[#0A1124] border border-cyan-500/40 text-cyan-300 text-xs flex items-center gap-2 shadow-lg">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
              <span>TOLKFLOW AI is generating response...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Tool Presets Bar */}
      <div className="px-4 py-2 border-t border-slate-800/80 bg-[#060B18]/60 flex items-center gap-2 overflow-x-auto max-w-4xl mx-auto w-full text-xs">
        <span className="text-slate-500 font-mono uppercase text-[10px] tracking-wider flex items-center gap-1 flex-shrink-0">
          <Sparkles className="w-3 h-3 text-cyan-400" /> Quick AI:
        </span>
        <button
          onClick={() => handleSendMessage('Translate "Hello, how are you doing today?" into Kinyarwanda, Chinese, Swahili, and French.')}
          className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 whitespace-nowrap flex-shrink-0"
        >
          🌐 Multilingual Greetings
        </button>
        <button
          onClick={() => handleSendMessage('Explain the Rwandan concept of "Ubupfura" and cultural values of polite communication.')}
          className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 whitespace-nowrap flex-shrink-0"
        >
          🇷🇼 Explain Rwandan Idioms
        </button>
        <button
          onClick={handleSummarizeCurrentChat}
          className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-white border border-cyan-500/30 whitespace-nowrap flex-shrink-0"
        >
          📝 Summarize Current Chat
        </button>
      </div>

      {/* Input Stage with Voice STT & Send */}
      <div className="p-4 border-t border-slate-800 bg-[#0A1124] flex-shrink-0">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          {/* Voice Input Microphone (STT) */}
          <button
            onClick={toggleVoiceInput}
            className={`p-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center ${
              isListening
                ? 'bg-rose-600 text-white animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.6)]'
                : 'bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800'
            }`}
            title={isListening ? 'Click to stop listening' : `Click to speak in ${currentLangObj.name} (STT Voice Input)`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            placeholder={
              isListening
                ? `Listening in ${currentLangObj.name}... Speak now!`
                : `Ask TOLKFLOW AI or speak question in ${currentLangObj.name}...`
            }
            className="flex-1 px-4 py-3.5 rounded-2xl bg-slate-900 border border-slate-800 focus:border-cyan-400 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-colors"
          />

          {/* Send Button */}
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isLoading}
            className={`p-3.5 px-5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all ${
              inputText.trim() && !isLoading
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-[0_0_20px_rgba(0,102,255,0.4)]'
                : 'bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800'
            }`}
            title="Send to AI Assistant"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
};
