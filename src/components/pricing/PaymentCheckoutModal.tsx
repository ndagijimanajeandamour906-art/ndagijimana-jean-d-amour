import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import {
  PaymentCurrencyInfo,
  PaymentInvoice,
  PaymentProviderInfo,
  PaymentTransactionRecord,
  SubscriptionPlan,
} from '../../types';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Download,
  ExternalLink,
  Globe,
  Loader2,
  Lock,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';

interface PaymentCheckoutModalProps {
  isOpen: boolean;
  plan: SubscriptionPlan | null;
  onClose: () => void;
  onSuccessComplete?: () => void;
}

const CHECKOUT_COUNTRIES = [
  'Rwanda',
  'United States',
  'United Kingdom',
  'France',
  'Germany',
  'Canada',
  'Kenya',
  'Uganda',
  'Nigeria',
  'Singapore',
  'Japan',
];

export const PaymentCheckoutModal: React.FC<PaymentCheckoutModalProps> = ({
  isOpen,
  plan,
  onClose,
  onSuccessComplete,
}) => {
  const {
    currentUser,
    authSessionToken,
    ownerToken,
    setAuthModalOpen,
    applyVerifiedSubscription,
    notifyPaymentOutcome,
  } = useTolkflow();

  const activeToken = authSessionToken || ownerToken || '';

  const [country, setCountry] = useState<string>(currentUser.country || 'Rwanda');
  const [providers, setProviders] = useState<PaymentProviderInfo[]>([]);
  const [currencies, setCurrencies] = useState<PaymentCurrencyInfo[]>([]);
  const [exchangeRates, setExchangeRates] = useState<{
    available: boolean;
    rates: Record<string, number>;
    source: string;
    fetchedAt: string | null;
    error: string | null;
  }>({
    available: false,
    rates: { USD: 1 },
    source: 'loading',
    fetchedAt: null,
    error: null,
  });

  const [selectedProvider, setSelectedProvider] = useState<string>('mtn_momo_rw');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('RWF');
  const [phoneNumber, setPhoneNumber] = useState<string>(currentUser.phone || '+250');
  const [loadingMethods, setLoadingMethods] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [checkingStatus, setCheckingStatus] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(false);

  const [activePayment, setActivePayment] = useState<PaymentTransactionRecord | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<PaymentInvoice | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? `idem_${crypto.randomUUID()}`
      : `idem_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  );

  const sseRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appliedSuccessRef = useRef<boolean>(false);

  const stopLiveListeners = () => {
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopLiveListeners();
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopLiveListeners();
      return;
    }
    setCountry(currentUser.country || 'Rwanda');
    setPhoneNumber(currentUser.phone || '+250');
    setActivePayment(null);
    setActiveInvoice(null);
    setCheckoutUrl(null);
    setErrorMessage(null);
    setNeedsAuth(false);
    appliedSuccessRef.current = false;
    setIdempotencyKey(
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? `idem_${crypto.randomUUID()}`
        : `idem_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    );
  }, [isOpen, plan?.id, currentUser.country, currentUser.phone]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoadingMethods(true);
    setErrorMessage(null);

    fetch(`/api/payments/methods?country=${encodeURIComponent(country)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.success) {
          const list: PaymentProviderInfo[] = data.providers || [];
          setProviders(list);
          setCurrencies(data.currencies || []);
          setExchangeRates(
            data.exchangeRates || {
              available: false,
              rates: { USD: 1 },
              source: 'unavailable',
              fetchedAt: null,
              error: 'Exchange rate service unavailable.',
            }
          );
          const preferred = list.find((p) => p.recommended) || list[0];
          if (preferred) {
            setSelectedProvider(preferred.code);
            if (preferred.code === 'mtn_momo_rw') {
              setSelectedCurrency('RWF');
            } else if (preferred.supportedCurrencies?.includes('USD')) {
              setSelectedCurrency('USD');
            } else if (preferred.supportedCurrencies?.[0]) {
              setSelectedCurrency(preferred.supportedCurrencies[0]);
            }
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMessage(err?.message || 'Unable to load payment providers.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMethods(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, country]);

  const currentProvider = useMemo(
    () => providers.find((p) => p.code === selectedProvider) || null,
    [providers, selectedProvider]
  );

  const allowedCurrencies = useMemo(() => {
    if (!currentProvider) return currencies;
    return currencies.filter((c) => currentProvider.supportedCurrencies.includes(c.code));
  }, [currentProvider, currencies]);

  useEffect(() => {
    if (currentProvider && !currentProvider.supportedCurrencies.includes(selectedCurrency)) {
      setSelectedCurrency(currentProvider.supportedCurrencies[0] || 'USD');
    }
  }, [currentProvider, selectedCurrency]);

  const convertedPreview = useMemo(() => {
    if (!plan) return null;
    if (selectedCurrency === 'USD') {
      return { amount: plan.priceMonthly, rate: 1, available: true };
    }
    const rate = exchangeRates.rates?.[selectedCurrency];
    if (!exchangeRates.available || !rate) {
      return { amount: null, rate: null, available: false };
    }
    const decimals = currencies.find((c) => c.code === selectedCurrency)?.decimals ?? 2;
    const val = Number((plan.priceMonthly * rate).toFixed(decimals));
    return { amount: val, rate, available: true };
  }, [plan, selectedCurrency, exchangeRates, currencies]);

  const handleVerifiedStatusPayload = (payment: PaymentTransactionRecord, invoice?: PaymentInvoice | null) => {
    setActivePayment(payment);
    if (invoice) setActiveInvoice(invoice);

    if (payment.status === 'successful') {
      stopLiveListeners();
      if (!appliedSuccessRef.current && plan) {
        appliedSuccessRef.current = true;
        applyVerifiedSubscription(plan.id, {
          transactionRef: payment.transactionRef,
          invoiceNumber: invoice?.invoiceNumber,
          amount: payment.amount,
          currency: payment.currency,
        });
        onSuccessComplete?.();
      }
    } else if (payment.status === 'failed' || payment.status === 'cancelled') {
      stopLiveListeners();
      if (!appliedSuccessRef.current) {
        appliedSuccessRef.current = true;
        notifyPaymentOutcome(payment.status, {
          serviceName: payment.serviceName,
          transactionRef: payment.transactionRef,
          reason: payment.failureReason,
        });
      }
    }
  };

  const checkPaymentStatusNow = async (txRefOrId: string) => {
    if (!txRefOrId || !activeToken) return;
    setCheckingStatus(true);
    try {
      const res = await fetch(`/api/payments/status/${encodeURIComponent(txRefOrId)}`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      const data = await res.json();
      if (res.ok && data?.payment) {
        handleVerifiedStatusPayload(data.payment, data.invoice || null);
      } else if (data?.error) {
        setErrorMessage(data.error);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Status verification check failed.');
    } finally {
      setCheckingStatus(false);
    }
  };

  const startLiveMonitoring = (transactionRef: string) => {
    stopLiveListeners();
    if (!activeToken) return;

    try {
      const es = new EventSource(
        `/api/payments/stream/${encodeURIComponent(transactionRef)}?token=${encodeURIComponent(activeToken)}`
      );
      sseRef.current = es;
      const onEvt = (evt: MessageEvent) => {
        try {
          const parsed = JSON.parse(evt.data);
          if (parsed?.payment) {
            handleVerifiedStatusPayload(parsed.payment, parsed.invoice || null);
          }
        } catch {}
      };
      es.addEventListener('payment:snapshot', onEvt as any);
      es.addEventListener('payment:updated', onEvt as any);
    } catch {}

    pollRef.current = setInterval(() => {
      checkPaymentStatusNow(transactionRef);
    }, 3500);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;
    setErrorMessage(null);
    setNeedsAuth(false);

    if (!activeToken) {
      setNeedsAuth(true);
      setErrorMessage('Please sign in to your verified TOLKFLOW account before completing a payment.');
      return;
    }

    setSubmitting(true);
    appliedSuccessRef.current = false;

    try {
      const isMtn = selectedProvider === 'mtn_momo_rw';
      const endpoint = isMtn ? '/api/payments/mtn/request' : '/api/payments/international/create';
      const payload = {
        planId: plan.id,
        serviceName: plan.name,
        providerCode: selectedProvider,
        currency: selectedCurrency,
        country,
        phoneNumber: isMtn ? phoneNumber : undefined,
        customerName: currentUser.name,
        customerEmail: currentUser.email,
        idempotencyKey,
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.status === 401) {
        setNeedsAuth(true);
        setErrorMessage(data?.error || 'Authentication required before initiating payment.');
        return;
      }

      if (!res.ok || !data.success) {
        setErrorMessage(data?.error || 'Payment request could not be initiated.');
        if (data?.payment) {
          setActivePayment(data.payment);
        }
        return;
      }

      const payment: PaymentTransactionRecord = data.payment;
      setActivePayment(payment);
      setCheckoutUrl(data.checkoutUrl || null);

      if (payment.status === 'successful') {
        handleVerifiedStatusPayload(payment, data.invoice || null);
      } else if (payment.status === 'pending' || payment.status === 'processing') {
        startLiveMonitoring(payment.transactionRef);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network error contacting payment server.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetryReset = () => {
    stopLiveListeners();
    setActivePayment(null);
    setActiveInvoice(null);
    setCheckoutUrl(null);
    setErrorMessage(null);
    appliedSuccessRef.current = false;
    setIdempotencyKey(
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? `idem_${crypto.randomUUID()}`
        : `idem_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    );
  };

  const downloadReceiptJson = () => {
    if (!activePayment) return;
    const receiptDoc = {
      platform: 'TOLKFLOW Global Communication',
      invoiceNumber: activeInvoice?.invoiceNumber || activePayment.transactionRef,
      transactionRef: activePayment.transactionRef,
      externalReference: activePayment.externalReference,
      status: activePayment.status,
      providerCode: activePayment.providerCode,
      customerName: activePayment.customerName,
      customerEmail: activePayment.customerEmail,
      customerPhoneMasked: activePayment.customerPhoneMasked,
      country: activePayment.country,
      serviceName: activePayment.serviceName,
      amount: activePayment.amount,
      currency: activePayment.currency,
      amountUsd: activePayment.amountUsd,
      exchangeRate: activePayment.exchangeRate,
      verifiedAt: activePayment.verifiedAt,
    };
    const blob = new Blob([JSON.stringify(receiptDoc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tolkflow-receipt-${activePayment.transactionRef}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen || !plan) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[#0A1124] border border-cyan-500/40 rounded-3xl shadow-[0_0_60px_rgba(0,180,255,0.28)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-[#060B18] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
              title="Back to plans"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>Secure Payment Checkout — {plan.name}</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Server-verified billing (${plan.priceMonthly}/month). Never confirmed before provider verification.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Active Transaction Status View */}
          {activePayment ? (
            <div className="space-y-4">
              {activePayment.status === 'pending' || activePayment.status === 'processing' ? (
                <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/40 space-y-3">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-6 h-6 text-amber-400 animate-spin flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-extrabold text-amber-200">
                        {activePayment.providerCode === 'mtn_momo_rw'
                          ? 'Waiting for payment approval on your MTN MoMo phone...'
                          : 'Awaiting Payment Completion & Provider Verification'}
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {activePayment.providerCode === 'mtn_momo_rw'
                          ? `Approve the MTN Mobile Money prompt on ${activePayment.customerPhoneMasked || 'your phone'} (${activePayment.amount.toLocaleString()} ${activePayment.currency}).`
                          : `Complete checkout via the secure provider window, then confirm status below.`}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/60 p-3 rounded-xl border border-slate-800 font-mono">
                    <div>
                      <span className="text-slate-400 block">Transaction ID</span>
                      <span className="text-cyan-300 font-bold">{activePayment.transactionRef}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Status</span>
                      <span className="text-amber-300 font-bold uppercase">{activePayment.status}</span>
                    </div>
                  </div>

                  {checkoutUrl && (
                    <a
                      href={checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-2 hover:from-blue-500 hover:to-cyan-400 transition-all"
                    >
                      <span>Open Hosted Checkout Page</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => checkPaymentStatusNow(activePayment.transactionRef)}
                      disabled={checkingStatus}
                      className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-2"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${checkingStatus ? 'animate-spin' : ''}`} />
                      <span>{checkingStatus ? 'Verifying...' : 'Verify Payment Status Now'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRetryReset}
                      className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold"
                    >
                      Change Method
                    </button>
                  </div>
                </div>
              ) : activePayment.status === 'successful' ? (
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400 flex-shrink-0" />
                    <div>
                      <h4 className="text-base font-extrabold text-emerald-300">
                        Payment Confirmed & Subscription Activated
                      </h4>
                      <p className="text-xs text-slate-300">
                        Verified by {activePayment.providerCode.toUpperCase()}. Your {plan.name} features are now active.
                      </p>
                    </div>
                  </div>

                  {/* Official Receipt */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Receipt className="w-4 h-4 text-cyan-400" />
                        Official Payment Receipt
                      </span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {activeInvoice?.invoiceNumber || activePayment.transactionRef}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-1.5 text-[11px]">
                      <span className="text-slate-400">Transaction Ref:</span>
                      <span className="font-mono text-white text-right">{activePayment.transactionRef}</span>
                      <span className="text-slate-400">Provider Reference:</span>
                      <span className="font-mono text-slate-200 text-right truncate">
                        {activePayment.externalReference || 'N/A'}
                      </span>
                      <span className="text-slate-400">Customer:</span>
                      <span className="text-white text-right">{activePayment.customerName}</span>
                      <span className="text-slate-400">Amount Paid:</span>
                      <span className="font-mono font-bold text-emerald-300 text-right">
                        {activePayment.amount.toLocaleString()} {activePayment.currency} (${activePayment.amountUsd.toFixed(2)} USD)
                      </span>
                      <span className="text-slate-400">Verified At:</span>
                      <span className="font-mono text-slate-300 text-right">
                        {activePayment.verifiedAt
                          ? new Date(activePayment.verifiedAt).toLocaleString()
                          : new Date().toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={downloadReceiptJson}
                      className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Official Receipt</span>
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-400 text-black text-xs font-extrabold"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/40 space-y-3">
                  <div className="flex items-center gap-3">
                    <XCircle className="w-6 h-6 text-rose-400 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-extrabold text-rose-300">
                        Payment {activePayment.status === 'cancelled' ? 'Cancelled' : 'Failed'}
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {activePayment.failureReason ||
                          'The payment was not completed and your subscription was not billed.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRetryReset}
                      className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                    >
                      Retry or Choose Another Method
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmitPayment} className="space-y-4">
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <p>{errorMessage}</p>
                    {needsAuth && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          setAuthModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500 text-black font-bold text-[11px]"
                      >
                        Sign In / Verify Account
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Country & Currency Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Billing Country
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-cyan-400"
                    >
                      {CHECKOUT_COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Payment Currency
                  </label>
                  <select
                    value={selectedCurrency}
                    onChange={(e) => setSelectedCurrency(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-cyan-400"
                  >
                    {allowedCurrencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment Providers */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase">
                    Select Payment Provider ({country === 'Rwanda' ? 'Rwanda Mobile Money & Global' : 'International Gateways'})
                  </label>
                  {loadingMethods && <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {providers.map((prov) => {
                    const active = selectedProvider === prov.code;
                    const Icon =
                      prov.code === 'mtn_momo_rw'
                        ? Smartphone
                        : prov.code === 'paypal'
                        ? Wallet
                        : CreditCard;
                    return (
                      <button
                        type="button"
                        key={prov.code}
                        onClick={() => setSelectedProvider(prov.code)}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                          active
                            ? 'bg-cyan-500/15 border-cyan-400 ring-1 ring-cyan-400/40'
                            : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="p-2 rounded-xl bg-slate-800 text-cyan-400 mt-0.5">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-white truncate">{prov.name}</span>
                            {prov.recommended && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                                Recommended
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span
                              className={`text-[10px] font-mono ${
                                prov.configured ? 'text-emerald-400' : 'text-amber-400'
                              }`}
                            >
                              {prov.configured ? `${prov.mode} ready` : 'credentials needed'}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              • {prov.supportedCurrencies.join(', ')}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Provider Credential Warning (Honest Status, never simulated) */}
              {currentProvider && !currentProvider.configured && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 space-y-1">
                  <p className="font-bold">
                    {currentProvider.name} credentials are not yet configured on this server.
                  </p>
                  <p className="text-amber-300/90 font-mono">
                    Required backend env vars: {currentProvider.missingEnv.join(', ')}
                  </p>
                </div>
              )}

              {/* MTN MoMo Rwanda MSISDN Input (No PIN collection!) */}
              {selectedProvider === 'mtn_momo_rw' ? (
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <label className="block text-[11px] font-bold text-slate-300 uppercase">
                    MTN Rwanda Mobile Money Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+250788123456 or 0788123456"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-white outline-none focus:border-cyan-400"
                  />
                  <p className="text-[11px] text-slate-400">
                    You will authorize the debit on your phone via MTN MoMo USSD/app prompt. TOLKFLOW never asks for or stores your MoMo PIN.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Hosted PCI-Compliant Checkout Redirect</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Card security codes (CVV/CVC) and card numbers are handled exclusively on {currentProvider?.name || 'the provider'}&apos;s hosted checkout page.
                  </p>
                </div>
              )}

              {/* Verified FX Conversion & Total Summary */}
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Subscription Plan</span>
                  <span className="font-bold text-white">{plan.name} (Monthly)</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Base Price (USD)</span>
                  <span className="font-mono">${plan.priceMonthly.toFixed(2)} USD</span>
                </div>
                <div className="flex items-center justify-between text-slate-300 border-t border-slate-800 pt-2">
                  <span>Amount Charged ({selectedCurrency})</span>
                  {convertedPreview?.available && convertedPreview.amount !== null ? (
                    <span className="text-base font-extrabold font-mono text-cyan-300">
                      {convertedPreview.amount.toLocaleString()} {selectedCurrency}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-400 font-semibold">
                      Live FX rate unavailable ({exchangeRates.error || 'use USD'})
                    </span>
                  )}
                </div>
                {selectedCurrency !== 'USD' && convertedPreview?.rate && (
                  <p className="text-[10px] text-slate-500 font-mono text-right">
                    Verified rate: 1 USD = {convertedPreview.rate} {selectedCurrency} ({exchangeRates.source})
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || (selectedCurrency !== 'USD' && !convertedPreview?.available)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-400 hover:from-emerald-400 hover:to-cyan-300 disabled:opacity-50 text-black text-xs font-extrabold flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(16,185,129,0.35)] transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Initiating Payment Request...</span>
                  </>
                ) : selectedProvider === 'mtn_momo_rw' ? (
                  <>
                    <Smartphone className="w-4 h-4" />
                    <span>
                      Pay {convertedPreview?.amount ? `${convertedPreview.amount.toLocaleString()} ${selectedCurrency}` : `$${plan.priceMonthly}`} via MTN MoMo
                    </span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Continue to {currentProvider?.name || 'Secure Checkout'}</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
