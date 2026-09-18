import type { CapacitorConfig } from "@capacitor/cli";

// This shell doesn't bundle the web app locally — it points the native
// WebView straight at your deployed BAB Tasker domain, so the app always
// shows the same live data as the website. Update `server.url` once you've
// deployed and pointed your own domain at it (see ../README.md).
const config: CapacitorConfig = {
  appId: "com.babcleaning.tasker",
  appName: "BAB Tasker",
  webDir: "www",
  server: {
    url: "https://app.yourdomain.com",
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      backgroundColor: "#1D1730",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#2B2140",
    },
  },
};

export default config;
