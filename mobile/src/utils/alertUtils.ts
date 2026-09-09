import { Alert, Platform } from 'react-native';

/**
 * Cross-platform confirmation dialog that works reliably on both Web (via window.confirm)
 * and native iOS/Android (via Alert.alert with buttons).
 */
export function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel: string = 'Confirm'
) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      const ok = window.confirm(`${title}\n\n${message}`);
      if (ok) {
        onConfirm();
      }
    } else {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: confirmLabel, style: 'destructive', onPress: onConfirm },
    ]);
  }
}

/**
 * Cross-platform alert message dialog.
 */
export function showAlert(title: string, message?: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
  } else {
    Alert.alert(title, message);
  }
}
