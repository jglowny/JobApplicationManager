import type { JobItem, JobsQuery } from "../types/jobs";

export type JobsResponse = {
  query: JobsQuery;
  items: JobItem[];
  sources: string[];
  errors?: Record<string, string>;
};

const buildQuery = (query: JobsQuery) => {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.location) params.set("location", query.location);
  if (query.tech) params.set("tech", query.tech);
  if (query.source) params.set("source", query.source);
  if (query.remote) params.set("remote", query.remote);
  return params.toString();
};

export const fetchJobs = async (query: JobsQuery) => {
  const qs = buildQuery(query);
  const res = await fetch(`/jobs-api/search?${qs}`);
  if (!res.ok) {
    throw new Error("Failed to fetch jobs");
  }
  return (await res.json()) as JobsResponse;
};
