import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "@/components/AppButton";
import { IconButton } from "@/components/IconButton";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/context/AuthContext";
import { useTodos } from "@/context/TodoContext";
import type { AppStackParamList } from "@/navigation/types";
import {
  configureNotifications,
  getLocationPermissionSummary,
  requestLocationReminderPermissions,
  sendTestNotificationSound
} from "@/services/locationReminders";
import { colors, radius, spacing, typography } from "@/theme";

type Props = NativeStackScreenProps<AppStackParamList, "Profile">;
type PermissionSummary = Awaited<ReturnType<typeof getLocationPermissionSummary>>;

export function ProfileSettingsScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const { todos, refreshTodos } = useTodos();
  const [permissions, setPermissions] = useState<PermissionSummary | null>(null);
  const [saving, setSaving] = useState(false);

  const loadPermissions = useCallback(async () => {
    setPermissions(await getLocationPermissionSummary());
  }, []);

  useEffect(() => {
    void loadPermissions();
  }, [loadPermissions]);

  const enableReminders = async () => {
    setSaving(true);
    try {
      await configureNotifications();
      await requestLocationReminderPermissions();
      await refreshTodos();
      await loadPermissions();
    } finally {
      setSaving(false);
    }
  };

  const locationCount = todos.filter((todo) => todo.location && !todo.completed).length;

  return (
    <Screen>
      <View style={styles.topBar}>
        <IconButton icon="chevron-back" label="Back" onPress={() => navigation.goBack()} />
        <Text style={styles.screenTitle}>Settings</Text>
        <IconButton icon="ellipsis-horizontal" label="More" onPress={() => undefined} />
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons name="person-outline" size={28} color={colors.primary} />
        </View>
        <View style={styles.profileText}>
          <Text style={styles.profileName}>{user?.displayName || "Ado user"}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Preferences</Text>
        <SettingsRow icon="checkbox-outline" label="Saved todos" value={`${todos.length}`} />
        <SettingsRow icon="location-outline" label="Location reminders" value={`${locationCount}`} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Permissions</Text>
        <PermissionRow icon="navigate-outline" label="Foreground location" value={permissions?.foreground ?? "unknown"} />
        <PermissionRow icon="map-outline" label="Background location" value={permissions?.background ?? "unknown"} />
        <PermissionRow icon="notifications-outline" label="Notifications" value={permissions?.notifications ?? "unknown"} />
      </View>

      <View style={styles.actions}>
        <AppButton
          icon="location-outline"
          loading={saving}
          onPress={enableReminders}
          title="Enable reminders"
        />
        <AppButton
          icon="settings-outline"
          onPress={() => Linking.openSettings()}
          title="Open system settings"
          variant="secondary"
        />
        <AppButton
          icon="volume-high-outline"
          onPress={() => void sendTestNotificationSound()}
          title="Test notification sound"
          variant="secondary"
        />
        <AppButton icon="log-out-outline" onPress={() => void logout()} title="Log out" variant="danger" />
      </View>
    </Screen>
  );
}

function SettingsRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.rowItem}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function PermissionRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const granted = value === "granted";
  return (
    <Pressable style={styles.rowItem}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={granted ? colors.success : colors.primary} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.permissionValue, granted && styles.permissionGranted]}>{value}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
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
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft
  },
  profileText: {
    flex: 1,
    gap: 3
  },
  profileName: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: "900"
  },
  profileEmail: {
    color: colors.textMuted,
    fontSize: typography.small
  },
  section: {
    gap: spacing.sm,
    marginTop: spacing.lg
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: typography.tiny,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  rowItem: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft
  },
  rowLabel: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800"
  },
  rowValue: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: "900"
  },
  permissionValue: {
    color: colors.warning,
    fontSize: typography.tiny,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  permissionGranted: {
    color: colors.success
  },
  actions: {
    gap: spacing.md,
    paddingTop: spacing.xl
  }
});
