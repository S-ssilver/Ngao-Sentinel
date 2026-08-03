import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { signOut, useSession } from "@/lib/team-store";
import ngaoLogo from "@/assets/ngao-logo.png.asset.json";

import type { Role } from "@/lib/team-store";

const navItems = [
  { to: "/ops", label: "Operations", role: "Operations Manager" },
  { to: "/client", label: "Client Portal", role: "Client" },
  { to: "/supervisor", label: "Supervisor", role: "Supervisor" },
] as const satisfies ReadonlyArray<{ to: string; label: string; role: Role }>;

const PROTECTED_PREFIXES = ["/ops", "/supervisor", "/client", "/guard", "/sites"];

export function AppShell({ children }: { children: ReactNode }) {
  const session = useSession();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  const visibleNavItems = session
    ? navItems.filter((item) => item.role === session.role)
    : [];

  useEffect(() => {
    if (isProtected && !session) {
      navigate({ to: "/auth" });
    }
  }, [isProtected, session, navigate]);

  return (
    <div className="flex min-h-screen flex-col text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link to="/ops" className="flex items-center gap-2 shrink-0">
            <img
              src={ngaoLogo.url}
              alt="NGAO logo"
              className="h-10 w-10 object-contain"
            />
            <div className="min-w-0">
              <div className="text-sm font-semibold tracking-wide text-gradient">
                NGAO SENTINEL
              </div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Sentinel Platform
              </div>
            </div>
          </Link>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <nav className="flex flex-wrap gap-1 overflow-x-auto">
              {visibleNavItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-full px-3.5 py-1.5 text-sm font-medium text-foreground/70 transition-all hover:bg-white/5 hover:text-foreground"
                  activeProps={{
                    className:
                      "rounded-full px-3.5 py-1.5 text-sm font-medium bg-gradient-to-r from-primary/25 to-accent/20 text-foreground ring-1 ring-primary/40 shadow-[0_0_20px_-8px] shadow-primary/60",
                  }}
                  activeOptions={{ exact: false }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            {session ? (
              <div className="flex items-center gap-2">
                <div className="hidden text-right sm:block">
                  <div className="text-xs font-semibold text-foreground">
                    {session.name}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-accent">
                    {session.role}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1 text-xs"
                  onClick={() => {
                    signOut();
                    navigate({ to: "/auth" });
                  }}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <footer className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        Powered by Silverline Tech
      </footer>
    </div>
  );
}