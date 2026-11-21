import React, { useState } from 'react';
import { 
  Scale, 
  ShieldCheck, 
  AlertTriangle, 
  ExternalLink, 
  FileText, 
  Calendar, 
  Globe, 
  Search, 
  Filter, 
  History, 
  CheckCircle2, 
  Sparkles, 
  Bot, 
  Volume2, 
  Building2, 
  Lock, 
  BookOpen, 
  ChevronRight,
  Info
} from 'lucide-react';
import { useTolkflow } from '../../context/TolkflowContext';
import { NationalLaw, LawCategory, LawComplianceStatus } from '../../types';

export const SmartLegalCompliance: React.FC = () => {
  const { 
    nationalLaws, 
    legalAuditLogs, 
    selectedCountry, 
    setSelectedCountry, 
    jurisdictions,
    currentUser
  } = useTolkflow();

  const [activeSubTab, setActiveSubTab] = useState<'laws' | 'audit_logs' | 'ai_explainer'>('laws');
  const [selectedLaw, setSelectedLaw] = useState<NationalLaw | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // AI Explainer state
  const [explainingLawId, setExplainingLawId] = useState<string | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiLang, setAiLang] = useState<'rw' | 'en'>('rw');
  const [loadingAi, setLoadingAi] = useState(false);

  const currentJurisdiction = jurisdictions.find(j => j.countryCode === selectedCountry) || jurisdictions[0];

  const filteredLaws = nationalLaws.filter(law => {
    const matchesCountry = law.countryCode === selectedCountry || law.countryCode === 'GLOBAL';
    const matchesCategory = categoryFilter === 'all' || law.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || law.status === statusFilter;
    const matchesSearch = 
      law.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      law.gazetteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      law.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      law.affectedEntities.some(e => e.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCountry && matchesCategory && matchesStatus && matchesSearch;
  });

  const handleAskAi = async (law: NationalLaw) => {
    setExplainingLawId(law.id);
    setSelectedLaw(law);
    setActiveSubTab('ai_explainer');
    setLoadingAi(true);
    setAiExplanation(null);

    try {
      const res = await fetch('/api/ai/explain-law', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lawId: law.id,
          title: law.title,
          country: law.country,
          keyProvisions: [law.fullArticlesHighlight, ...law.affectedEntities],
          language: aiLang === 'rw' ? 'Kinyarwanda' : 'English'
        })
      });
      const data = await res.json();
      setAiExplanation(data.explanation || data.error || 'Failed to explain law');
    } catch {
      setAiExplanation(
        aiLang === 'rw'
          ? `Iri tegeko ry'i ${law.country} (${law.gazetteNumber}) rigamije kurengera umutekano w'amakuru y'abaturage no kubungabunga ituze rusange. Muri Tolkflow, amategeko yose yubahirizwa mu buryo bungana ku bakoresha bose, nta muntu n'umwe uri hejuru y'amategeko harimo na ba Admin cyangwa Umuyobozi w'urubuga.`
          : `This law of ${law.country} (${law.gazetteNumber}) enforces data security and public communication integrity. Tolkflow strictly enforces universal compliance across all accounts. No user, regardless of admin status or authority, is exempt from compliance.`
      );
    } finally {
      setLoadingAi(false);
    }
  };

  const getStatusBadge = (status: LawComplianceStatus) => {
    switch (status) {
      case 'compliant':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Compliant & Enforced
          </span>
        );
      case 'requires_action':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            Under Audit
          </span>
        );
      case 'pending_review':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <FileText className="w-3.5 h-3.5" />
            Pending Gazette
          </span>
        );
      case 'exempt':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Info className="w-3.5 h-3.5" />
            Conditional Exemption
          </span>
        );
    }
  };

  const categories: { key: string; labelRw: string; labelEn: string }[] = [
    { key: 'all', labelRw: 'Byose', labelEn: 'All Categories' },
    { key: 'data_privacy', labelRw: 'Amakuru Bwite', labelEn: 'Data Privacy' },
    { key: 'cybersecurity', labelRw: 'Umutekano mu By\'ikoranabuhanga', labelEn: 'Cybercrimes' },
    { key: 'content_safety', labelRw: 'Ibirimo n\'Imyitwarire', labelEn: 'Content & Speech' },
    { key: 'telecom', labelRw: 'Imiyoborere ya Telecom', labelEn: 'Telecom / RURA' },
    { key: 'ai_governance', labelRw: 'Imiyoborere ya AI', labelEn: 'AI Governance' },
    { key: 'e_commerce', labelRw: 'Ubucuruzi n\'Imihanahanire', labelEn: 'Fintech & E-commerce' }
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#0b141a] overflow-hidden">
      {/* Top Header Banner */}
      <div className="bg-white dark:bg-[#111b21] border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex-shrink-0 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-700/10 dark:bg-emerald-500/20 flex items-center justify-center text-[#075E54] dark:text-[#25D366]">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Smart National Law Compliance
                </h1>
                <span className="text-xs px-2 py-0.5 rounded font-mono bg-emerald-100 dark:bg-emerald-900/50 text-[#075E54] dark:text-[#25D366] font-semibold">
                  AUDITED
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Kubahiriza amategeko y'igihugu • Universal Equality (Nobody is above the law)
              </p>
            </div>
          </div>

          {/* Country Selector */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#202c33] p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <Globe className="w-4 h-4 ml-2 text-slate-400" />
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="bg-transparent text-sm font-medium text-slate-800 dark:text-slate-200 py-1.5 pr-4 pl-1 outline-none cursor-pointer"
            >
              {jurisdictions.map((j) => (
                <option key={j.countryCode} value={j.countryCode} className="bg-white dark:bg-[#111b21] text-slate-900 dark:text-slate-100">
                  {j.flag} {j.countryName} ({j.dataProtectionAuthority})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Universal Equality Guarantee Banner */}
        <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-emerald-950 via-[#075E54] to-teal-800 text-white shadow-sm flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/10 rounded-lg text-emerald-300 mt-0.5 sm:mt-0 flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-200">
                Principe y'Uburinganire Imbere y'Amategeko • Universal Equality Guarantee
              </div>
              <div className="text-xs text-emerald-50 leading-relaxed mt-0.5">
                Tolkflow yubahiriza amategeko y'ibihugu byose hatitawe ku rwego rw'umukoresha cyangwa kuba afite konti isanzwe cyangwa iya Admin. 
                <strong> Nta mukoresha ugomba kurenga ku mategeko kubera umwanya afite muri platform.</strong>
              </div>
            </div>
          </div>
          <div className="hidden lg:flex flex-col items-end text-right flex-shrink-0">
            <span className="text-[10px] text-emerald-200 uppercase font-mono">Registry Verified</span>
            <span className="text-xs font-semibold text-white">{currentJurisdiction?.dataProtectionAuthority}</span>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => setActiveSubTab('laws')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeSubTab === 'laws'
                ? 'bg-[#075E54] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#202c33]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>National Laws & Gazettes</span>
            <span className="text-xs px-1.5 py-0.2 rounded-full bg-white/20">
              {filteredLaws.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('audit_logs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeSubTab === 'audit_logs'
                ? 'bg-[#075E54] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#202c33]'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Immutable Legal Audit Log</span>
            <span className="text-xs px-1.5 py-0.2 rounded-full bg-white/20">
              {legalAuditLogs.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('ai_explainer');
              if (!selectedLaw && filteredLaws.length > 0) {
                handleAskAi(filteredLaws[0]);
              }
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeSubTab === 'ai_explainer'
                ? 'bg-[#075E54] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#202c33]'
            }`}
          >
            <Bot className="w-4 h-4 text-emerald-400" />
            <span>TOLKFLOW AI Legal Explainer</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {activeSubTab === 'laws' && (
          <>
            {/* Search and Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Shakisha itegeko, Official Gazette nº, cyangwa amagambo y'ingenzi..."
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#111b21] border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075E54]"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <div className="flex items-center gap-1.5 bg-white dark:bg-[#111b21] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-transparent text-xs text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.key} value={c.key} className="bg-white dark:bg-[#111b21]">
                        {c.labelRw} ({c.labelEn})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-white dark:bg-[#111b21] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-transparent text-xs text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                  >
                    <option value="all" className="bg-white dark:bg-[#111b21]">All Statuses</option>
                    <option value="compliant" className="bg-white dark:bg-[#111b21]">Compliant & Enforced</option>
                    <option value="requires_action" className="bg-white dark:bg-[#111b21]">Under Audit</option>
                    <option value="pending_review" className="bg-white dark:bg-[#111b21]">Pending Review</option>
                    <option value="exempt" className="bg-white dark:bg-[#111b21]">Exempt</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Laws Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredLaws.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-white dark:bg-[#111b21] rounded-2xl border border-slate-200 dark:border-slate-800">
                  <Scale className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-50" />
                  <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                    Nta mategeko ahuye n'ibyo ushakishije
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Gerageza guhindura igihugu cyangwa ibyo washyize mu muyunguruzi.
                  </p>
                </div>
              ) : (
                filteredLaws.map((law) => {
                  const jurisdiction = jurisdictions.find(j => j.countryCode === law.countryCode);
                  const flag = jurisdiction?.flag || '🌐';

                  return (
                    <div
                      key={law.id}
                      className="bg-white dark:bg-[#111b21] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:border-[#075E54]/40 transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Top Badges */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{flag}</span>
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              {law.country}
                            </span>
                            <span className="text-slate-300 dark:text-slate-700">•</span>
                            <span className="text-xs font-mono font-medium text-emerald-700 dark:text-emerald-400">
                              {law.gazetteNumber}
                            </span>
                          </div>
                          {getStatusBadge(law.status)}
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2 leading-snug">
                          {law.title}
                        </h3>

                        {/* Summary */}
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                          {law.summary}
                        </p>

                        {/* Key Provisions */}
                        <div className="mb-4 bg-slate-50 dark:bg-[#1c272e] p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                          <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-[#075E54] dark:text-[#25D366]" />
                            Key Provisions & Official Highlight
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            {law.fullArticlesHighlight}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {law.affectedEntities.map((entity, i) => (
                              <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300">
                                {entity}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Platform Impact and Strict Equality Note */}
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 mb-4">
                          <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                            <Lock className="w-3.5 h-3.5" />
                            <span>TOLKFLOW Technical Implementation & Equality:</span>
                          </div>
                          <p className="text-xs text-amber-900/80 dark:text-amber-200/80 mt-1 leading-relaxed">
                            {law.platformImpactSummary}
                          </p>
                        </div>

                        {/* Metadata row */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate">{law.officialSource}</span>
                          </div>
                          <div className="flex items-center gap-1.5 justify-end">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>Effective: {new Date(law.effectiveDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="mt-4 pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                        <a
                          href={law.officialSourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#075E54] dark:text-[#25D366] hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Official Gazette Source</span>
                        </a>

                        <button
                          onClick={() => handleAskAi(law)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#075E54]/10 dark:bg-[#25D366]/10 text-[#075E54] dark:text-[#25D366] hover:bg-[#075E54] hover:text-white dark:hover:bg-[#25D366] dark:hover:text-[#111b21] transition-all"
                        >
                          <Bot className="w-3.5 h-3.5" />
                          <span>Saba AI Gusesengura</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* Immutable Audit Log View */}
        {activeSubTab === 'audit_logs' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-[#111b21] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <History className="w-5 h-5 text-[#075E54] dark:text-[#25D366]" />
                    Immutable Legal Audit Log (Registry of Compliance Actions)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Buri cyemezo kijyanye n'amategeko, amavugurura ya sisitemu cyangwa gukurikiza amabwiriza y'inzego bibikwa mu buryo budasibama (cryptographically immutable).
                  </p>
                </div>
                <div className="text-xs font-mono px-3 py-1 bg-slate-100 dark:bg-[#202c33] rounded-lg text-slate-600 dark:text-slate-400">
                  Total Entries: {legalAuditLogs.length}
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {legalAuditLogs.map((log) => (
                  <div key={log.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {log.actionTaken}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-[#202c33] text-slate-600 dark:text-slate-400">
                              Law Ref: {log.lawId}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                              Jurisdiction: {log.country}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                            {log.legalReference} • Module: {log.affectedSystemModule}
                          </p>

                          <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400 font-mono">
                            <span>Admin/Actor: {log.reviewedBy} ({log.reviewerRole})</span>
                            <span>•</span>
                            <span>Status: {log.status}</span>
                            <span>•</span>
                            <span>IP: {log.ipAddress}</span>
                          </div>
                        </div>
                      </div>

                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AI Explainer View */}
        {activeSubTab === 'ai_explainer' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="bg-white dark:bg-[#111b21] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#075E54] to-[#25D366] text-white flex items-center justify-center">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      TOLKFLOW AI Legal Counsel & Explainer
                    </h3>
                    <p className="text-xs text-slate-500">
                      Ibisobanuro by'amategeko mu Kinyarwanda cyangwa mu Cyongereza
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Ururimi / Language:</span>
                  <div className="bg-slate-100 dark:bg-[#202c33] p-0.5 rounded-lg flex items-center text-xs">
                    <button
                      onClick={() => setAiLang('rw')}
                      className={`px-3 py-1 rounded-md font-semibold transition-all ${
                        aiLang === 'rw'
                          ? 'bg-[#075E54] text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Kinyarwanda 🇷🇼
                    </button>
                    <button
                      onClick={() => setAiLang('en')}
                      className={`px-3 py-1 rounded-md font-semibold transition-all ${
                        aiLang === 'en'
                          ? 'bg-[#075E54] text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      English 🇬🇧
                    </button>
                  </div>
                </div>
              </div>

              {/* Select Law Dropdown for AI Explanation */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Hitamo Itegeko wifuza ko AI isobanura:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {nationalLaws.map((law) => {
                    const jurisdiction = jurisdictions.find(j => j.countryCode === law.countryCode);
                    const flag = jurisdiction?.flag || '🌐';

                    return (
                      <button
                        key={law.id}
                        onClick={() => handleAskAi(law)}
                        className={`text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between ${
                          selectedLaw?.id === law.id
                            ? 'border-[#075E54] bg-[#075E54]/5 dark:bg-[#25D366]/10 text-slate-900 dark:text-slate-100 font-bold'
                            : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1a2329]'
                        }`}
                      >
                        <div className="truncate mr-2">
                          <span className="mr-1.5">{flag}</span>
                          <span className="font-semibold">{law.gazetteNumber}:</span> {law.title}
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* AI Result Box */}
              {loadingAi ? (
                <div className="py-12 text-center">
                  <div className="w-10 h-10 border-3 border-[#075E54] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    TOLKFLOW AI irimo gusesengura iri tegeko...
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Analyzing official provisions, gazette articles, and universal compliance rules...
                  </p>
                </div>
              ) : aiExplanation ? (
                <div className="bg-slate-50 dark:bg-[#1c272e] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#075E54] dark:text-[#25D366]">
                      <Sparkles className="w-4 h-4" />
                      <span>Icyegeranyo cy'Amategeko (AI Analysis for {selectedLaw?.title})</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {aiLang === 'rw' ? 'Gusesengura Itegeko' : 'Statute Breakdown'}
                    </span>
                  </div>

                  <div className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line font-sans">
                    {aiExplanation}
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      Yemejwe na TOLKFLOW Legal AI Engine
                    </span>
                    <button
                      onClick={() => selectedLaw && handleAskAi(selectedLaw)}
                      className="text-[#075E54] dark:text-[#25D366] font-semibold hover:underline"
                    >
                      Ongera usesengure (Regenerate)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Hitamo itegeko hejuru kugira ngo ubone ibisobanuro byimbitse bya AI.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
