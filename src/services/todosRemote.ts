import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  type QueryConstraint,
  type Unsubscribe
} from "@firebase/firestore";

import { db } from "./firebase";
import type { Todo } from "@/types/todo";

const TODOS_COLLECTION = "todos";

const isRemoteDbAvailable = () => {
  return db !== null;
};

export async function getTodosFromRemote(userId: string): Promise<Todo[]> {
  if (!isRemoteDbAvailable()) {
    return [];
  }

  try {
    const q = query(
      collection(db!, TODOS_COLLECTION),
      where("userId", "==", userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as Todo);
  } catch (error) {
    console.error("Error fetching todos from Firestore:", error);
    return [];
  }
}

export async function saveTodoToRemote(todo: Todo): Promise<void> {
  if (!isRemoteDbAvailable()) {
    return;
  }

  try {
    const todoRef = doc(db!, TODOS_COLLECTION, todo.id);
    await setDoc(todoRef, todo, { merge: true });
  } catch (error) {
    console.error("Error saving todo to Firestore:", error);
    throw error;
  }
}

export async function saveTodosToRemote(todos: Todo[]): Promise<void> {
  if (!isRemoteDbAvailable()) {
    return;
  }

  try {
    // Batch write all todos
    await Promise.all(todos.map((todo) => saveTodoToRemote(todo)));
  } catch (error) {
    console.error("Error saving todos to Firestore:", error);
    throw error;
  }
}

export async function deleteTodoFromRemote(todoId: string): Promise<void> {
  if (!isRemoteDbAvailable()) {
    return;
  }

  try {
    const todoRef = doc(db!, TODOS_COLLECTION, todoId);
    await deleteDoc(todoRef);
  } catch (error) {
    console.error("Error deleting todo from Firestore:", error);
    throw error;
  }
}

export async function updateTodoOnRemote(todoId: string, updates: Partial<Todo>): Promise<void> {
  if (!isRemoteDbAvailable()) {
    return;
  }

  try {
    const todoRef = doc(db!, TODOS_COLLECTION, todoId);
    await updateDoc(todoRef, updates);
  } catch (error) {
    console.error("Error updating todo on Firestore:", error);
    throw error;
  }
}

export function watchUserTodos(
  userId: string,
  onUpdate: (todos: Todo[]) => void
): Unsubscribe | null {
  if (!isRemoteDbAvailable()) {
    return null;
  }

  try {
    const q = query(
      collection(db!, TODOS_COLLECTION),
      where("userId", "==", userId)
    );

    return onSnapshot(q, (snapshot) => {
      const todos = snapshot.docs.map((doc) => doc.data() as Todo);
      onUpdate(todos);
    });
  } catch (error) {
    console.error("Error watching todos from Firestore:", error);
    return null;
  }
}
