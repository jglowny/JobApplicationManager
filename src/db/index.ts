export type OfferStatus =
  | "Szkic"
  | "Zapisana"
  | "Aplikacja wysłana"
  | "Rozmowa"
  | "Oferta"
  | "Odrzucona";

export type OfferCategory = "web" | "it";

export interface Offer {
  id?: string | number;
  title: string;
  company: string;
  url: string;
  status: OfferStatus;
  category: OfferCategory;
  description?: string;
  notes?: string;
  offerAddedAt?: string;
  offerClosedAt?: string;
  structuredData?: string;
  screenshotName?: string;
  screenshotBlob?: Blob;
  screenshotPath?: string;
  pdfName?: string;
  pdfBlob?: Blob;
  pdfPath?: string;
  cvName?: string;
  cvBlob?: Blob;
  cvPath?: string;
  createdAt: string;
  updatedAt: string;
}
