// Real-time WebRTC Signaling Client for TOLKFLOW Calling System
// Supports both WebSocket Server (/ws/signaling) and Cross-Tab BroadcastChannel fallback

type MessageHandler = (data: any) => void;

export class SignalingClient {
  private ws: WebSocket | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private currentUserId: string | null = null;
  private currentUserData: any = null;
  private isConnected: boolean = false;
  private reconnectTimer: any = null;
  private pingInterval: any = null;
  private processedMessageIds = new Set<string>();

  // Event handlers
  private handlers: { [event: string]: Set<MessageHandler> } = {
    incoming_call: new Set(),
    call_ringing: new Set(),
    call_accepted: new Set(),
    call_rejected: new Set(),
    call_cancelled: new Set(),
    call_ended: new Set(),
    user_offline: new Set(),
    offer: new Set(),
    answer: new Set(),
    ice_candidate: new Set(),
    connection_change: new Set(),
    incoming_message: new Set(),
    message_ack: new Set(),
    message_status_update: new Set(),
    device_sync_message: new Set(),
    peer_typing: new Set(),
    user_presence_change: new Set(),
    stress_test_progress: new Set(),
    stress_test_complete: new Set(),
  };

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('tolkflow-webrtc-signaling');
        this.broadcastChannel.onmessage = (event) => {
          this.handleIncomingRaw(event.data, 'broadcast');
        };
      } catch (e) {
        console.warn('BroadcastChannel not available:', e);
      }
    }
    this.connect();
  }

  // Connect to the WebSocket signaling server
  connect() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/signaling`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.emit('connection_change', { status: 'connected' });

        // Register if we already have user credentials
        if (this.currentUserId) {
          this.sendDirect({
            type: 'register',
            userId: this.currentUserId,
            user: this.currentUserData,
          });
        }

        // Keep-alive ping every 25 seconds
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleIncomingRaw(data, 'websocket');
        } catch (err) {
          console.error('Failed to parse signaling message:', err);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket signaling connection issue (will reconnect):', err);
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.emit('connection_change', { status: 'disconnected' });
        if (this.pingInterval) clearInterval(this.pingInterval);

        // Schedule auto-reconnect
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
          }, 3000);
        }
      };
    } catch (err) {
      console.warn('Could not initialize WebSocket signaling:', err);
    }
  }

  // Process incoming messages, deduplicating between WS and BroadcastChannel
  private handleIncomingRaw(data: any, source: 'websocket' | 'broadcast') {
    if (!data || !data.type) return;

    // Generate or check message deduplication ID
    const msgId = data.msgId || `${data.type}_${data.callId || ''}_${data.fromUserId || ''}_${data.sdp?.type || ''}_${data.timestamp || ''}`;
    if (this.processedMessageIds.has(msgId)) {
      return;
    }
    this.processedMessageIds.add(msgId);

    // Keep deduplication set compact
    if (this.processedMessageIds.size > 200) {
      const firstEntries = Array.from(this.processedMessageIds).slice(0, 50);
      firstEntries.forEach((id) => this.processedMessageIds.delete(id));
    }

    // Don't process our own broadcast echoes
    if (source === 'broadcast' && data._senderUserId === this.currentUserId) {
      return;
    }

    // Filter incoming calls or signaling targeted specifically to this user
    if (data.toUserId && this.currentUserId && data.toUserId !== this.currentUserId && data.type !== 'register') {
      return;
    }

    this.emit(data.type, data);
  }

  // Register client identity
  register(userId: string, user: any) {
    this.currentUserId = userId;
    this.currentUserData = user;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendDirect({
        type: 'register',
        userId,
        user,
      });
    }

    // Broadcast registration cross-tab
    this.broadcastLocally({
      type: 'user_online',
      userId,
      user,
      _senderUserId: userId,
    });
  }

  // Send message over WebSocket and locally over BroadcastChannel
  private send(data: any) {
    const payload = {
      ...data,
      msgId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now(),
      _senderUserId: this.currentUserId,
    };

    // Send to WebSocket server
    this.sendDirect(payload);

    // Also dispatch to other browser tabs of the same app
    this.broadcastLocally(payload);
  }

  private sendDirect(payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  private broadcastLocally(payload: any) {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(payload);
      } catch (err) {
        console.warn('Broadcast send error:', err);
      }
    }
  }

  // Calling Actions
  callUser(toUserId: string, callId: string, callType: 'voice' | 'video', caller: any) {
    this.send({
      type: 'call_user',
      callId,
      toUserId,
      callType,
      caller,
    });
  }

  acceptCall(toUserId: string, callId: string) {
    this.send({
      type: 'accept_call',
      callId,
      toUserId,
    });
  }

  rejectCall(toUserId: string, callId: string, reason: string = 'declined') {
    this.send({
      type: 'reject_call',
      callId,
      toUserId,
      reason,
    });
  }

  cancelCall(toUserId: string, callId: string) {
    this.send({
      type: 'cancel_call',
      callId,
      toUserId,
    });
  }

  endCall(toUserId: string, callId: string, durationSeconds: number = 0) {
    this.send({
      type: 'end_call',
      callId,
      toUserId,
      durationSeconds,
    });
  }

  sendOffer(toUserId: string, callId: string, sdp: RTCSessionDescriptionInit) {
    this.send({
      type: 'offer',
      callId,
      toUserId,
      sdp,
    });
  }

  sendAnswer(toUserId: string, callId: string, sdp: RTCSessionDescriptionInit) {
    this.send({
      type: 'answer',
      callId,
      toUserId,
      sdp,
    });
  }

  sendIceCandidate(toUserId: string, callId: string, candidate: RTCIceCandidateInit) {
    this.send({
      type: 'ice_candidate',
      callId,
      toUserId,
      candidate,
    });
  }

  // Real-Time Ultra-Fast Instant Messaging Methods
  sendMessage(
    arg1: any,
    arg2?: any,
    arg3?: any,
    arg4?: string
  ) {
    let toUserId = '';
    let conversationId = '';
    let message: any = null;
    let tempId = '';

    if (typeof arg1 === 'object' && arg1 !== null) {
      // Called as sendMessage(message, toUserId)
      message = arg1;
      toUserId = arg2 || message.recipientId || '';
      conversationId = message.conversationId || '';
      tempId = message.id;
    } else {
      // Called as sendMessage(toUserId, conversationId, message, tempId)
      toUserId = arg1;
      conversationId = arg2;
      message = arg3;
      tempId = arg4 || message?.id || '';
    }

    const payload = {
      type: 'send_message',
      toUserId,
      conversationId,
      message,
      tempId: tempId || message?.id,
      _senderUserId: this.currentUserId,
    };

    // 1. Send to server via WebSocket
    this.send(payload);

    // 2. Cross-tab peer broadcast with incoming_message for local tabs of different users
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'incoming_message',
          toUserId,
          conversationId,
          message: { ...message, status: 'delivered' },
          fromUserId: this.currentUserId,
          msgId: `bc_msg_${message?.id}`,
          _senderUserId: this.currentUserId,
        });
      } catch {}
    }
  }

  sendDeliveryAck(messageId: string, arg2: string, arg3: string) {
    const senderId = arg2.startsWith('conv_') ? arg3 : arg2;
    const conversationId = arg2.startsWith('conv_') ? arg2 : arg3;
    this.send({
      type: 'message_delivered',
      messageId,
      conversationId,
      senderId,
    });
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'message_status_update',
          toUserId: senderId,
          messageId,
          conversationId,
          status: 'delivered',
          _senderUserId: this.currentUserId,
        });
      } catch {}
    }
  }

  sendReadAck(messageId: string, arg2: string, arg3: string) {
    const senderId = arg2.startsWith('conv_') ? arg3 : arg2;
    const conversationId = arg2.startsWith('conv_') ? arg2 : arg3;
    this.send({
      type: 'message_read',
      messageId,
      conversationId,
      senderId,
    });
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'message_status_update',
          toUserId: senderId,
          messageId,
          conversationId,
          status: 'read',
          _senderUserId: this.currentUserId,
        });
      } catch {}
    }
  }

  sendTyping(
    arg1: string,
    arg2: string,
    arg3: any,
    arg4?: any
  ) {
    let toUserId = '';
    let conversationId = '';
    let isTyping = false;
    let username = '';

    if (typeof arg3 === 'boolean') {
      toUserId = arg1;
      conversationId = arg2;
      isTyping = arg3;
      username = arg4 || '';
    } else {
      conversationId = arg1;
      toUserId = arg2;
      username = arg3 || '';
      isTyping = Boolean(arg4);
    }

    this.send({
      type: 'typing',
      toUserId,
      conversationId,
      isTyping,
      username,
    });
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'peer_typing',
          toUserId,
          conversationId,
          fromUserId: this.currentUserId,
          username,
          fromUserName: username,
          isTyping,
          _senderUserId: this.currentUserId,
        });
      } catch {}
    }
  }

  runStressTest(userCount: number) {
    this.send({
      type: 'run_stress_test',
      userCount,
    });
  }

  // Event subscription
  on(event: string, handler: MessageHandler): () => void {
    if (!this.handlers[event]) {
      this.handlers[event] = new Set();
    }
    this.handlers[event].add(handler);
    return () => {
      this.handlers[event]?.delete(handler);
    };
  }

  private emit(event: string, data: any) {
    const list = this.handlers[event];
    if (list) {
      list.forEach((handler) => {
        try {
          handler(data);
        } catch (err) {
          console.error(`Error in signaling handler for ${event}:`, err);
        }
      });
    }
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }
}

export const signalingClient = new SignalingClient();
