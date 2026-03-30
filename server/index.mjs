import express from "express";
import cors from "cors";
import * as cheerio from "cheerio";
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { initializeApp } from "firebase/app";
import {
  addDoc,
  collection,
  getDocs,
  getFirestore,
  query,
  where,
} from "firebase/firestore";
import { renderCvHtml } from "./cvTemplate.mjs";

const app = express();
const port = process.env.PORT || 5174;
const uploadsDir = path.join(process.cwd(), "uploads");
const firebaseConfig = {
  apiKey: "AIzaSyAwRsL48mH5K7XX_Yyq3Q4C56xCkEmPFaM",
  authDomain: "offers-app-d0fcc.firebaseapp.com",
  projectId: "offers-app-d0fcc",
  storageBucket: "offers-app-d0fcc.firebasestorage.app",
  messagingSenderId: "423300884891",
  appId: "1:423300884891:web:7d61e1a7cb6f7a7a1a193e",
  measurementId: "G-V4X92PEMKH",
};
const firebaseApp = initializeApp(firebaseConfig);
const firestore = getFirestore(firebaseApp);
const offersCollection = collection(firestore, "offers");

app.use(cors());
app.use(express.json({ limit: "30mb" }));
app.use("/uploads", express.static(uploadsDir));

const toSafeFileName = (value, fallback) => {
  const cleaned = String(value || "")
    .trim()
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || fallback;
};

const getMimeExtension = (mimeType) => {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "application/msword") return "doc";
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  return "bin";
};

const toDateInput = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const findJobPosting = (payload) => {
  if (!payload) return null;
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = findJobPosting(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof payload === "object") {
    const record = payload;
    if (record["@type"] === "JobPosting") return record;
    if (record["@graph"]) return findJobPosting(record["@graph"]);
  }
  return null;
};

const parseOfferData = (data) => {
  const ldJob = findJobPosting(data.structuredData?.ldJson);
  const ldTitle = typeof ldJob?.title === "string" ? ldJob.title : "";
  const ldDescription =
    typeof ldJob?.description === "string" ? ldJob.description : "";
  const ldCompany = (() => {
    if (typeof ldJob?.hiringOrganization === "string") {
      return ldJob.hiringOrganization;
    }
    if (typeof ldJob?.hiringOrganization === "object") {
      const org = ldJob.hiringOrganization;
      return typeof org?.name === "string" ? org.name : "";
    }
    return "";
  })();

  const nextDataJob = (() => {
    const next = data.structuredData?.nextData;
    const pageProps = next?.props?.pageProps;
    return pageProps?.offer ?? pageProps?.job ?? null;
  })();

  const nextTitle =
    nextDataJob && typeof nextDataJob === "object" ? nextDataJob.title : "";
  const nextCompany =
    nextDataJob && typeof nextDataJob === "object"
      ? nextDataJob.companyName
      : "";
  const nextDescription =
    nextDataJob && typeof nextDataJob === "object"
      ? nextDataJob.description
      : "";

  const resolvedTitle =
    (typeof nextTitle === "string" && nextTitle) || ldTitle || data.title || "";
  const resolvedCompany =
    (typeof nextCompany === "string" && nextCompany) ||
    ldCompany ||
    data.hostname ||
    "";
  const resolvedDescription =
    (typeof nextDescription === "string" && nextDescription) ||
    ldDescription ||
    data.ldDescription ||
    data.description ||
    "";
  const resolvedNotes = resolvedDescription || "";

  const ldDatePosted =
    typeof ldJob?.datePosted === "string" ? ldJob.datePosted : "";
  const ldValidThrough =
    typeof ldJob?.validThrough === "string" ? ldJob.validThrough : "";
  const nextDatePosted =
    nextDataJob && typeof nextDataJob === "object"
      ? nextDataJob.datePosted
      : "";
  const nextValidThrough =
    nextDataJob && typeof nextDataJob === "object"
      ? nextDataJob.validThrough
      : "";
  const resolvedDatePosted =
    (typeof nextDatePosted === "string" && nextDatePosted) || ldDatePosted;
  const resolvedOfferAddedAt = resolvedDatePosted
    ? toDateInput(resolvedDatePosted)
    : "";
  const resolvedValidThrough =
    (typeof nextValidThrough === "string" && nextValidThrough) ||
    ldValidThrough;
  const resolvedOfferClosedAt = resolvedValidThrough
    ? toDateInput(resolvedValidThrough)
    : "";

  const structuredDataText = data.structuredData
    ? JSON.stringify(data.structuredData, null, 2)
    : "";

  return {
    title: resolvedTitle,
    company: resolvedCompany,
    description: resolvedDescription,
    notes: resolvedNotes,
    offerAddedAt: resolvedOfferAddedAt,
    offerClosedAt: resolvedOfferClosedAt,
    structuredDataText,
  };
};

const getOfferData = async (targetUrl) => {
  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    throw Object.assign(new Error("Nieprawidłowy URL."), { statusCode: 400 });
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw Object.assign(new Error("Dozwolone są tylko http/https."), {
      statusCode: 400,
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "JobApplicationManager/1.0 (+local)",
      },
    });

    if (!response.ok) {
      throw Object.assign(new Error("Nie udało się pobrać treści."), {
        statusCode: 502,
      });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const title =
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="title"]').attr("content") ||
      $("title").text().trim();

    const description =
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      "";

    const textSnippet = $("body")
      .text()
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 400);

    const ldJsonRaw = [];
    $('script[type="application/ld+json"]').each((_, element) => {
      const content = $(element).contents().text().trim();
      if (content) {
        ldJsonRaw.push(content);
      }
    });

    const ldJson = ldJsonRaw
      .map((item) => {
        try {
          return JSON.parse(item);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const jobPosting = findJobPosting(ldJson);
    const ldDescription = jobPosting?.description || "";

    let nextData = null;
    const nextDataText = $("#__NEXT_DATA__").contents().text().trim();
    if (nextDataText) {
      try {
        nextData = JSON.parse(nextDataText);
      } catch {
        nextData = null;
      }
    }

    return {
      title,
      description,
      textSnippet,
      hostname: parsedUrl.hostname,
      url: parsedUrl.toString(),
      ldDescription,
      structuredData: {
        ldJson,
        nextData,
      },
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw Object.assign(new Error("Przekroczono limit czasu."), {
        statusCode: 504,
      });
    }
    if (error?.statusCode) {
      throw error;
    }
    throw Object.assign(new Error("Błąd serwera podczas pobierania."), {
      statusCode: 500,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const createOfferAssets = async ({ targetUrl, company, title, debug }) => {
  const parsedUrl = new URL(targetUrl);
  const created = await createPage(parsedUrl, debug);
  const { browser, page, debugDir } = created;

  try {
    if (debug && debugDir) {
      await page.screenshot({
        path: path.join(debugDir, `assets-preview-${Date.now()}.png`),
        fullPage: true,
        type: "png",
      });
    }

    const screenshotBuffer = await page.screenshot({
      fullPage: true,
      type: "png",
    });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" },
    });

    const safeCompany = toSafeFileName(company, "firma");
    const safeTitle = toSafeFileName(title, "oferta");
    const datePart = new Date().toISOString().slice(0, 10);

    const screenshot = await saveBufferInProject({
      kind: "screenshot",
      fileName: `screenshot-${safeCompany}-${safeTitle}.png`,
      mimeType: "image/png",
      buffer: screenshotBuffer,
    });
    const pdf = await saveBufferInProject({
      kind: "pdf",
      fileName: `ogloszenie-${safeCompany}-${datePart}.pdf`,
      mimeType: "application/pdf",
      buffer: pdfBuffer,
    });

    return { screenshot, pdf };
  } finally {
    await browser.close();
  }
};

const createOfferPayload = ({
  url,
  parsed,
  assets,
  body,
}) => {
  const now = new Date().toISOString();
  return {
    title:
      (typeof body.title === "string" && body.title.trim()) || parsed.title || "",
    company:
      (typeof body.company === "string" && body.company.trim()) ||
      parsed.company ||
      "",
    url,
    status:
      typeof body.status === "string" && body.status.trim()
        ? body.status.trim()
        : "Zapisana",
    category:
      body.category === "it" || body.category === "web"
        ? body.category
        : "web",
    description:
      (typeof body.description === "string" && body.description.trim()) ||
      parsed.description ||
      "",
    notes:
      (typeof body.notes === "string" && body.notes.trim()) ||
      parsed.notes ||
      "",
    offerAddedAt:
      (typeof body.offerAddedAt === "string" && body.offerAddedAt.trim()) ||
      parsed.offerAddedAt ||
      new Date().toISOString().slice(0, 10),
    offerClosedAt:
      (typeof body.offerClosedAt === "string" && body.offerClosedAt.trim()) ||
      parsed.offerClosedAt ||
      undefined,
    structuredData:
      (typeof body.structuredData === "string" && body.structuredData.trim()) ||
      parsed.structuredDataText ||
      undefined,
    screenshotName: assets.screenshot.path.split("/").pop(),
    screenshotPath: assets.screenshot.path,
    pdfName: assets.pdf.path.split("/").pop(),
    pdfPath: assets.pdf.path,
    cvName:
      typeof body.cvName === "string" && body.cvName.trim()
        ? body.cvName.trim()
        : undefined,
    cvPath:
      typeof body.cvPath === "string" && body.cvPath.trim()
        ? body.cvPath.trim()
        : undefined,
    createdAt: now,
    updatedAt: now,
  };
};

const findExistingOfferByUrl = async (url) => {
  const snapshot = await getDocs(query(offersCollection, where("url", "==", url)));
  return snapshot.empty ? null : snapshot.docs[0];
};

const saveBufferInProject = async ({ kind, fileName, mimeType, buffer }) => {
  const safeKind = toSafeFileName(kind, "other");
  const datePart = new Date().toISOString().slice(0, 10);
  const kindDir = path.join(uploadsDir, safeKind, datePart);
  await fs.mkdir(kindDir, { recursive: true });

  const originalExt = path.extname(fileName).replace(".", "").toLowerCase();
  const extension = originalExt || getMimeExtension(mimeType);
  const baseName = toSafeFileName(
    path.basename(fileName, path.extname(fileName)),
    "plik",
  );
  const diskFileName = `${Date.now()}-${baseName}.${extension}`;
  const filePath = path.join(kindDir, diskFileName);

  await fs.writeFile(filePath, buffer);

  const relativePath = path
    .join("uploads", safeKind, datePart, diskFileName)
    .split(path.sep)
    .join("/");

  return {
    path: relativePath,
    url: `/${relativePath}`,
    mimeType,
  };
};

const createDebugDir = async (debug) => {
  if (!debug) return null;
  const debugDir = path.join(process.cwd(), "debug");
  await fs.mkdir(debugDir, { recursive: true });
  return debugDir;
};

const getPracujCookies = () => {
  const cookieHeader = process.env.PRACUJ_COOKIE || "";
  const cookies = cookieHeader
    ? cookieHeader.split(";").map((item) => {
        const [name, ...rest] = item.split("=");
        return {
          name: name.trim(),
          value: rest.join("=").trim(),
          domain: ".pracuj.pl",
          path: "/",
        };
      })
    : [];
  cookies.push({
    name: "gpc_v",
    value: "1",
    domain: ".pracuj.pl",
    path: "/",
  });
  return cookies;
};

const createPage = async (parsedUrl, debug) => {
  const debugDir = await createDebugDir(debug);
  const browser = await chromium.launch({
    headless: !debug,
    slowMo: debug ? 100 : 0,
  });
  const isPracuj = parsedUrl.hostname.includes("pracuj.pl");
  const context = await browser.newContext({
    viewport: isPracuj
      ? { width: 1440, height: 900 }
      : { width: 1280, height: 720 },
    locale: "pl-PL",
    isMobile: false,
    hasTouch: false,
    deviceScaleFactor: 1,
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  if (isPracuj) {
    await context.addCookies(getPracujCookies());
  }
  const page = await context.newPage();
  if (debug) {
    page.on("console", (msg) =>
      console.log("[page console]", msg.type(), msg.text()),
    );
    page.on("pageerror", (error) =>
      console.error("[page error]", error.message),
    );
    page.on("requestfailed", (request) =>
      console.error("[request failed]", request.url(), request.failure()),
    );
  }
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined,
    });
  });
  await page.goto(parsedUrl.toString(), {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  if (isPracuj) {
    await page.addStyleTag({
      content:
        '[data-test="section-applyingMobile"] { display: none !important; }',
    });
  }
  await page.waitForTimeout(3000);

  return { browser, page, debugDir };
};

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/files", async (req, res) => {
  const kind =
    typeof req.body?.kind === "string" && req.body.kind.trim()
      ? req.body.kind.trim().toLowerCase()
      : "other";
  const fileNameRaw =
    typeof req.body?.fileName === "string" ? req.body.fileName : "plik";
  const dataUrl =
    typeof req.body?.dataUrl === "string" ? req.body.dataUrl : "";

  if (!dataUrl.startsWith("data:")) {
    return res.status(400).json({ error: "Brak poprawnych danych pliku." });
  }

  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return res.status(400).json({ error: "Niepoprawny format pliku." });
  }

  const [, mimeType, base64] = match;
  const saved = await saveBufferInProject({
    kind,
    fileName: fileNameRaw,
    mimeType,
    buffer: Buffer.from(base64, "base64"),
  });

  return res.status(201).json(saved);
});

app.post("/api/offer-assets", async (req, res) => {
  const targetUrl =
    typeof req.body?.url === "string" ? req.body.url : req.query.url;
  const companyRaw =
    typeof req.body?.company === "string" ? req.body.company : "";
  const titleRaw = typeof req.body?.title === "string" ? req.body.title : "";
  const debug = req.query.debug === "1" || req.body?.debug === true;

  if (typeof targetUrl !== "string" || targetUrl.trim() === "") {
    return res.status(400).json({ error: "Brak parametru url." });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return res.status(400).json({ error: "Nieprawidłowy URL." });
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return res.status(400).json({ error: "Dozwolone są tylko http/https." });
  }

  let browser;
  try {
    const created = await createPage(parsedUrl, debug);
    browser = created.browser;
    const { page, debugDir } = created;

    if (debug && debugDir) {
      await page.screenshot({
        path: path.join(debugDir, `assets-preview-${Date.now()}.png`),
        fullPage: true,
        type: "png",
      });
    }

    const screenshotBuffer = await page.screenshot({
      fullPage: true,
      type: "png",
    });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" },
    });

    const safeCompany = toSafeFileName(companyRaw, "firma");
    const safeTitle = toSafeFileName(titleRaw, "oferta");
    const datePart = new Date().toISOString().slice(0, 10);

    const screenshot = await saveBufferInProject({
      kind: "screenshot",
      fileName: `screenshot-${safeCompany}-${safeTitle}.png`,
      mimeType: "image/png",
      buffer: screenshotBuffer,
    });
    const pdf = await saveBufferInProject({
      kind: "pdf",
      fileName: `ogloszenie-${safeCompany}-${datePart}.pdf`,
      mimeType: "application/pdf",
      buffer: pdfBuffer,
    });

    return res.status(201).json({
      url: parsedUrl.toString(),
      screenshot,
      pdf,
    });
  } catch (error) {
    const details =
      error instanceof Error && error.message ? error.message : "";
    console.error("Offer assets error:", error);
    return res.status(500).json({
      error: "Błąd generowania i zapisu plików oferty.",
      details,
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.post("/api/offers", async (req, res) => {
  const targetUrl =
    typeof req.query?.url === "string" ? req.query.url.trim() : "";
  const categoryParam =
    typeof req.query?.category === "string" ? req.query.category.trim() : "";
  const statusParam =
    typeof req.query?.status === "string" ? req.query.status.trim() : "";
  const debug = false;

  const allowedCategories = new Set(["web", "it"]);
  const allowedStatuses = new Set([
    "Szkic",
    "Zapisana",
    "Aplikacja wysłana",
    "Rozmowa",
    "Oferta",
    "Odrzucona",
  ]);

  if (!targetUrl) {
    return res.status(400).json({ error: "Brak parametru url." });
  }

  if (categoryParam && !allowedCategories.has(categoryParam)) {
    return res.status(400).json({
      error: "Nieprawidłowa kategoria. Dozwolone: web, it.",
    });
  }

  if (statusParam && !allowedStatuses.has(statusParam)) {
    return res.status(400).json({
      error:
        "Nieprawidłowy status. Dozwolone: Szkic, Zapisana, Aplikacja wysłana, Rozmowa, Oferta, Odrzucona.",
    });
  }

  try {
    const existing = await findExistingOfferByUrl(targetUrl);
    if (existing) {
      return res.status(409).json({
        error: "Oferta z tym URL już istnieje.",
        offerId: existing.id,
      });
    }

    const offerData = await getOfferData(targetUrl);
    const parsed = parseOfferData(offerData);
    const assets = await createOfferAssets({
      targetUrl,
      company: parsed.company,
      title: parsed.title,
      debug,
    });

    const payload = createOfferPayload({
      url: targetUrl,
      parsed,
      assets,
      body: {
        status: statusParam || undefined,
        category: categoryParam || undefined,
      },
    });

    const created = await addDoc(offersCollection, payload);

    return res.status(201).json({
      id: created.id,
      offer: payload,
    });
  } catch (error) {
    const statusCode = error?.statusCode || 500;
    const details = error instanceof Error && error.message ? error.message : "";
    return res.status(statusCode).json({
      error:
        statusCode >= 500
          ? "Nie udało się utworzyć ogłoszenia."
          : details,
      details: statusCode >= 500 ? details : undefined,
    });
  }
});

app.get("/api/offer", async (req, res) => {
  const targetUrl = req.query.url;
  if (typeof targetUrl !== "string" || targetUrl.trim() === "") {
    return res.status(400).json({ error: "Brak parametru url." });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return res.status(400).json({ error: "Nieprawidłowy URL." });
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return res.status(400).json({ error: "Dozwolone są tylko http/https." });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "JobApplicationManager/1.0 (+local)",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(502).json({ error: "Nie udało się pobrać treści." });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const title =
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="title"]').attr("content") ||
      $("title").text().trim();

    const description =
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="description"]').attr("content") ||
      "";

    const textSnippet = $("body")
      .text()
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 400);

    const ldJsonRaw = [];
    $('script[type="application/ld+json"]').each((_, element) => {
      const content = $(element).contents().text().trim();
      if (content) {
        ldJsonRaw.push(content);
      }
    });

    const ldJson = ldJsonRaw
      .map((item) => {
        try {
          return JSON.parse(item);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const findJobPosting = (data) => {
      if (!data) return null;
      if (Array.isArray(data)) {
        for (const item of data) {
          const found = findJobPosting(item);
          if (found) return found;
        }
        return null;
      }
      if (data["@type"] === "JobPosting") return data;
      if (data["@graph"]) return findJobPosting(data["@graph"]);
      return null;
    };

    const jobPosting = findJobPosting(ldJson);
    const ldDescription = jobPosting?.description || "";

    let nextData = null;
    const nextDataText = $("#__NEXT_DATA__").contents().text().trim();
    if (nextDataText) {
      try {
        nextData = JSON.parse(nextDataText);
      } catch {
        nextData = null;
      }
    }

    return res.json({
      title,
      description,
      textSnippet,
      hostname: parsedUrl.hostname,
      url: parsedUrl.toString(),
      ldDescription,
      structuredData: {
        ldJson,
        nextData,
      },
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      return res.status(504).json({ error: "Przekroczono limit czasu." });
    }
    return res.status(500).json({ error: "Błąd serwera podczas pobierania." });
  }
});

app.get("/api/screenshot", async (req, res) => {
  const targetUrl = req.query.url;
  const debug = req.query.debug === "1";
  if (typeof targetUrl !== "string" || targetUrl.trim() === "") {
    return res.status(400).json({ error: "Brak parametru url." });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return res.status(400).json({ error: "Nieprawidłowy URL." });
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return res.status(400).json({ error: "Dozwolone są tylko http/https." });
  }

  let browser;
  try {
    const created = await createPage(parsedUrl, debug);
    browser = created.browser;
    const { page, debugDir } = created;
    if (debug && debugDir) {
      await page.screenshot({
        path: path.join(debugDir, `before-${Date.now()}.png`),
        fullPage: true,
        type: "png",
      });
    }
    const buffer = await page.screenshot({ fullPage: true, type: "png" });
    if (debug && debugDir) {
      await page.screenshot({
        path: path.join(debugDir, `after-${Date.now()}.png`),
        fullPage: true,
        type: "png",
      });
    }
    const filename = `screenshot-${Date.now()}.png`;

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    return res.send(buffer);
  } catch (error) {
    const details =
      error instanceof Error && error.message ? error.message : "";
    console.error("Screenshot error:", error);
    return res.status(500).json({
      error: "Błąd tworzenia screena.",
      details,
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.get("/api/pdf", async (req, res) => {
  const targetUrl = req.query.url;
  const debug = req.query.debug === "1";
  if (typeof targetUrl !== "string" || targetUrl.trim() === "") {
    return res.status(400).json({ error: "Brak parametru url." });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return res.status(400).json({ error: "Nieprawidłowy URL." });
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return res.status(400).json({ error: "Dozwolone są tylko http/https." });
  }

  let browser;
  try {
    const created = await createPage(parsedUrl, debug);
    browser = created.browser;
    const { page, debugDir } = created;
    if (debug && debugDir) {
      await page.screenshot({
        path: path.join(debugDir, `pdf-preview-${Date.now()}.png`),
        fullPage: true,
        type: "png",
      });
    }
    const buffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" },
    });
    if (debug && debugDir) {
      await fs.writeFile(path.join(debugDir, `page-${Date.now()}.pdf`), buffer);
    }
    const filename = `ogloszenie-${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    return res.send(buffer);
  } catch (error) {
    const details =
      error instanceof Error && error.message ? error.message : "";
    console.error("PDF error:", error);
    return res.status(500).json({
      error: "Błąd generowania PDF.",
      details,
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.post("/api/cv/pdf", async (req, res) => {
  const debug = req.query.debug === "1";
  const cv = req.body?.cv;
  if (!cv || typeof cv !== "object") {
    return res.status(400).json({ error: "Brak danych CV." });
  }

  let browser;
  try {
    const debugDir = await createDebugDir(debug);
    browser = await chromium.launch({
      headless: !debug,
      slowMo: debug ? 100 : 0,
    });
    const page = await browser.newPage({
      viewport: { width: 1240, height: 1754 },
    });
    const html = renderCvHtml(cv);

    await page.setContent(html, { waitUntil: "load" });
    await page.emulateMedia({ media: "screen" });

    if (debug && debugDir) {
      await page.screenshot({
        path: path.join(debugDir, `cv-preview-${Date.now()}.png`),
        fullPage: true,
      });
    }

    const buffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" },
    });

    if (debug && debugDir) {
      await fs.writeFile(path.join(debugDir, `cv-${Date.now()}.pdf`), buffer);
    }

    const filename = `cv-${Date.now()}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    return res.send(buffer);
  } catch (error) {
    const details =
      error instanceof Error && error.message ? error.message : "";
    console.error("CV PDF error:", error);
    return res.status(500).json({
      error: "Błąd generowania CV PDF.",
      details,
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.post("/api/cv/preview", (req, res) => {
  const cv = req.body?.cv;
  if (!cv || typeof cv !== "object") {
    return res.status(400).json({ error: "Brak danych CV." });
  }
  const html = renderCvHtml(cv);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.send(html);
});

app.listen(port, () => {
  console.log(`API działa na porcie ${port}`);
});
