import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "@/components/AppButton";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useAuth } from "@/context/AuthContext";
import type { AuthStackParamList } from "@/navigation/types";
import { colors, radius, spacing, typography } from "@/theme";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { login, firebaseReady } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.brand}>Ado</Text>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to manage your todos and location reminders.</Text>
      </View>

      {!firebaseReady ? (
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Firebase setup needed</Text>
          <Text style={styles.noticeText}>Add your Firebase web app values to `.env` before logging in.</Text>
        </View>
      ) : null}

      <View style={styles.form}>
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
          placeholder="Password"
          secureTextEntry
          value={password}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AppButton
          disabled={!email || !password || !firebaseReady}
          icon="log-in-outline"
          loading={loading}
          onPress={submit}
          title="Log in"
        />

        <Pressable onPress={() => navigation.navigate("ForgotPassword")} style={styles.linkButton}>
          <Text style={styles.link}>Forgot password?</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>New to Ado?</Text>
        <Pressable onPress={() => navigation.navigate("CreateAccount")}>
          <Text style={styles.link}>Create account</Text>
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
  brand: {
    color: colors.accent,
    fontSize: typography.small,
    fontWeight: "900",
    textTransform: "uppercase"
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
  linkButton: {
    alignSelf: "center",
    paddingVertical: spacing.sm
  },
  link: {
    color: colors.accent,
    fontWeight: "800"
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs,
    paddingTop: spacing.xl
  },
  footerText: {
    color: colors.textMuted
  }
});
