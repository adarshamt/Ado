import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { Alert } from "react-native";

import {
  registerTodoGeofences,
  scheduleTodoArrivalNotification,
  watchTodoArrivals,
  type TodoArrival
} from "@/services/locationReminders";
import { getTodosForUser, saveTodosForUser } from "@/services/todoStorage";
import {
  deleteTodoFromRemote,
  getTodosFromRemote,
  saveTodoToRemote,
  saveTodosToRemote,
  updateTodoOnRemote,
  watchUserTodos
} from "@/services/todosRemote";
import type { Todo, TodoDraft, TodoLocation } from "@/types/todo";

import { useAuth } from "./AuthContext";

type TodoContextValue = {
  todos: Todo[];
  loading: boolean;
  pendingLocation: TodoLocation | null;
  setPendingLocation: (location: TodoLocation | null) => void;
  addTodo: (draft: TodoDraft) => Promise<void>;
  updateTodo: (todoId: string, draft: TodoDraft) => Promise<void>;
  deleteTodo: (todoId: string) => Promise<void>;
  toggleTodo: (todoId: string) => Promise<void>;
  refreshTodos: () => Promise<void>;
};

const TodoContext = createContext<TodoContextValue | undefined>(undefined);

const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function TodoProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<TodoLocation | null>(null);

  const syncTodos = useCallback(
    async (nextTodos: Todo[]) => {
      if (!user) {
        return;
      }

      setTodos(nextTodos);
      
      // Sync to local storage
      await saveTodosForUser(user.uid, nextTodos);

      // Sync to Firestore
      try {
        await saveTodosToRemote(nextTodos);
      } catch (error) {
        console.error("Failed to sync todos to Firestore:", error);
        // Continue with local storage even if Firestore fails
      }

      // Register geofences
      try {
        await registerTodoGeofences(user.uid, nextTodos);
      } catch {
        // Permission-denied geofence sync should not block local todo changes.
      }
    },
    [user]
  );

  const showLocationArrivalAlert = useCallback(
    async ({ todo, distanceMeters }: TodoArrival) => {
      const now = new Date().toISOString();
      const place = todo.location?.label ?? "your selected location";
      const distanceLabel = Math.max(0, Math.round(distanceMeters));

      if (user) {
        await scheduleTodoArrivalNotification(todo, user.uid);
      }

      return new Promise<void>((resolve) => {
        Alert.alert(
          "Location reminder",
          `You reached ${place}. Task: ${todo.title}.`,
          [
            {
              text: "Mark Complete",
              onPress: async () => {
                await syncTodos(
                  todos.map((item) =>
                    item.id === todo.id
                      ? {
                          ...item,
                          completed: true,
                          completedAt: now,
                          lastNotifiedAt: now,
                          updatedAt: now
                        }
                      : item
                  )
                );
                if (__DEV__) {
                  console.log(`Location reminder completed for "${todo.title}" at ${distanceLabel}m.`);
                }
                resolve();
              },
              style: "default"
            },
            {
              text: "Dismiss",
              onPress: async () => {
                await syncTodos(
                  todos.map((item) =>
                    item.id === todo.id
                      ? {
                          ...item,
                          lastNotifiedAt: now,
                          updatedAt: now
                        }
                      : item
                  )
                );
                if (__DEV__) {
                  console.log(`Location reminder shown for "${todo.title}" at ${distanceLabel}m.`);
                }
                resolve();
              }
            }
          ]
        );
      });
    },
    [syncTodos, todos, user]
  );

  const refreshTodos = useCallback(async () => {
    if (!user) {
      setTodos([]);
      return;
    }

    setLoading(true);
    try {
      // Try to get todos from Firestore first
      let stored = await getTodosFromRemote(user.uid);
      
      // Fallback to local storage if Firestore is empty or unavailable
      if (stored.length === 0) {
        stored = await getTodosForUser(user.uid);
      }
      
      setTodos(stored);
      await registerTodoGeofences(user.uid, stored);
    } catch {
      // If both fail, try local storage
      try {
        const stored = await getTodosForUser(user.uid);
        setTodos(stored);
      } catch {
        setTodos([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshTodos();
  }, [refreshTodos]);

  // Set up real-time listener for Firestore changes
  useEffect(() => {
    if (!user) {
      return;
    }

    const unsubscribe = watchUserTodos(user.uid, (remoteTodos) => {
      setTodos(remoteTodos);
      // Also save to local storage for offline access
      void saveTodosForUser(user.uid, remoteTodos);
    });

    return () => {
      unsubscribe?.();
    };
  }, [user]);

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;
    let cancelled = false;

    void watchTodoArrivals(todos, (arrival) => {
      void showLocationArrivalAlert(arrival);
    }).then((nextSubscription) => {
      if (cancelled) {
        nextSubscription?.remove();
        return;
      }

      subscription = nextSubscription;
    });

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [showLocationArrivalAlert, todos]);

  const addTodo = useCallback(
    async (draft: TodoDraft) => {
      if (!user) {
        return;
      }

      const now = new Date().toISOString();
      const todo: Todo = {
        ...draft,
        id: createId(),
        userId: user.uid,
        completed: false,
        createdAt: now,
        updatedAt: now
      };

      const newTodos = [todo, ...todos];
      await syncTodos(newTodos);
      
      // Also save individual todo to Firestore for faster sync
      try {
        await saveTodoToRemote(todo);
      } catch (error) {
        console.error("Failed to save todo to Firestore:", error);
      }
    },
    [syncTodos, todos, user]
  );

  const updateTodo = useCallback(
    async (todoId: string, draft: TodoDraft) => {
      const updatedAt = new Date().toISOString();
      const nextTodos = todos.map((todo) =>
        todo.id === todoId
          ? {
              ...todo,
              ...draft,
              updatedAt
            }
          : todo
      );

      await syncTodos(nextTodos);

      // Also update individual todo on Firestore for faster sync
      try {
        await updateTodoOnRemote(todoId, { ...draft, updatedAt });
      } catch (error) {
        console.error("Failed to update todo on Firestore:", error);
      }
    },
    [syncTodos, todos]
  );

  const deleteTodo = useCallback(
    async (todoId: string) => {
      const nextTodos = todos.filter((todo) => todo.id !== todoId);
      await syncTodos(nextTodos);

      // Also delete individual todo from Firestore for faster sync
      try {
        await deleteTodoFromRemote(todoId);
      } catch (error) {
        console.error("Failed to delete todo from Firestore:", error);
      }
    },
    [syncTodos, todos]
  );

  const toggleTodo = useCallback(
    async (todoId: string) => {
      const now = new Date().toISOString();
      const nextTodos = todos.map((todo) =>
        todo.id === todoId
          ? {
              ...todo,
              completed: !todo.completed,
              completedAt: todo.completed ? undefined : now,
              updatedAt: now
            }
          : todo
      );

      await syncTodos(nextTodos);

      // Also update individual todo on Firestore for faster sync
      const updatedTodo = nextTodos.find((t) => t.id === todoId);
      if (updatedTodo) {
        try {
          await updateTodoOnRemote(todoId, {
            completed: updatedTodo.completed,
            completedAt: updatedTodo.completedAt,
            updatedAt: now
          });
        } catch (error) {
          console.error("Failed to toggle todo on Firestore:", error);
        }
      }
    },
    [syncTodos, todos]
  );

  const value = useMemo(
    () => ({
      todos,
      loading,
      pendingLocation,
      setPendingLocation,
      addTodo,
      updateTodo,
      deleteTodo,
      toggleTodo,
      refreshTodos
    }),
    [addTodo, deleteTodo, loading, pendingLocation, refreshTodos, todos, toggleTodo, updateTodo]
  );

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
}

export function useTodos() {
  const context = useContext(TodoContext);
  if (!context) {
    throw new Error("useTodos must be used inside TodoProvider");
  }

  return context;
}
