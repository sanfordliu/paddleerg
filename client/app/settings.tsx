import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { PrimaryTabs, type PrimaryTab } from '@/src/components/PrimaryTabs';
import { ScreenPanel } from '@/src/components/ScreenPanel';
import { AdvancedTab } from '@/src/components/settings/AdvancedTab';
import { AthleteTab } from '@/src/components/settings/AthleteTab';
import { ConnectionsTab } from '@/src/components/settings/ConnectionsTab';
import { DisplayTab } from '@/src/components/settings/DisplayTab';
import { useStravaStore } from '@/src/store/stravaStore';
import { space } from '@/src/theme';

type SettingsTab = 'display' | 'athlete' | 'connections' | 'advanced';

const TABS: readonly PrimaryTab<SettingsTab>[] = [
  { key: 'display', label: 'Display', icon: 'view-dashboard-outline' },
  { key: 'athlete', label: 'Athlete', icon: 'account-outline' },
  { key: 'connections', label: 'Connections', icon: 'bluetooth' },
  { key: 'advanced', label: 'Advanced', icon: 'tune-variant' },
];

function isSettingsTab(value: unknown): value is SettingsTab {
  return TABS.some((t) => t.key === value);
}

export default function SettingsScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const tab: SettingsTab = isSettingsTab(params.tab) ? params.tab : 'display';
  const hydrate = useStravaStore((s) => s.hydrate);
  const scrollRef = useRef<ScrollViewInstance>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [tab]);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <ScreenPanel
      title="Settings"
      onClose={close}
      closeAccessibilityLabel="Close settings"
      scroll={false}>
      <PrimaryTabs
        tabs={TABS}
        value={tab}
        onChange={(next) => router.setParams({ tab: next })}
      />
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.column}>
          {tab === 'display' ? <DisplayTab /> : null}
          {tab === 'athlete' ? <AthleteTab /> : null}
          {tab === 'connections' ? <ConnectionsTab /> : null}
          {tab === 'advanced' ? <AdvancedTab /> : null}
        </View>
      </ScrollView>
    </ScreenPanel>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: space.md,
    paddingBottom: 48,
  },
  column: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
});
