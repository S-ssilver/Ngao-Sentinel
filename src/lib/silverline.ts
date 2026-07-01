export const SHIFT_TYPES = ["Day", "Night"] as const;
export type ShiftType = (typeof SHIFT_TYPES)[number];

export const ATTENDANCE_STATUSES = [
  "Present",
  "Absent",
  "Late",
  "Replacement Required",
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const INCIDENT_TYPES = [
  "Theft",
  "Assault/Violence",
  "Trespassing",
  "Vandalism/Damage",
  "Medical Emergency",
  "Fire",
  "Equipment Failure",
  "Other",
] as const;
export type IncidentType = (typeof INCIDENT_TYPES)[number];

export const SEVERITIES = ["Low", "Medium", "High"] as const;
export type Severity = (typeof SEVERITIES)[number];

export interface Site {
  id: string;
  site_name: string;
  company_name: string;
  active: boolean;
  location_code: string | null;
  address: string | null;
  created_at: string;
}

export interface AttendanceLog {
  id: string;
  site_id: string;
  guard_name: string;
  shift_type: ShiftType;
  status: AttendanceStatus;
  notes: string | null;
  reported_by: string | null;
  created_at: string;
}

export interface IncidentLog {
  id: string;
  site_id: string;
  incident_type: IncidentType;
  other_type: string | null;
  severity: Severity;
  description: string | null;
  resolved: boolean;
  reported_by: string | null;
  created_at: string;
}

export function statusTone(status: AttendanceStatus) {
  switch (status) {
    case "Present":
      return "bg-[oklch(0.72_0.16_160/0.2)] text-[oklch(0.82_0.16_160)] border-[oklch(0.72_0.16_160/0.4)]";
    case "Absent":
      return "bg-destructive/20 text-destructive border-destructive/40";
    case "Late":
      return "bg-[oklch(0.78_0.16_85/0.2)] text-[oklch(0.85_0.16_85)] border-[oklch(0.78_0.16_85/0.4)]";
    case "Replacement Required":
      return "bg-primary/20 text-primary border-primary/40";
  }
}

export function severityTone(s: Severity) {
  switch (s) {
    case "Low":
      return "bg-[oklch(0.72_0.16_160/0.2)] text-[oklch(0.82_0.16_160)] border-[oklch(0.72_0.16_160/0.4)]";
    case "Medium":
      return "bg-[oklch(0.78_0.16_85/0.2)] text-[oklch(0.85_0.16_85)] border-[oklch(0.78_0.16_85/0.4)]";
    case "High":
      return "bg-destructive/20 text-destructive border-destructive/40";
  }
}