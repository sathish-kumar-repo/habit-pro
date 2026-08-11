import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
  query,
  orderBy,
  writeBatch,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";

export type Todo = {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  order?: number;
  categoryId?: string | null;
};

// ─── Categories ─────────────────────────────────────────────────────────────

export type Category = {
  id: string;
  name: string;
  color: string;
  createdAt: number;
};

export const CATEGORY_COLORS = [
  "#20A973",
  "#319DC4",
  "#7F52E0",
  "#CE3475",
  "#E48068",
  "#E4A12B",
  "#5DA9E9",
  "#7A8C99",
  "#4C5B70",
  "#2DA796",
];

function categoriesCol(uid: string) {
  return collection(db, "users", uid, "categories");
}

function categoryDoc(uid: string, categoryId: string) {
  return doc(db, "users", uid, "categories", categoryId);
}

export function subscribeCategories(
  uid: string,
  cb: (categories: Category[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const ref = query(categoriesCol(uid), orderBy("createdAt", "asc"));
  return onSnapshot(
    ref,
    (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Category, "id">),
      }));
      cb(list);
    },
    (err) => {
      console.error("[categories] snapshot error:", err);
      onError?.(err);
    },
  );
}

export async function createCategory(
  uid: string,
  name: string,
  color: string,
): Promise<string> {
  const ref = await addDoc(categoriesCol(uid), {
    name: name.trim(),
    color,
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function updateCategory(
  uid: string,
  id: string,
  name: string,
  color: string,
): Promise<void> {
  await updateDoc(categoryDoc(uid, id), { name: name.trim(), color });
}

export async function deleteCategory(uid: string, id: string): Promise<void> {
  await deleteDoc(categoryDoc(uid, id));
}

/** Clears the categoryId on all todos belonging to a deleted category. */
export async function clearCategoryOnTodos(
  uid: string,
  categoryId: string,
): Promise<void> {
  const snap = await getDocs(todosCol(uid));
  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    if (d.get("categoryId") === categoryId) {
      batch.update(d.ref, { categoryId: null });
    }
  });
  await batch.commit();
}

/**
 * Returns the Firestore collection reference for the authenticated user's
 * todos. Data lives at `users/{uid}/todos/{todoId}` so each user's
 * todo list is fully isolated from every other user's.
 */
function todosCol(uid: string) {
  return collection(db, "users", uid, "todos");
}

function todoDoc(uid: string, todoId: string) {
  return doc(db, "users", uid, "todos", todoId);
}

/**
 * Subscribes to the authenticated user's todos in real time, ordered by
 * creation time descending. Returns an unsubscribe function.
 */
export function subscribeTodos(
  uid: string,
  cb: (todos: Todo[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const ref = query(todosCol(uid), orderBy("createdAt", "desc"));
  return onSnapshot(
    ref,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Todo, "id">) }));
      cb(list);
    },
    (err) => {
      console.error("[todos] snapshot error:", err);
      onError?.(err);
    },
  );
}

export async function createTodo(
  uid: string,
  text: string,
  categoryId?: string | null,
): Promise<void> {
  await addDoc(todosCol(uid), {
    text: text.trim(),
    done: false,
    createdAt: Date.now(),
    categoryId: categoryId ?? null,
  });
}

export async function toggleTodo(uid: string, id: string, done: boolean): Promise<void> {
  await updateDoc(todoDoc(uid, id), { done });
}

export async function updateTodoText(uid: string, id: string, text: string): Promise<void> {
  await updateDoc(todoDoc(uid, id), { text: text.trim() });
}

export async function updateTodoCategory(
  uid: string,
  id: string,
  categoryId: string | null,
): Promise<void> {
  await updateDoc(todoDoc(uid, id), { categoryId });
}

export async function deleteTodo(uid: string, id: string): Promise<void> {
  await deleteDoc(todoDoc(uid, id));
}

/** Persists a new display order by writing an `order` index to each todo. */
export async function reorderTodos(uid: string, orderedIds: string[]): Promise<void> {
  const batch = writeBatch(db);
  orderedIds.forEach((id, index) => {
    batch.update(todoDoc(uid, id), { order: index });
  });
  await batch.commit();
}
