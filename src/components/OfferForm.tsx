import { type FormEvent, type RefObject } from "react";
import { type OfferStatus } from "../db";
import { type OfferFormState } from "../types/offer";

type ExistingFiles = {
  screenshotBlob?: Blob;
  screenshotName?: string;
  pdfBlob?: Blob;
  pdfName?: string;
  cvBlob?: Blob;
  cvName?: string;
};

type OfferFormProps = {
  editingId: string | number | null;
  isFormOpen: boolean;
  onToggleForm: () => void;
  form: OfferFormState;
  statusOptions: OfferStatus[];
  handleChange: (
    field: keyof OfferFormState,
    value: string | File | null,
  ) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  resetForm: () => void;
  isFetchingOffer: boolean;
  fetchError: string | null;
  submitError: string | null;
  structuredDataText: string | null;
  onShowStructuredData: () => void;
  isCapturingScreenshot: boolean;
  screenshotError: string | null;
  screenshotPreviewUrl: string | null;
  isGeneratingPdf: boolean;
  pdfError: string | null;
  isGeneratingServerAssets: boolean;
  serverAssetsError: string | null;
  screenshotInputRef: RefObject<HTMLInputElement | null>;
  handleFetchOffer: () => void;
  handleCaptureScreenshot: () => void;
  handleGeneratePdf: () => void;
  handleGenerateServerAssets: () => void;
  existingFiles: ExistingFiles;
};

export default function OfferForm({
  editingId,
  isFormOpen,
  onToggleForm,
  form,
  statusOptions,
  handleChange,
  handleSubmit,
  resetForm,
  isFetchingOffer,
  fetchError,
  submitError,
  structuredDataText,
  onShowStructuredData,
  isCapturingScreenshot,
  screenshotError,
  screenshotPreviewUrl,
  isGeneratingPdf,
  pdfError,
  isGeneratingServerAssets,
  serverAssetsError,
  screenshotInputRef,
  handleFetchOffer,
  handleCaptureScreenshot,
  handleGeneratePdf,
  handleGenerateServerAssets,
  existingFiles,
}: OfferFormProps) {
  return (
    <section className="form-section" id="offer-form">
      <div className="form-header">
        <h2>{editingId ? "Edytuj ofertę" : "Dodaj ofertę"}</h2>
        <button type="button" className="toggle-form" onClick={onToggleForm}>
          {isFormOpen ? "−" : "+"}
        </button>
      </div>
      {isFormOpen && (
        <form onSubmit={handleSubmit} className="offer-form">
          <div className="form-grid">
            <label>
              Nazwa stanowiska
              <input
                type="text"
                value={form.title}
                onChange={(event) => handleChange("title", event.target.value)}
                placeholder="Frontend Developer"
                required
              />
            </label>
            <label>
              Firma
              <input
                type="text"
                value={form.company}
                onChange={(event) =>
                  handleChange("company", event.target.value)
                }
                placeholder="Nazwa firmy"
              />
            </label>
            <label className="span-2">
              URL oferty
              <input
                type="url"
                value={form.url}
                onChange={(event) => handleChange("url", event.target.value)}
                placeholder="https://..."
                required
              />
              <div className="inline-actions">
                <button
                  type="button"
                  onClick={handleFetchOffer}
                  disabled={isFetchingOffer || !form.url}
                >
                  {isFetchingOffer ? "Pobieram..." : "Pobierz treść"}
                </button>
                {structuredDataText && (
                  <button type="button" onClick={onShowStructuredData}>
                    Pokaż structuredData
                  </button>
                )}
                {fetchError && <span className="form-error">{fetchError}</span>}
              </div>
            </label>
            <label>
              Status
              <select
                value={form.status}
                onChange={(event) =>
                  handleChange("status", event.target.value as OfferStatus)
                }
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Kategoria
              <select
                value={form.category}
                onChange={(event) =>
                  handleChange("category", event.target.value)
                }
              >
                <option value="web">Web</option>
                <option value="it">IT</option>
              </select>
            </label>
            <label>
              Dodanie oferty
              <input
                type="date"
                value={form.offerAddedAt}
                onChange={(event) =>
                  handleChange("offerAddedAt", event.target.value)
                }
              />
            </label>
            <label>
              Zakończenie
              <input
                type="date"
                value={form.offerClosedAt}
                onChange={(event) =>
                  handleChange("offerClosedAt", event.target.value)
                }
              />
            </label>
            <label className="span-2">
              Screenshot ogłoszenia
              <div className="screenshot-actions">
                <button
                  type="button"
                  onClick={() => screenshotInputRef.current?.click()}
                >
                  Dodaj screenshot
                </button>
                <button
                  type="button"
                  onClick={handleCaptureScreenshot}
                  disabled={isCapturingScreenshot || !form.url}
                >
                  {isCapturingScreenshot
                    ? "Robię screenshot..."
                    : "Zrób screenshot"}
                </button>
                <button
                  type="button"
                  onClick={() => handleGeneratePdf()}
                  disabled={isGeneratingPdf || !form.url}
                >
                  {isGeneratingPdf ? "Generuję PDF..." : "Zapisz do PDF"}
                </button>
                <button
                  type="button"
                  onClick={handleGenerateServerAssets}
                  disabled={
                    isGeneratingServerAssets ||
                    isCapturingScreenshot ||
                    isGeneratingPdf ||
                    !form.url
                  }
                >
                  {isGeneratingServerAssets
                    ? "Generuję i zapisuję..."
                    : "Generuj + zapisz (serwer)"}
                </button>
                <input
                  ref={screenshotInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden-input"
                  onChange={(event) =>
                    handleChange(
                      "screenshotFile",
                      event.target.files?.[0] ?? null,
                    )
                  }
                />
                {form.screenshotFile ? (
                  <span className="file-hint">
                    Wybrano: {form.screenshotFile.name}
                  </span>
                ) : (
                  existingFiles.screenshotName && (
                    <span className="file-hint">
                      Aktualny: {existingFiles.screenshotName}
                    </span>
                  )
                )}
                {form.pdfFile ? (
                  <span className="file-hint">PDF: {form.pdfFile.name}</span>
                ) : (
                  existingFiles.pdfName && (
                    <span className="file-hint">
                      PDF: {existingFiles.pdfName}
                    </span>
                  )
                )}
                {screenshotError && (
                  <span className="form-error">{screenshotError}</span>
                )}
                {pdfError && <span className="form-error">{pdfError}</span>}
                {serverAssetsError && (
                  <span className="form-error">{serverAssetsError}</span>
                )}
              </div>
              {isCapturingScreenshot && (
                <div className="screenshot-preview loading">
                  Generuję podgląd screena...
                </div>
              )}
              {screenshotPreviewUrl && !isCapturingScreenshot && (
                <img
                  className="screenshot-preview"
                  src={screenshotPreviewUrl}
                  alt="Podgląd screena"
                />
              )}
            </label>
            <label>
              CV (PDF/DOC)
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(event) =>
                  handleChange("cvFile", event.target.files?.[0] ?? null)
                }
              />
              {existingFiles.cvName && !form.cvFile && (
                <span className="file-hint">
                  Aktualny: {existingFiles.cvName}
                </span>
              )}
            </label>
            <label className="span-2">
              Opis
              <textarea
                value={form.description}
                onChange={(event) =>
                  handleChange("description", event.target.value)
                }
                placeholder="Opis oferty"
                rows={4}
              />
            </label>
          </div>

          <div className="form-actions">
            <button type="submit">
              {editingId ? "Zapisz zmiany" : "Dodaj ofertę"}
            </button>
            <button type="button" className="secondary" onClick={resetForm}>
              Wyczyść
            </button>
          </div>
          {submitError && <span className="form-error">{submitError}</span>}
        </form>
      )}
    </section>
  );
}
