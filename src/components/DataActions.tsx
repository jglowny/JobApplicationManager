type DataActionsProps = {
  onExport: () => void;
  onImport: (file: File | null) => void;
  iconOnly?: boolean;
};

export default function DataActions({
  onExport,
  onImport,
  iconOnly = false,
}: DataActionsProps) {
  return (
    <section className={`data-actions${iconOnly ? " data-actions--icon" : ""}`}>
      <button
        type="button"
        onClick={onExport}
        aria-label="Eksportuj ZIP"
        title="Eksportuj ZIP"
      >
        {iconOnly ? (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 3a1 1 0 0 1 1 1v9.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4.01 4a1 1 0 0 1-1.4 0l-4.01-4a1 1 0 1 1 1.4-1.42L11 13.59V4a1 1 0 0 1 1-1z"
              fill="currentColor"
            />
            <path
              d="M5 19a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H6a1 1 0 0 1-1-1z"
              fill="currentColor"
            />
          </svg>
        ) : (
          "Eksportuj do ZIP"
        )}
      </button>
      <label
        className="import-button"
        aria-label="Importuj ZIP lub JSON"
        title="Importuj ZIP lub JSON"
      >
        {iconOnly ? (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 21a1 1 0 0 1-1-1v-9.59l-2.3 2.3a1 1 0 1 1-1.4-1.42l4.01-4a1 1 0 0 1 1.4 0l4.01 4a1 1 0 1 1-1.4 1.42L13 10.41V20a1 1 0 0 1-1 1z"
              fill="currentColor"
            />
            <path
              d="M5 5a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H6a1 1 0 0 1-1-1z"
              fill="currentColor"
            />
          </svg>
        ) : (
          "Importuj JSON"
        )}
        <input
          type="file"
          accept="application/json,.json,application/zip,.zip"
          onChange={(event) => onImport(event.target.files?.[0] ?? null)}
        />
      </label>
    </section>
  );
}
