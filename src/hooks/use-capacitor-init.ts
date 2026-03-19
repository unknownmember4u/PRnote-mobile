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

    const updateNativeInsets = () => {
      const viewport = window.visualViewport;
      const viewportTop = viewport ? Math.max(0, Math.round(viewport.offsetTop)) : 0;
      const rawBottom = viewport
        ? Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop))
        : 0;

      const keyboardOffset = Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--keyboard-offset') || '0',
      ) || 0;

      // Avoid double counting when keyboard is visible.
      const viewportBottom = keyboardOffset > 0 || rawBottom > 120 ? 0 : rawBottom;
      const fallbackTop = platform === 'android' ? 32 : 0;
      const fallbackBottom = platform === 'android' ? 24 : 0;

      document.documentElement.style.setProperty('--native-safe-top', `${Math.max(viewportTop, fallbackTop)}px`);
      document.documentElement.style.setProperty('--native-safe-right', '0px');
      document.documentElement.style.setProperty('--native-safe-bottom', `${Math.max(viewportBottom, fallbackBottom)}px`);
      document.documentElement.style.setProperty('--native-safe-left', '0px');
    };

    const keyboardShow = Keyboard.addListener('keyboardDidShow', (event) => {
      document.documentElement.style.setProperty('--keyboard-offset', `${event.keyboardHeight}px`);
      updateNativeInsets();
    });

    const keyboardHide = Keyboard.addListener('keyboardDidHide', () => {
      document.documentElement.style.setProperty('--keyboard-offset', '0px');
      updateNativeInsets();
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
    updateNativeInsets();
    window.addEventListener('resize', updateNativeInsets);
    window.visualViewport?.addEventListener('resize', updateNativeInsets);
    window.visualViewport?.addEventListener('scroll', updateNativeInsets);

    return () => {
      keyboardShow.then((handle) => handle.remove());
      keyboardHide.then((handle) => handle.remove());
      backButton.then((handle) => handle.remove());
      window.removeEventListener('resize', updateNativeInsets);
      window.visualViewport?.removeEventListener('resize', updateNativeInsets);
      window.visualViewport?.removeEventListener('scroll', updateNativeInsets);
      document.documentElement.style.setProperty('--keyboard-offset', '0px');
      document.documentElement.style.setProperty('--native-safe-top', '0px');
      document.documentElement.style.setProperty('--native-safe-right', '0px');
      document.documentElement.style.setProperty('--native-safe-bottom', '0px');
      document.documentElement.style.setProperty('--native-safe-left', '0px');
      document.documentElement.classList.remove('platform-native', `platform-${platform}`);
    };
  }, []);
}
