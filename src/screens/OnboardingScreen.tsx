import { StyleSheet, Text, View } from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";

import { AppButton } from "@/components/AppButton";
import { Screen } from "@/components/Screen";
import { colors, radius, spacing, typography } from "@/theme";

type OnboardingScreenProps = {
  onDone: () => void;
};

const highlights = [
  { icon: "person-add-outline" as const, title: "Secure accounts", text: "Firebase login keeps each todo list separate." },
  { icon: "map-outline" as const, title: "Location reminders", text: "Attach places and get notified when you arrive." },
  { icon: "moon-outline" as const, title: "Focused dashboard", text: "Today, upcoming, and completed filters stay close." }
];

export function OnboardingScreen({ onDone }: OnboardingScreenProps) {
  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>A</Text>
        </View>
        <Text style={styles.title}>Ado</Text>
        <Text style={styles.subtitle}>A private, location-aware task list built for daily follow-through.</Text>
      </View>

      <View style={styles.cards}>
        {highlights.map((item) => (
          <View key={item.title} style={styles.card}>
            <View style={styles.iconShell}>
              <Ionicons name={item.icon} size={22} color={colors.accent} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardBody}>{item.text}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <AppButton icon="arrow-forward" title="Get started" onPress={onDone} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.md
  },
  logo: {
    width: 84,
    height: 84,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  logoText: {
    color: colors.white,
    fontSize: 46,
    fontWeight: "900"
  },
  title: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: 24
  },
  cards: {
    gap: spacing.md
  },
  card: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  iconShell: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted
  },
  cardText: {
    flex: 1,
    gap: spacing.xs
  },
  cardTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800"
  },
  cardBody: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: 19
  },
  footer: {
    paddingTop: spacing.xl
  }
});
