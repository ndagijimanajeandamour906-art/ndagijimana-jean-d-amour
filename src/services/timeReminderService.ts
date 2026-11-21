// Smart User Time Management & Healthy Break Reminder Service for TOLKFLOW
// Tracks active continuous usage, pauses on inactivity or tab switch,
// and notifies users when session thresholds are met (e.g., 1 hour).

import { UserTimeSettings, ScreenTimeSession } from '../types';
import { soundFx } from './soundEffects';

type TimeListener = (activeSeconds: number, formattedTime: string) => void;
type BreakPromptListener = (sessionMinutes: number, messageEn: string, messageRw: string) => void;

class TimeReminderService {
  private settings: UserTimeSettings = {
    enabled: true,
    reminderIntervalMinutes: 60, // 1 hour default
    notificationSound: true,
    language: 'auto',
    autoPauseOnInactivity: true,
    dailyGoalMinutes: 180,
  };

  private activeSeconds: number = 0;
  private totalTodaySeconds: number = 0;
  private isActive: boolean = true;
  private lastActivityTimestamp: number = Date.now();
  private timer: any = null;
  private inactivityCheckTimer: any = null;
  private lastPromptedMinute: number = 0;

  private timeListeners = new Set<TimeListener>();
  private breakPromptListeners = new Set<BreakPromptListener>();

  constructor() {
    this.loadFromStorage();
    if (typeof window !== 'undefined') {
      this.initEventListeners();
      this.startTimer();
    }
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const storedSettings = localStorage.getItem('tolkflow_time_settings');
      if (storedSettings) {
        this.settings = { ...this.settings, ...JSON.parse(storedSettings) };
      }

      const today = new Date().toISOString().split('T')[0];
      const storedToday = localStorage.getItem(`tolkflow_screentime_${today}`);
      if (storedToday) {
        this.totalTodaySeconds = parseInt(storedToday, 10) || 0;
      }
    } catch (e) {
      console.warn('Error loading screen time storage:', e);
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('tolkflow_time_settings', JSON.stringify(this.settings));
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem(`tolkflow_screentime_${today}`, this.totalTodaySeconds.toString());
    } catch (e) {
      console.warn('Error saving screen time storage:', e);
    }
  }

  private initEventListeners() {
    // Window focus / blur (pause tracking when user leaves the tab)
    window.addEventListener('focus', () => {
      this.isActive = true;
      this.lastActivityTimestamp = Date.now();
    });

    window.addEventListener('blur', () => {
      this.isActive = false;
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.isActive = false;
      } else {
        this.isActive = true;
        this.lastActivityTimestamp = Date.now();
      }
    });

    // User activity listeners
    const onUserActivity = () => {
      this.lastActivityTimestamp = Date.now();
      if (!this.isActive) {
        this.isActive = true;
      }
    };

    window.addEventListener('mousemove', onUserActivity, { passive: true });
    window.addEventListener('keydown', onUserActivity, { passive: true });
    window.addEventListener('touchstart', onUserActivity, { passive: true });
    window.addEventListener('scroll', onUserActivity, { passive: true });
  }

  private startTimer() {
    if (this.timer) clearInterval(this.timer);

    this.timer = setInterval(() => {
      // If inactive for more than 2 minutes, pause active usage counting
      const idleSeconds = (Date.now() - this.lastActivityTimestamp) / 1000;
      if (idleSeconds > 120 && this.settings.autoPauseOnInactivity) {
        this.isActive = false;
      }

      if (this.isActive && this.settings.enabled) {
        this.activeSeconds += 1;
        this.totalTodaySeconds += 1;

        // Check if reminder threshold is reached
        this.checkReminderThreshold();

        // Notify listeners
        const formatted = this.formatTime(this.activeSeconds);
        this.timeListeners.forEach((l) => l(this.activeSeconds, formatted));

        // Periodic persist every 30 seconds
        if (this.activeSeconds % 30 === 0) {
          this.saveToStorage();
        }
      }
    }, 1000);
  }

  private checkReminderThreshold() {
    if (!this.settings.enabled) return;

    const intervalSec = this.settings.reminderIntervalMinutes * 60;
    if (intervalSec <= 0) return;

    // Trigger when activeSeconds hits exact multiples of reminder interval
    const currentMinute = Math.floor(this.activeSeconds / 60);

    if (
      this.activeSeconds > 0 &&
      this.activeSeconds % intervalSec === 0 &&
      currentMinute !== this.lastPromptedMinute
    ) {
      this.lastPromptedMinute = currentMinute;
      const hours = Math.floor(this.activeSeconds / 3600);
      const minutes = Math.floor((this.activeSeconds % 3600) / 60);

      let timeTextEn = '';
      let timeTextRw = '';

      if (hours >= 1) {
        timeTextEn = hours === 1 ? 'one hour' : `${hours} hours`;
        timeTextRw = hours === 1 ? 'isaha imwe' : `amasaha ${hours}`;
      } else {
        timeTextEn = `${minutes} minutes`;
        timeTextRw = `iminota ${minutes}`;
      }

      const msgEn = `You have been using Tolkflow for ${timeTextEn}. Remember to take a short break!`;
      const msgRw = `Umaze ${timeTextRw} ukoresha Tolkflow. Wakwibuka gufata akaruhuko gato!`;

      if (this.settings.notificationSound) {
        soundFx.playWarningSound();
      }

      this.breakPromptListeners.forEach((cb) => cb(currentMinute, msgEn, msgRw));
    }
  }

  formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) {
      return `${h}h ${m}m`;
    }
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  }

  getActiveSeconds(): number {
    return this.activeSeconds;
  }

  getTotalTodaySeconds(): number {
    return this.totalTodaySeconds;
  }

  getSettings(): UserTimeSettings {
    return { ...this.settings };
  }

  updateSettings(updates: Partial<UserTimeSettings>) {
    this.settings = { ...this.settings, ...updates };
    this.saveToStorage();
  }

  resetSession() {
    this.activeSeconds = 0;
    this.lastPromptedMinute = 0;
    this.lastActivityTimestamp = Date.now();
    this.isActive = true;
  }

  postponeReminder(additionalMinutes: number = 15) {
    // Postpone next trigger by shifting lastPromptedMinute forward
    const shiftSeconds = additionalMinutes * 60;
    this.activeSeconds = Math.max(0, this.activeSeconds - shiftSeconds);
  }

  subscribe(listener: TimeListener): () => void {
    this.timeListeners.add(listener);
    listener(this.activeSeconds, this.formatTime(this.activeSeconds));
    return () => this.timeListeners.delete(listener);
  }

  onBreakPrompt(listener: BreakPromptListener): () => void {
    this.breakPromptListeners.add(listener);
    return () => this.breakPromptListeners.delete(listener);
  }

  // Trigger manual demo/test break reminder
  triggerTestReminder() {
    const msgEn = 'You have been using Tolkflow for one hour. Remember to take a short break!';
    const msgRw = 'Umaze isaha imwe ukoresha Tolkflow. Wakwibuka gufata akaruhuko gato!';
    if (this.settings.notificationSound) {
      soundFx.playWarningSound();
    }
    this.breakPromptListeners.forEach((cb) => cb(60, msgEn, msgRw));
  }
}

export const timeReminderService = new TimeReminderService();
