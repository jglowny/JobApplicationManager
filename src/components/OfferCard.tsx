import { useEffect, useMemo, useState } from "react";
import { type Offer, type OfferStatus } from "../db";

type OfferCardProps = {
  offer: Offer;
  statusOptions: OfferStatus[];
  onEdit: (offer: Offer) => void;
  onDelete: (offer: Offer) => void;
  onStatusChange: (offerId: string | number, status: OfferStatus) => void;
  variant?: "full" | "details";
};

export default function OfferCard({
  offer,
  statusOptions,
  onEdit,
  onDelete,
  onStatusChange,
  variant = "full",
}: OfferCardProps) {
  const isDetails = variant === "details";
  const screenshotPathUrl = offer.screenshotPath
    ? `/${offer.screenshotPath.replace(/^\/+/, "")}`
    : null;
  const screenshotUrl = useMemo(
    () =>
      offer.screenshotBlob
        ? URL.createObjectURL(offer.screenshotBlob)
        : screenshotPathUrl,
    [offer.screenshotBlob, screenshotPathUrl],
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const daysLeft = offer.offerClosedAt
    ? Math.ceil(
        (new Date(offer.offerClosedAt).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;
  const isExpired = daysLeft !== null && daysLeft <= 0;

  useEffect(() => {
    if (!offer.screenshotBlob || !screenshotUrl) {
      return undefined;
    }
    return () => URL.revokeObjectURL(screenshotUrl);
  }, [offer.screenshotBlob, screenshotUrl]);

  const handleDownload = (blob?: Blob, filename?: string, filePath?: string) => {
    if (!blob && !filePath) return;
    const url = blob
      ? URL.createObjectURL(blob)
      : `/${String(filePath).replace(/^\/+/, "")}`;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename || "plik";
    anchor.click();
    if (blob) {
      URL.revokeObjectURL(url);
    }
  };

  return (
    <article
      className={`offer-card${isDetails ? " offer-card--details" : ""}${isExpired ? " offer-card--expired" : ""}`}
    >
      <header>
        {!isDetails && (
          <div>
            <h3>{offer.title}</h3>
            <p className="offer-company">{offer.company || "Bez firmy"}</p>
            {offer.status === "Aplikacja wysłana" && (
              <span className="status-badge status-sent">
                Aplikacja wysłana
              </span>
            )}
          </div>
        )}
        <select
          value={offer.status}
          onChange={(event) =>
            onStatusChange(offer.id ?? "", event.target.value as OfferStatus)
          }
          aria-label="Status aplikacji"
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </header>

      <div className="offer-meta">
        <div className="offer-meta-left">
          <a href={offer.url} target="_blank" rel="noreferrer">
            {offer.url}
          </a>
          {(offer.offerAddedAt || (offer.offerClosedAt && !isDetails)) && (
            <div>
              {offer.offerAddedAt && (
                <span>
                  Dodanie oferty:{" "}
                  {new Date(offer.offerAddedAt).toLocaleDateString()}
                </span>
              )}
              {offer.offerClosedAt && !isDetails && (
                <span>
                  Zakończenie:{" "}
                  {new Date(offer.offerClosedAt).toLocaleDateString()}
                </span>
              )}
              {offer.offerClosedAt && daysLeft !== null && !isDetails && (
                <span>
                  {daysLeft > 0 ? `Pozostało dni: ${daysLeft}` : "Termin minął"}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="offer-meta-right">
          <span>Utworzono: {new Date(offer.createdAt).toLocaleString()}</span>
          {offer.updatedAt !== offer.createdAt && (
            <span>
              Aktualizacja: {new Date(offer.updatedAt).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {offer.description && (
        <div className="offer-description">
          <p className="offer-notes">
            {isDescriptionExpanded
              ? offer.description
              : `${offer.description.slice(0, 100)}${offer.description.length > 100 ? "…" : ""}`}
          </p>
          {offer.description.length > 100 && (
            <button
              type="button"
              className="link-button"
              onClick={() => setIsDescriptionExpanded((prev) => !prev)}
            >
              {isDescriptionExpanded ? "Zwiń" : "Rozwiń"}
            </button>
          )}
        </div>
      )}

      <div className="offer-assets">
        <div>
          <p className="asset-label">Screen oferty</p>
          {screenshotUrl ? (
            <img
              src={screenshotUrl}
              alt={`Screenshot ${offer.title}`}
              className="screenshot-thumb"
              onClick={() => setIsModalOpen(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  setIsModalOpen(true);
                }
              }}
            />
          ) : (
            <p className="asset-empty">Brak screena</p>
          )}
        </div>
        <div>
          <p className="asset-label">CV</p>
          {(offer.cvBlob || offer.cvPath) && offer.cvName ? (
            <button
              type="button"
              className="cv-link"
              onClick={() =>
                handleDownload(offer.cvBlob, offer.cvName, offer.cvPath)
              }
            >
              {offer.cvName}
            </button>
          ) : (
            <p className="asset-empty">Brak przypisanego CV</p>
          )}
        </div>
        <div>
          <p className="asset-label">PDF ogłoszenia</p>
          {(offer.pdfBlob || offer.pdfPath) && offer.pdfName ? (
            <button
              type="button"
              className="cv-link"
              onClick={() =>
                handleDownload(offer.pdfBlob, offer.pdfName, offer.pdfPath)
              }
            >
              {offer.pdfName}
            </button>
          ) : (
            <p className="asset-empty">Brak PDF</p>
          )}
        </div>
      </div>

      <div className="offer-actions">
        <button type="button" onClick={() => onEdit(offer)}>
          Edytuj
        </button>
        <button
          type="button"
          className="danger"
          onClick={() => onDelete(offer)}
        >
          Usuń
        </button>
      </div>

      {screenshotUrl && isModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setIsModalOpen(false)}
          onWheel={(event) => {
            event.preventDefault();
            setZoom((prev) => {
              const next = prev + (event.deltaY < 0 ? 0.1 : -0.1);
              return Math.min(3, Math.max(0.5, Number(next.toFixed(2))));
            });
          }}
        >
          <div
            className="modal-content"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setIsModalOpen(false)}
              aria-label="Zamknij"
            >
              ✕
            </button>
            <div className="modal-toolbar">
              <button
                type="button"
                onClick={() =>
                  setZoom((prev) => Math.max(0.5, +(prev - 0.1).toFixed(2)))
                }
              >
                −
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={() =>
                  setZoom((prev) => Math.min(3, +(prev + 0.1).toFixed(2)))
                }
              >
                +
              </button>
              <button type="button" onClick={() => setZoom(1)}>
                Reset
              </button>
              <button
                type="button"
                className="download-link"
                onClick={() =>
                  handleDownload(
                    offer.screenshotBlob,
                    offer.screenshotName || "screenshot.png",
                    offer.screenshotPath,
                  )
                }
              >
                Pobierz
              </button>
            </div>
            <img
              src={screenshotUrl}
              alt={`Pełny screenshot ${offer.title}`}
              className="modal-image"
              style={{ transform: `scale(${zoom})` }}
            />
          </div>
        </div>
      )}
    </article>
  );
}
