import { Platform, Alert } from 'react-native';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.body.style.backgroundColor = '#F3F4F6';
  document.body.style.margin = '0';
}
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const rnAlert = Alert as any;
  rnAlert.alert = (title: string, message?: string, buttons?: any[]) => {
    const fullMessage = message ? `${title}\n\n${message}` : String(title);

    if (!buttons || buttons.length === 0) {
      window.alert(fullMessage);
      return;
    }
    if (buttons.length === 1) {
      window.alert(fullMessage);
      buttons[0].onPress?.();
      return;
    }
    const confirmed = window.confirm(fullMessage);
    if (confirmed) {
      const positive = buttons.find((b) => b.style !== 'cancel');
      positive?.onPress?.();
      } else {
      const cancel = buttons.find((b) => b.style === 'cancel');
      cancel?.onPress?.();
    }
  };
}

export const webContainerStyle: any = Platform.OS === 'web' ? {
  width: 1000,
  maxWidth: '100%',
  marginLeft: 'auto',      
  marginRight: 'auto',   
  // minHeight: '100vh',
  // marginLeft: 'max(240px, calc(50% - 430px))',
  backgroundColor: '#FFFFFF',
  borderRightWidth: 1,
  borderRightColor: '#E5E7EB',
  shadowColor: '#000',
  shadowOpacity: 0.04,
  shadowRadius: 12,
  elevation: 1,
} : {};

export const webAuthContainerStyle: any = Platform.OS === 'web' ? {
  flex: 1,
  width: '100%',
  maxWidth: 440,
  alignSelf: 'center',
  justifyContent: 'center',
  paddingVertical: 40,
  backgroundColor: 'transparent',
  borderWidth: 0,
} : {};

export const webAuthCardStyle = Platform.OS === 'web' ? {
  width: '100%',
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 32,
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 24,
  elevation: 4,
} : { width: '100%' };