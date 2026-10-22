import { useState } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Icon, Surface, Text, useTheme } from 'react-native-paper';
import type { MetricDef } from '@/src/metrics/catalog';
import type { LiveMetrics } from '@/src/ble/types';
import { resolveMaxHr } from '@/src/metrics/bandDefaults';
import {
  evaluateHrZone,
  evaluateTarget,
  isTargetMetricId,
  type HrZone,
  type TargetResult,
} from '@/src/metrics/bands';
import { useAthleteStore } from '@/src/store/athleteStore';
import { accents } from '@/src/theme';

interface Props {
  def: MetricDef;
  metrics: LiveMetrics;
  controlSize?: number;
}

const ZONE_TINT: Record<HrZone, string> = {
  1: accents.zone1,
  2: accents.zone2,
  3: accents.zone3,
  4: accents.zone4,
  5: accents.zone5,
};

function targetTint(result: TargetResult): string {
  if (result.side === 'in') return accents.targetIn;
  if (result.side === 'under') return result.far ? accents.targetUnderFar : accents.targetUnderNear;
  return result.far ? accents.targetOverFar : accents.targetOverNear;
}

function chromeTypeScale(width: number, height: number) {
  const cols = width < height ? 2 : width < 900 ? 2 : 3;
  const rows = Math.ceil(6 / cols);
  const cellH = (height - 100) / rows;
  const label = Math.round(Math.min(42, Math.max(20, cellH * 0.09)));
  const unit = Math.round(Math.min(36, Math.max(18, cellH * 0.075)));
  const control = Math.round(Math.min(56, Math.max(32, cellH * 0.12)));
  return { label, unit, control };
}

let measureCanvas: HTMLCanvasElement | null = null;

function measureTextWidth(text: string, fontSize: number): number {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    if (!measureCanvas) measureCanvas = document.createElement('canvas');
    const ctx = measureCanvas.getContext('2d');
    if (ctx) {
      ctx.font = `700 ${fontSize}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
      return ctx.measureText(text).width;
    }
  }
  return text.length * fontSize * 0.62;
}

function fitFontSize(text: string, boxW: number, boxH: number): number {
  if (boxW <= 0 || boxH <= 0 || !text) return 24;
  const maxByHeight = boxH * 0.8;
  const maxByWidthGuess = boxW * 0.98;
  let hi = Math.min(maxByHeight, maxByWidthGuess, 400);
  let lo = 12;
  if (measureTextWidth(text, hi) <= boxW * 0.98) {
    return Math.max(12, Math.floor(hi));
  }
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    if (measureTextWidth(text, mid) <= boxW * 0.98) lo = mid;
    else hi = mid;
  }
  return Math.max(12, Math.floor(lo));
}

export function MetricTile({ def, metrics }: Props) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const rawValue = def.getValue(metrics);
  const display = def.format(rawValue);
  const targetConfig = useAthleteStore((s) =>
    isTargetMetricId(def.id) ? s.bands[def.id] : undefined
  );
  const hrZones = useAthleteStore((s) => s.hrZones);
  const birthYear = useAthleteStore((s) => s.profile.birthYear);

  const target = isTargetMetricId(def.id)
    ? evaluateTarget(rawValue, targetConfig, def.id)
    : null;
  const zone =
    def.id === 'heartRate'
      ? evaluateHrZone(rawValue, hrZones, resolveMaxHr(hrZones, birthYear))
      : null;
  const background = zone
    ? ZONE_TINT[zone]
    : target
      ? targetTint(target)
      : theme.colors.surface;

  const chrome = chromeTypeScale(width, height);
  const [valueBox, setValueBox] = useState({ width: 0, height: 0 });
  const valueFont = fitFontSize(display, valueBox.width, valueBox.height);

  const onValueLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (Math.abs(w - valueBox.width) > 1 || Math.abs(h - valueBox.height) > 1) {
      setValueBox({ width: w, height: h });
    }
  };

  return (
    <Surface
      style={[
        styles.tile,
        {
          backgroundColor: background,
          borderColor: theme.colors.outlineVariant,
          borderStyle: 'solid',
          borderWidth: 1,
          paddingTop: 16,
        },
      ]}
      elevation={1}
      mode="flat">
      <View style={styles.header}>
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            {
              color: theme.colors.onSurfaceVariant,
              fontSize: chrome.label,
              lineHeight: Math.round(chrome.label * 1.2),
            },
          ]}>
          {def.label}
        </Text>
        {zone ? (
          <View
            accessibilityLabel={`Heart rate zone ${zone}`}
            style={[styles.zoneChip, { borderColor: theme.colors.onSurfaceVariant }]}>
            <Text
              style={{
                color: theme.colors.onSurface,
                fontSize: Math.round(chrome.label * 0.8),
                lineHeight: Math.round(chrome.label * 1.05),
                fontWeight: '700',
              }}>
              {`Z${zone}`}
            </Text>
          </View>
        ) : null}
        {target && target.side !== 'in' ? (
          <View
            accessible
            accessibilityLabel={
              target.side === 'over' ? 'Above target, ease off' : 'Below target, push harder'
            }>
            <Icon
              source={target.side === 'over' ? 'arrow-up-bold' : 'arrow-down-bold'}
              size={Math.round(chrome.label * 1.3)}
              color={theme.colors.onSurface}
            />
          </View>
        ) : null}
      </View>

      <View style={styles.valueWrap} onLayout={onValueLayout}>
        <Text
          numberOfLines={1}
          style={[
            styles.valueText,
            {
              color: theme.colors.onSurface,
              fontSize: valueFont,
              lineHeight: Math.round(valueFont * 1.05),
            },
          ]}>
          {display}
        </Text>
      </View>

      <Text
        numberOfLines={1}
        style={[
          styles.unit,
          {
            color: theme.colors.onSurface,
            fontSize: chrome.unit,
            lineHeight: Math.round(chrome.unit * 1.2),
            opacity: def.unit ? 1 : 0,
          },
        ]}>
        {def.unit || ' '}
      </Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexShrink: 0,
  },
  label: { fontWeight: '600', flexShrink: 1 },
  zoneChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  valueWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    minHeight: 0,
    width: '100%',
    overflow: 'hidden',
  },
  valueText: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    ...(Platform.OS === 'web'
      ? ({ whiteSpace: 'nowrap', textOverflow: 'clip', overflow: 'hidden' } as object)
      : null),
  },
  unit: { fontWeight: '500', alignSelf: 'flex-start', flexShrink: 0 },
});
