import { Button } from 'react-native-paper';
import { isWebBluetoothSupported } from '@/src/ble/adapter';
import { useWorkoutStore } from '@/src/store/workoutStore';

interface Props {
  label?: string;
}

export function ConnectButton({ label = 'Connect' }: Props) {
  const connection = useWorkoutStore((s) => s.connection);
  const chooseFtmsDevice = useWorkoutStore((s) => s.chooseFtmsDevice);
  const connecting = connection === 'connecting';
  const disabled = !isWebBluetoothSupported() || connecting;

  return (
    <Button
      mode="contained"
      icon="bluetooth"
      loading={connecting}
      disabled={disabled}
      onPress={() => {
        void chooseFtmsDevice();
      }}>
      {label}
    </Button>
  );
}
