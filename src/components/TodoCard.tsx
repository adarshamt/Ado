import { Pressable, StyleSheet, Text, View } from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";

import { colors, radius, spacing, typography } from "@/theme";
import type { Todo } from "@/types/todo";
import { formatDateLabel, formatTimeLabel } from "@/utils/dates";

import { IconButton } from "./IconButton";

type TodoCardProps = {
  todo: Todo;
  onPress: () => void;
  onToggle: () => void;
  onDelete: () => void;
};

const priorityColor = {
  low: colors.success,
  medium: colors.warning,
  high: colors.danger
};

const priorityTone = {
  low: colors.successSoft,
  medium: colors.warningSoft,
  high: colors.dangerSoft
};

export function TodoCard({ todo, onPress, onToggle, onDelete }: TodoCardProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel={todo.completed ? "Mark incomplete" : "Mark complete"}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: todo.completed }}
          onPress={onToggle}
          style={[styles.check, todo.completed && styles.checkDone]}
        >
          {todo.completed ? <Ionicons name="checkmark" size={18} color={colors.white} /> : null}
        </Pressable>

        <View style={styles.titleBlock}>
          <Text numberOfLines={2} style={[styles.title, todo.completed && styles.completedText]}>
            {todo.title}
          </Text>
          {todo.description ? (
            <Text numberOfLines={2} style={styles.description}>
              {todo.description}
            </Text>
          ) : null}
        </View>

        <IconButton icon="trash-outline" label="Delete todo" color={colors.danger} onPress={onDelete} />
      </View>

      <View style={styles.metaRow}>
        <View
          style={[
            styles.pill,
            {
              borderColor: priorityTone[todo.priority],
              backgroundColor: priorityTone[todo.priority]
            }
          ]}
        >
          <View style={[styles.dot, { backgroundColor: priorityColor[todo.priority] }]} />
          <Text style={[styles.pillText, { color: priorityColor[todo.priority] }]}>{todo.priority}</Text>
        </View>
        <View style={styles.pill}>
          <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
          <Text style={styles.pillText}>{formatDateLabel(todo.dueDate)}</Text>
        </View>
        <View style={styles.pill}>
          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
          <Text style={styles.pillText}>{formatTimeLabel(todo.dueTime)}</Text>
        </View>
      </View>

      {todo.location ? (
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={16} color={colors.accent} />
          <Text numberOfLines={1} style={styles.locationText}>
            {todo.location.label ??
              `${todo.location.latitude.toFixed(4)}, ${todo.location.longitude.toFixed(4)}`}
          </Text>
          <Text style={styles.radiusText}>{todo.location.radius}m</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  pressed: {
    opacity: 0.86
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    backgroundColor: colors.white
  },
  checkDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  titleBlock: {
    flex: 1,
    gap: spacing.xs
  },
  title: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: "900",
    lineHeight: 24
  },
  completedText: {
    color: colors.textSubtle,
    textDecorationLine: "line-through"
  },
  description: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: 19
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  pill: {
    minHeight: 26,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceSoft
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill
  },
  pillText: {
    color: colors.textMuted,
    fontSize: typography.tiny,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  locationText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: typography.small
  },
  radiusText: {
    color: colors.textSubtle,
    fontSize: typography.tiny,
    fontWeight: "800"
  }
});
