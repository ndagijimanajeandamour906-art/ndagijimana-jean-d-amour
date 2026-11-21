import React, { useEffect, useState } from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import {
  ShieldAlert,
  Users,
  MessageSquare,
  Radio,
  Activity,
  AlertTriangle,
  Search,
  CheckCircle2,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { AdminFinancialLedgerPanel } from './AdminFinancialLedgerPanel';

export const AdminDashboard: React.FC = () => {
  const {
    allPlatformUsers,
    suspendUserAccount,
    reactivateUserAccount,
    updateUserRole,
    verificationStats,
    refreshAdminUsers,
    conversations,
    messages,
    flowRooms,
  } = useTolkflow();

  const [searchUser, setSearchUser] = useState('');
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'verified' | 'unverified' | 'suspended'>('all');
  const [activeTab, setActiveTab] = useState<'users' | 'payments' | 'reports' | 'telemetry'>('users');

  useEffect(() => {
    if (activeTab === 'users') {
      refreshAdminUsers();
    }
  }, [activeTab, refreshAdminUsers]);

  const totalMessagesCount = Object.values(messages).reduce<number>((acc, list) => acc + (list as any[]).length, 0);
  const activeRoomsCount = flowRooms.filter((r) => r.isLive).length;

  const totalRegistered = verificationStats?.totalUsers ?? allPlatformUsers.length;
  const verifiedTotal =
    verificationStats?.verifiedCount ??
    allPlatformUsers.filter((u) => Boolean(u.isVerified ?? u.verified) && !u.isBlocked && u.accountStatus !== 'suspended').length;
  const unverifiedTotal =
    verificationStats?.unverifiedCount ??
    allPlatformUsers.filter((u) => !(u.isVerified ?? u.verified) && !u.isBlocked && u.accountStatus !== 'suspended').length;
  const suspendedTotal =
    verificationStats?.suspendedCount ??
    allPlatformUsers.filter((u) => u.isBlocked || u.accountStatus === 'suspended').length;
  const verificationRate =
    verificationStats?.verificationRatePercent ??
    (totalRegistered > 0 ? Math.round((verifiedTotal / totalRegistered) * 100) : 0);

  const filteredUsers = allPlatformUsers.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.username.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.email.toLowerCase().includes(searchUser.toLowerCase());
    const isVerified = Boolean(u.isVerified ?? u.verified);
    const isSuspended = Boolean(u.isBlocked || u.accountStatus === 'suspended');
    const matchesVerification =
      verificationFilter === 'all' ||
      (verificationFilter === 'verified' && isVerified && !isSuspended) ||
      (verificationFilter === 'unverified' && !isVerified && !isSuspended) ||
      (verificationFilter === 'suspended' && isSuspended);
    return matchesSearch && matchesVerification;
  });

  const mockReports = [
    {
      id: 'rep_1',
      reporter: 'Sarah Chen',
      reportedUser: 'Dr. Kenji Sato',
      reason: 'Suspicious quantum bot automated query pattern',
      timestamp: '15m ago',
      status: 'Under Review',
    },
    {
      id: 'rep_2',
      reporter: 'Elena Rostova',
      reportedUser: 'Guest_8829',
      reason: 'Attempted invalid cryptographic ratchet handshake',
      timestamp: '2h ago',
      status: 'Resolved',
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050B14] overflow-hidden select-none">
      {/* Header */}
      <div className="p-6 border-b border-slate-800/80 bg-[#0A1124]/50 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-display font-bold text-white tracking-wide">
              TOLKFLOW Administration Center
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Global cluster telemetry, identity verification governance, role management, and security audit logs.
          </p>
        </div>

        <span className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold">
          ADMIN PRIVILEGES ACTIVE
        </span>
      </div>

      <div className="flex-1 p-6 overflow-y-auto space-y-6 max-w-6xl mx-auto w-full">
        {/* Real Live Statistics Computed from Active State */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#0A1124] border border-slate-800 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-600/20 text-cyan-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono">Total Registered</span>
              <p className="text-xl font-bold text-white font-mono">{totalRegistered}</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0A1124] border border-emerald-500/30 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-600/20 text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono">Verified ({verificationRate}%)</span>
              <p className="text-xl font-bold text-emerald-400 font-mono">{verifiedTotal}</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0A1124] border border-amber-500/30 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-600/20 text-amber-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono">Unverified / Pending</span>
              <p className="text-xl font-bold text-amber-300 font-mono">{unverifiedTotal}</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0A1124] border border-slate-800 flex items-center gap-3">
            <div className="p-3 rounded-xl bg-purple-600/20 text-purple-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono">Msgs / Rooms / Susp</span>
              <p className="text-sm font-bold text-white font-mono">
                {totalMessagesCount} / {activeRoomsCount} / {suspendedTotal}
              </p>
            </div>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-2 rounded-xl font-semibold transition-all ${
              activeTab === 'users' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            User Verification Governance ({allPlatformUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex-1 py-2 rounded-xl font-semibold transition-all ${
              activeTab === 'payments' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Payments &amp; Revenue
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex-1 py-2 rounded-xl font-semibold transition-all ${
              activeTab === 'reports' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Security Reports &amp; Flagged Logs (2)
          </button>
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`flex-1 py-2 rounded-xl font-semibold transition-all ${
              activeTab === 'telemetry' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Platform Telemetry &amp; Nodes
          </button>
        </div>

        {activeTab === 'payments' && <AdminFinancialLedgerPanel variant="dark" />}

        {/* Users Management Tab */}
        {activeTab === 'users' && (
          <div className="p-6 rounded-3xl bg-[#0A1124] border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    placeholder="Filter by name, @username, or email..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-400 outline-none focus:border-cyan-400"
                  />
                </div>

                <select
                  value={verificationFilter}
                  onChange={(e) => setVerificationFilter(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 outline-none focus:border-cyan-400"
                >
                  <option value="all">All Verification States</option>
                  <option value="verified">Verified Only</option>
                  <option value="unverified">Unverified Only</option>
                  <option value="suspended">Suspended Only</option>
                </select>

                <button
                  onClick={() => refreshAdminUsers()}
                  className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-xs text-cyan-300 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync DB</span>
                </button>
              </div>

              <span className="text-xs text-slate-400">
                Displaying {filteredUsers.length} accounts
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                    <th className="pb-3">User Profile</th>
                    <th className="pb-3">Contact</th>
                    <th className="pb-3">Email Verification</th>
                    <th className="pb-3">Registered / Verified</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3 text-right">Administrative Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUsers.map((u) => {
                    const isVerified = Boolean(u.isVerified ?? u.verified);
                    const isSuspended = Boolean(u.isBlocked || u.accountStatus === 'suspended');
                    const regDate = u.createdAt
                      ? new Date(u.createdAt).toLocaleDateString()
                      : 'Seeded';
                    const verDate = u.verifiedAt
                      ? new Date(u.verifiedAt).toLocaleDateString()
                      : isVerified
                      ? 'Verified'
                      : 'Pending';

                    return (
                      <tr key={u.id} className="hover:bg-slate-900/40">
                        <td className="py-3.5 flex items-center gap-3">
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-700"
                          />
                          <div>
                            <p className="font-bold text-white flex items-center gap-1">
                              {u.name}
                              {isVerified && <CheckCircle2 className="w-3 h-3 text-cyan-400" />}
                            </p>
                            <p className="text-[10px] text-cyan-400 font-mono">@{u.username}</p>
                          </div>
                        </td>

                        <td className="py-3.5 text-slate-300">
                          <p>{u.email}</p>
                          <p className="text-[10px] text-slate-400">{u.phone || u.country}</p>
                        </td>

                        <td className="py-3.5">
                          {isVerified ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono">
                              VERIFIED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono">
                              UNVERIFIED
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 text-[10px] font-mono text-slate-400">
                          <p>Reg: {regDate}</p>
                          <p className={isVerified ? 'text-emerald-400' : 'text-amber-400'}>
                            Ver: {verDate}
                          </p>
                        </td>

                        <td className="py-3.5">
                          {isSuspended ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-mono">
                              SUSPENDED
                            </span>
                          ) : isVerified ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono">
                              PENDING OTP
                            </span>
                          )}
                        </td>

                        <td className="py-3.5">
                          <select
                            value={u.role}
                            onChange={async (e) => {
                              await updateUserRole(u.id, e.target.value as any);
                              await refreshAdminUsers();
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs outline-none"
                          >
                            <option value="user">User</option>
                            <option value="moderator">Moderator</option>
                            <option value="superadmin">Superadmin</option>
                          </select>
                        </td>

                        <td className="py-3.5 text-right">
                          {isSuspended ? (
                            <button
                              onClick={async () => {
                                await reactivateUserAccount(u.id);
                                await refreshAdminUsers();
                              }}
                              className="px-3 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 text-xs font-semibold transition-colors"
                            >
                              Restore Account
                            </button>
                          ) : (
                            <button
                              onClick={async () => {
                                await suspendUserAccount(u.id);
                                await refreshAdminUsers();
                              }}
                              className="px-3 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600 text-rose-200 text-xs font-semibold transition-colors"
                            >
                              Suspend Account
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="p-6 rounded-3xl bg-[#0A1124] border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white mb-2">User Reports & Moderation Queue</h3>
            <div className="space-y-3">
              {mockReports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          Reported: {rep.reportedUser}
                        </span>
                        <span className="text-[10px] text-slate-400">by {rep.reporter}</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">{rep.reason}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                      {rep.timestamp}
                    </span>
                    <button className="px-3 py-1 rounded-lg bg-blue-600 text-xs text-white">
                      Take Action
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Telemetry Tab */}
        {activeTab === 'telemetry' && (
          <div className="p-6 rounded-3xl bg-[#0A1124] border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white mb-2">Edge Routing & WebRTC Topology</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400">US-West (Oregon) Node</span>
                <p className="text-sm font-bold text-emerald-400 font-mono">Healthy (12ms)</p>
                <p className="text-[10px] text-slate-500">TURN Relay: Active</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400">EU-Central (Frankfurt) Node</span>
                <p className="text-sm font-bold text-emerald-400 font-mono">Healthy (18ms)</p>
                <p className="text-[10px] text-slate-500">STUN Gather: 100%</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-xs text-slate-400">AP-East (Tokyo) Node</span>
                <p className="text-sm font-bold text-emerald-400 font-mono">Healthy (22ms)</p>
                <p className="text-[10px] text-slate-500">Throughput: 8.4 Gbps</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
