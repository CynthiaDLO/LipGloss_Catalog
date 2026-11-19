
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAppearance } from "../context/AppearanceContext";
import { AppearanceProvider } from "../context/AppearanceContext";
import { SafeAreaProvider } from "react-native-safe-area-context";

import {
  AuthProvider,
  useAuth,
} from "../context/AuthContext";

function RootNavigator() {
  const { user } = useAuth();
  const { dark } = useAppearance();

  return (
    <>
    <StatusBar style={dark ? "light" : "dark"} />
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppearanceProvider><RootNavigator /></AppearanceProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
