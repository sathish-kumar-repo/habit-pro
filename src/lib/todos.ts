import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";

export type Todo = {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
};

const TODO_COLLECTION = "todos";

export function subscribeTodos(cb: (todos: Todo[]) => void): () => void {
  const ref = query(collection(db, TODO_COLLECTION), orderBy("createdAt", "desc"));
  return onSnapshot(ref, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Todo, "id">) }));
    cb(list);
  });
}

export async function createTodo(text: string): Promise<void> {
  await addDoc(collection(db, TODO_COLLECTION), {
    text: text.trim(),
    done: false,
    createdAt: Date.now(),
  });
}

export async function toggleTodo(id: string, done: boolean): Promise<void> {
  await updateDoc(doc(db, TODO_COLLECTION, id), { done });
}

export async function updateTodoText(id: string, text: string): Promise<void> {
  await updateDoc(doc(db, TODO_COLLECTION, id), { text: text.trim() });
}

export async function deleteTodo(id: string): Promise<void> {
  await deleteDoc(doc(db, TODO_COLLECTION, id));
}
