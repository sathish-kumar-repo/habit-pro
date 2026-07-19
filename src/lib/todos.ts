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
} from "firebase/firestore";
import { db } from "./firebase";

export type Todo = {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  order?: number;
};

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

export async function createTodo(uid: string, text: string): Promise<void> {
  await addDoc(todosCol(uid), {
    text: text.trim(),
    done: false,
    createdAt: Date.now(),
  });
}

export async function toggleTodo(uid: string, id: string, done: boolean): Promise<void> {
  await updateDoc(todoDoc(uid, id), { done });
}

export async function updateTodoText(uid: string, id: string, text: string): Promise<void> {
  await updateDoc(todoDoc(uid, id), { text: text.trim() });
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
