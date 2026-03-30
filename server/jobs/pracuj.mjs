import * as cheerio from "cheerio";
import { buildId, fetchHtml, normalizeText, toArray } from "./utils.mjs";

const buildSearchUrl = ({ q, location }) => {
  const params = new URLSearchParams();
  if (q) params.set("query", q);
  if (location) params.set("where", location);
  return `https://www.pracuj.pl/praca?${params.toString()}`;
};

const parseJsonLd = (html) => {
  const $ = cheerio.load(html);
  const scripts = $("script[type='application/ld+json']");
  const items = [];

  scripts.each((_, script) => {
    try {
      const raw = $(script).text();
      if (!raw) return;
      const data = JSON.parse(raw);
      const list = data?.itemListElement || data?.[0]?.itemListElement;
      if (!list) return;
      for (const entry of toArray(list)) {
        const item = entry.item || entry;
        if (!item) continue;
        items.push(item);
      }
    } catch {
      // ignore
    }
  });

  return items;
};

export const fetchPracujJobs = async (query) => {
  const url = buildSearchUrl(query);
  const html = await fetchHtml(url, { useBrowser: true });
  const list = parseJsonLd(html);

  return list
    .map((item) => {
      const title = normalizeText(item.title || item.name);
      const company = normalizeText(item.hiringOrganization?.name);
      const location = normalizeText(
        item.jobLocation?.address?.addressLocality || item.jobLocation?.name,
      );
      const salary = normalizeText(
        item.baseSalary?.value?.value || item.baseSalary?.value,
      );
      const urlValue = normalizeText(item.url || item.sameAs);
      return {
        id: buildId("pracuj", [title, company, urlValue]),
        title,
        company,
        location,
        salary,
        technologies: [],
        url: urlValue,
        source: "pracuj",
      };
    })
    .filter((item) => item.title || item.url);
};
