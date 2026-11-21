import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import {
  AdminRevenueSummary,
  PaymentAuditEntry,
  PaymentRefundRecord,
  PaymentTransactionRecord,
} from '../../types';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  FileJson,
  Filter,
  Globe,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Smartphone,
  Wifi,
  X,
  XCircle,
} from 'lucide-react';

interface AdminFinancialLedgerPanelProps {
  variant?: 'light' | 'dark';
}

export const AdminFinancialLedgerPanel: React.FC<AdminFinancialLedgerPanelProps> = ({
  variant = 'light',
}) => {
  const { authSessionToken, ownerToken } = useTolkflow();
  const activeToken = ownerToken || authSessionToken || '';

  const [payments, setPayments] = useState<PaymentTransactionRecord[]>([]);
  const [refunds, setRefunds] = useState<PaymentRefundRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<PaymentAuditEntry[]>([]);
  const [revenue, setRevenue] = useState<AdminRevenueSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [liveConnected, setLiveConnected] = useState<boolean>(false);

  // Filters
  const [searchQ, setSearchQ] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Inspection & Refund Modals (strictly in-app, no window.confirm/alert)
  const [receiptDetail, setReceiptDetail] = useState<any | null>(null);
  const [refundTarget, setRefundTarget] = useState<PaymentTransactionRecord | null>(null);
  const [refundReason, setRefundReason] = useState<string>('');
  const [refundSubmitting, setRefundSubmitting] = useState<boolean>(false);
  const [actionBanner, setActionBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const sseRef = useRef<EventSource | null>(null);

  const buildFilterQuery = useCallback(() => {
    const p = new URLSearchParams();
    if (searchQ.trim()) p.set('q', searchQ.trim());
    if (statusFilter !== 'all') p.set('status', statusFilter);
    if (providerFilter !== 'all') p.set('provider', providerFilter);
    if (countryFilter !== 'all') p.set('country', countryFilter);
    if (dateFrom) p.set('dateFrom', dateFrom);
    if (dateTo) p.set('dateTo', dateTo);
    return p;
  }, [searchQ, statusFilter, providerFilter, countryFilter, dateFrom, dateTo]);

  const fetchPayments = useCallback(async () => {
    if (!activeToken) {
      setErrorMsg('Admin session token is required to load live financial transactions.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const qs = buildFilterQuery().toString();
      const res = await fetch(`/api/admin/payments${qs ? `?${qs}` : ''}`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setErrorMsg(data?.error || 'Unable to load payment transactions.');
      } else {
        setPayments(data.payments || []);
        setRefunds(data.refunds || []);
        setAuditLogs(data.auditLogs || []);
        if (data.revenue) setRevenue(data.revenue);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error loading financial data.');
    } finally {
      setLoading(false);
    }
  }, [activeToken, buildFilterQuery]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Live SSE Stream Subscription (/api/admin/payments/stream)
  useEffect(() => {
    if (!activeToken) return;
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }

    const es = new EventSource(`/api/admin/payments/stream?token=${encodeURIComponent(activeToken)}`);
    sseRef.current = es;

    es.onopen = () => setLiveConnected(true);
    es.onerror = () => setLiveConnected(false);

    const onSnapshot = (evt: MessageEvent) => {
      try {
        const data = JSON.parse(evt.data);
        if (data?.revenue) setRevenue(data.revenue);
        if (Array.isArray(data?.payments)) setPayments(data.payments);
        if (Array.isArray(data?.refunds)) setRefunds(data.refunds);
        if (Array.isArray(data?.auditLogs)) setAuditLogs(data.auditLogs);
      } catch {}
    };

    const onPaymentEvt = (evt: MessageEvent) => {
      try {
        const data = JSON.parse(evt.data);
        if (data?.payment) {
          setPayments((prev) => {
            const exists = prev.some((p) => p.id === data.payment.id);
            return exists
              ? prev.map((p) => (p.id === data.payment.id ? data.payment : p))
              : [data.payment, ...prev];
          });
        }
      } catch {}
    };

    const onRevenueEvt = (evt: MessageEvent) => {
      try {
        const data = JSON.parse(evt.data);
        if (data && typeof data.totalRevenueUsd === 'number') {
          setRevenue(data);
        }
      } catch {}
    };

    es.addEventListener('revenue:snapshot', onSnapshot as any);
    es.addEventListener('payment:created', onPaymentEvt as any);
    es.addEventListener('payment:updated', onPaymentEvt as any);
    es.addEventListener('revenue:updated', onRevenueEvt as any);

    return () => {
      es.close();
      sseRef.current = null;
      setLiveConnected(false);
    };
  }, [activeToken]);

  const uniqueCountries = useMemo(() => {
    const set = new Set<string>();
    payments.forEach((p) => {
      if (p.country) set.add(p.country);
    });
    return Array.from(set);
  }, [payments]);

  const handleDownloadReport = async (format: 'csv' | 'json') => {
    if (!activeToken) return;
    try {
      const qs = buildFilterQuery();
      qs.set('format', format);
      const res = await fetch(`/api/admin/payment-reports?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tolkflow-financial-report-${new Date().toISOString().slice(0, 10)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const handleInspectReceipt = async (txRef: string) => {
    if (!activeToken) return;
    try {
      const res = await fetch(`/api/payments/receipt/${encodeURIComponent(txRef)}`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      const data = await res.json();
      if (res.ok && data?.payment) {
        setReceiptDetail(data);
      }
    } catch {}
  };

  const handleSubmitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundTarget || !activeToken) return;
    setRefundSubmitting(true);
    setActionBanner(null);
    try {
      const res = await fetch('/api/admin/payments/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({
          paymentId: refundTarget.id,
          reason: refundReason.trim() || 'Administrative refund approved',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setActionBanner({ type: 'err', text: data?.error || 'Refund failed.' });
      } else {
        setActionBanner({
          type: 'ok',
          text: `Refund completed for ${refundTarget.transactionRef} (${refundTarget.amount} ${refundTarget.currency}).`,
        });
        setRefundTarget(null);
        setRefundReason('');
        fetchPayments();
      }
    } catch (err: any) {
      setActionBanner({ type: 'err', text: err?.message || 'Network error issuing refund.' });
    } finally {
      setRefundSubmitting(false);
    }
  };

  const isLight = variant === 'light';
  const cardCls = isLight
    ? 'bg-white border border-slate-200 shadow-sm text-slate-900'
    : 'bg-[#0A1124] border border-slate-800 text-white';
  const subTextCls = isLight ? 'text-slate-500' : 'text-slate-400';
  const inputCls = isLight
    ? 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400'
    : 'bg-slate-900 border border-slate-800 text-white placeholder-slate-400';

  return (
    <div className="space-y-6">
      {/* Header & Real-Time SSE Indicator */}
      <div className={`p-5 rounded-2xl ${cardCls} flex flex-wrap items-center justify-between gap-4`}>
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-extrabold">
              Real-Time Payment Gateway & Financial Ledger
            </h3>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 ${
                liveConnected
                  ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                  : 'bg-slate-500/15 text-slate-500 border border-slate-500/30'
              }`}
            >
              <Wifi className="w-3 h-3" />
              {liveConnected ? 'LIVE SSE STREAM' : 'SYNCING'}
            </span>
          </div>
          <p className={`text-xs mt-1 ${subTextCls}`}>
            Only gateway-verified successful payments count toward revenue. Unverified transactions cannot be manually marked paid.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchPayments}
            disabled={loading}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                : 'bg-slate-800 hover:bg-slate-700 text-cyan-300'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => handleDownloadReport('csv')}
            className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => handleDownloadReport('json')}
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-xs text-rose-500 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {actionBanner && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between ${
            actionBanner.type === 'ok'
              ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-500'
              : 'bg-rose-500/15 border border-rose-500/40 text-rose-500'
          }`}
        >
          <span>{actionBanner.text}</span>
          <button type="button" onClick={() => setActionBanner(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl ${cardCls}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${subTextCls}`}>
              Total Confirmed Revenue
            </span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold font-mono mt-1 text-emerald-500">
            ${(revenue?.totalRevenueUsd ?? 0).toFixed(2)}
          </p>
          <p className={`text-[11px] mt-1 ${subTextCls}`}>
            {revenue?.totalSuccessfulPayments ?? 0} verified payments
          </p>
        </div>

        <div className={`p-4 rounded-2xl ${cardCls}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${subTextCls}`}>
              Today / Monthly Revenue
            </span>
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-extrabold font-mono mt-1">
            ${(revenue?.todayRevenueUsd ?? 0).toFixed(2)}{' '}
            <span className={`text-xs font-normal ${subTextCls}`}>
              / ${(revenue?.monthlyRevenueUsd ?? 0).toFixed(2)} mo
            </span>
          </p>
          <p className={`text-[11px] mt-1 ${subTextCls}`}>Live UTC billing window</p>
        </div>

        <div className={`p-4 rounded-2xl ${cardCls}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${subTextCls}`}>
              MTN MoMo vs International
            </span>
            <Smartphone className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-base font-extrabold font-mono mt-1">
            MoMo: {revenue?.mtnMomoCount ?? 0} (${(revenue?.mtnMomoVolumeUsd ?? 0).toFixed(2)})
          </p>
          <p className={`text-[11px] font-mono mt-1 ${subTextCls}`}>
            Intl: {revenue?.internationalCount ?? 0} (${(revenue?.internationalVolumeUsd ?? 0).toFixed(2)})
          </p>
        </div>

        <div className={`p-4 rounded-2xl ${cardCls}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${subTextCls}`}>
              Pending / Failed / Refunds
            </span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-lg font-extrabold font-mono mt-1">
            <span className="text-amber-500">{revenue?.pendingCount ?? 0}</span> /{' '}
            <span className="text-rose-500">{revenue?.failedCount ?? 0}</span> /{' '}
            <span className="text-purple-500">{revenue?.refundsCount ?? 0}</span>
          </p>
          <p className={`text-[11px] mt-1 ${subTextCls}`}>
            Refunded: ${(revenue?.refundedVolumeUsd ?? 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Payment Provider Connection Status Cards */}
      <div className={`p-5 rounded-2xl ${cardCls} space-y-3`}>
        <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-500" />
          <span>Payment Provider Connection Status</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(revenue?.providers || []).map((prov) => (
            <div
              key={prov.code}
              className={`p-3.5 rounded-xl border ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/70 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold truncate">{prov.name}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                    prov.configured
                      ? 'bg-emerald-500/15 text-emerald-500'
                      : 'bg-amber-500/15 text-amber-500'
                  }`}
                >
                  {prov.configured ? prov.mode : 'Missing Keys'}
                </span>
              </div>
              <p className={`text-[10px] font-mono mt-1 ${subTextCls}`}>
                {prov.code} • {prov.connectionStatus}
              </p>
              {!prov.configured && prov.missingEnv?.length > 0 && (
                <p className="text-[10px] text-amber-500 font-mono mt-1 truncate" title={prov.missingEnv.join(', ')}>
                  Missing: {prov.missingEnv.join(', ')}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Filters & Payment History Table */}
      <div className={`p-5 rounded-2xl ${cardCls} space-y-4`}>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search transaction ID, customer, email, phone..."
              className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs outline-none focus:border-cyan-400 ${inputCls}`}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs outline-none ${inputCls}`}
          >
            <option value="all">All Statuses</option>
            <option value="successful">Successful</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>

          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs outline-none ${inputCls}`}
          >
            <option value="all">All Providers</option>
            <option value="mtn_momo_rw">MTN MoMo (Rwanda)</option>
            <option value="stripe_cards">Stripe Cards</option>
            <option value="paypal">PayPal</option>
            <option value="flutterwave_africa">Flutterwave Africa</option>
          </select>

          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs outline-none ${inputCls}`}
          >
            <option value="all">All Countries</option>
            {uniqueCountries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={`px-2.5 py-2 rounded-xl text-xs outline-none ${inputCls}`}
            title="Date From"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={`px-2.5 py-2 rounded-xl text-xs outline-none ${inputCls}`}
            title="Date To"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr
                className={`border-b text-[10px] font-mono uppercase ${
                  isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800 text-slate-400'
                }`}
              >
                <th className="py-2.5 pr-3">Transaction ID</th>
                <th className="py-2.5 pr-3">Customer</th>
                <th className="py-2.5 pr-3">Provider / Method</th>
                <th className="py-2.5 pr-3">Amount</th>
                <th className="py-2.5 pr-3">Status</th>
                <th className="py-2.5 pr-3">Date / Time</th>
                <th className="py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-slate-800/70'}`}>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`py-8 text-center ${subTextCls}`}>
                    No payment transactions match the active filters.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className={isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-900/40'}>
                    <td className="py-3 pr-3 font-mono">
                      <p className="font-bold text-cyan-500">{p.transactionRef}</p>
                      <p className={`text-[10px] ${subTextCls}`}>
                        Ext: {p.externalReference ? p.externalReference.slice(0, 18) : '—'}
                      </p>
                    </td>
                    <td className="py-3 pr-3">
                      <p className="font-semibold">{p.customerName}</p>
                      <p className={`text-[10px] ${subTextCls}`}>
                        {p.customerPhoneMasked || p.customerEmail || '—'} • {p.country}
                      </p>
                    </td>
                    <td className="py-3 pr-3">
                      <p className="font-semibold">{p.providerCode}</p>
                      <p className={`text-[10px] ${subTextCls}`}>{p.serviceName}</p>
                    </td>
                    <td className="py-3 pr-3 font-mono">
                      <p className="font-bold">
                        {p.amount.toLocaleString()} {p.currency}
                      </p>
                      <p className={`text-[10px] ${subTextCls}`}>${p.amountUsd.toFixed(2)} USD</p>
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                          p.status === 'successful'
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : p.status === 'pending' || p.status === 'processing'
                            ? 'bg-amber-500/15 text-amber-500'
                            : p.status === 'refunded'
                            ? 'bg-purple-500/15 text-purple-500'
                            : 'bg-rose-500/15 text-rose-500'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className={`py-3 pr-3 font-mono text-[10px] ${subTextCls}`}>
                      {new Date(p.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleInspectReceipt(p.transactionRef)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 ${
                            isLight
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              : 'bg-slate-800 hover:bg-slate-700 text-cyan-300'
                          }`}
                        >
                          <Receipt className="w-3 h-3" />
                          <span>Receipt</span>
                        </button>
                        {p.status === 'successful' && (
                          <button
                            type="button"
                            onClick={() => {
                              setRefundTarget(p);
                              setRefundReason('');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 text-[11px] font-bold flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Refund</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt & Immutable Ledger Modal */}
      {receiptDetail && (
        <div className="fixed inset-0 bg-black/75 z-[70] flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0A1124] border border-cyan-500/40 text-white p-5 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h4 className="text-sm font-extrabold">
                  Payment Receipt & Immutable Audit Trail
                </h4>
              </div>
              <button type="button" onClick={() => setReceiptDetail(null)}>
                <X className="w-4 h-4 text-slate-400 hover:text-white" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Transaction Ref:</span>
                <span className="text-cyan-300 font-bold">{receiptDetail.payment?.transactionRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Invoice #:</span>
                <span>{receiptDetail.invoice?.invoiceNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="uppercase font-bold text-emerald-400">{receiptDetail.payment?.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount:</span>
                <span>
                  {receiptDetail.payment?.amount} {receiptDetail.payment?.currency} ($
                  {Number(receiptDetail.payment?.amountUsd || 0).toFixed(2)} USD)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">External Ref:</span>
                <span className="truncate max-w-[230px]">{receiptDetail.payment?.externalReference || '—'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="text-[11px] font-bold uppercase text-slate-400">
                Immutable Transaction Events
              </h5>
              {(receiptDetail.transactions || []).map((ev: any) => (
                <div
                  key={ev.id}
                  className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 text-[11px] flex items-center justify-between"
                >
                  <div>
                    <span className="font-mono font-bold text-white">{ev.event_type}</span>
                    {ev.error_message && (
                      <p className="text-rose-400 text-[10px]">{ev.error_message}</p>
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">
                    {new Date(ev.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Refund Confirmation Modal */}
      {refundTarget && (
        <div className="fixed inset-0 bg-black/75 z-[70] flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitRefund}
            className="w-full max-w-md rounded-2xl bg-[#0A1124] border border-rose-500/40 text-white p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-rose-300 flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                <span>Confirm Payment Refund</span>
              </h4>
              <button type="button" onClick={() => setRefundTarget(null)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Issue a refund for <span className="font-mono text-cyan-300">{refundTarget.transactionRef}</span> (
              {refundTarget.amount} {refundTarget.currency} — {refundTarget.customerName}). Transaction history stays permanently recorded.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Refund Reason
              </label>
              <input
                type="text"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                required
                placeholder="e.g., Duplicate charge or customer cancellation request"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white outline-none focus:border-rose-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRefundTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={refundSubmitting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white disabled:opacity-50"
              >
                {refundSubmitting ? 'Processing...' : 'Confirm Refund'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
