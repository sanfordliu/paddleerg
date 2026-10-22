import { StyleSheet, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Button, Text, useTheme } from 'react-native-paper';
import { AppModal } from '@/src/components/AppModal';
import { Notice } from '@/src/components/Notice';
import { StravaConnectButton } from '@/src/components/StravaConnectButton';
import { formatDuration, formatPace } from '@/src/metrics/catalog';
import { useStravaStore } from '@/src/store/stravaStore';
import { accents, space } from '@/src/theme';
import type { LiveMetrics, WorkoutSample } from '@/src/ble/types';

interface Props {
  visible: boolean;
  workout: {
    startedAt: number;
    endedAt: number;
    metrics: LiveMetrics;
    samples: WorkoutSample[];
  };
  onDismiss: () => void;
}

function statusTone(status: string): 'error' | 'success' | 'info' {
  if (/error|fail/i.test(status)) return 'error';
  if (/uploaded|connected/i.test(status)) return 'success';
  return 'info';
}

function friendlyStatus(status: string): string {
  if (status === 'Uploading to Strava…') return 'Uploading to Strava…';
  const uploaded = status.match(/^Uploaded activity #(\d+)/);
  if (uploaded) return `Uploaded to Strava (activity ${uploaded[1]}).`;
  if (status.startsWith('Upload error:')) {
    return status.replace(/^Upload error:\s*/i, '');
  }
  if (status.startsWith('Upload status:')) {
    return status.replace(/^Upload status:\s*/i, '');
  }
  return status;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.summaryRow}>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
      <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
        {value}
      </Text>
    </View>
  );
}

/** Post-save share flow as a standard AppModal. */
export function ShareWorkout({ visible, workout, onDismiss }: Props) {
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

  const elapsed =
    workout.metrics.elapsedSeconds ??
    Math.max(1, Math.round((workout.endedAt - workout.startedAt) / 1000));
  const distance =
    workout.metrics.distanceMeters != null
      ? `${Math.round(workout.metrics.distanceMeters)} m`
      : '—';
  const pace = formatPace(workout.metrics.averagePaceSecondsPer500m);
  const when = new Date(workout.startedAt).toLocaleString();

  return (
    <AppModal
      visible={visible}
      title="Share workout"
      onClose={dismiss}
      closeAccessibilityLabel="Close share workout">
      <View style={styles.content}>
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
          Workout saved. Upload it to Strava or close this screen.
        </Text>

        <View
          style={[
            styles.summary,
            {
              backgroundColor: theme.colors.surfaceVariant,
              borderRadius: theme.roundness,
            },
          ]}>
          <SummaryRow label="Started" value={when} />
          <SummaryRow label="Duration" value={formatDuration(elapsed)} />
          <SummaryRow label="Distance" value={distance} />
          <SummaryRow label="Avg pace" value={pace === '—' ? '—' : `${pace} /500m`} />
        </View>

        {tokens ? (
          <View style={styles.actions}>
            <Button
              mode="contained"
              buttonColor={accents.strava}
              loading={uploading}
              disabled={uploading}
              icon={({ size, color }) => <FontAwesome5 name="strava" size={size} color={color} />}
              onPress={onUpload}
              contentStyle={styles.ctaContent}
              style={styles.cta}>
              {uploading ? 'Uploading…' : 'Upload to Strava'}
            </Button>
            {status && !uploading ? (
              <Notice
                tone={statusTone(status)}
                message={friendlyStatus(status)}
                onDismiss={clearStatus}
              />
            ) : null}
          </View>
        ) : (
          <View style={styles.actions}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Connect Strava to upload this workout.
            </Text>
            <StravaConnectButton />
          </View>
        )}
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: space.lg,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
  },
  summary: {
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    gap: space.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: space.md,
  },
  actions: {
    gap: space.md,
    alignItems: 'stretch',
  },
  cta: {
    alignSelf: 'stretch',
  },
  ctaContent: {
    height: 48,
  },
});
