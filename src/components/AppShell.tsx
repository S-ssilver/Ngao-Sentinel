import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

const navItems = [
  { to: "/ops", label: "Operations" },
  { to: "/client", label: "Client Portal" },
  { to: "/supervisor", label: "Supervisor" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link to="/ops" className="flex items-center gap-2 shrink-0">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[0_0_24px_-4px] shadow-primary/60">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold tracking-wide text-gradient">
                ARN SECURITY
              </div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Operations Platform
              </div>
            </div>
          </Link>
          <nav className="flex flex-wrap gap-1 overflow-x-auto">
            {navItems.map((item) => (
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
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <footer className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        Powered by Silverline Tech
      </footer>
    </div>
  );
}