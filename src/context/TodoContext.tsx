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
      await saveTodosForUser(user.uid, nextTodos);

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

      Alert.alert(
        "Location reminder",
        `You reached ${place}. Task: ${todo.title}.`,
        [{ text: "OK" }]
      );

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
      const stored = await getTodosForUser(user.uid);
      setTodos(stored);
      await registerTodoGeofences(user.uid, stored);
    } catch {
      setTodos([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshTodos();
  }, [refreshTodos]);

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

      await syncTodos([todo, ...todos]);
    },
    [syncTodos, todos, user]
  );

  const updateTodo = useCallback(
    async (todoId: string, draft: TodoDraft) => {
      const nextTodos = todos.map((todo) =>
        todo.id === todoId
          ? {
              ...todo,
              ...draft,
              updatedAt: new Date().toISOString()
            }
          : todo
      );

      await syncTodos(nextTodos);
    },
    [syncTodos, todos]
  );

  const deleteTodo = useCallback(
    async (todoId: string) => {
      await syncTodos(todos.filter((todo) => todo.id !== todoId));
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
