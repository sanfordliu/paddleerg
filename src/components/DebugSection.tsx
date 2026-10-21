import { StyleSheet, View } from 'react-native';
import { Button, List, Text, useTheme } from 'react-native-paper';
import { KNOWN_CHARACTERISTICS, shortUuid, normalizeUuid } from '@/src/ble/constants';
import type { LiveMetrics } from '@/src/ble/types';
import {
  useWorkoutStore,
  type NotificationLogEntry,
} from '@/src/store/workoutStore';
import { space } from '@/src/theme';

const METRIC_LABELS: { key: keyof LiveMetrics; label: string; format: (v: number) => string }[] = [
  { key: 'elapsedSeconds', label: 'Time', format: (v) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}` },
  { key: 'distanceMeters', label: 'Distance', format: (v) => `${Math.round(v)} m` },
  { key: 'strokeRateSpm', label: 'SPM', format: (v) => `${v.toFixed(1)} /min` },
  { key: 'strokeCount', label: 'Strokes', format: (v) => String(Math.round(v)) },
  {
    key: 'instantaneousPaceSecondsPer500m',
    label: 'Pace',
    format: (v) => `${Math.floor(v / 60)}:${String(Math.round(v % 60)).padStart(2, '0')} /500m`,
  },
  { key: 'instantaneousPowerWatts', label: 'Power', format: (v) => `${Math.round(v)} W` },
  { key: 'heartRateBpm', label: 'Heart rate', format: (v) => `${Math.round(v)} bpm` },
  { key: 'totalEnergyKcal', label: 'Energy', format: (v) => `${Math.round(v)} kcal` },
];

function charLabel(uuid: string): string {
  const n = normalizeUuid(uuid);
  return KNOWN_CHARACTERISTICS[n] ?? `Characteristic ${shortUuid(n)}`;
}

function summarizeParsed(parsed: LiveMetrics | null): string {
  if (!parsed) return 'No FTMS fields parsed';
  const parts = METRIC_LABELS.filter((m) => typeof parsed[m.key] === 'number').map((m) =>
    m.format(parsed[m.key] as number)
  );
  return parts.length > 0 ? parts.slice(0, 4).join(' · ') : 'Empty packet';
}

function formatAge(receivedAt: number): string {
  const sec = Math.max(0, Math.round((Date.now() - receivedAt) / 1000));
  if (sec < 2) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  return `${Math.floor(sec / 60)}m ago`;
}

function packetTitle(entry: NotificationLogEntry): string {
  const time = new Date(entry.receivedAt).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return `${time} · ${charLabel(entry.characteristicUuid)}`;
}

export function DebugSection() {
  const theme = useTheme();
  const connection = useWorkoutStore((s) => s.connection);
  const device = useWorkoutStore((s) => s.device);
  const metrics = useWorkoutStore((s) => s.metrics);
  const gattServices = useWorkoutStore((s) => s.gattServices);
  const notificationLog = useWorkoutStore((s) => s.notificationLog);
  const clearNotificationLog = useWorkoutStore((s) => s.clearNotificationLog);

  const connected = connection === 'connected';
  const latest = notificationLog[0];
  const liveMetrics = METRIC_LABELS.filter((m) => typeof metrics[m.key] === 'number');
  const recent = notificationLog.slice(0, 8);

  return (
    <View>
      <Text
        variant="titleMedium"
        style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
        Debug
      </Text>
      <Text variant="bodySmall" style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
        Connection details and recent FTMS packets. Connect a machine to populate this section.
      </Text>

      <List.Item
        title={connected ? 'Connected' : connection === 'connecting' ? 'Connecting…' : 'Not connected'}
        description={
          device
            ? `${device.name || 'Unnamed device'} · ${device.id.slice(0, 8)}…`
            : 'No device selected'
        }
        left={(props) => (
          <List.Icon {...props} icon={connected ? 'bluetooth-connect' : 'bluetooth-off'} />
        )}
      />

      <List.Item
        title="Last packet"
        description={
          latest
            ? `${formatAge(latest.receivedAt)} · ${charLabel(latest.characteristicUuid)}`
            : 'None yet'
        }
        left={(props) => <List.Icon {...props} icon="pulse" />}
      />

      <Text variant="titleSmall" style={[styles.subhead, { color: theme.colors.onSurface }]}>
        Live metrics
      </Text>
      {liveMetrics.length === 0 ? (
        <Text variant="bodyMedium" style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
          Waiting for FTMS data…
        </Text>
      ) : (
        liveMetrics.map((m) => (
          <List.Item
            key={m.key}
            title={m.label}
            description={m.format(metrics[m.key] as number)}
            style={styles.compactItem}
          />
        ))
      )}

      <Text variant="titleSmall" style={[styles.subhead, { color: theme.colors.onSurface }]}>
        GATT services
      </Text>
      {gattServices.length === 0 ? (
        <Text variant="bodyMedium" style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
          Connect to discover services.
        </Text>
      ) : (
        gattServices.map((svc) => (
          <List.Accordion
            key={svc.uuid}
            title={svc.uuid.includes('1826') ? 'Fitness Machine' : `Service ${shortUuid(svc.uuid)}`}
            description={`${svc.characteristics.length} characteristic${svc.characteristics.length === 1 ? '' : 's'}`}
            left={(props) => <List.Icon {...props} icon="chip" />}>
            {svc.characteristics.map((c) => (
              <List.Item
                key={c.uuid}
                title={c.name || charLabel(c.uuid)}
                description={`${shortUuid(c.uuid)}${c.properties.length ? ` · ${c.properties.join(', ')}` : ''}`}
                style={styles.nestedItem}
              />
            ))}
          </List.Accordion>
        ))
      )}

      <View style={styles.packetsHeader}>
        <Text variant="titleSmall" style={{ color: theme.colors.onSurface, flex: 1 }}>
          Recent packets
        </Text>
        <Button
          mode="text"
          compact
          disabled={notificationLog.length === 0}
          onPress={clearNotificationLog}>
          Clear
        </Button>
      </View>
      {recent.length === 0 ? (
        <Text variant="bodyMedium" style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
          Packets appear here while the machine is streaming.
        </Text>
      ) : (
        recent.map((entry, i) => (
          <List.Item
            key={`${entry.receivedAt}-${i}`}
            title={packetTitle(entry)}
            description={summarizeParsed(entry.parsed)}
            style={styles.compactItem}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginTop: space.lg,
    marginBottom: space.md,
    marginHorizontal: space.md,
    fontWeight: '600',
  },
  hint: {
    marginHorizontal: space.md,
    marginBottom: space.sm,
    lineHeight: 18,
  },
  subhead: {
    marginTop: space.md,
    marginBottom: space.sm,
    marginHorizontal: space.md,
    fontWeight: '600',
  },
  empty: {
    marginHorizontal: space.md,
    marginBottom: space.sm,
  },
  compactItem: {
    paddingVertical: 0,
  },
  nestedItem: {
    paddingLeft: space.lg,
  },
  packetsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space.md,
    marginHorizontal: space.md,
  },
});
