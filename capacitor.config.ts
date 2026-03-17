import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.prnote.app',
  appName: 'PRnote',
  webDir: 'dist',
  backgroundColor: '#0A0A0A',
  server: {
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#0A0A0A',
    adjustMarginsForEdgeToEdge: 'force',
    webContentsDebuggingEnabled: false,
  },
};

export default config;
