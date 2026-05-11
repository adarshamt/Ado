import type { ComponentProps } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";

import { colors, radius, spacing, typography } from "@/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

type AppButtonProps = {
  title: string;
  onPress: () => void;
  icon?: IconName;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  disabled?: boolean;
};

export function AppButton({
  title,
  onPress,
  icon,
  variant = "primary",
  loading,
  disabled
}: AppButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "ghost" ? colors.primary : colors.white} />
      ) : (
        <View style={styles.content}>
          {icon ? (
            <Ionicons
              name={icon}
              size={16}
              color={variant === "ghost" ? colors.primary : variant === "secondary" ? colors.primary : colors.white}
            />
          ) : null}
          <Text
            style={[
              styles.title,
              variant === "secondary" && styles.secondaryTitle,
              variant === "ghost" && styles.ghostTitle
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm
  },
  primary: {
    backgroundColor: colors.primary
  },
  secondary: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border
  },
  ghost: {
    backgroundColor: "transparent"
  },
  danger: {
    backgroundColor: colors.danger
  },
  disabled: {
    opacity: 0.55
  },
  pressed: {
    opacity: 0.84
  },
  title: {
    color: colors.white,
    fontSize: typography.small,
    fontWeight: "800"
  },
  secondaryTitle: {
    color: colors.primary
  },
  ghostTitle: {
    color: colors.primary
  }
});
