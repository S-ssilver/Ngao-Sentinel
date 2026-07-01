import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, MapPin, Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { Site } from "@/lib/silverline";
import { MetricCard } from "@/components/MetricCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/sites")({
  head: () => ({
    meta: [
      { title: "Sites Management — Silverline Station" },
      { name: "description", content: "Manage protected sites and clients." },
    ],
  }),
  component: SitesPage,
});

function SitesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const { data: sites = [] } = useQuery({
    queryKey: ["sites", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sites")
        .select("*")
        .order("site_name");
      if (error) throw error;
      return data as Site[];
    },
  });

  const filtered = sites.filter((s) => {
    const q = search.toLowerCase();
    return (
      !q ||
      s.site_name.toLowerCase().includes(q) ||
      s.company_name.toLowerCase().includes(q) ||
      (s.location_code ?? "").toLowerCase().includes(q) ||
      (s.address ?? "").toLowerCase().includes(q)
    );
  });

  const total = sites.length;
  const active = sites.filter((s) => s.active).length;
  const clients = new Set(sites.map((s) => s.company_name)).size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Sites Management</h1>
        <p className="text-sm text-muted-foreground">All protected sites under contract.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Total Sites" value={total} icon={MapPin} />
        <MetricCard label="Active Sites" value={active} icon={Building2} tone="ok" />
        <MetricCard label="Clients Served" value={clients} icon={Users} tone="default" />
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search sites..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 sm:w-80"
              />
            </div>
            <Button onClick={() => setOpen(true)} className="shrink-0">
              <Plus className="mr-1 h-4 w-4" /> Add site
            </Button>
          </div>

          <div className="mt-5 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Site Name</th>
                  <th className="px-3 py-2 text-left">Company</th>
                  <th className="px-3 py-2 text-left">Code</th>
                  <th className="px-3 py-2 text-left">Address</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                      No sites found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((s) => (
                    <tr
                      key={s.id}
                      className="cursor-pointer border-t border-border transition hover:bg-muted/40"
                      onClick={() =>
                        navigate({ to: "/sites/$siteId", params: { siteId: s.id } })
                      }
                    >
                      <td className="px-3 py-2 font-medium text-primary">{s.site_name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{s.company_name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{s.location_code ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{s.address ?? "—"}</td>
                      <td className="px-3 py-2">
                        <Badge variant={s.active ? "default" : "secondary"}>
                          {s.active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AddSiteDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={() => qc.invalidateQueries({ queryKey: ["sites"] })}
      />
    </div>
  );
}

function AddSiteDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [siteName, setSiteName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [active, setActive] = useState(true);

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("sites").insert({
        site_name: siteName.trim(),
        company_name: companyName.trim(),
        location_code: code.trim() || null,
        address: address.trim() || null,
        active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Site added");
      setSiteName("");
      setCompanyName("");
      setCode("");
      setAddress("");
      setActive(true);
      onOpenChange(false);
      onCreated();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add site</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!siteName.trim() || !companyName.trim()) {
              toast.error("Site name and company are required");
              return;
            }
            mutation.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label>Site Name</Label>
            <Input value={siteName} onChange={(e) => setSiteName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Company Name</Label>
            <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Site / Location Code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="flex items-end gap-2 pb-2">
              <Checkbox
                id="active"
                checked={active}
                onCheckedChange={(v) => setActive(v === true)}
              />
              <Label htmlFor="active" className="cursor-pointer">Active</Label>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Site Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save site"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}