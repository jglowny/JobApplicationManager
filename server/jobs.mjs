import express from "express";
import cors from "cors";
import { fetchJustJoinJobs } from "./jobs/justjoin.mjs";
import { fetchNoFluffJobs } from "./jobs/nofluffjobs.mjs";
import { fetchPracujJobs } from "./jobs/pracuj.mjs";
import { matchesQuery, uniqueById } from "./jobs/utils.mjs";

const app = express();
app.use(cors());
app.use(express.json({ limit: "100mb" }));

const PORT = process.env.JOBS_PORT || 5175;

app.get("/jobs-api/health", (req, res) => {
  res.json({ ok: true, service: "jobs" });
});

app.get("/jobs-api/search", async (req, res) => {
  const {
    q = "",
    location = "",
    tech = "",
    source = "all",
    remote = "",
    limit = "60",
  } = req.query;

  const query = {
    q: String(q),
    location: String(location),
    tech: String(tech),
    source: String(source),
    remote: String(remote),
  };

  const limitValue = Number.parseInt(String(limit), 10) || 60;

  const sources = ["pracuj", "justjoin", "nofluffjobs"];
  const selectedSources = source === "all" ? sources : [String(source)];

  try {
    const sourceFetchers = {
      pracuj: () => fetchPracujJobs(query),
      justjoin: () => fetchJustJoinJobs(query),
      nofluffjobs: () => fetchNoFluffJobs(query),
    };

    const tasks = selectedSources.map(async (item) => {
      const fetcher = sourceFetchers[item];
      if (!fetcher) return { source: item, items: [], error: "Unknown source" };
      try {
        return { source: item, items: await fetcher() };
      } catch (error) {
        return {
          source: item,
          items: [],
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    const results = await Promise.all(tasks);
    const merged = results.flatMap((result) => result.items);
    const filtered = merged.filter((item) => matchesQuery(item, query));
    const unique = uniqueById(filtered).slice(0, limitValue);
    const errors = results.reduce((acc, result) => {
      if (result.error) acc[result.source] = result.error;
      return acc;
    }, {});

    res.json({
      query,
      items: unique,
      sources,
      errors,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Jobs server listening on http://localhost:${PORT}`);
});
