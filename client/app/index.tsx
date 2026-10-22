import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton, Text, useTheme } from 'react-native-paper';
import { ConnectButton } from '@/src/components/ConnectButton';
import { MetricGrid } from '@/src/components/MetricGrid';
import { Notice } from '@/src/components/Notice';
import { ShareWorkout } from '@/src/components/ShareWorkout';
import { WorkoutTypeSelect } from '@/src/components/WorkoutTypeSelect';
import { useLayoutStore } from '@/src/store/layoutStore';
import { useStravaStore } from '@/src/store/stravaStore';
import { useWorkoutStore } from '@/src/store/workoutStore';
import { space } from '@/src/theme';

export default function WorkoutScreen() {
  const theme = useTheme();
  const connection = useWorkoutStore((s) => s.connection);
  const hrConnection = useWorkoutStore((s) => s.hrConnection);
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
  const beginAutoReconnect = useWorkoutStore((s) => s.beginAutoReconnect);

  const connected = connection === 'connected';
  const reconnecting = connection === 'reconnecting';
  const hrConnected = hrConnection === 'connected';
  const hrReconnecting = hrConnection === 'reconnecting';

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    beginAutoReconnect();
  }, [beginAutoReconnect]);

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
      edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.shell}>
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
          </View>

          <View style={styles.headerActions}>
            {connected ? <WorkoutTypeSelect /> : null}
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
            {!connected ? (
              <ConnectButton
                kind="erg"
                label={reconnecting ? 'Choose ERG' : 'Connect ERG'}
              />
            ) : null}
            {!hrConnected ? (
              <ConnectButton
                kind="hr"
                label={hrReconnecting ? 'Choose HR' : 'Connect HR'}
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

        {error ? <Notice tone="error" message={error} onDismiss={clearError} /> : null}

        <View style={styles.board}>
          <MetricGrid metrics={metrics} />
        </View>

        {lastSavedSummary ? (
          <ShareWorkout
            visible
            workout={lastSavedSummary}
            onDismiss={clearSaved}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  shell: {
    flex: 1,
    width: '100%',
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.md,
    gap: space.md,
    minHeight: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    minHeight: 48,
    flexShrink: 0,
  },
  headerLeft: { flex: 1, minWidth: 0 },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginLeft: -8 },
  brandIcon: { margin: 0 },
  brand: { fontWeight: '800', letterSpacing: -0.4 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: space.xs,
  },
  board: { flex: 1, minHeight: 0 },
});
