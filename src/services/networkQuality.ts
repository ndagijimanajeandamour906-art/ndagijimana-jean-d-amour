// Real-time Network Quality Monitor and Telemetry for TOLKFLOW
// Dynamically adjusts compression and optimizes delivery based on connection speed

export type NetworkTier = 'ultra' | 'good' | 'fair' | 'slow' | 'offline';

export interface NetworkStatus {
  tier: NetworkTier;
  effectiveType: string;
  rttMs: number;
  downlinkMbps: number;
  isOnline: boolean;
  saveData: boolean;
  packetLossPercent: number;
}

type NetworkListener = (status: NetworkStatus) => void;

class NetworkQualityService {
  private status: NetworkStatus = {
    tier: 'ultra',
    effectiveType: '4g',
    rttMs: 18,
    downlinkMbps: 25,
    isOnline: true,
    saveData: false,
    packetLossPercent: 0,
  };

  private listeners = new Set<NetworkListener>();
  private pingInterval: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.status.isOnline = navigator.onLine;

      window.addEventListener('online', () => {
        this.status.isOnline = true;
        this.measureLatency();
        this.notify();
      });

      window.addEventListener('offline', () => {
        this.status.isOnline = false;
        this.status.tier = 'offline';
        this.notify();
      });

      const navConn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      if (navConn) {
        navConn.addEventListener('change', () => this.updateFromNavConnection());
        this.updateFromNavConnection();
      }

      // Initial latency test
      this.measureLatency();

      // Periodically measure real latency
      this.pingInterval = setInterval(() => {
        this.measureLatency();
      }, 30000);
    }
  }

  private updateFromNavConnection() {
    if (typeof window === 'undefined') return;
    const navConn = (navigator as any).connection;
    if (navConn) {
      this.status.effectiveType = navConn.effectiveType || '4g';
      this.status.downlinkMbps = navConn.downlink || 25;
      this.status.rttMs = navConn.rtt || 20;
      this.status.saveData = Boolean(navConn.saveData);
      this.deriveTier();
      this.notify();
    }
  }

  async measureLatency(): Promise<number> {
    if (typeof window === 'undefined' || !navigator.onLine) {
      this.status.tier = 'offline';
      this.status.isOnline = false;
      this.notify();
      return 999;
    }

    const start = performance.now();
    try {
      // Light ping to server status endpoint
      const res = await fetch('/api/tolkflow/status', {
        method: 'GET',
        cache: 'no-store',
      });
      const end = performance.now();
      const rtt = Math.round(end - start);
      this.status.rttMs = rtt;
      this.status.isOnline = res.ok;
      this.status.packetLossPercent = 0;
      this.deriveTier();
      this.notify();
      return rtt;
    } catch {
      this.status.rttMs = 250;
      this.status.tier = 'slow';
      this.notify();
      return 250;
    }
  }

  private deriveTier() {
    if (!this.status.isOnline) {
      this.status.tier = 'offline';
      return;
    }

    const { rttMs, downlinkMbps } = this.status;

    if (rttMs < 35 && downlinkMbps >= 10) {
      this.status.tier = 'ultra';
    } else if (rttMs < 90 && downlinkMbps >= 3) {
      this.status.tier = 'good';
    } else if (rttMs < 200 || downlinkMbps >= 1) {
      this.status.tier = 'fair';
    } else {
      this.status.tier = 'slow';
    }
  }

  getStatus(): NetworkStatus {
    return { ...this.status };
  }

  getMetrics(): NetworkStatus {
    return this.getStatus();
  }

  // Recommended image compression quality based on network tier
  getRecommendedImageQuality(): { maxWidth: number; quality: number; format: 'webp' | 'jpeg' } {
    switch (this.status.tier) {
      case 'ultra':
        return { maxWidth: 2048, quality: 0.88, format: 'webp' };
      case 'good':
        return { maxWidth: 1600, quality: 0.80, format: 'webp' };
      case 'fair':
        return { maxWidth: 1200, quality: 0.70, format: 'webp' };
      case 'slow':
      case 'offline':
      default:
        return { maxWidth: 960, quality: 0.60, format: 'webp' };
    }
  }

  subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l(this.getStatus()));
  }
}

export type NetworkMetrics = NetworkStatus;

export const networkQuality = new NetworkQualityService();
