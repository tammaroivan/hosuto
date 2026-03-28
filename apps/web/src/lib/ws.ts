import type { WSMessage } from "@hosuto/shared";
import { wsUrl } from "./api";

export type { WSMessage };

type MessageHandler = (message: WSMessage) => void;

const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 30000;

let socket: WebSocket | null = null;
let retries = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const handlers = new Set<MessageHandler>();
const statusListeners = new Set<(status: "connected" | "connecting" | "disconnected") => void>();

const notifyStatus = (status: "connected" | "connecting" | "disconnected") => {
  for (const listener of statusListeners) {
    listener(status);
  }
};

const connect = () => {
  if (socket) {
    socket.onclose = null;
    socket.close();
  }

  notifyStatus("connecting");
  const ws = new WebSocket(wsUrl);
  socket = ws;

  ws.onopen = () => {
    retries = 0;
    notifyStatus("connected");
  };

  ws.onmessage = event => {
    try {
      const message = JSON.parse(event.data) as WSMessage;
      for (const handler of handlers) {
        handler(message);
      }
    } catch {
      // ignore non-JSON messages
    }
  };

  ws.onclose = () => {
    notifyStatus("disconnected");
    const delay = Math.min(RECONNECT_BASE_DELAY * Math.pow(2, retries), RECONNECT_MAX_DELAY);
    retries++;
    reconnectTimer = setTimeout(connect, delay);
  };

  ws.onerror = () => {};
};

export const wsManager = {
  start: () => {
    if (!socket) {
      connect();
    }
  },

  stop: () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (socket) {
      socket.onclose = null;
      socket.close();
      socket = null;
    }
  },

  send: (message: object) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  },

  onMessage: (handler: MessageHandler) => {
    handlers.add(handler);
    return () => {
      handlers.delete(handler);
    };
  },

  onStatus: (listener: (status: "connected" | "connecting" | "disconnected") => void) => {
    statusListeners.add(listener);
    return () => {
      statusListeners.delete(listener);
    };
  },
};
