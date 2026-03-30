import { buildId, fetchJson, normalizeText } from "./utils.mjs";

const API_URL = "https://justjoin.it/api/offers";

const parseSalary = (employmentTypes = []) => {
  if (!Array.isArray(employmentTypes) || employmentTypes.length === 0)
    return "";
  const values = employmentTypes
    .map((entry) => {
      const from = entry.salary?.from;
      const to = entry.salary?.to;
      const currency = entry.salary?.currency || "";
      if (from && to) return `${from}-${to} ${currency}`.trim();
      if (from) return `${from}+ ${currency}`.trim();
      return "";
    })
    .filter(Boolean);
  return values.join(" | ");
};

export const fetchJustJoinJobs = async () => {
  const data = await fetchJson(API_URL, {
    headers: {
      origin: "https://justjoin.it",
      referer: "https://justjoin.it/",
    },
  });
  if (!Array.isArray(data)) return [];

  return data.map((item) => {
    const title = normalizeText(item.title);
    const company = normalizeText(item.company_name);
    const location = normalizeText(item.city || item.workplace_type);
    const salary = parseSalary(item.employment_types);
    const url = `https://justjoin.it/offers/${item.slug}`;
    const technologies = Array.isArray(item.required_skills)
      ? item.required_skills.map((skill) => normalizeText(skill?.name || skill))
      : [];
    return {
      id: buildId("justjoin", [item.id || item.slug || url]),
      title,
      company,
      location,
      salary,
      technologies,
      url,
      source: "justjoin",
    };
  });
};
