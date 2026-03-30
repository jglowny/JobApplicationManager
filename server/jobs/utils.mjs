import crypto from "crypto";

const DEFAULT_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "accept-language": "pl-PL,pl;q=0.9,en;q=0.8",
  accept: "text/html,application/json;q=0.9,*/*;q=0.8",
};

let browserPromise;

const getBrowser = async () => {
  if (!browserPromise) {
    const { chromium } = await import("playwright");
    browserPromise = chromium.launch({ headless: true });
  }
  return browserPromise;
};

const fetchHtmlWithBrowser = async (url) => {
  const browser = await getBrowser();
  const page = await browser.newPage({
    userAgent: DEFAULT_HEADERS["user-agent"],
    locale: "pl-PL",
  });
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    return await page.content();
  } finally {
    await page.close();
  }
};

export const fetchHtml = async (url, options = {}) => {
  const { useBrowser = false, headers = {} } = options;
  const res = await fetch(url, { headers: { ...DEFAULT_HEADERS, ...headers } });
  if (res.ok) return await res.text();
  if (useBrowser && (res.status === 403 || res.status === 404)) {
    return await fetchHtmlWithBrowser(url);
  }
  throw new Error(`HTTP ${res.status} for ${url}`);
};

export const fetchJson = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: { ...DEFAULT_HEADERS, ...(options.headers || {}) },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return await res.json();
};

export const normalizeText = (value) => {
  if (!value) return "";
  return String(value).replace(/\s+/g, " ").trim();
};

export const buildId = (source, parts) => {
  const payload = [source, ...parts.map((part) => normalizeText(part))]
    .filter(Boolean)
    .join("|");
  return crypto.createHash("sha1").update(payload).digest("hex");
};

export const uniqueById = (items) => {
  const map = new Map();
  for (const item of items) {
    if (!item || !item.id) continue;
    map.set(item.id, item);
  }
  return Array.from(map.values());
};

export const toArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

export const parseRemote = (text) => {
  const normalized = normalizeText(text).toLowerCase();
  if (normalized.includes("remote")) return "remote";
  if (normalized.includes("hybrid")) return "hybrid";
  if (normalized.includes("zdal")) return "remote";
  if (normalized.includes("hyb")) return "hybrid";
  if (normalized.includes("stacjon")) return "onsite";
  return "";
};

export const matchesQuery = (item, query) => {
  const haystack = [
    item.title,
    item.company,
    item.location,
    item.salary,
    ...(item.technologies || []),
  ]
    .map((value) => normalizeText(value).toLowerCase())
    .join(" ");

  const hasTerm = (value) =>
    !value || haystack.includes(normalizeText(value).toLowerCase());

  if (!hasTerm(query.q)) return false;
  if (!hasTerm(query.location)) return false;
  if (!hasTerm(query.tech)) return false;

  if (query.remote) {
    const remoteText =
      parseRemote(item.location || "") || parseRemote(item.title || "");
    if (remoteText !== query.remote) return false;
  }

  return true;
};
