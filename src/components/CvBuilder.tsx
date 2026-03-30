import { useMemo, useRef, useState } from "react";
import type {
  CvCertification,
  CvData,
  CvEducation,
  CvExperience,
  CvProject,
} from "../types/cv";

const createEmptyCv = (): CvData => ({
  name: "",
  title: "",
  summary: "",
  avatarUrl: "",
  contact: {
    email: "",
    phone: "",
    location: "",
    links: [],
  },
  skills: [],
  languages: "",
  consentCompany: "",
  experience: [],
  projects: [],
  education: [],
  certifications: [],
});

const createExperience = (): CvExperience => ({
  role: "",
  company: "",
  period: "",
  bullets: [],
});

const createProject = (): CvProject => ({
  name: "",
  period: "",
  description: "",
  bullets: [],
});

const createEducation = (): CvEducation => ({
  school: "",
  degree: "",
  period: "",
});

const createCertification = (): CvCertification => ({
  name: "",
  issuer: "",
  year: "",
});

const parseLines = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const normalizeSkills = (skills: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];

  skills.forEach((skill) => {
    const trimmed = skill.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(trimmed);
  });

  return result;
};

export default function CvBuilder() {
  const [cv, setCv] = useState<CvData>(createEmptyCv);
  const [jsonDraft, setJsonDraft] = useState<string>(
    JSON.stringify(createEmptyCv(), null, 2),
  );
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const previewJson = useMemo(() => JSON.stringify(cv, null, 2), [cv]);

  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonDraft) as CvData;
      if (!parsed || typeof parsed !== "object") {
        throw new Error("Nieprawidłowy JSON.");
      }
      setCv({
        ...createEmptyCv(),
        ...parsed,
        avatarUrl: typeof parsed.avatarUrl === "string" ? parsed.avatarUrl : "",
        skills: normalizeSkills(
          Array.isArray(parsed.skills) ? parsed.skills : [],
        ),
        languages: typeof parsed.languages === "string" ? parsed.languages : "",
        consentCompany:
          typeof parsed.consentCompany === "string"
            ? parsed.consentCompany
            : "",
        contact: {
          ...createEmptyCv().contact,
          ...(parsed.contact || {}),
        },
      });
      setPdfError(null);
    } catch (error) {
      setPdfError(
        error instanceof Error ? error.message : "Nie udało się wczytać JSON.",
      );
    }
  };

  const handleSkillDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    setCv((prev) => {
      const updated = [...prev.skills];
      const [moved] = updated.splice(dragIndex, 1);
      updated.splice(targetIndex, 0, moved);
      return { ...prev, skills: updated };
    });
    setDragIndex(null);
  };

  const handleRefreshJson = () => {
    setJsonDraft(previewJson);
  };

  const handleGeneratePdf = async () => {
    setIsGenerating(true);
    setPdfError(null);

    try {
      const response = await fetch("/api/cv/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = data?.details
          ? `${data.error} (${data.details})`
          : data?.error || "Nie udało się wygenerować PDF.";
        throw new Error(message);
      }

      const blob = await response.blob();
      const filename = `cv-${new Date().toISOString().slice(0, 10)}.pdf`;

      if ("showSaveFilePicker" in window) {
        const handle = await (
          window as Window & {
            showSaveFilePicker: (options: {
              suggestedName?: string;
              types?: {
                description?: string;
                accept: Record<string, string[]>;
              }[];
            }) => Promise<{
              createWritable: () => Promise<{
                write: (data: Blob) => Promise<void>;
                close: () => Promise<void>;
              }>;
            }>;
          }
        ).showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: "PDF",
              accept: { "application/pdf": [".pdf"] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      setPdfError(
        error instanceof Error
          ? error.message
          : "Nie udało się wygenerować PDF.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreviewPdf = async () => {
    setPdfError(null);
    try {
      const response = await fetch("/api/cv/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = data?.details
          ? `${data.error} (${data.details})`
          : data?.error || "Nie udało się wygenerować podglądu PDF.";
        throw new Error(message);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const previewWindow = window.open(url, "cv-preview");
      if (!previewWindow) {
        URL.revokeObjectURL(url);
        throw new Error("Nie udało się otworzyć podglądu.");
      }
    } catch (error) {
      setPdfError(
        error instanceof Error
          ? error.message
          : "Nie udało się wygenerować podglądu PDF.",
      );
    }
  };

  const handlePreviewHtml = async () => {
    setPdfError(null);
    try {
      const response = await fetch("/api/cv/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = data?.details
          ? `${data.error} (${data.details})`
          : data?.error || "Nie udało się wygenerować podglądu.";
        throw new Error(message);
      }

      const html = await response.text();
      const previewWindow = window.open("", "cv-preview-html");
      if (!previewWindow) {
        throw new Error("Nie udało się otworzyć podglądu.");
      }
      previewWindow.document.open();
      previewWindow.document.write(html);
      previewWindow.document.close();
    } catch (error) {
      setPdfError(
        error instanceof Error
          ? error.message
          : "Nie udało się wygenerować podglądu.",
      );
    }
  };

  const handleExportJsonFile = () => {
    const blob = new Blob([previewJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `cv-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleJsonFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setJsonDraft(text);
      setPdfError(null);
    } catch (error) {
      setPdfError(
        error instanceof Error ? error.message : "Nie udało się wczytać pliku.",
      );
    } finally {
      event.target.value = "";
    }
  };

  const handleAvatarFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setCv((prev) => ({ ...prev, avatarUrl: result }));
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <section className="cv-section">
      <div className="cv-header">
        <div>
          <h2>Kreator CV</h2>
          <p>Uzupełnij dane lub wklej JSON. PDF generuje serwer.</p>
        </div>
        <div className="cv-actions">
          <button type="button" onClick={handleRefreshJson}>
            Odśwież JSON
          </button>
          <button type="button" onClick={handleApplyJson}>
            Wczytaj JSON
          </button>
          <button type="button" onClick={handlePreviewHtml}>
            Podgląd HTML
          </button>
          <button type="button" onClick={handlePreviewPdf}>
            Podgląd PDF
          </button>
          <button
            type="button"
            onClick={handleGeneratePdf}
            disabled={isGenerating}
          >
            {isGenerating ? "Generuję PDF..." : "Generuj PDF"}
          </button>
        </div>
      </div>

      {pdfError && <p className="form-error">{pdfError}</p>}

      <div className="cv-grid">
        <div className="cv-panel">
          <h3>Podstawowe dane</h3>
          <div className="cv-fieldset">
            <label>
              Zdjęcie (avatar)
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarFileChange}
              />
              {cv.avatarUrl && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setCv((prev) => ({ ...prev, avatarUrl: "" }))}
                >
                  Usuń zdjęcie
                </button>
              )}
            </label>
            <label>
              Imię i nazwisko
              <input
                type="text"
                value={cv.name}
                onChange={(event) =>
                  setCv((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </label>
            <label>
              Tytuł
              <input
                type="text"
                value={cv.title}
                onChange={(event) =>
                  setCv((prev) => ({ ...prev, title: event.target.value }))
                }
              />
            </label>
            <label className="span-2">
              Podsumowanie
              <textarea
                rows={4}
                value={cv.summary}
                onChange={(event) =>
                  setCv((prev) => ({ ...prev, summary: event.target.value }))
                }
              />
            </label>
          </div>

          <h3>Kontakt</h3>
          <div className="cv-fieldset">
            <label>
              Email
              <input
                type="email"
                value={cv.contact.email}
                onChange={(event) =>
                  setCv((prev) => ({
                    ...prev,
                    contact: { ...prev.contact, email: event.target.value },
                  }))
                }
              />
            </label>
            <label>
              Telefon
              <input
                type="text"
                value={cv.contact.phone}
                onChange={(event) =>
                  setCv((prev) => ({
                    ...prev,
                    contact: { ...prev.contact, phone: event.target.value },
                  }))
                }
              />
            </label>
            <label>
              Lokalizacja
              <input
                type="text"
                value={cv.contact.location}
                onChange={(event) =>
                  setCv((prev) => ({
                    ...prev,
                    contact: { ...prev.contact, location: event.target.value },
                  }))
                }
              />
            </label>
            <label className="span-2">
              Linki (jeden na linię)
              <textarea
                rows={3}
                value={cv.contact.links.join("\n")}
                onChange={(event) =>
                  setCv((prev) => ({
                    ...prev,
                    contact: {
                      ...prev.contact,
                      links: parseLines(event.target.value),
                    },
                  }))
                }
              />
            </label>
          </div>

          <h3>Technologie</h3>
          <label className="span-2">
            Umiejętności (oddzielone przecinkami)
            <input
              type="text"
              value={cv.skills.join(", ")}
              onChange={(event) =>
                setCv((prev) => ({
                  ...prev,
                  skills: normalizeSkills(
                    event.target.value.split(",").map((item) => item.trim()),
                  ),
                }))
              }
            />
          </label>
          {cv.skills.length > 0 && (
            <div className="skill-tags">
              {cv.skills.map((skill, index) => (
                <div
                  key={`${skill}-${index}`}
                  className={`skill-chip${dragIndex === index ? " dragging" : ""}`}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragEnd={() => setDragIndex(null)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleSkillDrop(index)}
                >
                  <span>{skill}</span>
                  <div className="skill-actions">
                    <button
                      type="button"
                      aria-label="Usuń"
                      onClick={() =>
                        setCv((prev) => ({
                          ...prev,
                          skills: prev.skills.filter((_, i) => i !== index),
                        }))
                      }
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h3>Języki</h3>
          <label className="span-2">
            Języki (np. Polski — ojczysty)
            <textarea
              rows={2}
              value={cv.languages}
              onChange={(event) =>
                setCv((prev) => ({
                  ...prev,
                  languages: event.target.value,
                }))
              }
            />
          </label>

          <h3>Klauzula</h3>
          <label className="span-2">
            Nazwa firmy do klauzuli
            <input
              type="text"
              value={cv.consentCompany}
              onChange={(event) =>
                setCv((prev) => ({
                  ...prev,
                  consentCompany: event.target.value,
                }))
              }
            />
          </label>
        </div>

        <div className="cv-panel">
          <h3>Doświadczenie</h3>
          {cv.experience.map((item, index) => (
            <div className="cv-list" key={`exp-${index}`}>
              <div className="cv-list-header">
                <strong>Pozycja {index + 1}</strong>
                <button
                  type="button"
                  onClick={() =>
                    setCv((prev) => ({
                      ...prev,
                      experience: prev.experience.filter((_, i) => i !== index),
                    }))
                  }
                >
                  Usuń
                </button>
              </div>
              <div className="cv-fieldset">
                <label>
                  Stanowisko
                  <input
                    type="text"
                    value={item.role}
                    onChange={(event) =>
                      setCv((prev) => {
                        const updated = [...prev.experience];
                        updated[index] = {
                          ...updated[index],
                          role: event.target.value,
                        };
                        return { ...prev, experience: updated };
                      })
                    }
                  />
                </label>
                <label>
                  Firma
                  <input
                    type="text"
                    value={item.company}
                    onChange={(event) =>
                      setCv((prev) => {
                        const updated = [...prev.experience];
                        updated[index] = {
                          ...updated[index],
                          company: event.target.value,
                        };
                        return { ...prev, experience: updated };
                      })
                    }
                  />
                </label>
                <label>
                  Okres
                  <input
                    type="text"
                    value={item.period}
                    onChange={(event) =>
                      setCv((prev) => {
                        const updated = [...prev.experience];
                        updated[index] = {
                          ...updated[index],
                          period: event.target.value,
                        };
                        return { ...prev, experience: updated };
                      })
                    }
                  />
                </label>
                <label className="span-2">
                  Opis (jedna linia = punkt)
                  <textarea
                    rows={3}
                    value={item.bullets.join("\n")}
                    onChange={(event) =>
                      setCv((prev) => {
                        const updated = [...prev.experience];
                        updated[index] = {
                          ...updated[index],
                          bullets: parseLines(event.target.value),
                        };
                        return { ...prev, experience: updated };
                      })
                    }
                  />
                </label>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="cv-add"
            onClick={() =>
              setCv((prev) => ({
                ...prev,
                experience: [...prev.experience, createExperience()],
              }))
            }
          >
            Dodaj doświadczenie
          </button>

          <h3>Projekty</h3>
          {cv.projects.map((item, index) => (
            <div className="cv-list" key={`proj-${index}`}>
              <div className="cv-list-header">
                <strong>Projekt {index + 1}</strong>
                <button
                  type="button"
                  onClick={() =>
                    setCv((prev) => ({
                      ...prev,
                      projects: prev.projects.filter((_, i) => i !== index),
                    }))
                  }
                >
                  Usuń
                </button>
              </div>
              <div className="cv-fieldset">
                <label>
                  Nazwa
                  <input
                    type="text"
                    value={item.name}
                    onChange={(event) =>
                      setCv((prev) => {
                        const updated = [...prev.projects];
                        updated[index] = {
                          ...updated[index],
                          name: event.target.value,
                        };
                        return { ...prev, projects: updated };
                      })
                    }
                  />
                </label>
                <label>
                  Okres
                  <input
                    type="text"
                    value={item.period}
                    onChange={(event) =>
                      setCv((prev) => {
                        const updated = [...prev.projects];
                        updated[index] = {
                          ...updated[index],
                          period: event.target.value,
                        };
                        return { ...prev, projects: updated };
                      })
                    }
                  />
                </label>
                <label className="span-2">
                  Opis
                  <input
                    type="text"
                    value={item.description}
                    onChange={(event) =>
                      setCv((prev) => {
                        const updated = [...prev.projects];
                        updated[index] = {
                          ...updated[index],
                          description: event.target.value,
                        };
                        return { ...prev, projects: updated };
                      })
                    }
                  />
                </label>
                <label className="span-2">
                  Punkty (jedna linia = punkt)
                  <textarea
                    rows={3}
                    value={item.bullets.join("\n")}
                    onChange={(event) =>
                      setCv((prev) => {
                        const updated = [...prev.projects];
                        updated[index] = {
                          ...updated[index],
                          bullets: parseLines(event.target.value),
                        };
                        return { ...prev, projects: updated };
                      })
                    }
                  />
                </label>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="cv-add"
            onClick={() =>
              setCv((prev) => ({
                ...prev,
                projects: [...prev.projects, createProject()],
              }))
            }
          >
            Dodaj projekt
          </button>

          <h3>Edukacja</h3>
          {cv.education.map((item, index) => (
            <div className="cv-list" key={`edu-${index}`}>
              <div className="cv-list-header">
                <strong>Edukacja {index + 1}</strong>
                <button
                  type="button"
                  onClick={() =>
                    setCv((prev) => ({
                      ...prev,
                      education: prev.education.filter((_, i) => i !== index),
                    }))
                  }
                >
                  Usuń
                </button>
              </div>
              <div className="cv-fieldset">
                <label>
                  Uczelnia
                  <input
                    type="text"
                    value={item.school}
                    onChange={(event) =>
                      setCv((prev) => {
                        const updated = [...prev.education];
                        updated[index] = {
                          ...updated[index],
                          school: event.target.value,
                        };
                        return { ...prev, education: updated };
                      })
                    }
                  />
                </label>
                <label>
                  Stopień / kierunek
                  <input
                    type="text"
                    value={item.degree}
                    onChange={(event) =>
                      setCv((prev) => {
                        const updated = [...prev.education];
                        updated[index] = {
                          ...updated[index],
                          degree: event.target.value,
                        };
                        return { ...prev, education: updated };
                      })
                    }
                  />
                </label>
                <label>
                  Okres
                  <input
                    type="text"
                    value={item.period}
                    onChange={(event) =>
                      setCv((prev) => {
                        const updated = [...prev.education];
                        updated[index] = {
                          ...updated[index],
                          period: event.target.value,
                        };
                        return { ...prev, education: updated };
                      })
                    }
                  />
                </label>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="cv-add"
            onClick={() =>
              setCv((prev) => ({
                ...prev,
                education: [...prev.education, createEducation()],
              }))
            }
          >
            Dodaj edukację
          </button>

          <h3>Certyfikaty</h3>
          {cv.certifications.map((item, index) => (
            <div className="cv-list" key={`cert-${index}`}>
              <div className="cv-list-header">
                <strong>Certyfikat {index + 1}</strong>
                <button
                  type="button"
                  onClick={() =>
                    setCv((prev) => ({
                      ...prev,
                      certifications: prev.certifications.filter(
                        (_, i) => i !== index,
                      ),
                    }))
                  }
                >
                  Usuń
                </button>
              </div>
              <div className="cv-fieldset">
                <label>
                  Nazwa
                  <input
                    type="text"
                    value={item.name}
                    onChange={(event) =>
                      setCv((prev) => {
                        const updated = [...prev.certifications];
                        updated[index] = {
                          ...updated[index],
                          name: event.target.value,
                        };
                        return { ...prev, certifications: updated };
                      })
                    }
                  />
                </label>
                <label>
                  Organizator
                  <input
                    type="text"
                    value={item.issuer}
                    onChange={(event) =>
                      setCv((prev) => {
                        const updated = [...prev.certifications];
                        updated[index] = {
                          ...updated[index],
                          issuer: event.target.value,
                        };
                        return { ...prev, certifications: updated };
                      })
                    }
                  />
                </label>
                <label>
                  Rok
                  <input
                    type="text"
                    value={item.year}
                    onChange={(event) =>
                      setCv((prev) => {
                        const updated = [...prev.certifications];
                        updated[index] = {
                          ...updated[index],
                          year: event.target.value,
                        };
                        return { ...prev, certifications: updated };
                      })
                    }
                  />
                </label>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="cv-add"
            onClick={() =>
              setCv((prev) => ({
                ...prev,
                certifications: [...prev.certifications, createCertification()],
              }))
            }
          >
            Dodaj certyfikat
          </button>
        </div>
      </div>

      <div className="cv-json">
        <div className="cv-json-header">
          <label>JSON danych (import/eksport)</label>
          <div className="cv-json-actions">
            <button type="button" onClick={() => jsonInputRef.current?.click()}>
              Wczytaj z pliku
            </button>
            <button type="button" onClick={handleExportJsonFile}>
              Zapisz do pliku
            </button>
            <input
              ref={jsonInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden-input"
              onChange={handleJsonFileChange}
            />
          </div>
        </div>
        <textarea
          rows={10}
          value={jsonDraft}
          onChange={(event) => setJsonDraft(event.target.value)}
        />
      </div>
    </section>
  );
}
