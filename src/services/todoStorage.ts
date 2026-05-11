import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Todo } from "@/types/todo";

const TODO_STORAGE_PREFIX = "ash-todo:todos:";

export const todoStorageKey = (userId: string) => `${TODO_STORAGE_PREFIX}${userId}`;

export async function getTodosForUser(userId: string) {
  const raw = await AsyncStorage.getItem(todoStorageKey(userId));
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as Todo[];
  } catch {
    return [];
  }
}

export async function saveTodosForUser(userId: string, todos: Todo[]) {
  await AsyncStorage.setItem(todoStorageKey(userId), JSON.stringify(todos));
}
