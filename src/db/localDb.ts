import Dexie, { type Table } from "dexie";
import { type Offer } from "./index";

class OfferDatabase extends Dexie {
  offers!: Table<Offer, number>;

  constructor() {
    super("offer-app-db");
    this.version(1).stores({
      offers: "++id, status, company, createdAt",
    });
  }
}

export const localDb = new OfferDatabase();
