import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors, spacing, typography } from "@/theme";

export function SplashScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.mark}>
        <Text style={styles.markText}>A</Text>
      </View>
      <Text style={styles.title}>Ado</Text>
      <ActivityIndicator color={colors.primary} style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    gap: spacing.md
  },
  mark: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  markText: {
    color: colors.white,
    fontSize: 38,
    fontWeight: "900"
  },
  title: {
    color: colors.text,
    fontSize: typography.h1,
    fontWeight: "900"
  },
  loader: {
    marginTop: spacing.lg
  }
});
