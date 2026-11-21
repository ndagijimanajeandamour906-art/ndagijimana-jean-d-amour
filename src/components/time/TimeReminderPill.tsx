import React, { useState, useRef, useEffect } from 'react';
import { Clock, Coffee, Sliders, Check, Bell, BellOff, Play } from 'lucide-react';
import { useTolkflow } from '../../context/TolkflowContext';

export const TimeReminderPill: React.FC = () => {
  const {
    formattedSessionTime,
    timeSettings,
    updateTimeSettings,
    triggerManualBreakTest,
    currentUser,
  } = useTolkflow();

  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const isKinyarwanda = currentUser.preferredLanguage === 'rw';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    };
    if (popoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [popoverOpen]);

  const intervals = [
    { label: '30 min', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '2 hours', value: 120 },
  ];

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setPopoverOpen(!popoverOpen)}
        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border transition-all ${
          timeSettings.enabled
            ? 'bg-[#128C7E]/20 text-emerald-300 border-[#25D366]/40 hover:bg-[#128C7E]/30 shadow-sm'
            : 'bg-gray-800/60 text-gray-400 border-gray-700/60 hover:text-gray-300'
        }`}
        title="TOLKFLOW Smart Time Management (Continuous session timer & break alerts)"
      >
        <Clock className="w-3.5 h-3.5 text-[#25D366]" />
        <span className="font-bold">{formattedSessionTime}</span>
        {timeSettings.enabled && (
          <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse" />
        )}
      </button>

      {/* Popover Settings */}
      {popoverOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-[#111b21] border border-emerald-500/30 rounded-2xl p-4 shadow-2xl z-50 text-gray-100 space-y-3.5 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
            <div className="flex items-center space-x-2">
              <Coffee className="w-4 h-4 text-[#25D366]" />
              <span className="text-xs font-bold text-white">
                {isKinyarwanda ? 'Gucunga Igihe' : 'Time Management'}
              </span>
            </div>
            <button
              onClick={() => updateTimeSettings({ enabled: !timeSettings.enabled })}
              className={`p-1 rounded-lg transition-colors ${
                timeSettings.enabled ? 'text-[#25D366] hover:bg-emerald-950/40' : 'text-gray-500 hover:bg-gray-800'
              }`}
              title={timeSettings.enabled ? 'Disable reminders' : 'Enable reminders'}
            >
              {timeSettings.enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider block">
              {isKinyarwanda ? 'Igihe cyo kwibutsa (Interval):' : 'Reminder Interval:'}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {intervals.map((int) => (
                <button
                  key={int.value}
                  onClick={() => updateTimeSettings({ reminderIntervalMinutes: int.value })}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                    timeSettings.reminderIntervalMinutes === int.value
                      ? 'bg-[#25D366] text-gray-950 shadow-md'
                      : 'bg-[#1f2c34] text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  {int.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-2.5 bg-[#1f2c34] rounded-xl border border-gray-800 text-[11px] text-gray-300 space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">Current Session:</span>
              <span className="font-mono text-emerald-400 font-bold">{formattedSessionTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Status:</span>
              <span className="text-[#25D366] font-medium">
                {timeSettings.enabled ? 'Active (Auto-pause)' : 'Disabled'}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              triggerManualBreakTest();
              setPopoverOpen(false);
            }}
            className="w-full py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-[#25D366] border border-emerald-400/30 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isKinyarwanda ? 'Kora Ikizamini cyo Kwibutsa' : 'Test Break Alert Now'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
