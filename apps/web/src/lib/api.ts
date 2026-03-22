import { hc } from "hono/client";
import type { AppType } from "@hosuto/server";

const client = hc<AppType>(import.meta.env.DEV ? "http://localhost:3000" : window.location.origin);

export const api = client.api;
