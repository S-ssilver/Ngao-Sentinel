import { Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import type { ReactNode } from "react";

const navItems = [
  { to: "/", label: "Operations" },
  { to: "/sites", label: "Sites" },
  { to: "/client", label: "Client Portal" },
  { to: "/supervisor", label: "Supervisor" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-sidebar/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Shield className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold tracking-wide">SILVERLINE STATION</div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Security Operations
              </div>
            </div>
          </Link>
          <nav className="flex flex-wrap gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{
                  className:
                    "rounded-md px-3 py-1.5 text-sm font-medium bg-secondary text-foreground",
                }}
                activeOptions={{ exact: item.to === "/" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}