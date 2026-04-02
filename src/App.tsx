import { useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { type Offer, type OfferStatus } from "./db";
import AppHeader from "./components/AppHeader";
import OfferForm from "./components/OfferForm";
import OffersSection from "./components/OffersSection";
import CvBuilder from "./components/CvBuilder";
import StructuredDataModal from "./components/StructuredDataModal";
import { type OfferExport, type OfferFormState } from "./types/offer";
import {
  fetchOfferData,
  fetchPdf,
  fetchScreenshot,
  generateAndSaveOfferAssets,
  saveFileInProject,
} from "./services/offerApi";
import { parseOfferData } from "./services/offerParser";
import { dataUrlToBlob, toSafeFileName } from "./utils/file";
import { firestore } from "./firebase";
import { localDb } from "./db/localDb";
import "./App.scss";

const statusOptions: OfferStatus[] = [
  "Szkic",
  "Zapisana",
  "Aplikacja wysłana",
  "Rozmowa",
  "Oferta",
  "Odrzucona",
];

const getTodayDate = () => new Date().toISOString().slice(0, 10);

const createEmptyForm = (): OfferFormState => ({
  title: "",
  company: "",
  url: "",
  status: "Zapisana",
  category: "web",
  description: "",
  notes: "",
  offerAddedAt: getTodayDate(),
  offerClosedAt: "",
  screenshotFile: null,
  pdfFile: null,
  cvFile: null,
});

type FilePickerWindow = Window & {
  showSaveFilePicker: (options: {
    suggestedName?: string;
    types?: { description?: string; accept: Record<string, string[]> }[];
  }) => Promise<{
    createWritable: () => Promise<{
      write: (data: Blob) => Promise<void>;
      close: () => Promise<void>;
    }>;
  }>;
};

const normalizeDateOnly = (value?: string | null) => {
  if (!value) return "";
  return value.includes("T") ? value.split("T")[0] : value;
};

type FirestoreOffer = Omit<Offer, "id" | "screenshotBlob" | "pdfBlob" | "cvBlob"> & {
  screenshotDataUrl?: string;
  pdfDataUrl?: string;
  cvDataUrl?: string;
};

const offersCollection = collection(firestore, "offers");

const omitUndefined = <T extends Record<string, unknown>>(value: T) =>
  Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined),
  ) as Partial<T>;

const getFileExtension = (fileName: string | undefined, fallback: string) => {
  if (!fileName) return fallback;
  const parts = fileName.split(".");
  const extension = parts.length > 1 ? parts.pop()?.trim().toLowerCase() : "";
  return extension || fallback;
};

const toPublicFileUrl = (filePath?: string) => {
  if (!filePath) return undefined;
  return `/${filePath.replace(/^\/+/, "")}`;
};

const mapDocToOffer = (docId: string, data: FirestoreOffer): Offer => ({
  id: docId,
  title: data.title ?? "",
  company: data.company ?? "",
  url: data.url ?? "",
  status: (data.status ?? "Zapisana") as OfferStatus,
  category: (data.category ?? "web") as "web" | "it",
  description: data.description,
  notes: data.notes,
  offerAddedAt: data.offerAddedAt,
  offerClosedAt: data.offerClosedAt,
  structuredData: data.structuredData,
  screenshotName: data.screenshotName,
  screenshotPath: data.screenshotPath,
  pdfName: data.pdfName,
  pdfPath: data.pdfPath,
  cvName: data.cvName,
  cvPath: data.cvPath,
  createdAt: data.createdAt ?? new Date().toISOString(),
  updatedAt: data.updatedAt ?? data.createdAt ?? new Date().toISOString(),
  screenshotBlob: dataUrlToBlob(data.screenshotDataUrl),
  pdfBlob: dataUrlToBlob(data.pdfDataUrl),
  cvBlob: dataUrlToBlob(data.cvDataUrl),
});

function App() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [form, setForm] = useState<OfferFormState>(createEmptyForm);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editingCreatedAt, setEditingCreatedAt] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("jobapplicationmanager-theme") === "dark";
  });
  const [useFirestore, setUseFirestore] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      window.localStorage.getItem("jobapplicationmanager-storage") ===
      "firestore"
    );
  });
  const [statusFilter, setStatusFilter] = useState<
    "Wszystkie" | "Zakończone" | OfferStatus
  >("Oferta");
  const [activeView, setActiveView] = useState<"offers" | "cv">("offers");
  const [sortOption, setSortOption] = useState<"closest" | "newest">("closest");
  const [isFetchingOffer, setIsFetchingOffer] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [screenshotPreviewUrl, setScreenshotPreviewUrl] = useState<
    string | null
  >(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isGeneratingServerAssets, setIsGeneratingServerAssets] =
    useState(false);
  const [serverAssetsError, setServerAssetsError] = useState<string | null>(
    null,
  );
  const [structuredDataText, setStructuredDataText] = useState<string | null>(
    null,
  );
  const [isStructuredModalOpen, setIsStructuredModalOpen] = useState(false);
  const screenshotInputRef = useRef<HTMLInputElement | null>(null);
  const [existingFiles, setExistingFiles] = useState<{
    screenshotBlob?: Blob;
    screenshotName?: string;
    screenshotPath?: string;
    pdfBlob?: Blob;
    pdfName?: string;
    pdfPath?: string;
    cvBlob?: Blob;
    cvName?: string;
    cvPath?: string;
  }>({});

  const totalByStatus = useMemo(() => {
    return statusOptions.reduce<Record<OfferStatus, number>>(
      (acc, status) => {
        acc[status] = offers.filter((offer) => offer.status === status).length;
        return acc;
      },
      {} as Record<OfferStatus, number>,
    );
  }, [offers]);

  const visibleOffers = useMemo(() => {
    const filtered =
      statusFilter === "Wszystkie"
        ? offers
        : statusFilter === "Zakończone"
          ? offers.filter((offer) => {
              if (!offer.offerClosedAt) return false;
              const closedAt = new Date(offer.offerClosedAt).getTime();
              return closedAt < new Date().setHours(0, 0, 0, 0);
            })
          : offers.filter((offer) => offer.status === statusFilter);

    return [...filtered].sort((a, b) => {
      if (sortOption === "newest") {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }

      const aDate = a.offerClosedAt
        ? new Date(a.offerClosedAt).getTime()
        : null;
      const bDate = b.offerClosedAt
        ? new Date(b.offerClosedAt).getTime()
        : null;

      if (aDate === null && bDate === null) return 0;
      if (aDate === null) return 1;
      if (bDate === null) return -1;
      return aDate - bDate;
    });
  }, [offers, statusFilter, sortOption]);

  const refreshOffers = async () => {
    if (useFirestore) {
      const snapshot = await getDocs(
        query(offersCollection, orderBy("createdAt", "desc")),
      );
      const items = snapshot.docs.map((docSnap) =>
        mapDocToOffer(docSnap.id, docSnap.data() as FirestoreOffer),
      );
      setOffers(items);
    } else {
      const items = await localDb.offers
        .orderBy("createdAt")
        .reverse()
        .toArray();
      setOffers(items);
    }
  };

  useEffect(() => {
    void refreshOffers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useFirestore]);

  useEffect(() => {
    document.body.classList.toggle("theme-dark", isDarkMode);
    window.localStorage.setItem(
      "jobapplicationmanager-theme",
      isDarkMode ? "dark" : "light",
    );
  }, [isDarkMode]);

  useEffect(() => {
    window.localStorage.setItem(
      "jobapplicationmanager-storage",
      useFirestore ? "firestore" : "local",
    );
  }, [useFirestore]);

  useEffect(() => {
    if (form.screenshotFile) {
      const url = URL.createObjectURL(form.screenshotFile);
      setScreenshotPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setScreenshotPreviewUrl(null);
    return undefined;
  }, [form.screenshotFile]);

  const handleChange = (
    field: keyof OfferFormState,
    value: string | File | null,
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(createEmptyForm());
    setEditingId(null);
    setEditingCreatedAt(null);
    setExistingFiles({});
    setFetchError(null);
    setSubmitError(null);
    setScreenshotError(null);
    setPdfError(null);
    setServerAssetsError(null);
    setStructuredDataText(null);
    setIsStructuredModalOpen(false);
    setIsFormOpen(false);
  };

  const handleCaptureScreenshot = async () => {
    if (!form.url) return;
    setIsCapturingScreenshot(true);
    setScreenshotError(null);
    console.log("Screenshot: start", form.url);

    try {
      const blob = await fetchScreenshot(form.url);
      const filename = `screenshot-${new Date().toISOString().slice(0, 19)}.png`;
      console.log("Screenshot: success", filename);
      setForm((prev) => ({
        ...prev,
        screenshotFile: new File([blob], filename, { type: "image/png" }),
      }));
    } catch (error) {
      setScreenshotError(
        error instanceof Error ? error.message : "Błąd tworzenia screena",
      );
      console.log("Screenshot: error", error);
    } finally {
      setIsCapturingScreenshot(false);
      console.log("Screenshot: end");
    }
  };

  const handleGeneratePdf = async (overrideUrl?: string | null) => {
    const targetUrl =
      typeof overrideUrl === "string" && overrideUrl.trim()
        ? overrideUrl
        : form.url;
    if (!targetUrl) return;
    setIsGeneratingPdf(true);
    setPdfError(null);
    console.log("PDF: start", targetUrl);

    try {
      const blob = await fetchPdf(targetUrl);
      const safeCompany = toSafeFileName(form.company, "firma");
      const filename = `ogloszenie-${safeCompany}-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;
      console.log("PDF: success", filename);

      if ("showSaveFilePicker" in window) {
        const handle = await (window as FilePickerWindow).showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: "PDF",
              accept: { "application/pdf": [".pdf"] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        const downloadUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = downloadUrl;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(downloadUrl);
      }

      setForm((prev) => ({
        ...prev,
        pdfFile: new File([blob], filename, { type: "application/pdf" }),
        url: overrideUrl ?? prev.url,
      }));
    } catch (error) {
      setPdfError(
        error instanceof Error ? error.message : "Błąd generowania PDF",
      );
      console.log("PDF: error", error);
    } finally {
      setIsGeneratingPdf(false);
      console.log("PDF: end");
    }
  };

  const handleGenerateServerAssets = async () => {
    if (!form.url) return;
    setIsGeneratingServerAssets(true);
    setServerAssetsError(null);

    try {
      const normalizedUrl = form.url.trim();
      const existing = offers.find((o) => o.url === normalizedUrl);
      if (existing && existing.id !== editingId) {
        setServerAssetsError("Oferta z tym URL już istnieje – nie zapisano plików.");
        return;
      }

      // zawsze pobierz dane oferty (uzupełni puste pola lub odświeży)
      let enrichedForm = form;
      let enrichedStructuredData = structuredDataText;
      try {
        const data = await fetchOfferData(normalizedUrl);
        const parsed = parseOfferData(data);
        enrichedStructuredData = parsed.structuredDataText || structuredDataText;
        enrichedForm = {
          ...form,
          title: form.title.trim() || parsed.title,
          company: form.company.trim() || parsed.company,
          description: form.description.trim() || parsed.description,
          notes: form.notes.trim() || parsed.notes,
          offerAddedAt:
            form.offerAddedAt || normalizeDateOnly(parsed.offerAddedAt),
          offerClosedAt: form.offerClosedAt || parsed.offerClosedAt,
        };
        setStructuredDataText(enrichedStructuredData);
        setForm({ ...enrichedForm });
      } catch {
        // dane oferty niedostępne – kontynuuj z tym co jest w formularzu
      }

      const generated = await generateAndSaveOfferAssets(
        normalizedUrl,
        enrichedForm.company.trim(),
        enrichedForm.title.trim(),
      );
      const screenshotName = generated.screenshot.path.split("/").pop();
      const pdfName = generated.pdf.path.split("/").pop();

      const updatedExistingFiles = {
        ...existingFiles,
        screenshotPath: generated.screenshot.path,
        screenshotName: screenshotName || existingFiles.screenshotName,
        pdfPath: generated.pdf.path,
        pdfName: pdfName || existingFiles.pdfName,
      };
      setExistingFiles(updatedExistingFiles);
      setScreenshotError(null);
      setPdfError(null);

      await saveOfferToDb({
        storedScreenshot: generated.screenshot,
        storedPdf: generated.pdf,
        storedCv: null,
        currentForm: enrichedForm,
        currentExistingFiles: updatedExistingFiles,
        currentStructuredData: enrichedStructuredData,
      });
      resetForm();
    } catch (error) {
      setServerAssetsError(
        error instanceof Error
          ? error.message
          : "Błąd generowania plików po stronie serwera.",
      );
    } finally {
      setIsGeneratingServerAssets(false);
    }
  };

  const handleFetchOffer = async () => {
    if (!form.url) return;
    setIsFetchingOffer(true);
    setFetchError(null);

    const normalizedUrl = form.url.trim();
    const existing = offers.find((offer) => offer.url === normalizedUrl);
    if (existing && existing.id !== editingId) {
      setFetchError("Oferta z tym URL już istnieje.");
      setIsFetchingOffer(false);
      return;
    }

    try {
      const data = await fetchOfferData(normalizedUrl);
      console.log("Pobrana treść ogłoszenia:", data);
      const parsed = parseOfferData(data);

      setStructuredDataText(parsed.structuredDataText || null);

      setForm((prev) => ({
        ...prev,
        title: prev.title || parsed.title,
        company: prev.company || parsed.company,
        description: prev.description || parsed.description,
        notes: prev.notes || parsed.notes,
        offerAddedAt:
          prev.offerAddedAt || normalizeDateOnly(parsed.offerAddedAt),
        offerClosedAt: prev.offerClosedAt || parsed.offerClosedAt,
      }));
    } catch (error) {
      setFetchError(error instanceof Error ? error.message : "Błąd pobierania");
    } finally {
      setIsFetchingOffer(false);
    }
  };

  const saveOfferToDb = async ({
    storedScreenshot,
    storedPdf,
    storedCv,
    currentForm,
    currentExistingFiles,
    currentStructuredData,
  }: {
    storedScreenshot: { path: string } | null;
    storedPdf: { path: string } | null;
    storedCv: { path: string } | null;
    currentForm: OfferFormState;
    currentExistingFiles: typeof existingFiles;
    currentStructuredData: string | null;
  }) => {
    const now = new Date().toISOString();
    const payload: Offer = {
      title: currentForm.title.trim(),
      company: currentForm.company.trim(),
      url: currentForm.url.trim(),
      status: currentForm.status,
      category: currentForm.category,
      description: currentForm.description.trim(),
      notes: currentForm.notes.trim(),
      offerAddedAt: currentForm.offerAddedAt || new Date().toISOString().slice(0, 10),
      offerClosedAt: currentForm.offerClosedAt || undefined,
      structuredData: currentStructuredData || undefined,
      screenshotName:
        currentForm.screenshotFile?.name ?? currentExistingFiles.screenshotName,
      screenshotPath:
        storedScreenshot?.path ?? currentExistingFiles.screenshotPath,
      pdfName: currentForm.pdfFile?.name ?? currentExistingFiles.pdfName,
      pdfPath: storedPdf?.path ?? currentExistingFiles.pdfPath,
      cvName: currentForm.cvFile?.name ?? currentExistingFiles.cvName,
      cvPath: storedCv?.path ?? currentExistingFiles.cvPath,
      createdAt: editingCreatedAt ?? now,
      updatedAt: now,
    };

    if (useFirestore) {
      if (typeof editingId === "string" && editingId) {
        await updateDoc(
          doc(firestore, "offers", editingId),
          await toFirestorePayload(payload),
        );
      } else {
        await addDoc(offersCollection, await toFirestorePayload(payload));
      }
    } else if (typeof editingId === "number") {
      await localDb.offers.update(editingId, payload);
    } else {
      await localDb.offers.add(payload);
    }

    await refreshOffers();
  };

  const toFirestorePayload = async (payload: Offer): Promise<FirestoreOffer> =>
    omitUndefined({
      title: payload.title,
      company: payload.company,
      url: payload.url,
      status: payload.status,
      category: payload.category,
      description: payload.description,
      notes: payload.notes,
      offerAddedAt: payload.offerAddedAt,
      offerClosedAt: payload.offerClosedAt,
      structuredData: payload.structuredData,
      screenshotName: payload.screenshotName,
      screenshotPath: payload.screenshotPath,
      pdfName: payload.pdfName,
      pdfPath: payload.pdfPath,
      cvName: payload.cvName,
      cvPath: payload.cvPath,
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt,
    }) as FirestoreOffer;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    const normalizedUrl = form.url.trim();

    const existing = offers.find((offer) => offer.url === normalizedUrl);
    if (existing && existing.id !== editingId) {
      setSubmitError("Oferta z tym URL już istnieje.");
      return;
    }

    try {
      const screenshotSource =
        form.screenshotFile ??
        (existingFiles.screenshotPath ? undefined : existingFiles.screenshotBlob);
      const pdfSource =
        form.pdfFile ?? (existingFiles.pdfPath ? undefined : existingFiles.pdfBlob);
      const cvSource =
        form.cvFile ?? (existingFiles.cvPath ? undefined : existingFiles.cvBlob);

      const storedScreenshot = screenshotSource
        ? await saveFileInProject(
            screenshotSource,
            form.screenshotFile?.name ??
              existingFiles.screenshotName ??
              "screenshot.png",
            "screenshot",
          )
        : null;
      const storedPdf = pdfSource
        ? await saveFileInProject(
            pdfSource,
            form.pdfFile?.name ?? existingFiles.pdfName ?? "oferta.pdf",
            "pdf",
          )
        : null;
      const storedCv = cvSource
        ? await saveFileInProject(
            cvSource,
            form.cvFile?.name ?? existingFiles.cvName ?? "cv.pdf",
            "cv",
          )
        : null;

      await saveOfferToDb({
        storedScreenshot,
        storedPdf,
        storedCv,
        currentForm: form,
        currentExistingFiles: existingFiles,
        currentStructuredData: structuredDataText,
      });
      resetForm();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Nie udało się zapisać oferty.",
      );
    }
  };

  const handleEdit = (offer: Offer) => {
    setEditingId(offer.id ?? null);
    setEditingCreatedAt(offer.createdAt);
    setExistingFiles({
      screenshotBlob: offer.screenshotBlob,
      screenshotName: offer.screenshotName,
      screenshotPath: offer.screenshotPath,
      pdfBlob: offer.pdfBlob,
      pdfName: offer.pdfName,
      pdfPath: offer.pdfPath,
      cvBlob: offer.cvBlob,
      cvName: offer.cvName,
      cvPath: offer.cvPath,
    });
    setStructuredDataText(offer.structuredData ?? null);
    setIsFormOpen(true);
    setForm({
      title: offer.title,
      company: offer.company,
      url: offer.url,
      status: offer.status,
      category: offer.category,
      description: offer.description ?? "",
      notes: offer.notes ?? "",
      offerAddedAt: normalizeDateOnly(offer.offerAddedAt),
      offerClosedAt: offer.offerClosedAt ?? "",
      screenshotFile: null,
      pdfFile: null,
      cvFile: null,
    });
  };

  const handleDelete = async (offer: Offer) => {
    if (!offer.id) return;
    if (useFirestore && typeof offer.id === "string") {
      await deleteDoc(doc(firestore, "offers", offer.id));
    } else if (!useFirestore && typeof offer.id === "number") {
      await localDb.offers.delete(offer.id);
    }
    await refreshOffers();
    if (editingId === offer.id) {
      resetForm();
    }
  };

  const handleStatusChange = async (
    offerId: string | number,
    status: OfferStatus,
  ) => {
    if (!offerId) return;
    if (useFirestore && typeof offerId === "string") {
      await updateDoc(doc(firestore, "offers", offerId), {
        status,
        updatedAt: new Date().toISOString(),
      });
    } else if (!useFirestore && typeof offerId === "number") {
      await localDb.offers.update(offerId, {
        status,
        updatedAt: new Date().toISOString(),
      });
    }
    await refreshOffers();
  };

  const handleExport = async () => {
    const zip = new JSZip();
    const assetsFolder = zip.folder("assets");
    const readStoredBlob = async (filePath?: string) => {
      const fileUrl = toPublicFileUrl(filePath);
      if (!fileUrl) return undefined;
      const response = await fetch(fileUrl);
      if (!response.ok) return undefined;
      return response.blob();
    };

    const exportItems: OfferExport[] = await Promise.all(offers.map(async (offer, index) => {
      const baseName = `${String(index + 1).padStart(3, "0")}-${toSafeFileName(`${offer.company}-${offer.title}`, "oferta")}`;

      const screenshotBlob =
        offer.screenshotBlob ?? (await readStoredBlob(offer.screenshotPath));

      const screenshotExt = getFileExtension(offer.screenshotName, "jpg");
      const screenshotFileName = screenshotBlob
        ? `${baseName}-screenshot.${screenshotExt}`
        : undefined;
      if (screenshotFileName && screenshotBlob && assetsFolder) {
        assetsFolder.file(screenshotFileName, screenshotBlob);
      }

      const pdfBlob = offer.pdfBlob ?? (await readStoredBlob(offer.pdfPath));

      const pdfExt = getFileExtension(offer.pdfName, "pdf");
      const pdfFileName = pdfBlob ? `${baseName}-pdf.${pdfExt}` : undefined;
      if (pdfFileName && pdfBlob && assetsFolder) {
        assetsFolder.file(pdfFileName, pdfBlob);
      }

      const cvBlob = offer.cvBlob ?? (await readStoredBlob(offer.cvPath));

      const cvExt = getFileExtension(offer.cvName, "pdf");
      const cvFileName = cvBlob ? `${baseName}-cv.${cvExt}` : undefined;
      if (cvFileName && cvBlob && assetsFolder) {
        assetsFolder.file(cvFileName, cvBlob);
      }

      return {
        title: offer.title,
        company: offer.company,
        url: offer.url,
        status: offer.status,
        category: offer.category,
        description: offer.description,
        notes: offer.notes,
        offerAddedAt: offer.offerAddedAt,
        offerClosedAt: offer.offerClosedAt,
        structuredData: offer.structuredData,
        screenshotName: offer.screenshotName,
        screenshotPath: offer.screenshotPath,
        pdfName: offer.pdfName,
        pdfPath: offer.pdfPath,
        cvName: offer.cvName,
        cvPath: offer.cvPath,
        createdAt: offer.createdAt,
        updatedAt: offer.updatedAt,
        screenshotFilePath: screenshotFileName
          ? `assets/${screenshotFileName}`
          : undefined,
        pdfFilePath: pdfFileName ? `assets/${pdfFileName}` : undefined,
        cvFilePath: cvFileName ? `assets/${cvFileName}` : undefined,
      };
    }));

    zip.file(
      "offers.json",
      JSON.stringify(
        {
          formatVersion: 2,
          exportedAt: new Date().toISOString(),
          offers: exportItems,
        },
        null,
        2,
      ),
    );

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `oferty-${new Date().toISOString().slice(0, 10)}.zip`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File | null) => {
    if (!file) return;
    try {
      let parsed: { offers?: OfferExport[] };
      let zipArchive: JSZip | null = null;

      if (file.name.toLowerCase().endsWith(".zip")) {
        zipArchive = await JSZip.loadAsync(file);
        const metadataEntry =
          zipArchive.file("offers.json") ??
          zipArchive.file(/offers\.json$/i)[0];
        if (!metadataEntry) {
          throw new Error("Brak pliku offers.json w archiwum ZIP.");
        }
        parsed = JSON.parse(await metadataEntry.async("text")) as {
          offers?: OfferExport[];
        };
      } else {
        const text = await file.text();
        parsed = JSON.parse(text) as { offers?: OfferExport[] };
      }

      const items = parsed.offers ?? [];
      if (items.length === 0) return;

      const readZipBlob = async (path?: string) => {
        if (!zipArchive || !path) return undefined;
        const normalized = path.replace(/^\.\//, "");
        const zipEntry =
          zipArchive.file(normalized) ??
          zipArchive.file(normalized.split("/").pop() ?? "");
        if (!zipEntry) return undefined;
        return zipEntry.async("blob");
      };

      const mappedItems: Offer[] = await Promise.all(
        items.map(async (item) => {
          const screenshotBlob =
            (await readZipBlob(item.screenshotFilePath)) ??
            dataUrlToBlob(item.screenshotDataUrl);
          const pdfBlob =
            (await readZipBlob(item.pdfFilePath)) ?? dataUrlToBlob(item.pdfDataUrl);
          const cvBlob =
            (await readZipBlob(item.cvFilePath)) ?? dataUrlToBlob(item.cvDataUrl);

          const savedScreenshot = screenshotBlob
            ? await saveFileInProject(
                screenshotBlob,
                item.screenshotName ?? "screenshot.png",
                "screenshot",
              )
            : null;
          const savedPdf = pdfBlob
            ? await saveFileInProject(pdfBlob, item.pdfName ?? "oferta.pdf", "pdf")
            : null;
          const savedCv = cvBlob
            ? await saveFileInProject(cvBlob, item.cvName ?? "cv.pdf", "cv")
            : null;

          return {
            title: item.title,
            company: item.company,
            url: item.url,
            status: item.status,
            category: item.category ?? "web",
            description: item.description,
            notes: item.notes,
            offerAddedAt: item.offerAddedAt,
            offerClosedAt: item.offerClosedAt,
            structuredData: item.structuredData,
            screenshotName: item.screenshotName,
            screenshotPath: savedScreenshot?.path,
            pdfName: item.pdfName,
            pdfPath: savedPdf?.path,
            cvName: item.cvName,
            cvPath: savedCv?.path,
            createdAt: item.createdAt ?? new Date().toISOString(),
            updatedAt: item.updatedAt ?? new Date().toISOString(),
          };
        }),
      );

      const shouldReplace = window.confirm(
        "Czy chcesz zastąpić aktualne dane importem?",
      );
      if (useFirestore) {
        if (shouldReplace) {
          const snapshot = await getDocs(offersCollection);
          const batch = writeBatch(firestore);
          snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
          await batch.commit();
        }

        const batch = writeBatch(firestore);
        for (const item of mappedItems) {
          const docRef = doc(offersCollection);
          batch.set(
            docRef,
            omitUndefined({
              title: item.title,
              company: item.company,
              url: item.url,
              status: item.status,
              category: item.category,
              description: item.description,
              notes: item.notes,
              offerAddedAt: item.offerAddedAt,
              offerClosedAt: item.offerClosedAt,
              structuredData: item.structuredData,
              screenshotName: item.screenshotName,
              screenshotPath: item.screenshotPath,
              pdfName: item.pdfName,
              pdfPath: item.pdfPath,
              cvName: item.cvName,
              cvPath: item.cvPath,
              createdAt: item.createdAt ?? new Date().toISOString(),
              updatedAt: item.updatedAt ?? new Date().toISOString(),
            }) as FirestoreOffer,
          );
        }
        await batch.commit();
      } else {
        if (shouldReplace) {
          await localDb.offers.clear();
        }
        await localDb.offers.bulkAdd(mappedItems);
      }
      await refreshOffers();
    } catch (error) {
      console.error("Import do Firestore nieudany", error);
      window.alert(
        useFirestore
          ? "Import do Firestore nieudany. Sprawdź reguły lub rozmiar danych."
          : "Import lokalny nieudany.",
      );
    }
  };

  return (
    <div className="app">
      <AppHeader
        statusOptions={statusOptions}
        totalByStatus={totalByStatus}
        onExport={handleExport}
        onImport={handleImport}
        onAddOffer={() => {
          setActiveView("offers");
          setIsFormOpen(true);
        }}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode((prev) => !prev)}
        useFirestore={useFirestore}
        onToggleStorage={() => setUseFirestore((prev) => !prev)}
      />

      <nav className="app-tabs">
        <button
          type="button"
          className={activeView === "offers" ? "active" : ""}
          onClick={() => setActiveView("offers")}
        >
          Oferty
        </button>
        <button
          type="button"
          className={activeView === "cv" ? "active" : ""}
          onClick={() => setActiveView("cv")}
        >
          Kreator CV
        </button>
      </nav>

      {activeView === "offers" ? (
        <>
          {isFormOpen && (
            <div
              className="form-modal-backdrop"
              onClick={() => setIsFormOpen(false)}
            >
              <div
                className="form-modal-content"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
              >
                <OfferForm
                  editingId={editingId}
                  isFormOpen
                  onToggleForm={() => setIsFormOpen(false)}
                  form={form}
                  statusOptions={statusOptions}
                  handleChange={handleChange}
                  handleSubmit={handleSubmit}
                  resetForm={resetForm}
                  isFetchingOffer={isFetchingOffer}
                  fetchError={fetchError}
                  submitError={submitError}
                  structuredDataText={structuredDataText}
                  onShowStructuredData={() => setIsStructuredModalOpen(true)}
                  isCapturingScreenshot={isCapturingScreenshot}
                  screenshotError={screenshotError}
                  screenshotPreviewUrl={screenshotPreviewUrl}
                  isGeneratingPdf={isGeneratingPdf}
                  pdfError={pdfError}
                  isGeneratingServerAssets={isGeneratingServerAssets}
                  serverAssetsError={serverAssetsError}
                  screenshotInputRef={screenshotInputRef}
                  handleFetchOffer={handleFetchOffer}
                  handleCaptureScreenshot={handleCaptureScreenshot}
                  handleGeneratePdf={handleGeneratePdf}
                  handleGenerateServerAssets={handleGenerateServerAssets}
                  existingFiles={existingFiles}
                />
              </div>
            </div>
          )}

          <OffersSection
            visibleOffers={visibleOffers}
            statusOptions={statusOptions}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            sortOption={sortOption}
            setSortOption={setSortOption}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />
        </>
      ) : (
        <CvBuilder />
      )}

      <StructuredDataModal
        structuredDataText={structuredDataText}
        isOpen={isStructuredModalOpen}
        onClose={() => setIsStructuredModalOpen(false)}
      />
    </div>
  );
}

export default App;
