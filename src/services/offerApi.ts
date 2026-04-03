export type OfferApiResponse = {
  title?: string;
  description?: string;
  textSnippet?: string;
  hostname?: string;
  ldDescription?: string;
  structuredData?: {
    ldJson?: unknown;
    nextData?: unknown;
  };
};

export type SaveFileResponse = {
  path: string;
  url: string;
  mimeType?: string;
};

export type OfferAssetsResponse = {
  url: string;
  screenshot: SaveFileResponse;
  pdf: SaveFileResponse;
};

export type OfferMatchAnalysis = {
  score: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  cvImprovements: string[];
  tailoredKeywords: string[];
};

const handleResponse = async <T>(response: Response, fallback: string) => {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = data?.details
      ? `${data.error} (${data.details})`
      : data?.error || fallback;
    throw new Error(message);
  }
  return (await response.json()) as T;
};

export const fetchOfferData = async (url: string) => {
  const response = await fetch(`/api/offer?url=${encodeURIComponent(url)}`);
  return handleResponse<OfferApiResponse>(
    response,
    "Nie udało się pobrać treści.",
  );
};

export const fetchScreenshot = async (url: string) => {
  const response = await fetch(
    `/api/screenshot?url=${encodeURIComponent(url)}`,
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = data?.details
      ? `${data.error} (${data.details})`
      : data?.error || "Nie udało się zrobić screena.";
    throw new Error(message);
  }
  return response.blob();
};

export const fetchPdf = async (url: string) => {
  const response = await fetch(`/api/pdf?url=${encodeURIComponent(url)}`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = data?.details
      ? `${data.error} (${data.details})`
      : data?.error || "Nie udało się wygenerować PDF.";
    throw new Error(message);
  }
  return response.blob();
};

export const generateAndSaveOfferAssets = async (
  url: string,
  company?: string,
  title?: string,
) => {
  const response = await fetch("/api/offer-assets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      company,
      title,
    }),
  });

  return handleResponse<OfferAssetsResponse>(
    response,
    "Nie udało się wygenerować i zapisać plików oferty.",
  );
};

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

export const saveFileInProject = async (
  file: Blob,
  fileName: string,
  kind: "screenshot" | "pdf" | "cv" | "other",
) => {
  const dataUrl = await blobToDataUrl(file);
  const response = await fetch("/api/files", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      kind,
      fileName,
      dataUrl,
    }),
  });

  return handleResponse<SaveFileResponse>(
    response,
    "Nie udało się zapisać pliku w projekcie.",
  );
};

export const analyzeOfferMatch = async ({
  cvFile,
  offerFile,
  offerText,
}: {
  cvFile: Blob;
  offerFile?: Blob;
  offerText?: string;
}) => {
  const formData = new FormData();
  formData.append("cvFile", cvFile, "cv.pdf");
  if (offerFile) {
    formData.append("offerFile", offerFile, "offer.pdf");
  }
  if (offerText?.trim()) {
    formData.append("offerText", offerText.trim());
  }

  const response = await fetch("/api/analyze-match", {
    method: "POST",
    body: formData,
  });

  return handleResponse<OfferMatchAnalysis>(
    response,
    "Nie udało się przeprowadzić analizy CV i ogłoszenia.",
  );
};
