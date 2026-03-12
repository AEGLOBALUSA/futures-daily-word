import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.futureschurch.dailyword',
  appName: 'Futures Daily Word',
  webDir: 'dist',
  bundledWebRuntime: false,

  server: {
    // In production, loads from bundled dist/
    // For dev, uncomment and set to your local IP:
    // url: 'http://192.168.1.x:5173',
    // cleartext: true,
    androidScheme: 'https',
    iosScheme: 'https',
  },

  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: '#0F0F0F',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0F0F0F',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    CapacitorHttp: {
      enabled: true,
    },
  },

  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
    scheme: 'Futures Daily Word',
    preferredContentMode: 'mobile',
  },

  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
