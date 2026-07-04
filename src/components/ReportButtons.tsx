import { useState } from "react";
import { FileDown, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { AttendanceLog, IncidentLog } from "@/lib/silverline";
import { generateReportPDF, type Range } from "@/lib/report-pdf";

type Row<T> = T & { sites: { site_name: string; company_name: string } | null };

export async function fetchReportData(
  from: Date,
  to: Date,
  siteId?: string,
): Promise<{ attendance: Row<AttendanceLog>[]; incidents: Row<IncidentLog>[] }> {
  let attQ = supabase
    .from("attendance_logs")
    .select("*, sites(site_name, company_name)")
    .gte("created_at", from.toISOString())
    .lt("created_at", to.toISOString())
    .order("created_at", { ascending: false });
  let incQ = supabase
    .from("incident_logs")
    .select("*, sites(site_name, company_name)")
    .gte("created_at", from.toISOString())
    .lt("created_at", to.toISOString())
    .order("created_at", { ascending: false });
  if (siteId) {
    attQ = attQ.eq("site_id", siteId);
    incQ = incQ.eq("site_id", siteId);
  }
  const [a, i] = await Promise.all([attQ, incQ]);
  if (a.error) throw a.error;
  if (i.error) throw i.error;
  return {
    attendance: (a.data ?? []) as Row<AttendanceLog>[],
    incidents: (i.data ?? []) as Row<IncidentLog>[],
  };
}

export function ReportButtons({
  scope,
  siteId,
  siteName,
  companyName,
}: {
  scope: "client" | "site";
  siteId?: string;
  siteName?: string;
  companyName?: string;
  title?: string;
}) {
  const [loading, setLoading] = useState<Range | null>(null);

  async function run(range: Range) {
    setLoading(range);
    try {
      const now = new Date();
      const from = new Date(now);
      if (range === "week") from.setDate(now.getDate() - 7);
      else from.setMonth(now.getMonth() - 1);
      const { attendance, incidents } = await fetchReportData(
        from, now, scope === "site" ? siteId : undefined,
      );

      let prevAtt, prevInc;
      if (range === "month") {
        const prevTo = new Date(from);
        const prevFrom = new Date(from);
        prevFrom.setMonth(prevFrom.getMonth() - 1);
        const prev = await fetchReportData(prevFrom, prevTo, scope === "site" ? siteId : undefined);
        prevAtt = prev.attendance;
        prevInc = prev.incidents;
      }

      generateReportPDF({
        siteName: siteName ?? (scope === "client" ? "Client Portfolio" : "Site"),
        companyName,
        range,
        from, to: now,
        attendance, incidents,
        prevAttendance: prevAtt,
        prevIncidents: prevInc,
      });
      toast.success(`${range === "week" ? "Weekly" : "Monthly"} report downloaded`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs text-primary">
        <ShieldCheck className="h-3.5 w-3.5" />
        Verified Proof of Service
      </div>
      <Button variant="outline" size="sm" onClick={() => run("week")} disabled={loading !== null}>
        <FileDown className="mr-1.5 h-4 w-4" />
        {loading === "week" ? "Generating..." : "Download Weekly Report"}
      </Button>
      <Button variant="outline" size="sm" onClick={() => run("month")} disabled={loading !== null}>
        <FileDown className="mr-1.5 h-4 w-4" />
        {loading === "month" ? "Generating..." : "Download Monthly Report"}
      </Button>
    </div>
  );
}