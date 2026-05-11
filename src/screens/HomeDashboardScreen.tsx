import type { ComponentProps } from "react";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "@/components/AppButton";
import { EmptyState } from "@/components/EmptyState";
import { IconButton } from "@/components/IconButton";
import { Screen } from "@/components/Screen";
import { SegmentedControl } from "@/components/SegmentedControl";
import { TodoCard } from "@/components/TodoCard";
import { useAuth } from "@/context/AuthContext";
import { useTodos } from "@/context/TodoContext";
import type { AppStackParamList } from "@/navigation/types";
import { colors, radius, spacing, typography } from "@/theme";
import type { TodoFilter } from "@/types/todo";
import { isToday, isUpcoming } from "@/utils/dates";

type Props = NativeStackScreenProps<AppStackParamList, "Home">;
type IconName = ComponentProps<typeof Ionicons>["name"];

const filters: { label: string; value: TodoFilter }[] = [
  { label: "Today", value: "today" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Done", value: "completed" }
];

export function HomeDashboardScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { todos, deleteTodo, toggleTodo } = useTodos();
  const [filter, setFilter] = useState<TodoFilter>("today");

  const stats = useMemo(
    () => ({
      today: todos.filter((todo) => !todo.completed && isToday(todo.dueDate)).length,
      upcoming: todos.filter((todo) => !todo.completed && isUpcoming(todo.dueDate, todo.dueTime)).length,
      completed: todos.filter((todo) => todo.completed).length
    }),
    [todos]
  );

  const visibleTodos = useMemo(() => {
    if (filter === "completed") {
      return todos.filter((todo) => todo.completed);
    }

    if (filter === "today") {
      return todos.filter((todo) => !todo.completed && isToday(todo.dueDate));
    }

    return todos.filter((todo) => !todo.completed && isUpcoming(todo.dueDate, todo.dueTime));
  }, [filter, todos]);

  const completionRate = todos.length ? Math.round((stats.completed / todos.length) * 100) : 0;

  const confirmDelete = (todoId: string) => {
    Alert.alert("Delete todo", "This removes the todo from this account.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void deleteTodo(todoId) }
    ]);
  };

  return (
    <Screen>
      <View style={styles.topBar}>
        <IconButton icon="chevron-back" label="Back" onPress={() => undefined} />
        <Text style={styles.screenTitle}>Calendar</Text>
        <IconButton icon="settings-outline" label="Settings" onPress={() => navigation.navigate("Profile")} />
      </View>

      <View style={styles.summaryCard}>
        <View>
          <Text style={styles.summaryEyebrow}>Already {stats.today + stats.upcoming} tasks</Text>
          <Text style={styles.summaryText}>Hello, {user?.displayName || "Ado"}</Text>
        </View>
        <View style={styles.summaryBadge}>
          <Text style={styles.summaryBadgeText}>{completionRate}%</Text>
        </View>
      </View>

      <View style={styles.heroCard}>
        <TaskIllustration />
        <Text style={styles.heroTitle}>
          {visibleTodos.length > 0 ? "Keep your plan moving" : "All caught up"}
        </Text>
        <Text style={styles.heroMessage}>
          {visibleTodos.length > 0
            ? `${visibleTodos.length} task${visibleTodos.length === 1 ? "" : "s"} in this view.`
            : "No tasks waiting in this view."}
        </Text>
        <AppButton icon="add" onPress={() => navigation.navigate("TodoEditor")} title="Add task" />
      </View>

      <View style={styles.statsRow}>
        <StatCard icon="today-outline" value={stats.today} label="Today" />
        <StatCard icon="time-outline" value={stats.upcoming} label="Upcoming" />
        <StatCard icon="checkmark-done-outline" value={stats.completed} label="Done" />
      </View>

      <SegmentedControl options={filters} value={filter} onChange={setFilter} />

      <View style={styles.list}>
        {visibleTodos.length === 0 ? (
          <EmptyState
            icon={filter === "completed" ? "checkmark-done-outline" : "clipboard-outline"}
            title={filter === "completed" ? "No completed tasks" : "Nothing scheduled"}
            message={
              filter === "completed"
                ? "Finished tasks will appear here."
                : "Create a task with a date and optional location."
            }
          />
        ) : (
          visibleTodos.map((todo) => (
            <TodoCard
              key={todo.id}
              todo={todo}
              onDelete={() => confirmDelete(todo.id)}
              onPress={() => navigation.navigate("TodoEditor", { todoId: todo.id })}
              onToggle={() => void toggleTodo(todo.id)}
            />
          ))
        )}
      </View>

      <View style={styles.bottomNav}>
        <DashboardNavItem active={filter === "today"} icon="home-outline" label="Home" onPress={() => setFilter("today")} />
        <DashboardNavItem active={filter === "upcoming"} icon="calendar-outline" label="Calendar" onPress={() => setFilter("upcoming")} />
        <DashboardNavItem icon="add-circle-outline" label="Add" onPress={() => navigation.navigate("TodoEditor")} />
        <DashboardNavItem icon="person-outline" label="Me" onPress={() => navigation.navigate("Profile")} />
      </View>
    </Screen>
  );
}

function TaskIllustration() {
  return (
    <View style={styles.illustration}>
      <View style={styles.circleLarge} />
      <View style={styles.circleSmall} />
      <View style={styles.clipboard}>
        <Ionicons name="clipboard-outline" size={54} color={colors.primary} />
        <View style={styles.checkBadge}>
          <Ionicons name="checkmark" size={16} color={colors.white} />
        </View>
      </View>
      <Ionicons name="sparkles" size={18} color={colors.accent} style={styles.sparkleLeft} />
      <Ionicons name="add" size={16} color={colors.primary} style={styles.sparkleRight} />
    </View>
  );
}

function StatCard({ icon, value, label }: { icon: IconName; value: number; label: string }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function DashboardNavItem({
  active,
  icon,
  label,
  onPress
}: {
  active?: boolean;
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.navItem}>
      <Ionicons name={icon} size={20} color={active ? colors.primary : colors.textSubtle} />
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingTop: spacing.xs
  },
  screenTitle: {
    flex: 1,
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: "900",
    textAlign: "center"
  },
  summaryCard: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  summaryEyebrow: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: "900"
  },
  summaryText: {
    color: colors.textMuted,
    fontSize: typography.small,
    marginTop: 3
  },
  summaryBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft
  },
  summaryBadgeText: {
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: "900"
  },
  heroCard: {
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  illustration: {
    width: 170,
    height: 138,
    alignItems: "center",
    justifyContent: "center"
  },
  circleLarge: {
    position: "absolute",
    width: 112,
    height: 112,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft
  },
  circleSmall: {
    position: "absolute",
    right: 28,
    top: 20,
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted
  },
  clipboard: {
    width: 90,
    height: 104,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-8deg" }]
  },
  checkBadge: {
    position: "absolute",
    right: 12,
    bottom: 22,
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary
  },
  sparkleLeft: {
    position: "absolute",
    left: 18,
    top: 30
  },
  sparkleRight: {
    position: "absolute",
    right: 18,
    bottom: 36
  },
  heroTitle: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: "900"
  },
  heroMessage: {
    color: colors.textMuted,
    fontSize: typography.small,
    textAlign: "center"
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginVertical: spacing.md
  },
  statCard: {
    flex: 1,
    minHeight: 82,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  statValue: {
    color: colors.text,
    fontSize: typography.h2,
    fontWeight: "900"
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: typography.tiny,
    fontWeight: "800"
  },
  list: {
    paddingTop: spacing.md,
    gap: spacing.md
  },
  bottomNav: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: spacing.sm
  },
  navLabel: {
    color: colors.textSubtle,
    fontSize: 10,
    fontWeight: "800"
  },
  navLabelActive: {
    color: colors.primary
  }
});
