import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldCheck, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  addRequest,
  getRequests,
  getUsers,
  setSession,
  upsertUser,
} from "@/lib/team-store";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — ARN Security" },
      { name: "description", content: "Sign in to the ARN Security operations platform." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  // Poll access request status while pending
  useEffect(() => {
    if (!pendingId) return;
    const t = setInterval(() => {
      const req = getRequests().find((r) => r.id === pendingId);
      if (!req) return;
      if (req.status === "Approved") {
        const user =
          getUsers().find((u) => u.email.toLowerCase() === req.email.toLowerCase()) ||
          null;
        const now = new Date().toISOString();
        if (user) {
          upsertUser({ ...user, status: "Active", lastLogin: now });
          setSession({
            userId: user.id,
            role: user.role,
            name: user.name,
            email: user.email,
            siteIds: user.siteIds,
            remember,
          });
          setPendingId(null);
          const dest =
            user.role === "Guard (Field)"
              ? "/guard"
              : user.role === "Client"
                ? "/client"
                : user.role === "Supervisor"
                  ? "/supervisor"
                  : "/ops";
          navigate({ to: dest });
        }
      } else if (req.status === "Denied") {
        setPendingId(null);
        setDenied(true);
      }
    }, 800);
    return () => clearInterval(t);
  }, [pendingId, remember, navigate]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDenied(false);
    const users = getUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    const role = user?.role ?? "Supervisor";
    const req = addRequest({ name: user?.name ?? email.split("@")[0], email, role });
    setPendingId(req.id);
  }

  if (pendingId) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
        <h1 className="text-xl font-semibold">Pending Approval</h1>
        <p className="text-sm text-muted-foreground">
          Your login request has been sent to your Operations Manager for
          verification. Please wait.
        </p>
        <Button variant="ghost" size="sm" onClick={() => setPendingId(null)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-xl bg-accent text-accent-foreground">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold">ARN Security</h1>
        <p className="text-xs uppercase tracking-widest text-accent">
          Operations Platform
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={remember}
                onCheckedChange={(v) => setRemember(v === true)}
              />
              Remember me — stay signed in until I sign out
            </label>
            {denied ? (
              <p className="text-sm text-destructive">
                Access denied. Contact your Operations Manager.
              </p>
            ) : null}
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-xs text-muted-foreground">
        Powered by Silverline Tech
      </div>
      <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-muted-foreground/70">
        <ShieldCheck className="h-3 w-3" />
        Silverline
      </div>
    </div>
  );
}