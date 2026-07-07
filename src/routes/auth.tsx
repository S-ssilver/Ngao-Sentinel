import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { getSession, signInWithPassword } from "@/lib/team-store";

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
  const [error, setError] = useState<string | null>(null);

  // If already signed in, jump straight to the right dashboard.
  useEffect(() => {
    const s = getSession();
    if (!s) return;
    const dest =
      s.role === "Client"
        ? "/client"
        : s.role === "Supervisor"
          ? "/supervisor"
          : s.role === "Guard (Field)"
            ? "/guard"
            : "/ops";
    navigate({ to: dest });
  }, [navigate]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const acc = signInWithPassword(email, password, remember);
    if (!acc) {
      setError("Incorrect email or password. Please try again.");
      return;
    }
    setError(null);
    navigate({ to: acc.landing });
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
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
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