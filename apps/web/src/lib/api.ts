import { hc } from "hono/client";
import type { AppType } from "@hosuto/server";

export const api = hc<AppType>(
  import.meta.env.DEV ? "http://localhost:3000" : window.location.origin,
);
