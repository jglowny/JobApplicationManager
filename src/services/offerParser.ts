import { type OfferApiResponse } from "./offerApi";

const toDateInput = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const findJobPosting = (payload: unknown): Record<string, unknown> | null => {
  if (!payload) return null;
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = findJobPosting(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (record["@type"] === "JobPosting") return record;
    if (record["@graph"]) return findJobPosting(record["@graph"]);
  }
  return null;
};

export const parseOfferData = (data: OfferApiResponse) => {
  const ldJob = findJobPosting(data.structuredData?.ldJson);
  const ldTitle = typeof ldJob?.title === "string" ? ldJob.title : "";
  const ldDescription =
    typeof ldJob?.description === "string" ? ldJob.description : "";
  const ldCompany = (() => {
    if (typeof ldJob?.hiringOrganization === "string") {
      return ldJob.hiringOrganization;
    }
    if (typeof ldJob?.hiringOrganization === "object") {
      const org = ldJob.hiringOrganization as Record<string, unknown>;
      return typeof org.name === "string" ? org.name : "";
    }
    return "";
  })();

  const nextDataJob = (() => {
    const next = data.structuredData?.nextData as
      | { props?: { pageProps?: Record<string, unknown> } }
      | undefined;
    const pageProps = next?.props?.pageProps as
      | Record<string, unknown>
      | undefined;
    return pageProps?.offer ?? pageProps?.job ?? null;
  })();

  const nextTitle =
    nextDataJob && typeof nextDataJob === "object"
      ? (nextDataJob as Record<string, unknown>).title
      : "";
  const nextCompany =
    nextDataJob && typeof nextDataJob === "object"
      ? (nextDataJob as Record<string, unknown>).companyName
      : "";
  const nextDescription =
    nextDataJob && typeof nextDataJob === "object"
      ? (nextDataJob as Record<string, unknown>).description
      : "";

  const resolvedTitle =
    (typeof nextTitle === "string" && nextTitle) || ldTitle || data.title || "";
  const resolvedCompany =
    (typeof nextCompany === "string" && nextCompany) ||
    ldCompany ||
    data.hostname ||
    "";
  const resolvedDescription =
    (typeof nextDescription === "string" && nextDescription) ||
    ldDescription ||
    data.ldDescription ||
    data.description ||
    "";
  const resolvedNotes = resolvedDescription || "";

  const ldDatePosted =
    typeof ldJob?.datePosted === "string" ? ldJob.datePosted : "";
  const ldValidThrough =
    typeof ldJob?.validThrough === "string" ? ldJob.validThrough : "";
  const nextDatePosted =
    nextDataJob && typeof nextDataJob === "object"
      ? (nextDataJob as Record<string, unknown>).datePosted
      : "";
  const nextValidThrough =
    nextDataJob && typeof nextDataJob === "object"
      ? (nextDataJob as Record<string, unknown>).validThrough
      : "";
  const resolvedDatePosted =
    (typeof nextDatePosted === "string" && nextDatePosted) || ldDatePosted;
  const resolvedOfferAddedAt = resolvedDatePosted
    ? toDateInput(resolvedDatePosted)
    : "";
  const resolvedValidThrough =
    (typeof nextValidThrough === "string" && nextValidThrough) ||
    ldValidThrough;
  const resolvedOfferClosedAt = resolvedValidThrough
    ? toDateInput(resolvedValidThrough)
    : "";

  const structuredDataText = data.structuredData
    ? JSON.stringify(data.structuredData, null, 2)
    : "";

  return {
    title: resolvedTitle,
    company: resolvedCompany,
    description: resolvedDescription,
    notes: resolvedNotes,
    offerAddedAt: resolvedOfferAddedAt,
    offerClosedAt: resolvedOfferClosedAt,
    structuredDataText,
  };
};
