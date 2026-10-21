import { useEffect } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton, Text, useTheme } from 'react-native-paper';
import { ConnectButton } from '@/src/components/ConnectButton';
import { MetricGrid } from '@/src/components/MetricGrid';
import { Notice } from '@/src/components/Notice';
import { ShareWorkout } from '@/src/components/ShareWorkout';
import { useLayoutStore } from '@/src/store/layoutStore';
import { useStravaStore } from '@/src/store/stravaStore';
import { useWorkoutStore } from '@/src/store/workoutStore';
import { space } from '@/src/theme';

export default function WorkoutScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const connection = useWorkoutStore((s) => s.connection);
  const device = useWorkoutStore((s) => s.device);
  const error = useWorkoutStore((s) => s.error);
  const clearError = useWorkoutStore((s) => s.clearError);
  const metrics = useWorkoutStore((s) => s.metrics);
  const phase = useWorkoutStore((s) => s.phase);
  const lastSavedSummary = useWorkoutStore((s) => s.lastSavedSummary);
  const startWorkout = useWorkoutStore((s) => s.startWorkout);
  const stopWorkout = useWorkoutStore((s) => s.stopWorkout);
  const clearSaved = useWorkoutStore((s) => s.clearSaved);

  const editing = useLayoutStore((s) => s.editing);
  const setEditing = useLayoutStore((s) => s.setEditing);

  const hydrate = useStravaStore((s) => s.hydrate);

  const connected = connection === 'connected';
  const maxWidth = Math.min(width, 820);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
      edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.shell, { maxWidth }]}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.brandRow}>
                <IconButton
                  icon="kayaking"
                  size={26}
                  iconColor={theme.colors.onBackground}
                  style={styles.brandIcon}
                />
                <Text
                  variant="headlineSmall"
                  style={[styles.brand, { color: theme.colors.onBackground }]}>
                  paddleerg
                </Text>
              </View>
              {connected ? (
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                  numberOfLines={1}>
                  {device?.name || 'Connected'}
                  {phase === 'active' ? ' · LIVE' : ''}
                </Text>
              ) : null}
            </View>

            <View style={styles.headerActions}>
              {connected && phase !== 'active' ? (
                <IconButton
                  icon="play"
                  mode="contained"
                  containerColor={theme.colors.tertiary}
                  iconColor={theme.colors.onTertiary}
                  accessibilityLabel="Start workout"
                  onPress={startWorkout}
                />
              ) : null}
              {connected && phase === 'active' ? (
                <IconButton
                  icon="stop"
                  mode="contained"
                  containerColor={theme.colors.error}
                  iconColor={theme.colors.onError}
                  accessibilityLabel="Stop and save"
                  onPress={stopWorkout}
                />
              ) : null}
              <IconButton
                icon={editing ? 'check' : 'pencil-outline'}
                mode={editing ? 'contained' : 'contained-tonal'}
                containerColor={editing ? theme.colors.tertiary : undefined}
                iconColor={editing ? theme.colors.onTertiary : theme.colors.onSurface}
                accessibilityLabel={editing ? 'Done editing' : 'Edit tiles'}
                onPress={() => setEditing(!editing)}
              />
              <IconButton
                icon="cog-outline"
                mode="contained-tonal"
                iconColor={theme.colors.onSurface}
                accessibilityLabel="Settings"
                onPress={() => router.push('/settings')}
              />
            </View>
          </View>

          {!connected ? (
            <View style={styles.connectRow}>
              <ConnectButton label="Connect" />
            </View>
          ) : null}

          {error ? <Notice tone="error" message={error} onDismiss={clearError} /> : null}

          <MetricGrid metrics={metrics} />

          {lastSavedSummary ? (
            <ShareWorkout workout={lastSavedSummary} onDismiss={clearSaved} />
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: 40,
    alignItems: 'center',
  },
  shell: { width: '100%', gap: space.md },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.md,
    minHeight: 48,
  },
  headerLeft: { flex: 1, gap: 2, minWidth: 0 },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginLeft: -8 },
  brandIcon: { margin: 0 },
  brand: { fontWeight: '800', letterSpacing: -0.4 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  connectRow: { alignSelf: 'flex-start' },
});
