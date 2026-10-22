import { Button } from 'react-native-paper';
import { isWebBluetoothSupported } from '@/src/ble/adapter';
import { useWorkoutStore } from '@/src/store/workoutStore';

type ConnectKind = 'erg' | 'hr';

interface Props {
  kind?: ConnectKind;
  label?: string;
}

export function ConnectButton({ kind = 'erg', label }: Props) {
  const connection = useWorkoutStore((s) => s.connection);
  const hrConnection = useWorkoutStore((s) => s.hrConnection);
  const chooseFtmsDevice = useWorkoutStore((s) => s.chooseFtmsDevice);
  const chooseHrDevice = useWorkoutStore((s) => s.chooseHrDevice);

  const isHr = kind === 'hr';
  const busy = isHr ? hrConnection === 'connecting' : connection === 'connecting';
  const disabled = !isWebBluetoothSupported() || busy;
  const defaultLabel = isHr ? 'Connect HR' : 'Connect ERG';

  // Avoid Paper `loading` on web: its ActivityIndicator uses RN Animated with
  // useNativeDriver, which is unsupported and spams the console.
  return (
    <Button
      mode="contained"
      icon={isHr ? 'heart' : 'bluetooth'}
      disabled={disabled}
      onPress={() => {
        void (isHr ? chooseHrDevice() : chooseFtmsDevice());
      }}>
      {busy ? 'Connecting…' : (label ?? defaultLabel)}
    </Button>
  );
}
