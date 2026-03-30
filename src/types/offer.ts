import { type Offer } from "../db";

export type OfferFormState = {
  title: string;
  company: string;
  url: string;
  status: Offer["status"];
  category: Offer["category"];
  description: string;
  notes: string;
  offerAddedAt: string;
  offerClosedAt: string;
  screenshotFile: File | null;
  pdfFile: File | null;
  cvFile: File | null;
};

export type OfferExport = Omit<
  Offer,
  "id" | "screenshotBlob" | "pdfBlob" | "cvBlob"
> & {
  screenshotFilePath?: string;
  pdfFilePath?: string;
  cvFilePath?: string;
  screenshotDataUrl?: string;
  pdfDataUrl?: string;
  cvDataUrl?: string;
};
