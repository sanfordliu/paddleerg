import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, TextInput, useTheme } from 'react-native-paper';
import { SelectMenu } from '@/src/components/SelectMenu';
import { HrZonesRow } from '@/src/components/settings/HrZonesRow';
import { SettingsSection } from '@/src/components/settings/SettingsSection';
import { TargetRow } from '@/src/components/settings/TargetRow';
import { ageFromBirthYear } from '@/src/metrics/bandDefaults';
import { TARGET_METRIC_IDS, type BandableMetricId } from '@/src/metrics/bands';
import {
  useAthleteStore,
  type AthleteGender,
  type FitnessLevel,
} from '@/src/store/athleteStore';
import { useStravaStore } from '@/src/store/stravaStore';
import { space } from '@/src/theme';

const GENDER_OPTIONS: { value: AthleteGender; label: string }[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other / prefer not to say' },
];

const FITNESS_OPTIONS: { value: FitnessLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

function BirthYearField({
  birthYear,
  onCommit,
}: {
  birthYear: number | null;
  onCommit: (birthYear: number | null) => void;
}) {
  const theme = useTheme();
  const [text, setText] = useState(birthYear != null ? String(birthYear) : '');
  const age = ageFromBirthYear(birthYear);

  const commit = () => {
    const t = text.trim();
    if (!t) {
      if (birthYear != null) onCommit(null);
      return;
    }
    const y = Number(t);
    if (!Number.isFinite(y) || y < 1900 || y > new Date().getFullYear()) return;
    if (Math.round(y) !== birthYear) onCommit(Math.round(y));
  };

  return (
    <View style={styles.birthRow}>
      <TextInput
        mode="outlined"
        dense
        label="Birth year"
        value={text}
        onChangeText={setText}
        onBlur={commit}
        onSubmitEditing={commit}
        keyboardType="number-pad"
        style={styles.birthInput}
      />
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        Age: {age != null ? age : '—'}
      </Text>
    </View>
  );
}

/** Athlete profile plus the heart-rate zones and targets derived from it. */
export function AthleteTab() {
  const theme = useTheme();
  const sportType = useStravaStore((s) => s.sportType);
  const profile = useAthleteStore((s) => s.profile);
  const setProfile = useAthleteStore((s) => s.setProfile);
  const applyDefaults = useAthleteStore((s) => s.applyDefaults);

  const [expanded, setExpanded] = useState<BandableMetricId | null>(null);

  const toggle = (id: BandableMetricId) => setExpanded((cur) => (cur === id ? null : id));

  return (
    <View>
      <SettingsSection
        title="Profile"
        hint="Used to suggest heart-rate zones and targets for SPM, pace and power.">
        <View style={styles.profileFields}>
          <BirthYearField
            key={profile.birthYear ?? 'none'}
            birthYear={profile.birthYear}
            onCommit={(birthYear) => {
              setProfile({ birthYear });
              applyDefaults(sportType, false);
            }}
          />
          <View style={styles.field}>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>
              Gender
            </Text>
            <SelectMenu
              value={(profile.gender ?? 'other') as AthleteGender}
              options={GENDER_OPTIONS}
              onChange={(value) => {
                setProfile({ gender: value });
                applyDefaults(sportType, false);
              }}
              accessibilityLabel="Gender"
            />
          </View>
          <View style={styles.field}>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>
              Fitness level
            </Text>
            <SelectMenu
              value={profile.fitnessLevel}
              options={FITNESS_OPTIONS}
              onChange={(value) => {
                setProfile({ fitnessLevel: value });
                applyDefaults(sportType, false);
              }}
              accessibilityLabel="Fitness level"
            />
          </View>
        </View>
      </SettingsSection>

      <SettingsSection
        title="Heart rate zones"
        hint="The heart-rate tile is colored by intensity zone, from gray (easy) to red (max).">
        <HrZonesRow
          expanded={expanded === 'heartRate'}
          onToggleExpanded={() => toggle('heartRate')}
        />
      </SettingsSection>

      <SettingsSection
        title="Targets"
        hint="Green is on target. Blue means under, orange or red means over. Arrows show whether to push or ease off.">
        {TARGET_METRIC_IDS.map((id) => (
          <TargetRow
            key={id}
            id={id}
            expanded={expanded === id}
            onToggleExpanded={() => toggle(id)}
          />
        ))}
      </SettingsSection>

      <View style={styles.footer}>
        <Button
          mode="outlined"
          textColor={theme.colors.onSurface}
          onPress={() => applyDefaults(sportType, true)}
          style={styles.reset}>
          Reset all zones and targets to profile defaults
        </Button>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Coaching heuristics, not medical advice. Zones and targets follow your profile until you
          edit them.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  profileFields: {
    marginHorizontal: space.md,
    gap: space.lg,
  },
  birthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
  },
  birthInput: {
    width: 160,
  },
  field: {
    gap: space.sm,
    alignItems: 'flex-start',
  },
  footer: {
    marginHorizontal: space.md,
    gap: space.md,
  },
  reset: {
    alignSelf: 'flex-start',
  },
});
