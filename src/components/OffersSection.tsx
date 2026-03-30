import { useState, useMemo } from "react";
import { type Offer, type OfferCategory, type OfferStatus } from "../db";
import OfferCard from "./OfferCard";
import OfferListItem from "./OfferListItem";

const categoryLabels: Record<OfferCategory, string> = {
  web: "Web",
  it: "IT",
};

type OffersSectionProps = {
  visibleOffers: Offer[];
  statusOptions: OfferStatus[];
  statusFilter: "Wszystkie" | "Zakończone" | OfferStatus;
  setStatusFilter: (value: "Wszystkie" | "Zakończone" | OfferStatus) => void;
  sortOption: "closest" | "newest";
  setSortOption: (value: "closest" | "newest") => void;
  onEdit: (offer: Offer) => void;
  onDelete: (offer: Offer) => void;
  onStatusChange: (offerId: string | number, status: OfferStatus) => void;
};

export default function OffersSection({
  visibleOffers,
  statusOptions,
  statusFilter,
  setStatusFilter,
  sortOption,
  setSortOption,
  onEdit,
  onDelete,
  onStatusChange,
}: OffersSectionProps) {
  const [viewMode, setViewMode] = useState<"cards" | "list">("list");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "web" | "it">(
    "all",
  );

  const groupedOffers = useMemo(() => {
    const groups: Record<OfferCategory, Offer[]> = {
      web: [],
      it: [],
    };

    visibleOffers.forEach((offer) => {
      const category = (offer.category ?? "web") as OfferCategory;
      if (categoryFilter === "all" || category === categoryFilter) {
        groups[category].push(offer);
      }
    });

    return groups;
  }, [visibleOffers, categoryFilter]);

  const renderOffersList = (offers: Offer[]) => {
    if (offers.length === 0) return null;

    return offers.map((offer) =>
      viewMode === "list" ? (
        <OfferListItem
          key={offer.id}
          offer={offer}
          statusOptions={statusOptions}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />
      ) : (
        <OfferCard
          key={offer.id}
          offer={offer}
          statusOptions={statusOptions}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />
      ),
    );
  };

  return (
    <section className="offers-section">
      <div className="offers-header">
        <h2>Lista ofert</h2>
        <span>{visibleOffers.length} zapisanych</span>
      </div>
      <div className="offers-controls">
        <label>
          Filtr statusu
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as "Wszystkie" | "Zakończone" | OfferStatus,
              )
            }
          >
            <option value="Wszystkie">Wszystkie</option>
            <option value="Zakończone">Zakończone</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sortowanie
          <select
            value={sortOption}
            onChange={(event) =>
              setSortOption(event.target.value as "closest" | "newest")
            }
          >
            <option value="closest">Najbliższe zakończenie</option>
            <option value="newest">Najnowsze</option>
          </select>
        </label>
        <div className="view-toggle" role="group" aria-label="Widok ofert">
          <button
            type="button"
            className={viewMode === "cards" ? "active" : ""}
            onClick={() => setViewMode("cards")}
          >
            Karty
          </button>
          <button
            type="button"
            className={viewMode === "list" ? "active" : ""}
            onClick={() => setViewMode("list")}
          >
            Lista
          </button>
        </div>
        <div className="category-toggle" role="group" aria-label="Filtr kategorii">
          <button
            type="button"
            className={categoryFilter === "all" ? "active" : ""}
            onClick={() => setCategoryFilter("all")}
          >
            Wszystkie
          </button>
          <button
            type="button"
            className={categoryFilter === "web" ? "active" : ""}
            onClick={() => setCategoryFilter("web")}
          >
            Web
          </button>
          <button
            type="button"
            className={categoryFilter === "it" ? "active" : ""}
            onClick={() => setCategoryFilter("it")}
          >
            IT
          </button>
        </div>
      </div>

      {visibleOffers.length === 0 ? (
        <div className={viewMode === "list" ? "offers-list" : "offers-grid"}>
          <p className="empty">
            Brak zapisanych ofert. Dodaj pierwszą powyżej.
          </p>
        </div>
      ) : (
        <>
          {Object.entries(groupedOffers).map(([category, offers]) =>
            offers.length > 0 ? (
              <div key={category}>
                <h3 className="category-heading">
                  {categoryLabels[category as OfferCategory]}
                </h3>
                <div className={viewMode === "list" ? "offers-list" : "offers-grid"}>
                  {renderOffersList(offers)}
                </div>
              </div>
            ) : null,
          )}
        </>
      )}
    </section>
  );
}
