import React from 'react';
import { useTolkflow } from '../../context/TolkflowContext';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  MessageSquare,
  Radio,
  UserPlus,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

interface NotificationsDrawerProps {
  onClose: () => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({ onClose }) => {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    unreadNotificationsCount,
  } = useTolkflow();

  return (
    <div className="fixed inset-y-0 right-0 w-80 lg:w-96 bg-[#0A1124] border-l border-slate-800 shadow-2xl z-50 flex flex-col select-none animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Platform Notifications</h3>
          {unreadNotificationsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-cyan-400 text-black text-[10px] font-extrabold">
              {unreadNotificationsCount}
            </span>
          )}
        </div>

        <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Sub-bar */}
      {unreadNotificationsCount > 0 && (
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex justify-end">
          <button
            onClick={markAllNotificationsRead}
            className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-medium"
          >
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </button>
        </div>
      )}

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => markNotificationRead(n.id)}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              !n.read
                ? 'bg-blue-600/10 border-cyan-500/40 shadow-sm'
                : 'bg-slate-900/60 border-slate-800 opacity-80 hover:opacity-100'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                {n.type === 'message' && <MessageSquare className="w-4 h-4 text-cyan-400" />}
                {n.type === 'system' && <Radio className="w-4 h-4 text-purple-400" />}
                {n.type === 'connect' && <UserPlus className="w-4 h-4 text-emerald-400" />}
                {n.type === 'security' && <ShieldAlert className="w-4 h-4 text-rose-400" />}
                <span className="text-xs font-bold text-white">{n.title}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">{n.timestamp}</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed pl-6">{n.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
