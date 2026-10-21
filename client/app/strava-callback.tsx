import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { useStravaStore } from '@/src/store/stravaStore';
import { accents } from '@/src/theme';

export default function StravaCallbackScreen() {
  const params = useLocalSearchParams<{ sid?: string; error?: string; state?: string }>();
  const completeOAuthSession = useStravaStore((s) => s.completeOAuthSession);
  const setStatus = useStravaStore((s) => s.setStatus);
  const router = useRouter();
  const [message, setMessage] = useState('Finishing Strava connection…');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (params.error) {
        const msg = `Strava error: ${params.error}`;
        setStatus(msg);
        setMessage(msg);
        setDone(true);
        return;
      }
      if (!params.sid) {
        const msg = 'No session id received from server.';
        setStatus(msg);
        setMessage(msg);
        setDone(true);
        return;
      }
      try {
        await completeOAuthSession(String(params.sid));
        if (!cancelled) {
          setMessage('Connected to Strava.');
          setDone(true);
          setTimeout(() => router.replace('/'), 800);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e);
          setStatus(msg);
          setMessage(msg);
          setDone(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.sid, params.error, completeOAuthSession, setStatus, router]);

  return (
    <View style={styles.wrap}>
      {!done ? <ActivityIndicator color={accents.strava} size="large" /> : null}
      <Text variant="bodyLarge" style={styles.text}>
        {message}
      </Text>
      {done ? (
        <Link href="/" asChild>
          <Button mode="contained">Continue</Button>
        </Link>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  text: { textAlign: 'center' },
});
