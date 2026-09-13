"use client";

/* Tiny typed client for the admin configuration & automation BFF. */

import { adminFetch } from "@/lib/consoleKeys";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await adminFetch(path, { cache: "no-store" });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || !json.success)
    throw new Error(json?.error?.message ?? `API ${res.status}`);
  return json.data as T;
}

export async function apiSend<T>(path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown): Promise<T> {
  const res = await adminFetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || !json.success)
    throw new Error(json?.error?.message ?? `API ${res.status}`);
  return json.data as T;
}
