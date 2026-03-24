import type { WSContext, WSEvents } from "hono/ws";
import { addClient, removeClient } from "./docker-events";
import { streamContainerLogs } from "./docker-logs";
import { startExecSession, type ExecSession } from "./docker-exec";

interface ConnectionState {
  logCleanup?: () => void;
  execSession?: ExecSession;
}

/**
 * Per-connection state keyed by the underlying Bun WebSocket (ws.raw).
 */
const connectionState = new WeakMap<object, ConnectionState>();

const getState = (ws: WSContext): ConnectionState => {
  const key = ws.raw ?? ws;
  let state = connectionState.get(key);

  if (!state) {
    state = {};
    connectionState.set(key, state);
  }

  return state;
};

const handleLogs = (message: { type: string; containerId?: string }, ws: WSContext) => {
  const state = getState(ws);

  if (message.type === "subscribe:logs" && message.containerId) {
    state.logCleanup?.();

    state.logCleanup = streamContainerLogs(
      message.containerId,
      lines => {
        ws.send(
          JSON.stringify({
            type: "log",
            payload: { containerId: message.containerId, lines },
          }),
        );
      },
      error => {
        ws.send(
          JSON.stringify({
            type: "log:error",
            payload: { containerId: message.containerId, error: error.message },
          }),
        );
      },
    );
  }

  if (message.type === "unsubscribe:logs") {
    state.logCleanup?.();
    state.logCleanup = undefined;
  }
};

const handleExec = (
  message: { type: string; containerId?: string; data?: string; cols?: number; rows?: number },
  ws: WSContext,
) => {
  const state = getState(ws);

  if (message.type === "exec:start" && message.containerId) {
    state.execSession?.cleanup();

    startExecSession(message.containerId, ws)
      .then(session => {
        state.execSession = session;
      })
      .catch(error => {
        console.error("Failed to start exec session:", error);
        ws.send(
          JSON.stringify({
            type: "exec:error",
            error: error instanceof Error ? error.message : "Failed to start exec session",
          }),
        );
      });
  }

  if (message.type === "exec:input" && message.data) {
    state.execSession?.write(message.data);
  }

  if (message.type === "exec:resize" && message.cols && message.rows) {
    state.execSession?.resize(message.cols, message.rows);
  }
};

export const wsEvents: WSEvents = {
  onOpen(_event, ws) {
    addClient(ws);
  },
  onMessage(event, ws) {
    try {
      const message = JSON.parse(event.data as string);
      handleLogs(message, ws);
      handleExec(message, ws);
    } catch (error) {
      console.warn("Failed to handle WebSocket message:", error);
    }
  },
  onClose(_event, ws) {
    removeClient(ws);
    const state = getState(ws);
    state.logCleanup?.();
    state.execSession?.cleanup();
  },
};
