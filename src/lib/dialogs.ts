import { Alert, Platform } from 'react-native';

// o Alert do react-native-web não mostra nada: na web usamos os diálogos do navegador

/** pede confirmação antes de uma ação destrutiva */
export function confirmAction(title: string, message: string | undefined, confirmLabel: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(message ? `${title}\n\n${message}` : title)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

export function showError(title: string, message: string) {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}
