import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  FileText,
  Phone,
  HelpCircle,
  BarChart3,
  BookOpen,
  UserCheck,
  Camera,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import ngaoLogo from "@/assets/ngao-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NGAO Sentinel Platform" },
      {
        name: "description",
        content:
          "Real-time security intelligence for every site you protect. Incident management, proof of service reports, SOP guidance and digital guard attendance.",
      },
      { property: "og:title", content: "NGAO Sentinel Platform" },
      {
        property: "og:description",
        content:
          "Real-time security intelligence for every site you protect.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <Hero />
      <ProblemSection />
      <DeliverySection />
      <SentinelCamTeaser />
      <RolePreviews />
      <RequestAccessForm />
      <SiteFooter />
    </div>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-accent/30 bg-primary/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <img src={ngaoLogo.url} alt="NGAO logo" className="h-10 w-10 object-contain" />
          <div>
            <div className="text-sm font-semibold tracking-wide text-primary-foreground">
              NGAO SENTINEL
            </div>
            <div className="text-[11px] uppercase tracking-widest text-accent">
              Sentinel Platform
            </div>
          </div>
        </div>
        <Link
          to="/auth"
          className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-foreground transition hover:bg-accent/90"
        >
          Sign In
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="border-b border-accent/20 bg-primary text-primary-foreground">
      <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-28">
        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
          NGAO —{" "}
          <span className="text-accent">Sentinel Platform</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-primary-foreground/80 sm:text-lg">
          Real-time security intelligence for every site you protect.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/auth"
            className="inline-flex h-11 items-center rounded-md bg-accent px-6 text-sm font-semibold text-accent-foreground transition hover:bg-accent/90"
          >
            Sign In to Dashboard
          </Link>
          <a
            href="#request-access"
            className="inline-flex h-11 items-center rounded-md border border-accent px-6 text-sm font-semibold text-accent transition hover:bg-accent hover:text-accent-foreground"
          >
            Request Access
          </a>
        </div>
      </div>
    </section>
  );
}

function ProblemSection() {
  const items = [
    {
      icon: FileText,
      text: "Still using occurrence books? Incidents get lost, clients stay in the dark.",
    },
    {
      icon: Phone,
      text: "Constant calls to the office? Your ops team shouldn't need to chase updates by phone.",
    },
    {
      icon: HelpCircle,
      text: "Can't prove your team responded? One incident without documentation is a liability.",
    },
  ];
  return (
    <section className="border-b border-border py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="mb-10 text-center text-2xl font-bold sm:text-3xl">
          The Problem
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {items.map(({ icon: Icon, text }, i) => (
            <Card key={i} className="border-border/70">
              <CardContent className="flex flex-col items-start gap-3 p-6">
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-accent/15 text-accent">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="text-sm leading-relaxed">{text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function DeliverySection() {
  const rows = [
    {
      icon: ShieldCheck,
      heading: "Real-time Incident Management",
      text: "Supervisors log incidents in seconds. Operations managers see everything across every site — no phone calls required.",
    },
    {
      icon: BarChart3,
      heading: "Proof of Service Reports",
      text: "Automated weekly and monthly PDF reports, branded to your company. Give your clients the visibility that justifies your contract.",
    },
    {
      icon: BookOpen,
      heading: "Emergency Guidance Built In",
      text: "When a supervisor faces an incident and the office can't be reached, the platform shows your approved response protocol immediately — the right action, every time.",
    },
    {
      icon: UserCheck,
      heading: "Guard Attendance, Digitised",
      text: "Track every guard across every shift. Know instantly who is present, absent, late, or needs replacement — before your client calls to ask.",
    },
  ];
  return (
    <section className="border-b border-border bg-card/40 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="mb-12 text-center text-2xl font-bold sm:text-3xl">
          What Silverline Delivers
        </h2>
        <div className="space-y-12">
          {rows.map(({ icon: Icon, heading, text }, i) => {
            const iconLeft = i % 2 === 0;
            return (
              <div
                key={heading}
                className="grid items-center gap-6 md:grid-cols-2 md:gap-12"
              >
                <div
                  className={`flex justify-center ${iconLeft ? "md:order-1" : "md:order-2"}`}
                >
                  <span className="grid h-24 w-24 place-items-center rounded-2xl bg-accent/15 text-accent">
                    <Icon className="h-12 w-12" />
                  </span>
                </div>
                <div className={iconLeft ? "md:order-2" : "md:order-1"}>
                  <h3 className="text-xl font-semibold text-accent">
                    {heading}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/85">
                    {text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SentinelCamTeaser() {
  const [joined, setJoined] = useState(false);
  return (
    <section
      id="sentinelcam"
      className="border-b border-accent/20 bg-primary py-20 text-primary-foreground"
    >
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-accent">
          Coming Soon
        </div>
        <div className="mt-3 flex justify-center">
          <span className="grid h-14 w-14 place-items-center rounded-xl bg-accent/15 text-accent">
            <Camera className="h-7 w-7" />
          </span>
        </div>
        <h2 className="mt-4 text-2xl font-bold sm:text-3xl">
          SentinelCam — AI-Powered Assault Detection
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-primary-foreground/80 sm:text-base">
          The next phase of NGAO's security intelligence platform. Offline
          edge-AI body cameras that detect threats in real time — no cellular
          data required. Built for Africa.
        </p>
        <div className="mt-6">
          <Button
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => {
              setJoined(true);
              toast.success("Thank you — we'll be in touch");
            }}
          >
            {joined ? "You're on the list" : "Join the Waitlist"}
          </Button>
        </div>
        <p className="mt-4 text-xs text-primary-foreground/60">
          SentinelCam is currently in development. Powered by Silverline Tech.
        </p>
      </div>
    </section>
  );
}

function RolePreviews() {
  const roles = [
    {
      title: "For Operations Managers",
      text: "Full visibility across all sites. Real-time alerts. Intelligence reports that flag problems before they escalate.",
    },
    {
      title: "For Supervisors",
      text: "Log incidents in under 60 seconds. Get immediate SOP guidance. No paperwork, no delays.",
    },
    {
      title: "For Your Clients",
      text: "A professional dashboard showing exactly what your security team is doing — building trust and justifying your contract every month.",
    },
  ];
  return (
    <section className="border-b border-border py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="mb-10 text-center text-2xl font-bold sm:text-3xl">
          Built for Every Role
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {roles.map((r) => (
            <Card key={r.title} className="border-accent/30">
              <CardContent className="p-6">
                <div className="text-sm font-semibold text-accent">
                  {r.title}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-foreground/85">
                  {r.text}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function RequestAccessForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <section
      id="request-access"
      className="border-b border-border bg-card/40 py-16 sm:py-20"
    >
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">
          Request Access
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">
          We onboard security companies directly. Fill in your details and our
          team will be in touch.
        </p>
        <Card className="mt-8">
          <CardContent className="p-6">
            {submitted ? (
              <div className="rounded-md border border-accent/40 bg-accent/10 p-6 text-center">
                <ShieldCheck className="mx-auto h-8 w-8 text-accent" />
                <p className="mt-3 text-sm font-medium">
                  Thank you — NGAO will be in touch within 24 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="company" label="Company Name" required />
                  <Field id="name" label="Your Name" required />
                  <Field id="role" label="Your Role" required />
                  <Field id="email" label="Email Address" type="email" required />
                  <Field id="phone" label="Phone Number" required />
                  <Field
                    id="sites"
                    label="Number of Sites"
                    type="number"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="message">Message (optional)</Label>
                  <Textarea id="message" name="message" rows={4} />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  Submit Request
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function Field({
  id,
  label,
  type = "text",
  required,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type={type} required={required} />
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="bg-primary py-8 text-primary-foreground">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-xs sm:flex-row sm:px-6">
        <div className="flex items-center gap-2">
          <img src={ngaoLogo.url} alt="NGAO logo" className="h-7 w-7 object-contain" />
          <span>© 2026 NGAO. All rights reserved.</span>
        </div>
        <nav className="flex gap-4 text-primary-foreground/80">
          <a href="#" className="hover:text-accent">
            Features
          </a>
          <Link to="/auth" className="hover:text-accent">
            Sign In
          </Link>
          <a href="#request-access" className="hover:text-accent">
            Request Access
          </a>
        </nav>
        <div className="text-primary-foreground/70">
          Powered by Silverline Tech
        </div>
      </div>
    </footer>
  );
}