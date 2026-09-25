// src/lib/api.ts — helpers for /api/bridge routes: auth, JSON responses, error envelope.
import { NextResponse } from "next/server";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const err = (message: string, status = 400) => NextResponse.json({ ok: false, error: message }, { status });

/** Optional shared secret. If BRIDGE_TOKEN is set, callers must send `Authorization: Bearer <token>` or `?token=`. */
export function authorized(req: Request): boolean {
  const token = process.env.BRIDGE_TOKEN;
  if (!token) return true;
  const h = req.headers.get("authorization") ?? "";
  if (h.toLowerCase().startsWith("bearer ") && h.slice(7).trim() === token) return true;
  const url = new URL(req.url);
  return url.searchParams.get("token") === token;
}

export async function readJson<T>(req: Request): Promise<T | null> {
  try { return (await req.json()) as T; } catch { return null; }
}

export function guard(req: Request): NextResponse | null {
  return authorized(req) ? null : err("unauthorized", 401);
}
