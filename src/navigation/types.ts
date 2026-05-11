import type { TodoLocation } from "@/types/todo";

export type AuthStackParamList = {
  Login: undefined;
  CreateAccount: undefined;
  ForgotPassword: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  TodoEditor: { todoId?: string } | undefined;
  MapPicker: { initialLocation?: TodoLocation } | undefined;
  Profile: undefined;
};
