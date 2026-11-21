import React, { useState } from 'react';
import {
  Globe,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ExternalLink,
  Volume2,
  Sparkles,
  Share2,
  Bookmark,
  AlertTriangle,
  Building2,
  TrendingUp,
  Shield,
  Cpu,
  GraduationCap,
  HeartPulse,
  Flame,
  ArrowRight,
  Eye,
  RotateCw,
  Plus,
  Square,
  Check,
  X,
} from 'lucide-react';
import { useTolkflow } from '../../context/TolkflowContext';
import { NationalNewsArticle, NewsCategory } from '../../types';
import { speechService } from '../../services/speechService';
import { getLanguageByCode } from '../../data/languages';

export const SmartNationalNews: React.FC = () => {
  const {
    newsArticles,
    selectedCountry,
    setSelectedCountry,
    jurisdictions,
    currentUser,
    addNewsArticle,
    theme,
  } = useTolkflow();

  const [activeCategory, setActiveCategory] = useState<NewsCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<NationalNewsArticle | null>(null);
  const [readingArticleId, setReadingArticleId] = useState<string | null>(null);
  const [articleModalOpen, setArticleModalOpen] = useState(false);

  const isKinyarwanda = currentUser.preferredLanguage === 'rw';

  const categories: { id: NewsCategory | 'all'; labelEn: string; labelRw: string; icon: any }[] = [
    { id: 'all', labelEn: 'All News', labelRw: 'Yose Hamwe', icon: Globe },
    { id: 'government', labelEn: 'Government & Policy', labelRw: 'Leta n\'Ubuyobozi', icon: Building2 },
    { id: 'economy', labelEn: 'Economy & Business', labelRw: 'Ubukungu', icon: TrendingUp },
    { id: 'security', labelEn: 'National Security', labelRw: 'Umutekano', icon: Shield },
    { id: 'tech', labelEn: 'Technology & AI', labelRw: 'Ikoranabuhanga', icon: Cpu },
    { id: 'education', labelEn: 'Education', labelRw: 'Uburezi', icon: GraduationCap },
    { id: 'health', labelEn: 'Health & Society', labelRw: 'Ubuzima', icon: HeartPulse },
  ];

  // Filter articles based on active selections
  const filteredArticles = newsArticles.filter((article) => {
    // Country filter (if not "Global" / "All")
    const matchCountry =
      selectedCountry === 'Global' ||
      selectedCountry === 'All' ||
      article.country.toLowerCase() === selectedCountry.toLowerCase() ||
      article.countryCode.toLowerCase() === selectedCountry.toLowerCase();

    // Category filter
    const matchCategory = activeCategory === 'all' || article.category === activeCategory;

    // Search query
    const matchSearch =
      !searchQuery.trim() ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (article.titleKinyarwanda && article.titleKinyarwanda.toLowerCase().includes(searchQuery.toLowerCase())) ||
      article.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.officialSource.toLowerCase().includes(searchQuery.toLowerCase());

    // Verified only filter
    const matchVerified = !verifiedOnly || article.verified;

    return matchCountry && matchCategory && matchSearch && matchVerified;
  });

  const breakingArticles = filteredArticles.filter((a) => a.isBreaking);

  // Handle TTS Read Aloud for news article
  const handleReadAloud = (article: NationalNewsArticle) => {
    if (readingArticleId === article.id && speechService.isSpeaking) {
      speechService.stop();
      setReadingArticleId(null);
      return;
    }

    const textToRead =
      isKinyarwanda && article.summaryKinyarwanda
        ? `${article.titleKinyarwanda || article.title}. ${article.summaryKinyarwanda}. ${article.content}`
        : `${article.title}. ${article.summary}. ${article.content}`;

    const lang = isKinyarwanda ? 'rw' : 'en';

    speechService.speak(textToRead, lang, article.id, {
      rate: 1.0,
      onStart: () => setReadingArticleId(article.id),
      onEnd: () => setReadingArticleId(null),
      onError: () => setReadingArticleId(null),
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050B14] text-slate-100 overflow-hidden select-none">
      {/* Top Banner & Country Bar */}
      <div className="bg-[#0b1424] border-b border-slate-800 p-4 md:px-8 space-y-4 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-[#075E54] to-[#25D366] text-white shadow-lg shadow-emerald-950/40">
              <Globe className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-white font-display">
                  TOLKFLOW Smart National News
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 uppercase">
                  Verified Intelligence
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isKinyarwanda
                  ? 'Gukurikirana amakuru agezweho mu gihugu no ku rwego mpuzamahanga'
                  : 'Automated national & international news monitoring with AI neural summaries'}
              </p>
            </div>
          </div>

          {/* Country Jurisdiction Selector */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
              {isKinyarwanda ? 'Igihugu:' : 'Jurisdiction:'}
            </span>
            <div className="flex items-center space-x-1.5 bg-[#050B14] p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setSelectedCountry('Global')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  selectedCountry === 'Global' || selectedCountry === 'All'
                    ? 'bg-[#25D366] text-gray-950 font-bold shadow'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                🌐 Global
              </button>
              {jurisdictions.map((j) => (
                <button
                  key={j.countryCode}
                  onClick={() => setSelectedCountry(j.countryName)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1 whitespace-nowrap ${
                    selectedCountry.toLowerCase() === j.countryName.toLowerCase()
                      ? 'bg-[#25D366] text-gray-950 font-bold shadow'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                  title={`${j.countryName} - ${j.dataProtectionAuthority}`}
                >
                  <span>{j.flag}</span>
                  <span className="hidden sm:inline">{j.countryName}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search & Category Pills */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Category Badges */}
          <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-500/20 text-[#25D366] border border-emerald-400/50 shadow'
                      : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{isKinyarwanda ? cat.labelRw : cat.labelEn}</span>
                </button>
              );
            })}
          </div>

          {/* Search Input & Verified Toggle */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isKinyarwanda ? 'Shakisha amakuru...' : 'Search national news...'}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 outline-none focus:border-[#25D366] transition-colors"
              />
            </div>

            <button
              onClick={() => setVerifiedOnly(!verifiedOnly)}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                verifiedOnly
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
              title="Filter by officially verified government & media sources"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#25D366]" />
              <span className="hidden md:inline">{isKinyarwanda ? 'Yemejwe gusa' : 'Verified Only'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: Breaking News Banner + News Grid */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {/* Breaking News Carousel / Alert */}
        {breakingArticles.length > 0 && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/40 via-red-900/30 to-amber-950/30 border border-rose-500/40 shadow-lg flex items-start justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-xl bg-rose-500 text-white flex-shrink-0 animate-bounce">
                <Flame className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-500 text-white tracking-wider">
                    {isKinyarwanda ? 'AMAKURU ASHYUSHYE' : 'BREAKING BULLETIN'}
                  </span>
                  <span className="text-xs text-rose-300 font-medium">
                    {breakingArticles[0].country} • {breakingArticles[0].publishedDateStr}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white hover:text-rose-200 cursor-pointer" onClick={() => {
                  setSelectedArticle(breakingArticles[0]);
                  setArticleModalOpen(true);
                }}>
                  {isKinyarwanda && breakingArticles[0].titleKinyarwanda
                    ? breakingArticles[0].titleKinyarwanda
                    : breakingArticles[0].title}
                </h3>
                <p className="text-xs text-slate-300 line-clamp-2">
                  {isKinyarwanda && breakingArticles[0].summaryKinyarwanda
                    ? breakingArticles[0].summaryKinyarwanda
                    : breakingArticles[0].summary}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedArticle(breakingArticles[0]);
                setArticleModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold whitespace-nowrap transition-colors flex items-center space-x-1"
            >
              <span>{isKinyarwanda ? 'Soma Byose' : 'Read Story'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* News Grid */}
        {filteredArticles.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Globe className="w-12 h-12 text-slate-600 mx-auto" />
            <h4 className="text-base font-bold text-white">
              {isKinyarwanda ? 'Nta makuru ahuye n\'ibyo ushakishije' : 'No national news found'}
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting your category filter or search keywords.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article) => {
              const isSpeaking = readingArticleId === article.id;
              const displayTitle = isKinyarwanda && article.titleKinyarwanda ? article.titleKinyarwanda : article.title;
              const displaySummary = isKinyarwanda && article.summaryKinyarwanda ? article.summaryKinyarwanda : article.summary;

              return (
                <div
                  key={article.id}
                  className="bg-[#0b1424] border border-slate-800 hover:border-emerald-500/40 rounded-2xl overflow-hidden shadow-lg transition-all hover:-translate-y-1 flex flex-col group"
                >
                  {/* Article Thumbnail Image */}
                  {article.imageUrl && (
                    <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                      <img
                        src={article.imageUrl}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0b1424] via-transparent to-transparent" />
                      
                      {/* Category Badge & Verification Badge on Thumbnail */}
                      <div className="absolute top-3 left-3 flex items-center space-x-1.5">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-black/60 backdrop-blur-md text-white border border-white/20 uppercase tracking-wider">
                          {article.category}
                        </span>
                        {article.verified ? (
                          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#25D366]/20 backdrop-blur-md text-[#25D366] border border-[#25D366]/40">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/20 backdrop-blur-md text-amber-300 border border-amber-500/40">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Developing</span>
                          </span>
                        )}
                      </div>

                      {/* Country Flag Badge */}
                      <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-md text-xs font-bold text-white border border-white/20">
                        {article.country}
                      </div>
                    </div>
                  )}

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-semibold text-emerald-400">{article.officialSource}</span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{article.publishedDateStr}</span>
                        </span>
                      </div>

                      <h3
                        onClick={() => {
                          setSelectedArticle(article);
                          setArticleModalOpen(true);
                        }}
                        className="text-base font-bold text-white group-hover:text-[#25D366] transition-colors cursor-pointer line-clamp-2 leading-snug"
                      >
                        {displayTitle}
                      </h3>

                      <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                        {displaySummary}
                      </p>
                    </div>

                    {/* AI Takeaway Capsule */}
                    <div className="p-3 bg-[#050B14] rounded-xl border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-emerald-400">
                        <span className="flex items-center space-x-1">
                          <Sparkles className="w-3 h-3 text-[#25D366]" />
                          <span>AI Intelligence Summary</span>
                        </span>
                        <span className="text-slate-500">{article.aiAnalysis.readingTimeMin} min read</span>
                      </div>
                      <p className="text-[11px] text-slate-300 italic line-clamp-2">
                        "{article.aiAnalysis.summary}"
                      </p>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      {/* TTS Read Aloud Button */}
                      <button
                        onClick={() => handleReadAloud(article)}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          isSpeaking
                            ? 'bg-rose-500 text-white animate-pulse'
                            : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                        }`}
                        title="Read story aloud with natural AI voice"
                      >
                        {isSpeaking ? (
                          <>
                            <Square className="w-3.5 h-3.5 fill-current" />
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5 text-[#25D366]" />
                            <span>Listen</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          setSelectedArticle(article);
                          setArticleModalOpen(true);
                        }}
                        className="flex items-center space-x-1 text-xs font-bold text-[#25D366] hover:text-emerald-300 transition-colors"
                      >
                        <span>{isKinyarwanda ? 'Amakuru arambuye' : 'Full Story'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full Article Modal */}
      {articleModalOpen && selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0b1424] border border-emerald-500/40 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-gray-100">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-[#075E54] to-[#128C7E] flex items-center justify-between border-b border-emerald-600/40">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{selectedArticle.country === 'Rwanda' ? '🇷🇼' : '🌐'}</span>
                <div>
                  <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider block">
                    {selectedArticle.category} • {selectedArticle.officialSource}
                  </span>
                  <span className="text-xs text-white/80">{selectedArticle.publishedDateStr}</span>
                </div>
              </div>
              <button
                onClick={() => setArticleModalOpen(false)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              <h2 className="text-xl md:text-2xl font-bold text-white font-display leading-snug">
                {isKinyarwanda && selectedArticle.titleKinyarwanda
                  ? selectedArticle.titleKinyarwanda
                  : selectedArticle.title}
              </h2>

              {/* AI Key Takeaways Box */}
              <div className="p-4 rounded-2xl bg-[#050B14] border border-[#25D366]/40 space-y-2.5">
                <div className="flex items-center space-x-2 text-xs font-bold text-[#25D366]">
                  <Sparkles className="w-4 h-4 text-[#25D366]" />
                  <span>AI Neural Analysis & Key Takeaways</span>
                </div>
                <p className="text-xs text-slate-300 italic leading-relaxed">
                  {selectedArticle.aiAnalysis.summary}
                </p>
                <ul className="space-y-1.5 pt-1 border-t border-slate-800 text-xs text-slate-200">
                  {selectedArticle.aiAnalysis.keyTakeaways.map((takeaway, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <Check className="w-3.5 h-3.5 text-[#25D366] flex-shrink-0 mt-0.5" />
                      <span>{takeaway}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Full Article Content */}
              <div className="prose prose-invert max-w-none text-slate-200 text-sm leading-relaxed space-y-4 whitespace-pre-wrap">
                {selectedArticle.content}
              </div>

              {/* Official Source Attestation */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-300 block">Attributed Source:</span>
                  <span className="text-xs text-emerald-400 font-medium">{selectedArticle.officialSource}</span>
                </div>
                {selectedArticle.sourceUrl && (
                  <a
                    href={selectedArticle.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-[#25D366] text-xs font-bold hover:bg-emerald-500/30 transition-colors"
                  >
                    <span>View Gazette / Source</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#050B14] border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => handleReadAloud(selectedArticle)}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-gray-950 font-bold text-xs transition-colors"
              >
                <Volume2 className="w-4 h-4 fill-current" />
                <span>{readingArticleId === selectedArticle.id ? 'Stop Reading' : 'Read Aloud with AI'}</span>
              </button>

              <button
                onClick={() => setArticleModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
