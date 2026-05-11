export type TodoPriority = "low" | "medium" | "high";

export type TodoLocation = {
  latitude: number;
  longitude: number;
  radius: number;
  label?: string;
};

export type Todo = {
  id: string;
  userId: string;
  title: string;
  description: string;
  dueDate: string;
  dueTime: string;
  priority: TodoPriority;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  location?: TodoLocation;
  lastNotifiedAt?: string;
};

export type TodoDraft = Omit<
  Todo,
  "id" | "userId" | "createdAt" | "updatedAt" | "completed" | "completedAt" | "lastNotifiedAt"
>;

export type TodoFilter = "today" | "upcoming" | "completed";
