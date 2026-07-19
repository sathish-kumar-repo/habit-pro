import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { z } from "zod";
import { db } from "./firebase";

// Track entry mirrors the Flutter app: [done, note, Timestamp]
export type TrackEntry = { done: boolean; note: string; date: Date };

export type Habit = {
  id: string;
  name: string;
  description: string;
  plan: string;
  startDate: string; // unpadded yyyy-m-d (matches Flutter app)
  endDate: string;
  track: Record<string, TrackEntry>;
  color: string;
  icon: string;
  createdAt: number;
};

// ---------- Validation ----------

export const habitSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .max(60, "Name must be 60 characters or less")
      .transform((v) => v.trim()),
    description: z
      .string()
      .max(200, "Description must be 200 characters or less")
      .transform((v) => v.trim()),
    plan: z
      .string()
      .max(500, "Plan must be 500 characters or less")
      .transform((v) => v.trim()),
    start: z.date({ message: "Start date is required" }),
    end: z.date({ message: "End date is required" }),
    color: z.string().min(1),
    icon: z.string().min(1).default("Star"),
  })
  .refine((d) => d.end >= d.start, {
    message: "End date must be on or after start date",
    path: ["end"],
  });

export type HabitFormValues = z.infer<typeof habitSchema>;

export const DATE_PRESETS = [
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "21 days", days: 21 },
  { label: "30 days", days: 30 },
  { label: "60 days", days: 60 },
  { label: "90 days", days: 90 },
  { label: "120 days", days: 120 },
  { label: "180 Days", days: 180 },
  { label: "365 Days", days: 365 },
] as const;

export const COLORS = [
  // Emerald / Sage
  "#20A973",
  "#2DA796",
  "#578E57",
  "#6FAF8F",

  // Teal / Ocean
  "#319DC4",
  "#3E8FB0",
  "#4AA3A2",
  "#5DA9E9",

  // Indigo / Violet
  "#7F52E0",
  "#6D5BD0",
  "#8B6BE8",
  "#5B4BC4",

  // Rose / Editorial
  "#CE3475",
  "#C94F7C",
  "#D46A92",
  "#B93C68",

  // Warm Sunset
  "#E48068",
  "#D96C5F",
  "#C96A4A",
  "#F08A5D",

  // Gold / Amber
  "#E4A12B",
  "#D4A017",
  "#C7922F",
  "#F2B84B",

  // Elegant Muted
  "#7A8C99",
  "#6B7280",
  "#8B7E74",
  "#7C6F64",

  // Deep Premium
  "#4C5B70",
  "#5A4E7C",
  "#3F6B68",
  "#6A5A4D",
];

/**
 * Matches the Flutter app's `getFormattedDate`: `${year}-${month}-${day}`
 * (NOT zero-padded). We must keep this exact format so docs interoperate
 * with the existing Firestore data.
 */
export function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function fmtDateInput(d: Date): string {
  // For <input type="date"> which requires zero-padded ISO format
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseInputDate(iso: string): Date {
  // iso is yyyy-mm-dd from <input type="date">
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function today(): string {
  return fmtDate(new Date());
}

export function eachDay(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function buildTrack(start: Date, end: Date): Habit["track"] {
  const t: Habit["track"] = {};
  for (const day of eachDay(start, end)) {
    t[fmtDate(day)] = { done: false, note: "", date: day };
  }
  return t;
}

export function progress(habit: Habit) {
  const days = Object.values(habit.track);
  const done = days.filter((d) => d.done).length;
  return { done, total: days.length, pct: days.length ? done / days.length : 0 };
}

export function sortedTrackKeys(habit: Habit): string[] {
  return Object.keys(habit.track).sort(
    (a, b) => habit.track[a].date.getTime() - habit.track[b].date.getTime(),
  );
}

export function streak(habit: Habit): number {
  const keys = sortedTrackKeys(habit);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  let s = 0;
  for (let i = keys.length - 1; i >= 0; i--) {
    const entry = habit.track[keys[i]];
    if (entry.date > now) continue;
    if (entry.done) s++;
    else break;
  }
  return s;
}

export function classify(habit: Habit): "ongoing" | "upcoming" | "finished" | "pending" {
  const values = Object.values(habit.track);
  if (values.length === 0) return "upcoming";
  const allDone = values.every((v) => v.done);
  if (allDone) return "finished";
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const allFuture = values.every((v) => {
    const d = new Date(v.date);
    d.setHours(0, 0, 0, 0);
    return d > now;
  });
  if (allFuture) return "upcoming";
  const allPast = values.every((v) => {
    const d = new Date(v.date);
    d.setHours(0, 0, 0, 0);
    return d < now;
  });
  const anyUndone = values.some((v) => !v.done);
  if (allPast && anyUndone) return "pending";
  return "ongoing";
}

// ---------- Firestore path helpers ----------

/**
 * Returns the Firestore collection reference for the authenticated user's
 * habits. Data lives at `users/{uid}/challenge/{habitId}` so each user's
 * habits are fully isolated from every other user's.
 */
function habitsCol(uid: string) {
  return collection(db, "users", uid, "challenge");
}

function habitDoc(uid: string, habitId: string) {
  return doc(db, "users", uid, "challenge", habitId);
}

// ---------- Firestore wire types ----------

type FirestoreTrack = Record<
  string,
  [boolean, string, Timestamp] | { 0: boolean; 1: string; 2: Timestamp }
>;

type FirestoreChallenge = {
  id: string;
  myChallenge: string;
  description: string;
  myPlan: string;
  challengeStartDate: Timestamp;
  challengeEndDate: Timestamp;
  track: FirestoreTrack;
  color?: string;
  icon?: string;
  createdAt?: number;
};

function readTrackTuple(val: unknown): [boolean, string, Timestamp] | null {
  if (Array.isArray(val) && val.length >= 3) {
    return [Boolean(val[0]), String(val[1] ?? ""), val[2] as Timestamp];
  }
  if (val && typeof val === "object") {
    const obj = val as Record<string, unknown>;
    if ("0" in obj && "2" in obj) {
      return [Boolean(obj["0"]), String(obj["1"] ?? ""), obj["2"] as Timestamp];
    }
  }
  return null;
}

function fromFirestore(id: string, data: FirestoreChallenge): Habit {
  const track: Habit["track"] = {};
  const entries = Object.entries(data.track ?? {})
    .map(([k, v]) => {
      const tuple = readTrackTuple(v);
      if (!tuple) return null;
      const [done, note, ts] = tuple;
      const date = ts?.toDate ? ts.toDate() : new Date();
      return { k, entry: { done, note, date } };
    })
    .filter((x): x is { k: string; entry: TrackEntry } => x !== null)
    .sort((a, b) => a.entry.date.getTime() - b.entry.date.getTime());
  for (const { k, entry } of entries) track[k] = entry;

  const start = data.challengeStartDate?.toDate?.() ?? new Date();
  const end = data.challengeEndDate?.toDate?.() ?? new Date();

  return {
    id: data.id ?? id,
    name: data.myChallenge ?? "",
    description: data.description ?? "",
    plan: data.myPlan ?? "",
    startDate: fmtDate(start),
    endDate: fmtDate(end),
    track,
    color: data.color ?? COLORS[0],
    icon: data.icon ?? "Star",
    createdAt: data.createdAt ?? Date.now(),
  };
}

function toFirestoreTrack(track: Habit["track"]): FirestoreTrack {
  const out: FirestoreTrack = {};
  for (const [k, v] of Object.entries(track)) {
    out[k] = [v.done, v.note ?? "", Timestamp.fromDate(v.date)];
  }
  return out;
}

// ---------- Firestore service — all functions require the user's uid ----------

/**
 * Subscribes to the authenticated user's habits in real time.
 * Returns an unsubscribe function to be called on component unmount.
 */
export function subscribeHabits(
  uid: string,
  cb: (habits: Habit[]) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    habitsCol(uid),
    (snap) => {
      const list = snap.docs.map((d) => fromFirestore(d.id, d.data() as FirestoreChallenge));
      cb(list);
    },
    (err) => {
      console.error("[habits] snapshot error:", err);
      onError?.(err);
    },
  );
}

export async function createHabit(
  uid: string,
  input: {
    name: string;
    description: string;
    plan: string;
    start: Date;
    end: Date;
    color: string;
    icon: string;
  },
): Promise<void> {
  const id = crypto.randomUUID();
  const track = buildTrack(input.start, input.end);
  const payload: FirestoreChallenge = {
    id,
    myChallenge: input.name,
    description: input.description,
    myPlan: input.plan,
    challengeStartDate: Timestamp.fromDate(input.start),
    challengeEndDate: Timestamp.fromDate(input.end),
    track: toFirestoreTrack(track),
    color: input.color,
    icon: input.icon,
    createdAt: Date.now(),
  };
  await setDoc(habitDoc(uid, id), payload);
}

export async function deleteHabit(uid: string, id: string): Promise<void> {
  await deleteDoc(habitDoc(uid, id));
}

export async function toggleHabitDay(
  uid: string,
  habit: Habit,
  dayKey: string,
): Promise<void> {
  const entry = habit.track[dayKey];
  if (!entry) return;
  const next = { ...habit.track, [dayKey]: { ...entry, done: !entry.done } };
  await updateDoc(habitDoc(uid, habit.id), {
    track: toFirestoreTrack(next),
  });
}

export async function setHabitNote(
  uid: string,
  habit: Habit,
  dayKey: string,
  note: string,
): Promise<void> {
  const entry = habit.track[dayKey];
  if (!entry) return;
  const next = { ...habit.track, [dayKey]: { ...entry, note } };
  await updateDoc(habitDoc(uid, habit.id), {
    track: toFirestoreTrack(next),
  });
}

export async function updateHabit(
  uid: string,
  habit: Habit,
  input: {
    name: string;
    description: string;
    plan: string;
    start: Date;
    end: Date;
    color: string;
    icon: string;
  },
): Promise<void> {
  const track = buildTrack(input.start, input.end);
  // Preserve existing completion state for days that still fall within the new range
  for (const [key, entry] of Object.entries(habit.track)) {
    if (track[key]) {
      track[key] = { ...track[key], done: entry.done, note: entry.note };
    }
  }
  await updateDoc(habitDoc(uid, habit.id), {
    myChallenge: input.name,
    description: input.description,
    myPlan: input.plan,
    challengeStartDate: Timestamp.fromDate(input.start),
    challengeEndDate: Timestamp.fromDate(input.end),
    track: toFirestoreTrack(track),
    color: input.color,
    icon: input.icon,
  });
}
