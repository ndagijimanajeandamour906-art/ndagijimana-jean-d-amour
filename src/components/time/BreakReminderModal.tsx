import React, { useState } from 'react';
import {
  Coffee,
  X,
  Clock,
  Heart,
  Droplet,
  Eye,
  Wind,
  CheckCircle2,
  Bell,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { useTolkflow } from '../../context/TolkflowContext';
import { timeReminderService } from '../../services/timeReminderService';

export const BreakReminderModal: React.FC = () => {
  const {
    breakModalOpen,
    dismissBreakModal,
    postponeBreak,
    breakReminderData,
    formattedSessionTime,
    timeSettings,
    currentUser,
  } = useTolkflow();

  const [guidedBreathingActive, setGuidedBreathingActive] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');

  if (!breakModalOpen) return null;

  const isKinyarwanda =
    currentUser.preferredLanguage === 'rw' || timeSettings.language === 'rw';

  const defaultMsgEn =
    'You have been using Tolkflow for one hour. Remember to take a short break!';
  const defaultMsgRw =
    'Umaze isaha imwe ukoresha Tolkflow. Wakwibuka gufata akaruhuko gato!';

  const headlineEn = breakReminderData?.messageEn || defaultMsgEn;
  const headlineRw = breakReminderData?.messageRw || defaultMsgRw;

  const startBreathing = () => {
    setGuidedBreathingActive(true);
    let phaseIdx = 0;
    const phases: ('Inhale' | 'Hold' | 'Exhale')[] = ['Inhale', 'Hold', 'Exhale'];
    const interval = setInterval(() => {
      phaseIdx = (phaseIdx + 1) % phases.length;
      setBreathingPhase(phases[phaseIdx]);
    }, 4000);

    setTimeout(() => {
      clearInterval(interval);
      setGuidedBreathingActive(false);
      dismissBreakModal();
    }, 24000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-[#111b21] border border-emerald-500/40 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-gray-100 flex flex-col relative animate-scale-up">
        {/* Top Decorative Gradient Bar */}
        <div className="h-2 bg-gradient-to-r from-[#25D366] via-emerald-400 to-cyan-400 w-full" />

        {/* Close Button */}
        <button
          onClick={dismissBreakModal}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          title="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 md:p-8 space-y-6">
          {/* Header Icon & Title */}
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 border border-emerald-400/40 flex items-center justify-center text-[#25D366] flex-shrink-0 shadow-[0_0_25px_rgba(37,211,102,0.25)]">
              <Coffee className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/40 uppercase tracking-wider">
                  Digital Wellbeing Alert
                </span>
                <span className="text-xs text-gray-400 font-mono flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{formattedSessionTime}</span>
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mt-1">
                {isKinyarwanda
                  ? 'Igihe cyo gufata akaruhuko gato'
                  : 'Time to take a healthy break'}
              </h3>
            </div>
          </div>

          {/* Main User Notification Card (Bilingual / Dual Language Prompts) */}
          <div className="p-4 rounded-2xl bg-[#1f2c34] border border-emerald-500/30 space-y-2.5">
            <div className="flex items-start space-x-3">
              <span className="text-xl">🍵</span>
              <div className="space-y-1.5 flex-1">
                <p className="text-sm font-semibold text-emerald-300 leading-snug">
                  "{headlineEn}"
                </p>
                <p className="text-xs text-gray-300 italic leading-snug border-t border-gray-700/60 pt-1.5">
                  🇷🇼 "{headlineRw}"
                </p>
              </div>
            </div>
          </div>

          {/* Guided Relaxation View if Active */}
          {guidedBreathingActive ? (
            <div className="p-6 bg-[#0B141A] rounded-2xl border border-cyan-500/40 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-cyan-500/20 animate-ping absolute" />
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center justify-center text-gray-950 font-black text-sm tracking-wider shadow-lg">
                  {breathingPhase}
                </div>
              </div>
              <p className="text-xs text-cyan-300 font-medium">
                Deep breathing exercise active. Relax your eyes and shoulders...
              </p>
            </div>
          ) : (
            /* Quick Health Tips Grid */
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-[#1f2c34] rounded-xl border border-gray-800 flex flex-col items-center">
                <Eye className="w-5 h-5 text-cyan-400 mb-1" />
                <span className="text-[11px] font-bold text-gray-200">20-20-20 Rule</span>
                <span className="text-[10px] text-gray-400 mt-0.5">Look 20ft away</span>
              </div>
              <div className="p-3 bg-[#1f2c34] rounded-xl border border-gray-800 flex flex-col items-center">
                <Droplet className="w-5 h-5 text-blue-400 mb-1" />
                <span className="text-[11px] font-bold text-gray-200">Hydration</span>
                <span className="text-[10px] text-gray-400 mt-0.5">Drink some water</span>
              </div>
              <div className="p-3 bg-[#1f2c34] rounded-xl border border-gray-800 flex flex-col items-center">
                <Heart className="w-5 h-5 text-rose-400 mb-1" />
                <span className="text-[11px] font-bold text-gray-200">Stretch</span>
                <span className="text-[10px] text-gray-400 mt-0.5">Stand & stretch</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            {!guidedBreathingActive ? (
              <button
                onClick={startBreathing}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#25D366] to-[#128C7E] text-gray-950 font-bold text-xs uppercase tracking-wider hover:opacity-95 transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 active:scale-95"
              >
                <Wind className="w-4 h-4" />
                <span>{isKinyarwanda ? 'Fata Akaruhuko (Relax)' : 'Take a 2-Min Break'}</span>
              </button>
            ) : null}

            <button
              onClick={() => postponeBreak(15)}
              className="w-full sm:w-auto py-3 px-4 rounded-xl bg-[#1f2c34] hover:bg-gray-800 text-gray-300 font-semibold text-xs transition-colors border border-gray-700/60"
            >
              {isKinyarwanda ? 'Nyibutsa mu minota 15' : 'Snooze 15m'}
            </button>

            <button
              onClick={dismissBreakModal}
              className="w-full sm:w-auto py-3 px-4 rounded-xl bg-transparent hover:bg-white/5 text-gray-400 hover:text-white font-medium text-xs transition-colors"
            >
              {isKinyarwanda ? 'Komeza gukora' : 'Continue'}
            </button>
          </div>

          {/* Footer Note */}
          <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-[11px] text-gray-400">
            <span>TOLKFLOW Smart Time Management</span>
            <span>Interval: {timeSettings.reminderIntervalMinutes} min</span>
          </div>
        </div>
      </div>
    </div>
  );
};
