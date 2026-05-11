import type { ComponentProps } from "react";
import { Pressable, StyleSheet } from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";

import { colors, radius } from "@/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

type IconButtonProps = {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
};

export function IconButton({ icon, label, onPress, color = colors.primary, disabled }: IconButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Ionicons name={icon} size={20} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border
  },
  pressed: {
    opacity: 0.75
  },
  disabled: {
    opacity: 0.5
  }
});
