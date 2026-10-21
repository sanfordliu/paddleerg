import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import 'react-native-reanimated';
import { paperTheme } from '@/src/theme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  anchor: 'index',
};

SplashScreen.preventAutoHideAsync();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: paperTheme.colors.background,
    card: paperTheme.colors.elevation.level2,
    text: paperTheme.colors.onBackground,
    border: paperTheme.colors.outlineVariant,
    primary: paperTheme.colors.secondary,
  },
};

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={paperTheme}>
        <ThemeProvider value={navTheme}>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen
              name="settings"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="strava-callback"
              options={{
                title: 'Strava',
                headerStyle: { backgroundColor: paperTheme.colors.elevation.level2 },
                headerTintColor: paperTheme.colors.onBackground,
              }}
            />
          </Stack>
        </ThemeProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
