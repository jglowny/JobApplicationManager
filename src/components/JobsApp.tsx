import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import type { JobItem, JobsQuery } from "../types/jobs";
import { fetchJobs } from "../services/jobsApi";

const emptyQuery: JobsQuery = {
  q: "",
  location: "",
  tech: "",
  source: "all",
  remote: "",
};

const formatSource = (source: JobItem["source"]) => {
  if (source === "justjoin") return "Just Join";
  if (source === "nofluffjobs") return "No Fluff Jobs";
  return "Pracuj";
};

export const JobsApp = () => {
  const [query, setQuery] = useState<JobsQuery>(emptyQuery);
  const [items, setItems] = useState<JobItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceErrors, setSourceErrors] = useState<Record<string, string>>({});

  const hasResults = items.length > 0;

  const queryLabel = useMemo(() => {
    const parts = [query.q, query.location, query.tech].filter(Boolean);
    return parts.length ? parts.join(" • ") : "Wszystkie oferty";
  }, [query]);

  const handleChange =
    (field: keyof JobsQuery) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setQuery((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setSourceErrors({});
    try {
      const response = await fetchJobs(query);
      setItems(response.items);
      setSourceErrors(response.errors ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nieznany błąd");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="jobs-shell">
      <header className="jobs-header">
        <div>
          <p className="jobs-kicker">Niezależny agregator ofert</p>
          <h1>Jobs Feed</h1>
        </div>
        <p className="jobs-subtitle">
          Oddzielny proces i UI, bez połączeń z trackerem.
        </p>
      </header>

      <form className="jobs-filters" onSubmit={handleSubmit}>
        <div className="jobs-field">
          <label>Fraza</label>
          <input
            value={query.q}
            onChange={handleChange("q")}
            placeholder="np. frontend, devops"
          />
        </div>
        <div className="jobs-field">
          <label>Lokalizacja</label>
          <input
            value={query.location}
            onChange={handleChange("location")}
            placeholder="np. Warszawa"
          />
        </div>
        <div className="jobs-field">
          <label>Technologia</label>
          <input
            value={query.tech}
            onChange={handleChange("tech")}
            placeholder="np. React"
          />
        </div>
        <div className="jobs-field">
          <label>Źródło</label>
          <select value={query.source} onChange={handleChange("source")}>
            <option value="all">Wszystkie</option>
            <option value="pracuj">Pracuj.pl</option>
            <option value="justjoin">Just Join</option>
            <option value="nofluffjobs">No Fluff Jobs</option>
          </select>
        </div>
        <div className="jobs-field">
          <label>Tryb zdalny</label>
          <select value={query.remote} onChange={handleChange("remote")}>
            <option value="">Dowolny</option>
            <option value="remote">Zdalnie</option>
            <option value="hybrid">Hybrydowo</option>
            <option value="onsite">Stacjonarnie</option>
          </select>
        </div>
        <button className="jobs-submit" type="submit" disabled={isLoading}>
          {isLoading ? "Szukam..." : "Szukaj"}
        </button>
      </form>

      <section className="jobs-results">
        <div className="jobs-results-header">
          <h2>{queryLabel}</h2>
          <span>{hasResults ? `${items.length} ofert` : "Brak wyników"}</span>
        </div>

        {error && <div className="jobs-error">{error}</div>}
        {!error && Object.keys(sourceErrors).length > 0 && (
          <div className="jobs-warning">
            <strong>Niektóre źródła nie odpowiedziały:</strong>
            <ul>
              {Object.entries(sourceErrors).map(([source, message]) => (
                <li key={source}>
                  {source}: {message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!hasResults && !isLoading && !error && (
          <div className="jobs-empty">
            Brak wyników. Uruchom wyszukiwanie, aby pobrać oferty z niezależnego
            serwera.
          </div>
        )}

        <div className="jobs-grid">
          {items.map((item) => (
            <article key={item.id} className="jobs-card">
              <div className="jobs-card-header">
                <div>
                  <h3>{item.title}</h3>
                  {item.company && (
                    <p className="jobs-company">{item.company}</p>
                  )}
                </div>
                <span className="jobs-source">{formatSource(item.source)}</span>
              </div>
              <div className="jobs-meta">
                {item.location && <span>{item.location}</span>}
                {item.salary && <span>{item.salary}</span>}
              </div>
              {item.technologies && item.technologies.length > 0 && (
                <div className="jobs-tags">
                  {item.technologies.map((tech) => (
                    <span key={tech}>{tech}</span>
                  ))}
                </div>
              )}
              {item.url && (
                <a
                  className="jobs-link"
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Zobacz ofertę
                </a>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
