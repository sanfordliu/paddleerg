import { StyleSheet, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Button, Text, useTheme } from 'react-native-paper';
import { Notice } from '@/src/components/Notice';
import { StravaConnectButton } from '@/src/components/StravaConnectButton';
import { useStravaStore } from '@/src/store/stravaStore';
import { accents, space } from '@/src/theme';
import type { LiveMetrics, WorkoutSample } from '@/src/ble/types';

interface Props {
  workout: {
    startedAt: number;
    endedAt: number;
    metrics: LiveMetrics;
    samples: WorkoutSample[];
  };
  onDismiss: () => void;
}

/** Post-save share strip — flat layout, no card chrome. */
export function ShareWorkout({ workout, onDismiss }: Props) {
  const theme = useTheme();
  const tokens = useStravaStore((s) => s.tokens);
  const sportType = useStravaStore((s) => s.sportType);
  const status = useStravaStore((s) => s.status);
  const clearStatus = useStravaStore((s) => s.clearStatus);
  const shareWorkout = useStravaStore((s) => s.shareWorkout);
  const uploading = status === 'Uploading to Strava…';

  const dismiss = () => {
    clearStatus();
    onDismiss();
  };

  const onUpload = () => {
    void shareWorkout({
      name: `paddleerg ${new Date(workout.startedAt).toLocaleString()}`,
      startedAt: workout.startedAt,
      endedAt: workout.endedAt,
      metrics: workout.metrics,
      samples: workout.samples,
      sportType,
    }).catch(() => {});
  };

  return (
    <View style={styles.wrap}>
      <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
        Share workout
      </Text>

      <View style={styles.actions}>
        {tokens ? (
          <View style={styles.uploadBlock}>
            <Button
              mode="contained"
              buttonColor={accents.strava}
              loading={uploading}
              disabled={uploading}
              icon={({ size, color }) => <FontAwesome5 name="strava" size={size} color={color} />}
              onPress={onUpload}>
              Upload to Strava
            </Button>
            {status ? (
              <Notice
                tone={/error|fail/i.test(status) ? 'error' : 'info'}
                message={status}
                onDismiss={clearStatus}
              />
            ) : null}
          </View>
        ) : (
          <StravaConnectButton />
        )}
        <Button mode="text" onPress={dismiss}>
          Dismiss
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space.md,
    marginTop: space.sm,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  uploadBlock: {
    alignItems: 'flex-start',
    gap: space.sm,
    flexShrink: 1,
  },
});
