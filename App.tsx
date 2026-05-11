import "react-native-gesture-handler";
import "./src/services/locationReminders";

import { useEffect, useState } from "react";
import { StatusBar, StyleSheet } from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer, type Theme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { TodoProvider } from "@/context/TodoContext";
import type { AppStackParamList, AuthStackParamList } from "@/navigation/types";
import { CreateAccountScreen } from "@/screens/CreateAccountScreen";
import { ForgotPasswordScreen } from "@/screens/ForgotPasswordScreen";
import { HomeDashboardScreen } from "@/screens/HomeDashboardScreen";
import { LoginScreen } from "@/screens/LoginScreen";
import { MapLocationPickerScreen } from "@/screens/MapLocationPickerScreen";
import { OnboardingScreen } from "@/screens/OnboardingScreen";
import { ProfileSettingsScreen } from "@/screens/ProfileSettingsScreen";
import { SplashScreen } from "@/screens/SplashScreen";
import { TodoEditorScreen } from "@/screens/TodoEditorScreen";
import { configureNotifications } from "@/services/locationReminders";
import { colors } from "@/theme";

const ONBOARDING_KEY = "ash-todo:onboarding-complete";

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

const navigationTheme: Theme = {
  dark: false,
  colors: {
    primary: colors.primary,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
    notification: colors.primary
  },
  fonts: {
    regular: { fontFamily: "System", fontWeight: "400" },
    medium: { fontFamily: "System", fontWeight: "500" },
    bold: { fontFamily: "System", fontWeight: "700" },
    heavy: { fontFamily: "System", fontWeight: "900" }
  }
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="CreateAccount" component={CreateAccountScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

function ProtectedNavigator() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="Home" component={HomeDashboardScreen} />
      <AppStack.Screen name="TodoEditor" component={TodoEditorScreen} />
      <AppStack.Screen name="MapPicker" component={MapLocationPickerScreen} />
      <AppStack.Screen name="Profile" component={ProfileSettingsScreen} />
    </AppStack.Navigator>
  );
}

function RootNavigator() {
  const { user, initializing } = useAuth();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    const loadOnboarding = async () => {
      const stored = await AsyncStorage.getItem(ONBOARDING_KEY);
      setOnboardingComplete(stored === "true");
      setCheckingOnboarding(false);
    };

    void loadOnboarding();
  }, []);

  const finishOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    setOnboardingComplete(true);
  };

  if (initializing || checkingOnboarding) {
    return <SplashScreen />;
  }

  if (!onboardingComplete) {
    return <OnboardingScreen onDone={() => void finishOnboarding()} />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {user ? <ProtectedNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

export default function App() {
  useEffect(() => {
    void configureNotifications();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AuthProvider>
          <TodoProvider>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <RootNavigator />
          </TodoProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background
  }
});
