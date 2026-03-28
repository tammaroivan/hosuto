import React from "react";
import { WebSocketContext, WebSocketContextValue } from "../contexts/WebSocketContext";

export const useWebSocket = (): WebSocketContextValue => {
  const context = React.useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within WebSocketProvider");
  }

  return context;
};
