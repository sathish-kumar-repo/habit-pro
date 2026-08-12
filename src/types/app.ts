/**
 * @file app.ts
 * @description Shared application-level types and constants used across all feature modules.
 * @author Sathish Kumar
 */

export const FILTERS = [
  { id: "ongoing", label: "In motion" },
  { id: "upcoming", label: "Upcoming" },
  { id: "pending", label: "Lapsed" },
  { id: "finished", label: "Completed" },
] as const;

export type FilterId = (typeof FILTERS)[number]["id"];
export type AppTab = "today" | "habits" | "progress" | "todos" | "journal";
export type ProgressRange = "7d" | "30d" | "all";
export type ProgressSort = "pct" | "streak" | "name";
