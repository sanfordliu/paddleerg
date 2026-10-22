import { MD3DarkTheme, type MD3Theme } from 'react-native-paper';

/** App-specific accents not in MD3 (Strava brand, live indicator, band tints). */
export const accents = {
  strava: '#fc4c02',
  live: '#3dd68c',
  bandGreen: '#143222',
  bandYellow: '#3d3214',
  bandRed: '#3d1418',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const paperTheme: MD3Theme = {
  ...MD3DarkTheme,
  roundness: 12,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#1f6feb',
    onPrimary: '#ffffff',
    primaryContainer: '#163d7a',
    onPrimaryContainer: '#d6e4ff',
    secondary: '#4da3ff',
    onSecondary: '#041525',
    secondaryContainer: '#1a3555',
    onSecondaryContainer: '#c5daf0',
    tertiary: '#2ea043',
    onTertiary: '#ffffff',
    tertiaryContainer: '#143222',
    onTertiaryContainer: '#b7f0c8',
    error: '#e5484d',
    onError: '#ffffff',
    errorContainer: '#8b2e2e',
    onErrorContainer: '#ffb4b4',
    background: '#071525',
    onBackground: '#f4f8fc',
    surface: '#0f2744',
    onSurface: '#f4f8fc',
    surfaceVariant: '#132a45',
    onSurfaceVariant: '#8eb6d8',
    outline: '#2a4d73',
    outlineVariant: '#1c3a5f',
    inverseSurface: '#f4f8fc',
    inverseOnSurface: '#071525',
    inversePrimary: '#9ec5e8',
    elevation: {
      ...MD3DarkTheme.colors.elevation,
      level0: 'transparent',
      level1: '#0f2744',
      level2: '#132a45',
      level3: '#183352',
      level4: '#1a3555',
      level5: '#1c3a5f',
    },
  },
};
