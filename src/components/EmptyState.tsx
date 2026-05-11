import type { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";

import { colors, radius, spacing, typography } from "@/theme";

type EmptyStateProps = {
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  message: string;
};

export function EmptyState({ icon, title, message }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <View style={styles.sparkleTop} />
        <Ionicons name={icon} size={34} color={colors.primary} />
        <View style={styles.sparkleBottom} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    minHeight: 220
  },
  icon: {
    width: 124,
    height: 108,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft
  },
  sparkleTop: {
    position: "absolute",
    top: 18,
    right: 26,
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.accent
  },
  sparkleBottom: {
    position: "absolute",
    left: 26,
    bottom: 20,
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primary
  },
  title: {
    color: colors.text,
    fontSize: typography.h3,
    fontWeight: "900"
  },
  message: {
    color: colors.textMuted,
    fontSize: typography.small,
    textAlign: "center",
    lineHeight: 20
  }
});
