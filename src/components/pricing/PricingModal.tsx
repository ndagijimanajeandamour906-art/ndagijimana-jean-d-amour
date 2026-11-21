import React, { useEffect, useState } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import { PaymentTransactionRecord, SubscriptionPlan, SubscriptionPlanType } from '../../types';
import { soundFx } from '../../services/soundEffects';
import { PaymentCheckoutModal } from './PaymentCheckoutModal';
import {
  X,
  Check,
  ShieldCheck,
  Crown,
  CreditCard,
  Lock,
  ArrowRight,
  Receipt,
  RefreshCw,
  Download,
} from 'lucide-react';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AFFORDABLE_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free Plan',
    priceMonthly: 0,
    description: 'Essential global messaging for individuals worldwide.',
    features: [
      'Encrypted P2P messaging & emojis',
      '10 AI voice & text translations / day',
      'Standard audio calls',
      'Up to 5 group chats',
      'Basic voice notes with waveforms',
    ],
  },
  {
    id: 'basic',
    name: 'Basic Plan',
    priceMonthly: 2.99,
    description: 'Affordable daily international communication with enhanced translation.',
    badge: 'Affordable',
    features: [
      'Unlimited messaging & media sharing',
      '100 AI voice & text translations / day',
      'Crystal-clear HD voice calls',
      '5GB encrypted Message Vault',
      'Audio speed controls (1x, 1.5x, 2x)',
      'No platform advertisements',
    ],
  },
  {
    id: 'standard',
    name: 'Standard Plan',
    priceMonthly: 6.99,
    description: 'Full-featured powerhouse for multilingual families, creators & professionals.',
    badge: 'Most Popular',
    isPopular: true,
    features: [
      'Unlimited real-time multilingual AI voice translation',
      'Full HD 1080p video calling & camera flip',
      'Live translated subtitles during calls',
      'Flow Rooms with up to 100 live participants',
      '50GB military-grade Message Vault',
      'Neural human-like voice synthesis (Kinyarwanda, Chinese, Swahili, etc.)',
      'Priority low-latency WebRTC mesh routing',
    ],
  },
  {
    id: 'business',
    name: 'Business Plan',
    priceMonthly: 14.99,
    description: 'Complete suite for global enterprises, cross-border teams & organizations.',
    badge: 'Scale 5,000+',
    features: [
      'All Standard Plan features included',
      'Unlimited communities & group video meetings',
      'Custom company translation dictionary',
      'High-throughput server capacity (up to 5,000+ members)',
      'Full administrative moderation & audit exports',
      'Dedicated 99.99% uptime SLA & 24/7 priority support',
    ],
  },
];

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    userSubscription,
    applyVerifiedSubscription,
    authSessionToken,
    ownerToken,
    setAuthModalOpen,
  } = useTolkflow();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanType>('standard');
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlan | null>(null);
  const [activeTab, setActiveTab] = useState<'plans' | 'history'>('plans');
  const [myPayments, setMyPayments] = useState<PaymentTransactionRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [freeNotice, setFreeNotice] = useState<boolean>(false);

  const activeToken = authSessionToken || ownerToken || '';
  const currentPlanId: SubscriptionPlanType = currentUser.plan || userSubscription || 'free';

  const loadMyPayments = async () => {
    if (!activeToken) return;
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/payments/my', {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setMyPayments(data.payments || []);
      }
    } catch {}
    setLoadingHistory(false);
  };

  useEffect(() => {
    if (isOpen && activeTab === 'history') {
      loadMyPayments();
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleChoosePlan = (planId: SubscriptionPlanType) => {
    setSelectedPlan(planId);
    const planObj = AFFORDABLE_PLANS.find((p) => p.id === planId);
    if (!planObj) return;

    if (planObj.priceMonthly <= 0) {
      applyVerifiedSubscription('free');
      soundFx.playCallConnectedSound();
      setFreeNotice(true);
      setTimeout(() => setFreeNotice(false), 2200);
      return;
    }

    setCheckoutPlan(planObj);
  };

  const handleDownloadReceipt = async (txRef: string) => {
    if (!activeToken) return;
    try {
      const res = await fetch(`/api/payments/receipt/${encodeURIComponent(txRef)}`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data?.payment) return;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tolkflow-receipt-${txRef}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
        <div className="w-full max-w-5xl bg-[#0A1124] border border-cyan-500/40 rounded-3xl shadow-[0_0_60px_rgba(0,102,255,0.35)] overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="p-6 border-b border-slate-800 bg-[#060B18] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-lg">
                <Crown className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-display font-extrabold text-white">
                    TOLKFLOW Subscription Plans & Payments
                  </h2>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/40">
                    MTN MoMo + Global Cards
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verified MTN Mobile Money (Rwanda), Visa/Mastercard, PayPal, and regional gateways.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('plans')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                    activeTab === 'plans' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Plans
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1.5 ${
                    activeTab === 'history' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>My Receipts</span>
                </button>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {freeNotice && (
            <div className="p-3.5 bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Switched to Free Plan.</span>
            </div>
          )}

          {activeTab === 'plans' ? (
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {AFFORDABLE_PLANS.map((plan) => {
                  const isSelected = selectedPlan === plan.id;
                  const isCurrent = currentPlanId === plan.id;

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between relative ${
                        isSelected
                          ? 'bg-gradient-to-b from-[#0F1C38] to-[#0A1124] border-cyan-400 shadow-[0_0_30px_rgba(0,229,255,0.25)] ring-2 ring-cyan-400/50 scale-[1.02]'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      {plan.badge && (
                        <div className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-mono text-[10px] font-extrabold shadow-md">
                          {plan.badge}
                        </div>
                      )}

                      <div>
                        <h3 className="text-base font-bold text-white mb-1">{plan.name}</h3>
                        <p className="text-[11px] text-slate-400 min-h-[32px]">{plan.description}</p>

                        <div className="my-4">
                          <span className="text-3xl font-extrabold font-mono text-white">
                            ${plan.priceMonthly}
                          </span>
                          <span className="text-xs text-slate-400 ml-1">/ month</span>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-slate-800/80">
                          {plan.features.map((feat, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                              <Check className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                              <span className="leading-tight">{feat}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-6">
                        {isCurrent ? (
                          <div className="w-full py-2.5 rounded-xl bg-slate-800 text-cyan-300 text-xs font-bold text-center border border-cyan-500/30">
                            Current Active Plan
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChoosePlan(plan.id);
                            }}
                            className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 ${
                              isSelected
                                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-cyan-500/20'
                                : 'bg-slate-800 hover:bg-slate-700 text-white'
                            }`}
                          >
                            <span>{plan.priceMonthly > 0 ? `Pay & Activate ${plan.name}` : 'Switch to Free'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 p-4 rounded-2xl bg-blue-950/20 border border-cyan-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-white block">Automatic Payment Verification & Fair Pricing</span>
                    <span>
                      Subscriptions activate only after official gateway confirmation from MTN MoMo or international payment webhooks. No raw PIN or CVV data is ever stored.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-cyan-300">
                    Webhook Verified
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Your Verified Payment History & Receipts</h3>
                  <p className="text-xs text-slate-400">
                    Download receipts or re-verify pending transactions against the gateway.
                  </p>
                </div>
                {activeToken && (
                  <button
                    type="button"
                    onClick={loadMyPayments}
                    disabled={loadingHistory}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-cyan-300 font-bold flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                )}
              </div>

              {!activeToken ? (
                <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-3">
                  <p className="text-xs text-slate-300">
                    Sign in to your verified TOLKFLOW account to view your payment history and receipts.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      setAuthModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-cyan-500 text-black text-xs font-extrabold"
                  >
                    Sign In
                  </button>
                </div>
              ) : myPayments.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-center text-xs text-slate-400">
                  No payment transactions recorded for this account yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {myPayments.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-cyan-300">{tx.transactionRef}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold ${
                              tx.status === 'successful'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : tx.status === 'pending' || tx.status === 'processing'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </div>
                        <p className="text-white font-semibold mt-1">
                          {tx.serviceName} • {tx.providerCode}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {new Date(tx.createdAt).toLocaleString()} • {tx.customerPhoneMasked || tx.country}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right font-mono">
                          <p className="text-sm font-extrabold text-white">
                            {tx.amount.toLocaleString()} {tx.currency}
                          </p>
                          <p className="text-[10px] text-slate-400">${tx.amountUsd.toFixed(2)} USD</p>
                        </div>
                        {tx.status === 'successful' && (
                          <button
                            type="button"
                            onClick={() => handleDownloadReceipt(tx.transactionRef)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300"
                            title="Download Official Receipt"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Modal Footer */}
          <div className="p-4 border-t border-slate-800 bg-[#060B18] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Secure server-verified checkout. Cancel anytime with 1 click.</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleChoosePlan(selectedPlan)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-400 hover:from-emerald-400 hover:to-cyan-300 text-black text-xs font-extrabold shadow-[0_0_20px_rgba(52,211,153,0.4)] flex items-center gap-1.5 transition-all"
              >
                <CreditCard className="w-4 h-4" />
                <span>Proceed to Pay ({selectedPlan.toUpperCase()})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <PaymentCheckoutModal
        isOpen={Boolean(checkoutPlan)}
        plan={checkoutPlan}
        onClose={() => setCheckoutPlan(null)}
        onSuccessComplete={() => {
          loadMyPayments();
        }}
      />
    </>
  );
};
