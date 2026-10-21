import { Button } from 'react-native-paper';
import { isWebBluetoothSupported } from '@/src/ble/adapter';
import { useWorkoutStore } from '@/src/store/workoutStore';

interface Props {
  label?: string;
}

export function ConnectButton({ label = 'Connect' }: Props) {
  const connection = useWorkoutStore((s) => s.connection);
  const chooseFtmsDevice = useWorkoutStore((s) => s.chooseFtmsDevice);
  const busy = connection === 'connecting';
  const disabled = !isWebBluetoothSupported() || busy;

  // Avoid Paper `loading` on web: its ActivityIndicator uses RN Animated with
  // useNativeDriver, which is unsupported and spams the console.
  return (
    <Button
      mode="contained"
      icon="bluetooth"
      disabled={disabled}
      onPress={() => {
        void chooseFtmsDevice();
      }}>
      {busy ? 'Connecting…' : label}
    </Button>
  );
}
