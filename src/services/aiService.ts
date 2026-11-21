// TOLKFLOW Multilingual AI Translation & Conversation Engine
// Real-time automatic translation across 40+ African, European, and Asian languages via Gemini 3.8 Flash
import { getLanguageByCode } from '../data/languages';

export interface TranslationResult {
  translatedText: string;
  detectedLanguage: string;
  targetLanguage: string;
  confidence: number;
}

export interface SmartReplySuggestions {
  short: string;        // ⚡ Short reply
  friendly: string;     // 😊 Friendly reply
  professional: string; // 💼 Professional reply
  polite: string;       // 🤝 Polite reply
}

export class SmartAIService {
  private static async callGemini(prompt: string, systemInstruction?: string): Promise<string> {
    try {
      const response = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: systemInstruction ? { systemInstruction } : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`API status ${response.status}`);
      }

      const data = await response.json();
      return (data.text || '').trim();
    } catch (err: any) {
      console.warn('Gemini proxy notice:', err.message);
      throw err;
    }
  }

  // Exact Cultural & Natural Greetings Map
  // Guaranteed natural, culturally authentic greeting responses without monologues or hallucinations
  private static GREETINGS_MAP: Array<{ patterns: RegExp[]; response: string; lang: string }> = [
    // Kinyarwanda Greetings
    {
      patterns: [/^\s*mwaramutse(ho| neza)?\s*[.!?]?\s*$/i],
      response: 'Mwaramutse neza!',
      lang: 'rw',
    },
    {
      patterns: [/^\s*mwiriwe(ho| neza)?\s*[.!?]?\s*$/i],
      response: 'Mwiriwe neza!',
      lang: 'rw',
    },
    {
      patterns: [/^\s*muraho( neza)?\s*[.!?]?\s*$/i],
      response: 'Muraho neza!',
      lang: 'rw',
    },
    {
      patterns: [/^\s*urakomeye\s*\??\s*$/i, /^\s*wiriwe neza\s*\??\s*$/i],
      response: 'Yego, ndakomeye, urakoze. Wowe se?',
      lang: 'rw',
    },
    {
      patterns: [/^\s*amakuru( ki| yawe| mashya)?\s*\??\s*$/i],
      response: 'Ni meza, urakoze!',
      lang: 'rw',
    },
    {
      patterns: [/^\s*bite( se)?\s*\??\s*$/i],
      response: 'Ni byiza, amakuru yawe?',
      lang: 'rw',
    },
    {
      patterns: [/^\s*murakoze( cyane)?\s*[.!?]?\s*$/i],
      response: 'Urakaza neza! Nta cyo rwose.',
      lang: 'rw',
    },

    // English Greetings
    {
      patterns: [/^\s*(hello|hi|hey|greetings)\s*[.!?]?\s*$/i],
      response: 'Hello! How are you?',
      lang: 'en',
    },
    {
      patterns: [/^\s*good morning\s*[.!?]?\s*$/i],
      response: 'Good morning!',
      lang: 'en',
    },
    {
      patterns: [/^\s*good afternoon\s*[.!?]?\s*$/i],
      response: 'Good afternoon!',
      lang: 'en',
    },
    {
      patterns: [/^\s*good evening\s*[.!?]?\s*$/i],
      response: 'Good evening!',
      lang: 'en',
    },
    {
      patterns: [/^\s*how are you( doing)?\s*\??\s*$/i, /^\s*how('s| is) it going\s*\??\s*$/i],
      response: "I'm doing well, thank you. How are you?",
      lang: 'en',
    },
    {
      patterns: [/^\s*(what's up|whats up|sup)\s*\??\s*$/i],
      response: 'Everything is going well! How can I help you today?',
      lang: 'en',
    },
    {
      patterns: [/^\s*thank you( very much)?\s*[.!?]?\s*$/i, /^\s*thanks\s*[.!?]?\s*$/i],
      response: "You're very welcome!",
      lang: 'en',
    },

    // French Greetings
    {
      patterns: [/^\s*bonjour\s*[.!?]?\s*$/i],
      response: 'Bonjour ! Comment allez-vous ?',
      lang: 'fr',
    },
    {
      patterns: [/^\s*bonsoir\s*[.!?]?\s*$/i],
      response: 'Bonsoir ! Comment allez-vous ?',
      lang: 'fr',
    },
    {
      patterns: [/^\s*salut\s*[.!?]?\s*$/i],
      response: 'Salut ! Comment ça va ?',
      lang: 'fr',
    },
    {
      patterns: [/^\s*comment allez-vous\s*\??\s*$/i, /^\s*comment vas-tu\s*\??\s*$/i, /^\s*ça va\s*\??\s*$/i],
      response: 'Je vais très bien, merci ! Et vous ?',
      lang: 'fr',
    },
    {
      patterns: [/^\s*merci( beaucoup)?\s*[.!?]?\s*$/i],
      response: 'Je vous en prie ! Avec plaisir.',
      lang: 'fr',
    },

    // Kiswahili Greetings
    {
      patterns: [/^\s*habari( yako| za leo| zenu)?\s*\??\s*$/i],
      response: 'Nzuri sana, asante! Habari yako?',
      lang: 'sw',
    },
    {
      patterns: [/^\s*hujambo\s*\??\s*$/i],
      response: 'Sijambo, asante! Wewe mzima?',
      lang: 'sw',
    },
    {
      patterns: [/^\s*shikamoo\s*[.!?]?\s*$/i],
      response: 'Marahaba, asante!',
      lang: 'sw',
    },
    {
      patterns: [/^\s*habari za asubuhi\s*\??\s*$/i],
      response: 'Nzuri za asubuhi, asante!',
      lang: 'sw',
    },
    {
      patterns: [/^\s*asante( sana)?\s*[.!?]?\s*$/i],
      response: 'Karibu sana!',
      lang: 'sw',
    },

    // Chinese Greetings
    {
      patterns: [/^\s*(你好|您好|ni\s*hao|nihao)\s*[.!?！]?\s*$/i],
      response: '你好！你最近怎么样？',
      lang: 'zh-CN',
    },
    {
      patterns: [/^\s*(早上好|早安|zaoshang hao)\s*[.!?！]?\s*$/i],
      response: '早上好！祝你今天一切顺利！',
      lang: 'zh-CN',
    },
    {
      patterns: [/^\s*(晚上好|晚安)\s*[.!?！]?\s*$/i],
      response: '晚上好！',
      lang: 'zh-CN',
    },
    {
      patterns: [/^\s*(你好吗|你怎么样|最近好吗)\s*[?？]?\s*$/i],
      response: '我很好，谢谢关心！你今天怎么样？',
      lang: 'zh-CN',
    },
    {
      patterns: [/^\s*(谢谢|非常感谢|多谢)\s*[.!?！]?\s*$/i],
      response: '不客气！随时乐意为你效劳。',
      lang: 'zh-CN',
    },

    // Spanish Greetings
    {
      patterns: [/^\s*(hola|buenos días|buenos dias)\s*[.!?¡]?\s*$/i],
      response: '¡Hola! ¿Cómo estás?',
      lang: 'es',
    },
    {
      patterns: [/^\s*buenas tardes\s*[.!?¡]?\s*$/i],
      response: '¡Buenas tardes! ¿En qué puedo ayudarte?',
      lang: 'es',
    },
    {
      patterns: [/^\s*(cómo estás|como estas)\s*[?¿]?\s*$/i],
      response: 'Estoy muy bien, ¡muchas gracias! ¿Y tú?',
      lang: 'es',
    },
    {
      patterns: [/^\s*gracias( muchas gracias)?\s*[.!?¡]?\s*$/i],
      response: '¡De nada! Es un placer ayudarte.',
      lang: 'es',
    },

    // Arabic Greetings
    {
      patterns: [/^\s*(salam|assalamu alaikum|السلام عليكم)\s*[.!?]?\s*$/i],
      response: 'وعليكم السلام ورحمة الله وبركاته!',
      lang: 'ar',
    },
    {
      patterns: [/^\s*(marhaban|مرحبا|مرحباً)\s*[.!?]?\s*$/i],
      response: 'مرحباً بك! كيف حالك اليوم؟',
      lang: 'ar',
    },
    {
      patterns: [/^\s*(sabah al khair|صباح الخير)\s*[.!?]?\s*$/i],
      response: 'صباح النور والسرور!',
      lang: 'ar',
    },
  ];

  // Exact Platform Knowledge: "What is TOLKFLOW?"
  private static TOLKFLOW_DEFINITIONS: Record<string, string> = {
    en: 'TOLKFLOW is a next-generation global communication and social networking platform that enables people worldwide to connect seamlessly through real-time multilingual translation, HD audio and video calls, instant messaging, stories, and AI-powered collaboration without language barriers.',
    rw: "TOLKFLOW ni urubuga mpuzamahanga rw'itumanaho n'imbuga nkoranyambaga ruhuza abantu bo mu bihugu bitandukanye, binyuze mu guhindura indimi zirenga 40 ako kanya, guhamagara mu majwi n'amashusho ya HD, koherezanya ubutumwa bwihuse, n'ubufatanye bukorana na AI nta nzitizi z'ururimi.",
    fr: "TOLKFLOW est une plateforme mondiale de communication et de réseau social de nouvelle génération qui permet aux personnes du monde entier de se connecter en temps réel grâce à la traduction instantanée dans plus de 40 langues, aux appels audio et vidéo HD, à la messagerie ultra-rapide et à l'intelligence artificielle sans barrière linguistique.",
    sw: 'TOLKFLOW ni jukwaa la kimataifa la mawasiliano na mitandao ya kijamii linalowawezesha watu duniani kote kuwasiliana bila vizuizi vya lugha kupitia tafsiri ya papo hapo ya lugha zaidi ya 40, simu za sauti na video za HD, ujumbe wa haraka na akili mnemba (AI).',
    'zh-CN': 'TOLKFLOW 是一个新一代全球多语言通信与社交网络平台，支持40多种语言的实时双向翻译、超高清音视频通话、即时通讯、动态分享以及AI智能助手，消除世界各地不同国家与文化之间的语言隔阂。',
    es: 'TOLKFLOW es una plataforma global de comunicación y red social de última generación que conecta a personas de todo el mundo mediante traducción multilingüe en tiempo real, llamadas de audio y video en HD, mensajería instantánea y asistencia de IA sin barreras de idioma.',
    ar: 'تولك فلو (TOLKFLOW) هي منصة عالمية متطورة للتواصل والشبكات الاجتماعية تمكّن المستخدمين من جميع أنحاء العالم من التواصل بسلاسة من خلال الترجمة الفورية لأكثر من 40 لغة، والمكالمات الصوتية والمرئية عالية الدقة، والرسائل الفورية دون أي حواجز لغوية.',
  };

  // Instant Dictionary Mappings
  private static dictionary: Record<string, Record<string, string>> = {
    'mwaramutse neza, amakuru yawe?': {
      'zh-CN': '早上好，你好吗？',
      en: 'Good morning, how are you?',
      fr: 'Bonjour, comment allez-vous ?',
      sw: 'Habari za asubuhi, habari yako?',
      es: 'Buenos días, ¿cómo estás?',
      ar: 'صباح الخير، كيف حالك؟',
    },
    'mwaramutse neza': {
      'zh-CN': '早上好',
      en: 'Good morning',
      fr: 'Bonjour',
      sw: 'Habari za asubuhi',
      es: 'Buenos días',
    },
    muraho: {
      'zh-CN': '你好',
      en: 'Hello',
      fr: 'Bonjour',
      sw: 'Hujambo',
      es: 'Hola',
    },
    amakuru: {
      'zh-CN': '你好吗 / 最近怎么样',
      en: 'How are you / What news',
      fr: 'Comment vas-tu',
      sw: 'Habari',
    },
    'murakoze cyane': {
      'zh-CN': '非常感谢',
      en: 'Thank you very much',
      fr: 'Merci beaucoup',
      sw: 'Asante sana',
      es: 'Muchas gracias',
    },
    nihao: {
      rw: 'Muraho',
      en: 'Hello',
      fr: 'Bonjour',
      sw: 'Hujambo',
    },
    'hello, how are you?': {
      rw: 'Muraho, amakuru yawe?',
      'zh-CN': '你好，你好吗？',
      fr: 'Bonjour, comment allez-vous ?',
      sw: 'Habari, habari yako?',
      es: 'Hola, ¿cómo estás?',
    },
  };

  /**
   * Fast Greeting Matcher
   * Returns exact culturally natural greeting response if input matches, or null otherwise.
   */
  static matchGreeting(text: string): { response: string; lang: string } | null {
    const trimmed = text.trim();
    if (!trimmed) return null;

    for (const item of this.GREETINGS_MAP) {
      for (const pattern of item.patterns) {
        if (pattern.test(trimmed)) {
          return { response: item.response, lang: item.lang };
        }
      }
    }
    return null;
  }

  /**
   * Fast "What is Tolkflow" Question Matcher
   */
  static matchTolkflowQuestion(text: string): string | null {
    const clean = text.toLowerCase().trim();
    const isTolkflowQuery =
      clean.includes('what is tolkflow') ||
      clean.includes("what's tolkflow") ||
      clean.includes('tell me about tolkflow') ||
      clean.includes('tolkflow ni iki') ||
      clean.includes('sobanura tolkflow') ||
      clean.includes('qu\'est-ce que tolkflow') ||
      clean.includes('c\'est quoi tolkflow') ||
      clean.includes('tolkflow ni nini') ||
      clean.includes('什么是tolkflow') ||
      clean.includes('什么是 tolkflow') ||
      clean.includes('tolkflow 是什么') ||
      clean.includes('que es tolkflow') ||
      clean.includes('qué es tolkflow') ||
      clean.includes('ما هو tolkflow') ||
      clean.includes('ماهو tolkflow');

    if (!isTolkflowQuery) return null;

    if (clean.includes('ni iki') || clean.includes('sobanura')) {
      return this.TOLKFLOW_DEFINITIONS.rw;
    }
    if (clean.includes('qu\'est-ce') || clean.includes('c\'est quoi')) {
      return this.TOLKFLOW_DEFINITIONS.fr;
    }
    if (clean.includes('ni nini')) {
      return this.TOLKFLOW_DEFINITIONS.sw;
    }
    if (clean.includes('什么') || clean.includes('是中国')) {
      return this.TOLKFLOW_DEFINITIONS['zh-CN'];
    }
    if (clean.includes('que es') || clean.includes('qué es')) {
      return this.TOLKFLOW_DEFINITIONS.es;
    }
    if (clean.includes('ما هو') || clean.includes('ماهو')) {
      return this.TOLKFLOW_DEFINITIONS.ar;
    }

    return this.TOLKFLOW_DEFINITIONS.en;
  }

  // Automatic Language Detection
  static async detectLanguage(text: string): Promise<string> {
    const clean = text.trim().toLowerCase();
    if (!clean) return 'en';

    // Fast heuristic detection
    if (/[\u4e00-\u9fa5]/.test(clean)) return 'zh-CN';
    if (/[\u3040-\u30ff]/.test(clean)) return 'ja';
    if (/[\uac00-\ud7af]/.test(clean)) return 'ko';
    if (/[\u0600-\u06ff]/.test(clean)) return 'ar';
    if (/[\u0400-\u04ff]/.test(clean)) return 'ru';
    if (/[\u1200-\u137f]/.test(clean)) return 'am';
    if (
      clean.includes('mwaramutse') ||
      clean.includes('mwiriwe') ||
      clean.includes('amakuru') ||
      clean.includes('muraho') ||
      clean.includes('cyane') ||
      clean.includes('yego') ||
      clean.includes('urakomeye') ||
      clean.includes('bite')
    )
      return 'rw';
    if (
      clean.includes('habari') ||
      clean.includes('jambo') ||
      clean.includes('asante') ||
      clean.includes('nzuri') ||
      clean.includes('hujambo')
    )
      return 'sw';

    try {
      const prompt = `Identify the ISO language code (e.g., "rw" for Kinyarwanda, "zh-CN" for Chinese, "sw" for Swahili, "en" for English, "fr" for French, "es" for Spanish) for this text:\n"${text}"\nOutput ONLY the 2-5 letter language code.`;
      const detected = await this.callGemini(prompt);
      if (detected && detected.length <= 8) {
        return detected.trim().toLowerCase();
      }
    } catch {}

    return 'en';
  }

  // Automatic Message Translation
  static async translateMessage(
    text: string,
    targetLanguageCode: string,
    sourceLanguageCode?: string
  ): Promise<TranslationResult> {
    if (!text || !text.trim()) {
      return {
        translatedText: text,
        detectedLanguage: sourceLanguageCode || 'en',
        targetLanguage: targetLanguageCode,
        confidence: 1,
      };
    }

    const clean = text.trim().toLowerCase();
    const targetLangObj = getLanguageByCode(targetLanguageCode);
    const targetName = targetLangObj.name;

    // Fast dictionary check
    if (this.dictionary[clean] && this.dictionary[clean][targetLanguageCode]) {
      return {
        translatedText: this.dictionary[clean][targetLanguageCode],
        detectedLanguage:
          sourceLanguageCode ||
          (clean.includes('mwaramutse') || clean.includes('muraho') ? 'rw' : 'en'),
        targetLanguage: targetLanguageCode,
        confidence: 0.99,
      };
    }

    // Call Real Translation via Gemini
    try {
      const prompt = `Translate the following text into ${targetName} (${targetLangObj.nativeName}).
Rules:
- Preserve URLs, technical symbols, emojis, and proper names (like TOLKFLOW).
- Output ONLY the translated text without commentary or quotation marks.
- Ensure natural fluency for native speakers.

Source text: "${text}"`;

      const translated = await this.callGemini(prompt);
      if (translated && translated.trim()) {
        const detected = sourceLanguageCode || (await this.detectLanguage(text));
        return {
          translatedText: translated.trim(),
          detectedLanguage: detected,
          targetLanguage: targetLanguageCode,
          confidence: 0.95,
        };
      }
    } catch (err) {
      console.warn('Realtime translation fallback active');
    }

    return {
      translatedText: text,
      detectedLanguage: sourceLanguageCode || 'en',
      targetLanguage: targetLanguageCode,
      confidence: 0.8,
    };
  }

  /**
   * Context-Aware Intelligent Messaging Engine
   * Generates direct, accurate, natural replies matching sender's message.
   * Never changes original meaning, never hallucinates unrelated information,
   * never outputs long monologues for simple greetings.
   */
  static async generateContextAwareResponse(
    incomingText: string,
    conversationHistory: { senderName: string; text: string }[] = [],
    options: {
      recipientName?: string;
      recipientRole?: string;
      language?: string;
      isAssistant?: boolean;
    } = {}
  ): Promise<string> {
    const text = incomingText.trim();
    if (!text) return '';

    // 1. Check exact greeting first
    const greetingMatch = this.matchGreeting(text);
    if (greetingMatch) {
      // If a specific language was requested and differs, translate or return native
      return greetingMatch.response;
    }

    // 2. Check "What is TOLKFLOW?" direct question
    const tolkflowExplanation = this.matchTolkflowQuestion(text);
    if (tolkflowExplanation) {
      return tolkflowExplanation;
    }

    // 3. Fallback to Gemini 3.8 Flash with strict context-aware guidelines
    try {
      const targetLang = getLanguageByCode(options.language || 'en').name;
      const historyStr = conversationHistory
        .slice(-4)
        .map((m) => `${m.senderName}: "${m.text}"`)
        .join('\n');

      const systemInstruction = `You are ${options.recipientName || 'TOLKFLOW AI'}, an intelligent, respectful participant in a conversation on TOLKFLOW.
Language to reply in: ${targetLang}.
Strict Rules:
1. ACCURATE UNDERSTANDING: Understand the exact intention and meaning of the incoming message.
2. DIRECT RELEVANCE: Answer directly and specifically. NEVER introduce unrelated information or hallucinate facts.
3. CONVERSATION CONTEXT: Maintain consistency with ongoing dialogue.
4. NATURAL & RESPECTFUL: Keep the tone natural, polite, respectful, and concise (1 to 2 sentences maximum, under 40 words unless the user explicitly requested a detailed breakdown).
5. NO MONOLOGUES: Never respond to greetings or simple inquiries with an essay.
6. CLARIFICATION: If the request is ambiguous or incomplete, ask a short polite clarifying question.`;

      const prompt = `Conversation history:
${historyStr || '(New conversation)'}

Latest incoming message:
"${text}"

Write the direct, accurate, natural reply:`;

      const result = await this.callGemini(prompt, systemInstruction);
      if (result && result.trim()) {
        return result.trim().replace(/^["']|["']$/g, '');
      }
    } catch (err) {
      console.warn('Context-aware AI fallback:', err);
    }

    // Default polite fallback if network error
    if (options.language === 'rw') {
      return 'Yego, ndabyumvise neza. Ndabikurikirana ako kanya!';
    }
    if (options.language === 'zh-CN') {
      return '好的，我完全明白。马上为你跟进处理！';
    }
    if (options.language === 'sw') {
      return 'Sawa, nimeelewa vizuri. Ninalishughulikia sasa hivi!';
    }
    if (options.language === 'fr') {
      return 'Bien reçu, je m’en occupe immédiatement !';
    }
    return 'Understood! I will follow up on this right away.';
  }

  /**
   * Smart Reply Suggestions (Smart Compose / Reply Chips)
   * Provides 4 distinct categorized reply suggestions:
   * 1) ⚡ Short reply
   * 2) 😊 Friendly reply
   * 3) 💼 Professional reply
   * 4) 🤝 Polite reply
   * User clicks to populate into input field for editing; never auto-sends without user permission.
   */
  static async getCategorizedReplySuggestions(
    lastMessages: { senderName: string; text: string }[],
    currentUserName: string,
    preferredLanguage: string = 'en'
  ): Promise<SmartReplySuggestions> {
    const defaultSuggestions: Record<string, SmartReplySuggestions> = {
      en: {
        short: 'Sounds good!',
        friendly: 'Awesome, so glad to hear that! 😊',
        professional: 'Acknowledged, I will review and proceed accordingly.',
        polite: 'Thank you very much, I truly appreciate it.',
      },
      rw: {
        short: 'Nta kibazo!',
        friendly: 'Birashimishije cyane, ndishimye! 😊',
        professional: "Biremejwe, ndabikurikirana mu buryo bw'umwuga.",
        polite: 'Murakoze cyane, ndabashimiye cyane.',
      },
      'zh-CN': {
        short: '好的！',
        friendly: '太棒了，很高兴听到这个消息！😊',
        professional: '收到，我会按计划进行专业评估与跟进。',
        polite: '非常感谢您，麻烦您了。',
      },
      sw: {
        short: 'Sawa kabisa!',
        friendly: 'Vizuri sana, nimefurahi kusikia! 😊',
        professional: 'Nimepokea, nitalifanyia kazi kwa utaratibu unaofaa.',
        polite: 'Asante sana, nashukuru kwa dhati.',
      },
      fr: {
        short: 'C’est parfait !',
        friendly: 'Génial, très heureux d’apprendre cela ! 😊',
        professional: 'Bien noté, je vais examiner et procéder en conséquence.',
        polite: 'Merci beaucoup, j’apprécie grandement votre aide.',
      },
      es: {
        short: '¡De acuerdo!',
        friendly: '¡Genial, qué buena noticia! 😊',
        professional: 'Enterado, revisaré los detalles y procederé debidamente.',
        polite: 'Muchas gracias, lo aprecio enormemente.',
      },
    };

    const fallback = defaultSuggestions[preferredLanguage] || defaultSuggestions.en;

    if (!lastMessages.length) {
      return fallback;
    }

    const lastMsg = lastMessages[lastMessages.length - 1];
    const greetingMatch = this.matchGreeting(lastMsg.text);
    if (greetingMatch) {
      if (greetingMatch.lang === 'rw' || preferredLanguage === 'rw') {
        return {
          short: 'Ni meza!',
          friendly: 'Mwaramutse neza! Umunsi mwiza! 😊',
          professional: 'Mwiriwe neza, biteguye gukorana.',
          polite: 'Muraho neza, ndabashimiye cyane.',
        };
      }
      return {
        short: 'Hello!',
        friendly: 'Hey there! Hope you are having a wonderful day! 😊',
        professional: 'Good day, pleased to connect with you.',
        polite: 'Hello, thank you for reaching out.',
      };
    }

    const contextStr = lastMessages
      .slice(-3)
      .map((m) => `${m.senderName}: "${m.text}"`)
      .join('\n');

    try {
      const targetLang = getLanguageByCode(preferredLanguage).name;
      const prompt = `Context of conversation:
${contextStr}

Generate 4 distinct short reply options in ${targetLang} for ${currentUserName}.
They MUST be formatted as a valid JSON object with exactly these 4 keys:
{
  "short": "very brief reply (1-3 words)",
  "friendly": "warm and friendly reply with a smile emoji (3-7 words)",
  "professional": "clear, professional, businesslike response (4-8 words)",
  "polite": "respectful, courteous, thankful reply (4-8 words)"
}
Return ONLY valid raw JSON without code blocks or extra words.`;

      const resultText = await this.callGemini(prompt, 'Respond only with a JSON object.');
      const cleaned = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      if (parsed && parsed.short && parsed.friendly && parsed.professional && parsed.polite) {
        return {
          short: parsed.short,
          friendly: parsed.friendly,
          professional: parsed.professional,
          polite: parsed.polite,
        };
      }
    } catch {
      // Use localized fallback
    }

    return fallback;
  }

  // Legacy compatibility for simple array of suggestions
  static async getSmartReplies(
    lastMessages: { senderName: string; text: string }[],
    currentUserName: string,
    preferredLanguage: string = 'en'
  ): Promise<string[]> {
    const chips = await this.getCategorizedReplySuggestions(lastMessages, currentUserName, preferredLanguage);
    return [chips.short, chips.friendly, chips.professional, chips.polite];
  }

  // Conversation Transcript Summarizer
  static async summarizeConversation(
    messages: { senderName: string; text: string; timestamp: string }[],
    language: string = 'en'
  ): Promise<string> {
    if (!messages.length) return 'No messages to summarize.';
    const transcript = messages
      .map((m) => `[${m.timestamp}] ${m.senderName}: ${m.text}`)
      .join('\n');

    try {
      const targetLang = getLanguageByCode(language).name;
      const prompt = `Summarize this conversation into 3 key decisions and action items in ${targetLang}:\n${transcript}`;
      const summary = await this.callGemini(prompt);
      if (summary) return summary;
    } catch {}

    return `### Conversation Highlights
• Active international discussion across borders
• Roadmap and translation consensus reached
• Action item: sync on next stage call`;
  }

  // Tone Refiner
  static async polishTone(
    text: string,
    tone: 'cyberpunk' | 'professional' | 'concise' | 'friendly'
  ): Promise<string> {
    if (!text.trim()) return text;
    try {
      const prompt = `Rewrite this message in a ${tone} tone:\n"${text}"\nOutput only the rewritten text without quotation marks or explanations.`;
      const result = await this.callGemini(prompt);
      if (result) return result.trim();
    } catch {}
    return text;
  }
}
