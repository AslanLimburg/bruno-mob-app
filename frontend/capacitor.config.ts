import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.brunotoken.app',
  appName: 'Bruno Token',
  webDir: 'build',
  server: {
    url: 'https://brunotoken.com',
    cleartext: false
  },
  android: {
    allowMixedContent: false
  }
};

export default config;
