// Local mock team + access-request store (localStorage). No real auth.
import { useSyncExternalStore } from "react";

export type Role = "Operations Manager" | "Supervisor" | "Client" | "Guard (Field)";
export type UserStatus = "Active" | "Pending" | "Suspended";

export interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  siteIds: string[];
  status: UserStatus;
  lastLogin: string | null;
}

export interface AccessRequest {
  id: string;
  name: string;
  email: string;
  role: Role;
  requestedAt: string;
  status: "Pending" | "Approved" | "Denied";
}

const USERS_KEY = "arn.users";
const REQ_KEY = "arn.access_requests";
const SESSION_KEY = "arn.session";

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
  if (typeof window !== "undefined") window.dispatchEvent(new Event("arn:store"));
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  if (typeof window !== "undefined") window.addEventListener("arn:store", cb);
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") window.removeEventListener("arn:store", cb);
  };
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, val: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(val));
  emit();
}

function seedIfEmpty() {
  if (typeof window === "undefined") return;
  if (!window.localStorage.getItem(USERS_KEY)) {
    const seed: TeamUser[] = [
      { id: crypto.randomUUID(), name: "Alex Ops", email: "alex@arn.security", role: "Operations Manager", siteIds: [], status: "Active", lastLogin: new Date().toISOString() },
      { id: crypto.randomUUID(), name: "Priya Supervisor", email: "priya@arn.security", role: "Supervisor", siteIds: [], status: "Active", lastLogin: null },
      { id: crypto.randomUUID(), name: "Client Contact", email: "client@site.com", role: "Client", siteIds: [], status: "Active", lastLogin: null },
    ];
    window.localStorage.setItem(USERS_KEY, JSON.stringify(seed));
  }
  if (!window.localStorage.getItem(REQ_KEY)) {
    window.localStorage.setItem(REQ_KEY, JSON.stringify([]));
  }
}

export function getUsers(): TeamUser[] {
  seedIfEmpty();
  return read<TeamUser[]>(USERS_KEY, []);
}
export function saveUsers(u: TeamUser[]) {
  write(USERS_KEY, u);
}
export function upsertUser(u: TeamUser) {
  const list = getUsers();
  const i = list.findIndex((x) => x.id === u.id);
  if (i >= 0) list[i] = u;
  else list.push(u);
  saveUsers(list);
}
export function removeUser(id: string) {
  saveUsers(getUsers().filter((u) => u.id !== id));
}

export function getRequests(): AccessRequest[] {
  seedIfEmpty();
  return read<AccessRequest[]>(REQ_KEY, []);
}
export function addRequest(r: Omit<AccessRequest, "id" | "requestedAt" | "status">) {
  const list = getRequests();
  const req: AccessRequest = {
    ...r,
    id: crypto.randomUUID(),
    requestedAt: new Date().toISOString(),
    status: "Pending",
  };
  list.unshift(req);
  write(REQ_KEY, list);
  return req;
}
export function updateRequest(id: string, status: "Approved" | "Denied") {
  const list = getRequests().map((r) => (r.id === id ? { ...r, status } : r));
  write(REQ_KEY, list);
}

export interface Session {
  userId: string;
  role: Role;
  name: string;
  email: string;
  siteIds: string[];
  remember: boolean;
}
export function getSession(): Session | null {
  return read<Session | null>(SESSION_KEY, null);
}
export function setSession(s: Session | null) {
  if (typeof window === "undefined") return;
  if (s) window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else window.localStorage.removeItem(SESSION_KEY);
  emit();
}

export function useTeamStore() {
  const users = useSyncExternalStore(subscribe, () => JSON.stringify(getUsers()), () => "[]");
  const requests = useSyncExternalStore(subscribe, () => JSON.stringify(getRequests()), () => "[]");
  return {
    users: JSON.parse(users) as TeamUser[],
    requests: JSON.parse(requests) as AccessRequest[],
  };
}