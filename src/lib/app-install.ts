export type InstallDevice = "iphone" | "ipad" | "android" | "mac" | "windows" | "other";
export type InstallBrowser = "safari" | "chrome" | "edge" | "other";

export const APP_INSTALL_URL = "https://blackgpt.lovable.app";
export const installDevices: { value: InstallDevice; label: string }[] = [
  { value: "iphone", label: "iPhone" },
  { value: "ipad", label: "iPad" },
  { value: "android", label: "Android" },
  { value: "mac", label: "Mac" },
  { value: "windows", label: "Windows PC" },
  { value: "other", label: "Other computer" },
];

// Device hints stay on the device; no fingerprint or analytics event is created.
export function detectInstallEnvironment(userAgent: string, platform: string, touchPoints: number) {
  let device: InstallDevice = "other";
  if (/iPad/i.test(userAgent) || (/Mac/i.test(platform) && touchPoints > 1)) device = "ipad";
  else if (/iPhone|iPod/i.test(userAgent)) device = "iphone";
  else if (/Android/i.test(userAgent)) device = "android";
  else if (/Mac/i.test(platform + userAgent)) device = "mac";
  else if (/Win/i.test(platform + userAgent)) device = "windows";
  let browser: InstallBrowser = "other";
  if (/Edg(?:e|A|iOS)?\//i.test(userAgent)) browser = "edge";
  else if (/Chrome|CriOS/i.test(userAgent) && !/OPR|SamsungBrowser/i.test(userAgent)) browser = "chrome";
  else if (/Safari/i.test(userAgent) && !/FxiOS|Firefox|OPR|SamsungBrowser/i.test(userAgent)) browser = "safari";
  return { device, browser };
}

// True when the app is running as an installed app (not a browser tab), so the Download App button can hide itself.
export function isRunningAsApp(displayModeStandalone: boolean, iosStandalone?: boolean) {
  return displayModeStandalone || iosStandalone === true;
}

export function installSteps(device: InstallDevice, browser: InstallBrowser): string[] {
  if (device === "iphone" || device === "ipad") return [
    "Open blackgpt.lovable.app in Safari.",
    "Tap Share (the square with an upward arrow). It may be inside the ••• menu.",
    "Choose Add to Home Screen. If shown, turn on Open as Web App, then tap Add.",
  ];
  if (device === "android") return [
    "Open blackgpt.lovable.app in Chrome.",
    "Tap the ⋮ menu in the top-right corner.",
    "Choose Add to Home screen or Install app, then confirm. The wording varies by phone.",
  ];
  if (device === "mac" && browser === "safari") return [
    "Open blackgpt.lovable.app in Safari on macOS Sonoma or newer.",
    "Choose File → Add to Dock.",
    "Click Add. Open BlackGPT from your Dock or Applications.",
  ];
  if (browser === "edge") return [
    "Open blackgpt.lovable.app in Microsoft Edge.",
    "Open the … menu → Apps → Install this site as an app. Apps may be under More tools.",
    "Confirm Install, then open BlackGPT from your apps.",
  ];
  return [
    "Open blackgpt.lovable.app in Chrome or Microsoft Edge.",
    "In Chrome, open ⋮ → Cast, save, and share → Install page as app. In Edge, open … → Apps → Install this site as an app.",
    "Confirm the installation. If the option is missing, update your browser or bookmark the page instead.",
  ];
}