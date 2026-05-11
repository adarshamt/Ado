import { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import DateTimePicker from "@react-native-community/datetimepicker";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "@/components/AppButton";
import { IconButton } from "@/components/IconButton";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useTodos } from "@/context/TodoContext";
import type { AppStackParamList } from "@/navigation/types";
import { configureNotifications, requestLocationReminderPermissions } from "@/services/locationReminders";
import { colors, radius, spacing, typography } from "@/theme";
import type { TodoLocation, TodoPriority } from "@/types/todo";
import { formatDateLabel, formatTimeLabel, fromDateAndTime, toDateKey, toTimeKey } from "@/utils/dates";

type Props = NativeStackScreenProps<AppStackParamList, "TodoEditor">;

const priorities: TodoPriority[] = ["low", "medium", "high"];

export function TodoEditorScreen({ navigation, route }: Props) {
  const { todos, addTodo, updateTodo, pendingLocation, setPendingLocation } = useTodos();
  const todo = todos.find((item) => item.id === route.params?.todoId);
  const isEditing = Boolean(todo);

  const now = useMemo(() => new Date(), []);
  const [title, setTitle] = useState(todo?.title ?? "");
  const [description, setDescription] = useState(todo?.description ?? "");
  const [dueDate, setDueDate] = useState(todo?.dueDate ?? toDateKey(now));
  const [dueTime, setDueTime] = useState(todo?.dueTime ?? toTimeKey(now));
  const [priority, setPriority] = useState<TodoPriority>(todo?.priority ?? "medium");
  const [location, setLocation] = useState<TodoLocation | undefined>(todo?.location);
  const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (pendingLocation) {
      setLocation(pendingLocation);
      setPendingLocation(null);
    }
  }, [pendingLocation, setPendingLocation]);

  const pickerValue = fromDateAndTime(dueDate, dueTime);

  const save = async () => {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    setError("");
    setSaving(true);

    try {
      if (location) {
        await configureNotifications();
        await requestLocationReminderPermissions();
      }

      const draft = {
        title: title.trim(),
        description: description.trim(),
        dueDate,
        dueTime,
        priority,
        location
      };

      if (todo) {
        await updateTodo(todo.id, draft);
      } else {
        await addTodo(draft);
      }

      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <View style={styles.topBar}>
        <IconButton icon="chevron-back" label="Back" onPress={() => navigation.goBack()} />
        <Text style={styles.screenTitle}>{isEditing ? "Edit Task" : "New Task"}</Text>
        <IconButton icon="ellipsis-horizontal" label="More" onPress={() => undefined} />
      </View>

      <View style={styles.heroCard}>
        <EditorIllustration />
        <Text style={styles.heroTitle}>{isEditing ? "Update your task" : "Create a focused task"}</Text>
        <Text style={styles.heroMessage}>Set a time, priority, and optional location reminder.</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Task</Text>
        <TextField
          autoCapitalize="sentences"
          icon="pencil-outline"
          label="Title"
          onChangeText={setTitle}
          placeholder="Pick up package"
          value={title}
        />
        <TextField
          label="Description"
          multiline
          numberOfLines={4}
          onChangeText={setDescription}
          placeholder="Notes, context, or checklist details"
          style={styles.textArea}
          value={description}
        />
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Schedule</Text>
        <View style={styles.row}>
          <Pressable onPress={() => setPickerMode("date")} style={styles.dateButton}>
            <View style={styles.dateIcon}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.dateTextBlock}>
              <Text style={styles.fieldLabel}>Date</Text>
              <Text numberOfLines={2} style={styles.dateValue}>{formatDateLabel(dueDate)}</Text>
            </View>
          </Pressable>
          <Pressable onPress={() => setPickerMode("time")} style={styles.dateButton}>
            <View style={styles.dateIcon}>
              <Ionicons name="time-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.dateTextBlock}>
              <Text style={styles.fieldLabel}>Time</Text>
              <Text numberOfLines={1} style={styles.dateValue}>{formatTimeLabel(dueTime)}</Text>
            </View>
          </Pressable>
        </View>

        {pickerMode ? (
          <View style={styles.pickerShell}>
            <DateTimePicker
              display={Platform.OS === "ios" ? "spinner" : "default"}
              mode={pickerMode}
              onChange={(_, selectedDate) => {
                if (Platform.OS === "android") {
                  setPickerMode(null);
                }
                if (!selectedDate) {
                  return;
                }
                if (pickerMode === "date") {
                  setDueDate(toDateKey(selectedDate));
                } else {
                  setDueTime(toTimeKey(selectedDate));
                }
              }}
              themeVariant="light"
              value={pickerValue}
            />
            {Platform.OS === "ios" ? (
              <AppButton title="Done" variant="secondary" onPress={() => setPickerMode(null)} />
            ) : null}
          </View>
        ) : null}
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Priority</Text>
        <View style={styles.priorityRow}>
          {priorities.map((item) => {
            const selected = item === priority;
            return (
              <Pressable
                accessibilityRole="button"
                key={item}
                onPress={() => setPriority(item)}
                style={[styles.priority, selected && styles.prioritySelected]}
              >
                <Text style={[styles.priorityText, selected && styles.priorityTextSelected]}>{item}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.locationCard}>
        <View style={styles.locationHeader}>
          <View style={styles.locationIcon}>
            <Ionicons name="location-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.locationTextBlock}>
            <Text style={styles.locationTitle}>Location reminder</Text>
            <Text style={styles.locationSubtitle}>
              {location
                ? location.label ?? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                : "Optional"}
            </Text>
          </View>
        </View>
        {location ? <Text style={styles.radiusText}>Geofence radius: {location.radius} meters</Text> : null}
        <AppButton
          icon="map-outline"
          onPress={() => navigation.navigate("MapPicker", { initialLocation: location })}
          title={location ? "Change location" : "Add location"}
          variant="secondary"
        />
        {location ? (
          <AppButton icon="close" title="Remove location" variant="ghost" onPress={() => setLocation(undefined)} />
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <AppButton
        icon={isEditing ? "save-outline" : "add"}
        loading={saving}
        onPress={save}
        title={isEditing ? "Save changes" : "Create task"}
      />
    </Screen>
  );
}

function EditorIllustration() {
  return (
    <View style={styles.illustration}>
      <View style={styles.circleLarge} />
      <View style={styles.circleSmall} />
      <View style={styles.cardIcon}>
        <Ionicons name="document-text-outline" size={52} color={colors.primary} />
      </View>
      <Ionicons name="add" size={17} color={colors.primary} style={styles.sparkleLeft} />
      <Ionicons name="sparkles" size={18} color={colors.accent} style={styles.sparkleRight} />
    </View>
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
  heroCard: {
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  illustration: {
    width: 148,
    height: 122,
    alignItems: "center",
    justifyContent: "center"
  },
  circleLarge: {
    position: "absolute",
    width: 104,
    height: 104,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft
  },
  circleSmall: {
    position: "absolute",
    right: 22,
    top: 18,
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted
  },
  cardIcon: {
    transform: [{ rotate: "8deg" }]
  },
  sparkleLeft: {
    position: "absolute",
    left: 20,
    top: 30
  },
  sparkleRight: {
    position: "absolute",
    right: 18,
    bottom: 28
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
  formCard: {
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: "900"
  },
  textArea: {
    minHeight: 104,
    textAlignVertical: "top"
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm
  },
  dateButton: {
    flex: 1,
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: spacing.sm
  },
  dateIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft
  },
  dateTextBlock: {
    flex: 1,
    gap: 2
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: typography.tiny,
    fontWeight: "800"
  },
  dateValue: {
    color: colors.text,
    fontSize: typography.small,
    fontWeight: "900",
    lineHeight: 18
  },
  pickerShell: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    overflow: "hidden",
    padding: spacing.sm,
    gap: spacing.sm
  },
  priorityRow: {
    flexDirection: "row",
    gap: spacing.xs,
    padding: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted
  },
  priority: {
    flex: 1,
    minHeight: 36,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center"
  },
  prioritySelected: {
    backgroundColor: colors.primary
  },
  priorityText: {
    color: colors.textMuted,
    fontSize: typography.tiny,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  priorityTextSelected: {
    color: colors.white
  },
  locationCard: {
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  locationIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft
  },
  locationTextBlock: {
    flex: 1,
    gap: 2
  },
  locationTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "900"
  },
  locationSubtitle: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: "700"
  },
  radiusText: {
    color: colors.textMuted,
    fontSize: typography.small
  },
  error: {
    color: colors.danger,
    lineHeight: 20,
    marginTop: spacing.md
  }
});
