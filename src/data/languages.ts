import { Language } from '../types';

export const SUPPORTED_LANGUAGES: Language[] = [
  // African Languages
  { code: 'rw', name: 'Kinyarwanda', nativeName: 'Ikinyarwanda', flag: '🇷🇼', region: 'African' },
  { code: 'sw', name: 'Kiswahili', nativeName: 'Kiswahili', flag: '🇹🇿', region: 'African' },
  { code: 'lg', name: 'Luganda', nativeName: 'Oluganda', flag: '🇺🇬', region: 'African' },
  { code: 'so', name: 'Somali', nativeName: 'Af-Soomaali', flag: '🇸🇴', region: 'African' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', flag: '🇪🇹', region: 'African' },
  { code: 'yo', name: 'Yoruba', nativeName: 'Èdè Yorùbá', flag: '🇳🇬', region: 'African' },
  { code: 'ha', name: 'Hausa', nativeName: 'Harshen Hausa', flag: '🇳🇬', region: 'African' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu', flag: '🇿🇦', region: 'African' },
  { code: 'xh', name: 'Xhosa', nativeName: 'isiXhosa', flag: '🇿🇦', region: 'African' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', flag: '🇿🇦', region: 'African' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', region: 'African' },

  // European Languages
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', region: 'European' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', region: 'European' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', region: 'European' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', region: 'European' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', region: 'European' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', region: 'European' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', region: 'European' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', region: 'European' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦', region: 'European' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', region: 'European' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', region: 'European' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷', region: 'European' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪', region: 'European' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴', region: 'European' },

  // Asian Languages
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', flag: '🇨🇳', region: 'Asian' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', flag: '🇹🇼', region: 'Asian' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', region: 'Asian' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', region: 'Asian' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', region: 'Asian' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰', region: 'Asian' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩', region: 'Asian' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', region: 'Asian' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', region: 'Asian' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', region: 'Asian' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾', region: 'Asian' },
  { code: 'tl', name: 'Filipino', nativeName: 'Wikang Filipino', flag: '🇵🇭', region: 'Asian' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', flag: '🇳🇵', region: 'Asian' },
];

export const getLanguageByCode = (code: string): Language => {
  return (
    SUPPORTED_LANGUAGES.find((l) => l.code.toLowerCase() === code.toLowerCase()) ||
    SUPPORTED_LANGUAGES[11] // Default English
  );
};
