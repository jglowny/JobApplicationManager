import { useState } from "react";
import { type Offer, type OfferStatus } from "../db";
import OfferCard from "./OfferCard";

type OfferListItemProps = {
  offer: Offer;
  statusOptions: OfferStatus[];
  onEdit: (offer: Offer) => void;
  onDelete: (offer: Offer) => void;
  onStatusChange: (offerId: string | number, status: OfferStatus) => void;
};

export default function OfferListItem({
  offer,
  statusOptions,
  onEdit,
  onDelete,
  onStatusChange,
}: OfferListItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isExpired = offer.offerClosedAt
    ? new Date(offer.offerClosedAt).getTime() < new Date().setHours(0, 0, 0, 0)
    : false;
  const isApplicationSent = offer.status === "Aplikacja wysłana";
  const closedAt = offer.offerClosedAt
    ? new Date(offer.offerClosedAt).toLocaleDateString()
    : "Brak terminu";

  return (
    <div className={`offer-list-item${isExpired ? " is-expired" : ""}`}>
      <div className="offer-list-main">
        <h3>{offer.title}</h3>
        <span className="offer-list-company">{offer.company || "Bez firmy"}</span>
        {isApplicationSent && (
          <span className="status-badge status-sent">Aplikacja wysłana</span>
        )}
      </div>
      <div className="offer-list-end">
        <span>Zakończenie</span>
        <strong>{closedAt}</strong>
        {isExpired && <span className="expired-badge">Termin minął</span>}
      </div>
      <button
        type="button"
        className="offer-list-toggle"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
      >
        {isExpanded ? "Zwiń szczegóły" : "Pokaż szczegóły"}
      </button>
      {isExpanded && (
        <div className="offer-list-details">
          <OfferCard
            offer={offer}
            statusOptions={statusOptions}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
            variant="details"
          />
        </div>
      )}
    </div>
  );
}
