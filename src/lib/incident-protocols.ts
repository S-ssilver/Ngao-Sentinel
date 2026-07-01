import type { IncidentType } from "./silverline";

export interface Protocol {
  title: string;
  immediate: string[];
  followUp: string[];
  escalate: string;
}

export const INCIDENT_PROTOCOLS: Record<IncidentType, Protocol> = {
  Theft: {
    title: "Theft Response Protocol",
    immediate: [
      "Do NOT pursue or physically confront suspects — observe only.",
      "Note descriptions: clothing, height, direction of travel, vehicle plate.",
      "Secure the scene; preserve any physical evidence (do not touch).",
      "Notify site manager and dispatch immediately.",
    ],
    followUp: [
      "File a police report and record the report number.",
      "Pull CCTV footage covering 30 minutes before and after.",
      "Inventory missing items with client contact.",
    ],
    escalate: "Call local police non-emergency line; 911 if suspect is still on premises.",
  },
  "Assault/Violence": {
    title: "Assault / Violence Protocol",
    immediate: [
      "Call 911 immediately — request police and EMS.",
      "Ensure your own safety first; do not engage armed subjects.",
      "Evacuate bystanders to a safe area.",
      "Provide first aid to victims only if safe and trained.",
    ],
    followUp: [
      "Preserve the scene until law enforcement arrives.",
      "Collect witness names and statements.",
      "Complete a detailed incident report within 2 hours.",
    ],
    escalate: "911 always. Notify Operations Manager and client point-of-contact.",
  },
  Trespassing: {
    title: "Trespassing Protocol",
    immediate: [
      "Approach only if safe; identify yourself as security.",
      "Verbally instruct the individual to leave the property.",
      "Document time, location, and appearance.",
      "If refused or aggressive, retreat and call police.",
    ],
    followUp: [
      "Issue a written trespass notice if authorized.",
      "Add subject description to shift briefing.",
    ],
    escalate: "Call police if the person refuses to leave or returns.",
  },
  "Vandalism/Damage": {
    title: "Vandalism / Property Damage Protocol",
    immediate: [
      "Secure the area — do not disturb evidence.",
      "Photograph damage from multiple angles.",
      "Check surrounding areas for additional damage or suspects.",
    ],
    followUp: [
      "Notify client and facilities/maintenance.",
      "File police report for damage estimates above policy threshold.",
      "Preserve CCTV footage of the affected zone.",
    ],
    escalate: "Police if damage exceeds threshold or is repeat/targeted.",
  },
  "Medical Emergency": {
    title: "Medical Emergency Protocol",
    immediate: [
      "Call 911 immediately — give exact location and nature of emergency.",
      "Administer first aid / CPR only if trained and certified.",
      "Send a second guard to guide EMS to the scene.",
      "Clear the area of bystanders.",
    ],
    followUp: [
      "Do not move the patient unless there is imminent danger.",
      "Record time of call, EMS arrival, and disposition.",
      "Notify next of kin only through client/HR channels.",
    ],
    escalate: "911 always. Notify Operations Manager immediately.",
  },
  Fire: {
    title: "Fire Response Protocol",
    immediate: [
      "Pull the nearest fire alarm and call 911.",
      "Begin evacuation using posted routes — do not use elevators.",
      "Only attempt to fight small, contained fires with an extinguisher (PASS).",
      "Account for occupants at the muster point.",
    ],
    followUp: [
      "Do not re-enter the building until fire officials clear it.",
      "Preserve area for fire marshal investigation.",
    ],
    escalate: "911 immediately. Notify client, Ops Manager, and building engineer.",
  },
  "Equipment Failure": {
    title: "Equipment / System Failure Protocol",
    immediate: [
      "Identify the failed system (access control, CCTV, alarms, radios).",
      "Implement manual compensating controls (physical checks, log entries).",
      "Increase patrol frequency around affected zones.",
    ],
    followUp: [
      "Open a ticket with the vendor / facilities team.",
      "Document downtime start/end and any incidents during the outage.",
    ],
    escalate: "Notify Ops Manager if outage exceeds 30 minutes or affects perimeter.",
  },
  Other: {
    title: "General Incident Protocol",
    immediate: [
      "Ensure personal safety and safety of others first.",
      "Observe, record, and report — do not intervene beyond your training.",
      "Isolate the area if it poses risk to occupants.",
    ],
    followUp: [
      "Document all facts: who, what, when, where, how.",
      "Notify supervisor for guidance on next steps.",
    ],
    escalate: "Contact Operations Manager for direction. Call 911 if life/safety is at risk.",
  },
};