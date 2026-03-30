import * as cheerio from "cheerio";
import { buildId, fetchHtml, normalizeText, toArray } from "./utils.mjs";

const buildSearchUrl = ({ q, location }) => {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (location) params.set("location", location);
  return `https://nofluffjobs.com/pl/jobs?${params.toString()}`;
};

const extractNextData = (html) => {
  const $ = cheerio.load(html);
  const raw = $("script#__NEXT_DATA__").text();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const extractPostings = (data) => {
  const props = data?.props?.pageProps || {};
  return (
    props?.postings ||
    props?.initialState?.postings ||
    props?.initialState?.search?.postings ||
    props?.initialState?.search?.results ||
    []
  );
};

export const fetchNoFluffJobs = async (query) => {
  const url = buildSearchUrl(query);
  const html = await fetchHtml(url, { useBrowser: true });
  const data = extractNextData(html);
  if (!data) return [];

  const postings = extractPostings(data);
  return toArray(postings)
    .map((item) => {
      const title = normalizeText(item.title);
      const company = normalizeText(item.company?.name || item.companyName);
      const location = normalizeText(
        item.city || item.location || item.workplaceType,
      );
      const salary = normalizeText(
        item.salary?.salaryFrom && item.salary?.salaryTo
          ? `${item.salary.salaryFrom}-${item.salary.salaryTo} ${item.salary.currency || ""}`
          : item.salary?.salaryFrom
            ? `${item.salary.salaryFrom}+ ${item.salary.currency || ""}`
            : item.salary?.text,
      );
      const urlValue = item.url
        ? `https://nofluffjobs.com${item.url}`
        : item.id
          ? `https://nofluffjobs.com/pl/job/${item.id}`
          : "";

      const technologies = toArray(item.technologies || item.requirements).map(
        (tech) => normalizeText(tech?.name || tech),
      );

      return {
        id: buildId("nofluffjobs", [item.id || urlValue, title, company]),
        title,
        company,
        location,
        salary,
        technologies,
        url: urlValue,
        source: "nofluffjobs",
      };
    })
    .filter((item) => item.title || item.url);
};
