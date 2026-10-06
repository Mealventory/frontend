import React, {createContext, useContext, useEffect, useRef, useState} from 'react';
import {AppState, Platform} from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import {useAuth} from './AuthContext';
import {setSignOutCleanup} from '../lib/account';
import {updatePushDevice} from '../lib/pushApi';

const key = 'mealventory.pushRegistration';
async function getTokenWithTimeout(notifications: typeof import('expo-notifications'), projectId: string) {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      notifications.getExpoPushTokenAsync({projectId}),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Getting the push token timed out. Please retry.')), 15000); }),
    ]);
  } finally { clearTimeout(timer!); }
}
const unavailable = Platform.OS === 'web' ? 'Push notifications are not available in the web app.'
  : Constants.appOwnership === 'expo' ? 'Push notifications need a development build; Expo Go is not supported.'
  : !Device.isDevice ? 'Use a physical phone to enable notifications.' : '';
const Context = createContext({status: '', busy: false, enable: async () => {}});
export const useNotifications = () => useContext(Context);

export function NotificationProvider({children}: {children: React.ReactNode}) {
  const {session, e2eMode} = useAuth();
  const current = useRef(session); current.current = session;
  const generation = useRef(0);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const [status, setStatus] = useState(unavailable || 'Notifications have not been enabled.');
  const [busy, setBusy] = useState(false);
  const enqueue = (task: () => Promise<void>) => {
    const result = queue.current.catch(() => {}).then(task);
    queue.current = result;
    return result;
  };
  const sync = (ask = false) => {
    const expected = generation.current;
    const user = current.current;
    if (e2eMode || unavailable || !user) return Promise.resolve();
    return enqueue(async () => {
      const valid = () => expected === generation.current && current.current?.user.id === user.user.id;
      if (!valid()) return;
      setBusy(true);
      try {
        const Notifications = await import('expo-notifications');
        const projectId = Constants.easConfig?.projectId || Constants.expoConfig?.extra?.eas?.projectId;
        if (!projectId) throw new Error('Notifications need an EAS project ID configured in this build.');
        if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('default', {
          name: 'Mealventory', importance: Notifications.AndroidImportance.DEFAULT,
        });
        let permission = await Notifications.getPermissionsAsync();
        if (ask && !permission.granted && permission.canAskAgain) permission = await Notifications.requestPermissionsAsync();
        if (!valid()) return;
        if (!permission.granted) {
          const previous = await SecureStore.getItemAsync(key);
          if (previous) { await updatePushDevice(user.access_token, previous); await SecureStore.deleteItemAsync(key); }
          if (valid()) setStatus(permission.canAskAgain ? 'Notifications are off. Tap Enable when ready.' : 'Permission denied. Enable notifications in your phone settings, then retry.');
          return;
        }
        const token = (await getTokenWithTimeout(Notifications, projectId)).data;
        if (!valid()) return;
        const previous = await SecureStore.getItemAsync(key);
        if (previous && previous !== token) await updatePushDevice(user.access_token, previous);
        // Remember before registration so uncertain request outcomes can still be cleaned up.
        await SecureStore.setItemAsync(key, token);
        await updatePushDevice(user.access_token, token, Platform.OS as 'ios' | 'android');
        if (!valid()) { await updatePushDevice(user.access_token, token); return; }
        setStatus('This phone is registered for Mealventory alerts.');
      } catch (error) {
        if (valid()) setStatus(error instanceof Error ? error.message : 'Could not register notifications. Please retry.');
      } finally { setBusy(false); }
    });
  };
  useEffect(() => {
    generation.current++;
    if (e2eMode) {
      setStatus('Notifications are disabled in E2E mode.');
      return;
    }
    if (unavailable) return;
    const previous = session;
    setStatus('Notifications have not been enabled.');
    void sync();
    let subscription: {remove: () => void} | undefined;
    let active = true;
    void import('expo-notifications').then(notifications => {
      notifications.setNotificationHandler?.({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      if (active && previous) subscription = notifications.addPushTokenListener(() => { void sync(); });
    }).catch(() => { if (active) setStatus('Notifications are unavailable in this build.'); });
    const foreground = AppState.addEventListener('change', state => { if (state === 'active') void sync(); });
    return () => {
      active = false; generation.current++; subscription?.remove(); foreground.remove();
      if (previous) void enqueue(async () => {
        const token = await SecureStore.getItemAsync(key);
        if (token) await updatePushDevice(previous.access_token, token);
      }).catch(() => {});
    };
  }, [session?.user.id, e2eMode]);
  useEffect(() => {
    if (e2eMode || unavailable) return;
    return setSignOutCleanup(async () => {
      const user = current.current;
      generation.current++;
      await enqueue(async () => {
        const token = await SecureStore.getItemAsync(key);
        if (token && user) {
          await updatePushDevice(user.access_token, token);
          await SecureStore.deleteItemAsync(key);
        }
      });
    });
  }, [e2eMode]);
  return <Context.Provider value={{status, busy, enable: () => sync(true)}}>{children}</Context.Provider>;
}
