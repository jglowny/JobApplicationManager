type StructuredDataModalProps = {
  structuredDataText: string | null;
  isOpen: boolean;
  onClose: () => void;
};

export default function StructuredDataModal({
  structuredDataText,
  isOpen,
  onClose,
}: StructuredDataModalProps) {
  if (!structuredDataText || !isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content structured-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Zamknij"
        >
          ✕
        </button>
        <h3>Structured Data</h3>
        <pre className="structured-data">{structuredDataText}</pre>
      </div>
    </div>
  );
}
