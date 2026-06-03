import { useEffect, useState } from "react";

import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { MD3LightTheme, PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Root layout: runs once when the app starts and initializes SQLite (tables + demo data).
import { initDB } from "../../database/db";

// Keep native splash visible until DB is ready, then hide it (otherwise the app can look "frozen").
SplashScreen.preventAutoHideAsync().catch(() => {});

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#0f766e",
    secondary: "#c2410c",
    tertiary: "#334155",
  },
};

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);

  // Stack navigator hides default headers; each screen draws its own toolbar.
  useEffect(() => {
    try {
      initDB();
    } catch (error) {
      console.error("Database init failed:", error);
    } finally {
      setAppReady(true);
      void SplashScreen.hideAsync();
    }
  }, []);

  if (!appReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <Stack screenOptions={{ headerShown: false }} />
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
