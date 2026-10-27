import { useEffect, useState } from "react";
import { Check, Copy, Download, Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { APP_INSTALL_URL, detectInstallEnvironment, installDevices, installSteps, isRunningAsApp, type InstallDevice } from "@/lib/app-install";

export default function DownloadApp() {
  const [environment] = useState(() => detectInstallEnvironment(navigator.userAgent, navigator.platform, navigator.maxTouchPoints));
  const [device, setDevice] = useState<InstallDevice>(environment.device);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [installed, setInstalled] = useState(() => isRunningAsApp(window.matchMedia("(display-mode: standalone)").matches, (navigator as Navigator & { standalone?: boolean }).standalone));
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const update = () => setInstalled(isRunningAsApp(standalone.matches, (navigator as Navigator & { standalone?: boolean }).standalone));
    standalone.addEventListener("change", update);
    return () => standalone.removeEventListener("change", update);
  }, []);
  const phone = device === "iphone" || device === "ipad" || device === "android";
  const steps = installSteps(device, device === environment.device ? environment.browser : "other");

  if (installed) return null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(APP_INSTALL_URL);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
  };

  return (
    <Dialog onOpenChange={() => { setCopied(false); setCopyError(false); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-primary" aria-label="Download App">
          <Download className="h-4 w-4" /> Download App
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-lg max-h-[85dvh] overflow-y-auto">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-3 mb-2">
            <img src="/icon-512.png" alt="BGPT app icon" className="h-12 w-12 rounded-lg" />
            <DialogTitle className="font-display text-xl">Download BlackGPT</DialogTitle>
          </div>
          <DialogDescription>
            Add BlackGPT to your {phone ? "home screen" : "computer"} straight from your browser. No app store needed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label id="install-device-label" className="flex items-center gap-2 text-sm font-medium">
            {phone ? <Smartphone className="h-4 w-4 text-primary" /> : <Monitor className="h-4 w-4 text-primary" />} Your device
          </label>
          <Select value={device} onValueChange={(value) => {
            if (installDevices.some((option) => option.value === value)) setDevice(value as InstallDevice);
          }}>
            <SelectTrigger aria-labelledby="install-device-label"><SelectValue /></SelectTrigger>
            <SelectContent>{installDevices.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <ol className="space-y-4">
          {steps.map((step, index) => <li key={step} className="flex items-start gap-3 text-sm leading-relaxed">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-primary text-xs font-semibold">{index + 1}</span>
            <span className="min-w-0">{step}</span>
          </li>)}
        </ol>
        <div className="border-t border-border pt-4 space-y-3">
          {!phone && <p className="text-sm text-muted-foreground">Want it on your phone? Open this link there, then choose your phone above for the steps.</p>}
          <div className="flex items-center gap-2">
            <a href={APP_INSTALL_URL} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 break-all text-sm text-primary underline underline-offset-4">blackgpt.lovable.app</a>
            <Button variant="outline" size="icon" onClick={() => void copyLink()} aria-label={copied ? "Link copied" : "Copy app link"} title={copied ? "Link copied" : "Copy app link"}>
              {copied ? <Check className="text-primary" /> : <Copy />}
            </Button>
          </div>
          {copied && <p role="status" className="text-xs text-primary">App link copied.</p>}
          {copyError && <p role="alert" className="text-xs text-muted-foreground">Couldn’t copy automatically. Press and hold or select the link to copy it.</p>}
          <p className="text-xs text-muted-foreground">Internet connection required. Install from the link above, not the editor preview.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}