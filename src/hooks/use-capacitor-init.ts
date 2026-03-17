import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Keyboard } from '@capacitor/keyboard';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Initialize native Android integrations when running inside Capacitor.
 */
export function useCapacitorInit() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const platform = Capacitor.getPlatform();
    document.documentElement.classList.add('platform-native', `platform-${platform}`);

    const keyboardShow = Keyboard.addListener('keyboardDidShow', (event) => {
      document.documentElement.style.setProperty('--keyboard-offset', `${event.keyboardHeight}px`);
    });

    const keyboardHide = Keyboard.addListener('keyboardDidHide', () => {
      document.documentElement.style.setProperty('--keyboard-offset', '0px');
    });

    const backButton = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      const backEvent = new CustomEvent('prnote:android-back', { cancelable: true });
      const shouldContinue = window.dispatchEvent(backEvent);

      if (!shouldContinue) {
        return;
      }

      if (canGoBack && window.history.length > 1) {
        window.history.back();
        return;
      }

      CapacitorApp.exitApp();
    });

    const initNativeUi = async () => {
      try {
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#0A0A0A' });
      } catch (error) {
        console.debug('[Capacitor] Native UI init skipped:', error);
      }
    };

    initNativeUi();

    return () => {
      keyboardShow.then((handle) => handle.remove());
      keyboardHide.then((handle) => handle.remove());
      backButton.then((handle) => handle.remove());
      document.documentElement.style.setProperty('--keyboard-offset', '0px');
      document.documentElement.classList.remove('platform-native', `platform-${platform}`);
    };
  }, []);
}
