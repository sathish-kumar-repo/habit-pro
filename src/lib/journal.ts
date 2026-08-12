import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export type JournalEntry = {
  id: string;
  title: string;
  content: string; // HTML string from Tiptap
  plainText: string; // for search/snippets
  date: Date; // user-selected journal date
  createdAt: number;
  updatedAt: number;
};

function journalsCol(uid: string) {
  return collection(db, "users", uid, "journals");
}

function journalDoc(uid: string, journalId: string) {
  return doc(db, "users", uid, "journals", journalId);
}

type FirestoreJournal = {
  title: string;
  content: string;
  plainText: string;
  date: Timestamp;
  createdAt: number;
  updatedAt: number;
};

function fromFirestore(id: string, data: FirestoreJournal): JournalEntry {
  return {
    id,
    title: data.title ?? "",
    content: data.content ?? "",
    plainText: data.plainText ?? "",
    date: data.date?.toDate?.() ?? new Date(data.createdAt ?? Date.now()),
    createdAt: data.createdAt ?? Date.now(),
    updatedAt: data.updatedAt ?? Date.now(),
  };
}

export function subscribeJournals(
  uid: string,
  cb: (entries: JournalEntry[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const ref = query(journalsCol(uid), orderBy("date", "desc"));
  return onSnapshot(
    ref,
    (snap) => {
      const list = snap.docs.map((d) =>
        fromFirestore(d.id, d.data() as FirestoreJournal),
      );
      cb(list);
    },
    (err) => {
      console.error("[journals] snapshot error:", err);
      onError?.(err);
    },
  );
}

export async function createJournal(
  uid: string,
  input: { title: string; content: string; plainText: string; date: Date },
): Promise<string> {
  const ref = await addDoc(journalsCol(uid), {
    title: input.title.trim(),
    content: input.content,
    plainText: input.plainText,
    date: Timestamp.fromDate(input.date),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return ref.id;
}

export async function updateJournal(
  uid: string,
  id: string,
  input: { title: string; content: string; plainText: string },
): Promise<void> {
  await updateDoc(journalDoc(uid, id), {
    title: input.title.trim(),
    content: input.content,
    plainText: input.plainText,
    updatedAt: Date.now(),
  });
}

export async function deleteJournal(uid: string, id: string): Promise<void> {
  await deleteDoc(journalDoc(uid, id));
}

/** Extracts a short text snippet from plainText, for list previews. */
export function snippet(plainText: string, max = 120): string {
  const trimmed = plainText.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max).trimEnd() + "\u2026";
}

/** Formats a Date as a readable journal date label. */
export function journalDateLabel(d: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (today.getTime() - target.getTime()) / 86_400_000,
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 0 && diffDays < 7)
    return target.toLocaleDateString("en", { weekday: "long" });
  return target.toLocaleDateString("en", {
    month: "long",
    day: "numeric",
    year: target.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}
