import { useState } from "react";
import { type OfferStatus } from "../db";
import DataActions from "./DataActions";

type AppHeaderProps = {
  statusOptions: OfferStatus[];
  totalByStatus: Record<OfferStatus, number>;
  onExport: () => void;
  onImport: (file: File | null) => void;
  onAddOffer: () => void;
  onOpenOffers: () => void;
  onOpenCv: () => void;
  activeView: "offers" | "cv";
  isDarkMode: boolean;
  onToggleTheme: () => void;
  useFirestore: boolean;
  onToggleStorage: () => void;
};

export default function AppHeader({
  statusOptions,
  totalByStatus,
  onExport,
  onImport,
  onAddOffer,
  onOpenOffers,
  onOpenCv,
  activeView,
  isDarkMode,
  onToggleTheme,
  useFirestore,
  onToggleStorage,
}: AppHeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <header className="app-topbar">
      <div className="app-topbar-content">
        <div className="app-topbar-left">
          <div className="app-topbar-info">
            <span className="app-topbar-title">Moje oferty pracy</span>
            <div className="app-topbar-links">
              <button
                type="button"
                className={`jobs-link${activeView === "offers" ? " active" : ""}`}
                onClick={onOpenOffers}
              >
                Oferty
              </button>
              <button
                type="button"
                className={`jobs-link${activeView === "cv" ? " active" : ""}`}
                onClick={onOpenCv}
              >
                Kreator CV
              </button>
              <a
                className="jobs-link"
                href="/jobs.html"
                target="_blank"
                rel="noreferrer"
              >
                Lista pobieranych ofert
              </a>
            </div>
          </div>
          <button
            type="button"
            className="add-offer-link"
            onClick={onAddOffer}
            aria-label="Dodaj ofertę"
            title="Dodaj ofertę"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </button>
        </div>
        <div className="app-topbar-right">
          <div className="mobile-settings">
            <button
              type="button"
              className="mobile-settings-button"
              onClick={() => setIsSettingsOpen((prev) => !prev)}
              aria-expanded={isSettingsOpen}
              aria-label="Ustawienia"
              title="Ustawienia"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zm8.5 3.5a8.3 8.3 0 0 0-.08-1l2-1.55a1 1 0 0 0 .24-1.3l-1.9-3.3a1 1 0 0 0-1.24-.44l-2.35.95a8.6 8.6 0 0 0-1.73-1l-.36-2.5a1 1 0 0 0-1-.85H9.42a1 1 0 0 0-1 .85l-.36 2.5a8.6 8.6 0 0 0-1.73 1l-2.35-.95a1 1 0 0 0-1.24.44l-1.9 3.3a1 1 0 0 0 .24 1.3l2 1.55a8.3 8.3 0 0 0 0 2l-2 1.55a1 1 0 0 0-.24 1.3l1.9 3.3a1 1 0 0 0 1.24.44l2.35-.95c.54.4 1.12.74 1.73 1l.36 2.5a1 1 0 0 0 1 .85h3.16a1 1 0 0 0 1-.85l.36-2.5c.61-.26 1.19-.6 1.73-1l2.35.95a1 1 0 0 0 1.24-.44l1.9-3.3a1 1 0 0 0-.24-1.3l-2-1.55c.05-.33.08-.66.08-1z"
                  fill="currentColor"
                />
              </svg>
            </button>
            {isSettingsOpen && (
              <div className="mobile-settings-menu" role="menu">
                <div className="settings-statuses" aria-label="Statusy ofert">
                  {statusOptions.map((status) => (
                    <div key={status}>
                      <span>{status}</span>
                      <strong>{totalByStatus[status] ?? 0}</strong>
                    </div>
                  ))}
                </div>
                <div className="mobile-settings-item mobile-settings-switch">
                  <span className="storage-label">Chmura</span>
                  <button
                    type="button"
                    className={`theme-switch${useFirestore ? " is-on" : ""}`}
                    onClick={onToggleStorage}
                    role="switch"
                    aria-checked={useFirestore}
                    aria-label={
                      useFirestore
                        ? "Wyłącz zapis do chmury"
                        : "Włącz zapis do chmury"
                    }
                    title={useFirestore ? "Zapis do chmury" : "Zapis lokalny"}
                  >
                    <span className="theme-switch-track" aria-hidden="true">
                      <span className="theme-switch-thumb" />
                    </span>
                  </button>
                </div>
                <div className="mobile-settings-item mobile-settings-switch">
                  <span className="storage-label">Tryb nocny</span>
                  <button
                    type="button"
                    className={`theme-switch${isDarkMode ? " is-on" : ""}`}
                    onClick={onToggleTheme}
                    role="switch"
                    aria-checked={isDarkMode}
                    aria-label={
                      isDarkMode ? "Wyłącz tryb nocny" : "Włącz tryb nocny"
                    }
                    title={isDarkMode ? "Wyłącz tryb nocny" : "Włącz tryb nocny"}
                  >
                    <span className="theme-switch-track" aria-hidden="true">
                      <span className="theme-switch-thumb" />
                    </span>
                  </button>
                </div>
                <DataActions onExport={onExport} onImport={onImport} />
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
