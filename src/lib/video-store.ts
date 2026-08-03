// Footage access store: tracks archive retrieval requests and "ready" notifications.
// Purely front-end simulation, persisted in localStorage.
import { useEffect, useState, useSyncExternalStore } from "react";

export const HOT_DAYS = 7;
export const RETENTION_DAYS = 365;

export type RetrievalStatus = "pending" | "ready";

export interface Retrieval {
  id: string;
  incidentId: string;
  label: string;
  date: string; // ISO date requested
  status: RetrievalStatus;
  requestedAt: number;
  readyAt: number | null;
  expiresAt: number | null;
  seen: boolean;
}

const KEY = "ngao.retrievals.v1";
// Demo timing: "5-10 minutes" in copy, ready quickly so the flow is visible.
const READY_AFTER_MS = 8000;
const ACCESS_WINDOW_MS = 60 * 60 * 1000;

let retrievals: Retrieval[] = [];
const listeners = new Set<() => void>();
let loaded = false;

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) retrievals = JSON.parse(raw) as Retrieval[];
  } catch {
    retrievals = [];
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(retrievals));
  } catch {
    /* ignore */
  }
}

function emit() {
  persist();
  listeners.forEach((l) => l());
}

function tick() {
  const now = Date.now();
  let changed = false;
  retrievals = retrievals.map((r) => {
    if (r.status === "pending" && now - r.requestedAt >= READY_AFTER_MS) {
      changed = true;
      return { ...r, status: "ready", readyAt: now, expiresAt: now + ACCESS_WINDOW_MS };
    }
    return r;
  });
  if (changed) emit();
}

export function isHot(date: Date) {
  const cutoff = Date.now() - HOT_DAYS * 24 * 60 * 60 * 1000;
  return date.getTime() >= cutoff;
}

export function requestRetrieval(incidentId: string, label: string, date: string) {
  load();
  const existing = retrievals.find((r) => r.incidentId === incidentId && r.date === date);
  if (existing) return existing;
  const rec: Retrieval = {
    id: `${incidentId}-${date}`,
    incidentId,
    label,
    date,
    status: "pending",
    requestedAt: Date.now(),
    readyAt: null,
    expiresAt: null,
    seen: false,
  };
  retrievals = [rec, ...retrievals];
  emit();
  return rec;
}

export function markSeen(id: string) {
  load();
  retrievals = retrievals.map((r) => (r.id === id ? { ...r, seen: true } : r));
  emit();
}

export function markAllSeen() {
  load();
  retrievals = retrievals.map((r) => (r.status === "ready" ? { ...r, seen: true } : r));
  emit();
}

function subscribe(cb: () => void) {
  load();
  listeners.add(cb);
  const timer = window.setInterval(tick, 1000);
  return () => {
    listeners.delete(cb);
    window.clearInterval(timer);
  };
}

function snapshot() {
  load();
  return retrievals;
}

export function useRetrievals() {
  const list = useSyncExternalStore(subscribe, snapshot, () => [] as Retrieval[]);
  const unseenReady = list.filter((r) => r.status === "ready" && !r.seen);
  return { retrievals: list, unseenReady };
}

export function useRetrieval(incidentId: string | null, date: string | null) {
  const { retrievals: list } = useRetrievals();
  if (!incidentId || !date) return null;
  return list.find((r) => r.incidentId === incidentId && r.date === date) ?? null;
}

/** Minutes remaining in an access window, floored at 0. */
export function minutesLeft(expiresAt: number | null) {
  if (!expiresAt) return 0;
  return Math.max(0, Math.floor((expiresAt - Date.now()) / 60000));
}

/** True when the browser reports a cellular connection. */
export function useOnCellular() {
  const [cellular, setCellular] = useState(false);
  useEffect(() => {
    const nav = navigator as Navigator & {
      connection?: { type?: string; effectiveType?: string; addEventListener?: (e: string, cb: () => void) => void; removeEventListener?: (e: string, cb: () => void) => void };
    };
    const conn = nav.connection;
    if (!conn) return;
    const read = () => setCellular(conn.type === "cellular");
    read();
    conn.addEventListener?.("change", read);
    return () => conn.removeEventListener?.("change", read);
  }, []);
  return cellular;
}