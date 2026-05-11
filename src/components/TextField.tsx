import type { ComponentProps } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";

import { colors, radius, spacing, typography } from "@/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

type TextFieldProps = {
  label: string;
  icon?: IconName;
  error?: string;
} & ComponentProps<typeof TextInput>;

export function TextField({ label, icon, error, style, ...props }: TextFieldProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputShell, error && styles.inputError]}>
        {icon ? <Ionicons name={icon} size={17} color={colors.accent} /> : null}
        <TextInput
          placeholderTextColor={colors.textSubtle}
          selectionColor={colors.primary}
          style={[styles.input, style]}
          {...props}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.tiny,
    fontWeight: "800"
  },
  inputShell: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  inputError: {
    borderColor: colors.danger
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "700",
    paddingVertical: spacing.sm
  },
  error: {
    color: colors.danger,
    fontSize: typography.small
  }
});
