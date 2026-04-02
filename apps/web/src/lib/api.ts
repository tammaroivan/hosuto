import { hc } from "hono/client";
import type { AppType } from "@hosuto/server";

const baseUrl = import.meta.env.DEV
  ? import.meta.env.VITE_API_URL || "http://localhost:3000"
  : window.location.origin;

const client = hc<AppType>(baseUrl);

export const api = client.api;
export const wsUrl = baseUrl.replace(/^http/, "ws") + "/ws";
