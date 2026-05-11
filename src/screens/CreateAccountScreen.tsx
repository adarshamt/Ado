import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "@/components/AppButton";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useAuth } from "@/context/AuthContext";
import type { AuthStackParamList } from "@/navigation/types";
import { colors, radius, spacing, typography } from "@/theme";

type Props = NativeStackScreenProps<AuthStackParamList, "CreateAccount">;

export function CreateAccountScreen({ navigation }: Props) {
  const { register, firebaseReady } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      await register(name, email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Your todos stay linked to your signed-in profile.</Text>
      </View>

      {!firebaseReady ? (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Firebase setup needed</Text>
          <Text style={styles.noticeText}>Add your Firebase web app values to `.env` before creating an account.</Text>
        </View>
      ) : null}

      <View style={styles.form}>
        <TextField
          autoCapitalize="words"
          icon="person-outline"
          label="Name"
          onChangeText={setName}
          placeholder="Ash"
          value={name}
        />
        <TextField
          autoCapitalize="none"
          autoComplete="email"
          icon="mail-outline"
          keyboardType="email-address"
          label="Email"
          onChangeText={setEmail}
          placeholder="you@example.com"
          value={email}
        />
        <TextField
          autoCapitalize="none"
          icon="lock-closed-outline"
          label="Password"
          onChangeText={setPassword}
          placeholder="At least 6 characters"
          secureTextEntry
          value={password}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AppButton
          disabled={!name || !email || password.length < 6 || !firebaseReady}
          icon="person-add-outline"
          loading={loading}
          onPress={submit}
          title="Create account"
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <Pressable onPress={() => navigation.navigate("Login")}>
          <Text style={styles.link}>Log in</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.xl,
    gap: spacing.sm
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
  notice: {
    marginTop: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: colors.warningSoft,
    padding: spacing.md,
    gap: spacing.xs
  },
  noticeTitle: {
    color: colors.warning,
    fontWeight: "900"
  },
  noticeText: {
    color: colors.textMuted,
    lineHeight: 20
  },
  form: {
    paddingTop: spacing.xl,
    gap: spacing.md
  },
  error: {
    color: colors.danger,
    lineHeight: 20
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs,
    paddingTop: spacing.xl
  },
  footerText: {
    color: colors.textMuted
  },
  link: {
    color: colors.accent,
    fontWeight: "800"
  }
});
