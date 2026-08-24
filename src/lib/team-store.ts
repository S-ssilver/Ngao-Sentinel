// Supabase authentication + local team store.
// Authentication is handled by Supabase Auth.
// Team management data is kept in localStorage for
// the Operations dashboard's Team Management panel.
import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

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

const USERS_KEY = "arn.users";
const SESSION_KEY = "arn.session.v2";

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
  if (typeof window !== "undefined") window.dispatchEvent(new Event("arn:store"));
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  if (typeof window !== "undefined") {
    window.addEventListener("arn:store", cb);
    window.addEventListener("storage", cb);
  }
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") {
      window.removeEventListener("arn:store", cb);
      window.removeEventListener("storage", cb);
    }
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
      { id: crypto.randomUUID(), name: "Grace Wanjiru", email: "ops@arnsecurity.co.ke", role: "Operations Manager", siteIds: [], status: "Active", lastLogin: new Date().toISOString() },
      { id: crypto.randomUUID(), name: "John Kamau", email: "supervisor@arnsecurity.co.ke", role: "Supervisor", siteIds: [], status: "Active", lastLogin: null },
      { id: crypto.randomUUID(), name: "Naivas", email: "client@naivas.co.ke", role: "Client", siteIds: [], status: "Active", lastLogin: null },
    ];
    window.localStorage.setItem(USERS_KEY, JSON.stringify(seed));
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

export interface Session {
  email: string;
  role: Role;
  name: string;
  displayName: string;
  siteIds: string[];
  remember: boolean;
}

function readSessionRaw(): string | null {
  if (typeof window === "undefined") return null;
  return (
    window.localStorage.getItem(SESSION_KEY) ??
    window.sessionStorage.getItem(SESSION_KEY)
  );
}

export function getSession(): Session | null {
  const raw = readSessionRaw();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function setSession(s: Session | null) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
  window.sessionStorage.removeItem(SESSION_KEY);
  if (s) {
    const store = s.remember ? window.localStorage : window.sessionStorage;
    store.setItem(SESSION_KEY, JSON.stringify(s));
  }
  emit();
}

export async function signInWithPassword(
  email: string,
  password: string,
  remember: boolean,
) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data.user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("Profiles")
    .select("email, name, role")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return null;
  }

  const session: Session = {
    email: profile.email,
    role: profile.role as Role,
   name: profile.name ?? "User",
    displayName: `${profile.name} — ${profile.role}`,
    siteIds: [],
    remember,
  };

  setSession(session);

  return {
    ...session,
    landing:
      profile.role === "Operations Manager"
        ? "/ops"
        : profile.role === "Supervisor"
          ? "/supervisor"
          : "/client",
  };
}


export async function signOut() {
  await supabase.auth.signOut();
  setSession(null);
}

export function useSession(): Session | null {
  const raw = useSyncExternalStore(
    subscribe,
    () => readSessionRaw() ?? "",
    () => "",
  );
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function useTeamStore() {
  const users = useSyncExternalStore(
    subscribe,
    () => JSON.stringify(getUsers()),
    () => "[]",
  );
  return {
    users: JSON.parse(users) as TeamUser[],
  };
}