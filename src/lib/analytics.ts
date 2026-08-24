// Privacy-light client analytics helpers.
// We store a random visitor id locally (no fingerprinting, no IP, no content)
// and remember the first-touch traffic source for attribution.

const VISITOR_KEY = "bgpt_visitor_id";
const SOURCE_KEY = "bgpt_first_source";
const REFERRER_KEY = "bgpt_first_referrer_host";

export function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "unknown";
  }
}

export function captureAttribution() {
  try {
    if (localStorage.getItem(SOURCE_KEY) || localStorage.getItem(REFERRER_KEY)) return;
    const params = new URLSearchParams(window.location.search);
    const utm = params.get("utm_source") || params.get("ref");
    if (utm) localStorage.setItem(SOURCE_KEY, utm.slice(0, 120));

    const ref = document.referrer;
    if (ref) {
      try {
        const host = new URL(ref).hostname;
        if (host && host !== window.location.hostname) {
          localStorage.setItem(REFERRER_KEY, host.slice(0, 120));
        }
      } catch { /* ignore */ }
    }
  } catch { /* storage unavailable */ }
}

export function getAttribution() {
  try {
    return {
      visitor_id: getVisitorId(),
      source: localStorage.getItem(SOURCE_KEY),
      referrer_host: localStorage.getItem(REFERRER_KEY),
    };
  } catch {
    return { visitor_id: "unknown", source: null, referrer_host: null };
  }
}
