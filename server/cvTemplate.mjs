const escapeHtml = (value = "") =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderList = (items = [], renderItem) => {
  if (!items.length) return "";
  return items.map(renderItem).join("");
};

export const renderCvHtml = (cv = {}) => {
  const name = escapeHtml(cv.name || "Imię Nazwisko");
  const title = escapeHtml(cv.title || "Stanowisko / Specjalizacja");
  const summary = escapeHtml(cv.summary || "Krótki opis profilu zawodowego.");
  const email = escapeHtml(cv?.contact?.email || "");
  const phone = escapeHtml(cv?.contact?.phone || "");
  const location = escapeHtml(cv?.contact?.location || "");
  const links = Array.isArray(cv?.contact?.links) ? cv.contact.links : [];
  const skills = Array.isArray(cv?.skills) ? cv.skills : [];
  const languages = typeof cv?.languages === "string" ? cv.languages : "";
  const consentCompany = escapeHtml(cv?.consentCompany || "[nazwa firmy]");
  const experience = Array.isArray(cv?.experience) ? cv.experience : [];
  const projects = Array.isArray(cv?.projects) ? cv.projects : [];
  const education = Array.isArray(cv?.education) ? cv.education : [];
  const certifications = Array.isArray(cv?.certifications)
    ? cv.certifications
    : [];

  return `<!doctype html>
<html lang="pl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      * { box-sizing: border-box; }
      @page {
        margin: 0;
      }
      body {
        margin: 0;
        font-family: "Inter", "Segoe UI", Arial, sans-serif;
        color: #0f172a;
        background-image:
          linear-gradient(90deg, #0f172a 0 36%, #ffffff 36% 100%),
          repeating-linear-gradient(
            0deg,
            transparent 0,
            transparent calc(297mm - 1px),
            rgba(148, 163, 184, 0.4) calc(297mm - 1px),
            rgba(148, 163, 184, 0.4) 297mm
          );
        background-size: 210mm 297mm, 210mm 297mm;
        background-repeat: repeat-y;
        background-position: center top;
      }
      @media screen {
        body {
          background-color: #e5e7eb;
          padding: 20mm 0;
        }
        .page {
          border-radius: 6px;
          overflow: hidden;
        }
      }
      @media print {
        body {
          padding: 0;
          background-color: transparent;
        }
        .page {
          box-shadow: none;
          border-radius: 0;
        }
      }
      .page {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        box-sizing: border-box;
        display: grid;
        grid-template-columns: 0.9fr 1.6fr;
      }
      .cv-sidebar {
        background: #0f172a;
        color: #e2e8f0;
        padding: 36px 28px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        -webkit-box-decoration-break: clone;
        box-decoration-break: clone;
      }
      .cv-main {
        padding: 36px 40px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        -webkit-box-decoration-break: clone;
        box-decoration-break: clone;
      }
      .avatar {
        width: 140px;
        height: 140px;
        border-radius: 24px;
        background: #1e293b;
        color: #e2e8f0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 40px;
        font-weight: 700;
      }
      .avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 24px;
      }
      header {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      h1 {
        margin: 0;
        font-size: 28px;
        letter-spacing: 0.4px;
      }
      h2 {
        margin: 0;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 1.4px;
        color: #475569;
      }
      .sidebar-title {
        color: #cbd5f5;
      }
      .summary {
        font-size: 13px;
        line-height: 1.5;
        color: #334155;
      }
      .contact {
        display: flex;
        flex-wrap: wrap;
        gap: 12px 20px;
        font-size: 12px;
        color: #475569;
      }
      .contact--sidebar {
        flex-direction: column;
        gap: 8px;
        color: #cbd5f5;
      }
      .section {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .section-title {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: #475569;
      }
      .section-title--light {
        color: #cbd5f5;
      }
      .skill-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .skill {
        padding: 4px 8px;
        border-radius: 999px;
        background: #e2e8f0;
        font-size: 11px;
      }
      .skill--dark {
        background: rgba(148, 163, 184, 0.2);
        color: #e2e8f0;
      }
      .item {
        display: flex;
        flex-direction: column;
        gap: 4px;
        border-left: 2px solid #e2e8f0;
        padding-left: 12px;
        margin-bottom: 40px;
      }
      .experience-item {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .experience-list .experience-item:nth-child(3) {
        break-before: page;
        page-break-before: always;
        margin-top: 0;
      }
      .item-header {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        font-weight: 600;
      }
      .item-sub {
        font-size: 11px;
        color: #64748b;
      }
      ul {
        margin: 0;
        padding-left: 16px;
        font-size: 12px;
        color: #334155;
      }
      .list--light {
        color: #e2e8f0;
      }
      li { margin-bottom: 4px; }
      .cv-grid-main {
        display: grid;
        grid-template-columns: 1fr;
        gap: 16px;
      }
      .consent {
        font-size: 10px;
        line-height: 1.45;
        color: #334155;
        margin-top: 32px;
        margin-bottom: 32px;
        break-inside: avoid;
        page-break-inside: avoid;
      }
    </style>
  </head>
  <body>
    <div class="page">
      <aside class="cv-sidebar">
        <div class="avatar">
          ${
            cv.avatarUrl
              ? `<img src="${escapeHtml(cv.avatarUrl)}" alt="avatar" />`
              : escapeHtml(
                  name
                    .split(" ")
                    .map((part) => part[0])
                    .join(""),
                )
          }
        </div>
        <header>
          <h1>${name}</h1>
          <h2 class="sidebar-title">${title}</h2>
        </header>
        <div class="contact contact--sidebar">
          ${email ? `<span>${email}</span>` : ""}
          ${phone ? `<span>${phone}</span>` : ""}
          ${location ? `<span>${location}</span>` : ""}
          ${renderList(links, (link) => `<span>${escapeHtml(link)}</span>`)}
        </div>
        ${
          skills.length
            ? `
        <section class="section">
          <div class="section-title section-title--light">Technologie</div>
          <div class="skill-list">
            ${renderList(skills, (skill) => `<span class="skill skill--dark">${escapeHtml(skill)}</span>`)}
          </div>
        </section>`
            : ""
        }

        ${
          languages
            ? `
        <section class="section">
          <div class="section-title section-title--light">Języki</div>
          <p class="list--light">${escapeHtml(languages)}</p>
        </section>`
            : ""
        }
      </aside>

      <main class="cv-main">
        <div class="summary">${summary}</div>
        <div class="cv-grid-main">
          ${
            experience.length
              ? `
          <section class="section">
            <div class="section-title">Doświadczenie</div>
            <div class="experience-list">
              ${renderList(
                experience,
                (item) => `
                <div class="item experience-item">
                  <div class="item-header">
                    <span>${escapeHtml(item.role || "Stanowisko")}</span>
                    <span>${escapeHtml(item.period || "")}</span>
                  </div>
                  <div class="item-sub">${escapeHtml(item.company || "Firma")}</div>
                  ${item.bullets ? `<ul>${renderList(item.bullets, (bullet) => `<li>${escapeHtml(bullet)}</li>`)}</ul>` : ""}
                </div>`,
              )}
            </div>
          </section>`
              : ""
          }

          ${
            education.length
              ? `
          <section class="section">
            <div class="section-title">Edukacja</div>
            ${renderList(
              education,
              (item) => `
              <div class="item">
                <div class="item-header">
                  <span>${escapeHtml(item.school || "Uczelnia")}</span>
                  <span>${escapeHtml(item.period || "")}</span>
                </div>
                <div class="item-sub">${escapeHtml(item.degree || "")}</div>
              </div>`,
            )}
          </section>`
              : ""
          }

          ${
            certifications.length
              ? `
          <section class="section">
            <div class="section-title">Szkolenia, kursy, certyfikaty</div>
            ${renderList(
              certifications,
              (item) => `
              <div class="item">
                <div class="item-header">
                  <span>${escapeHtml(item.name || "Certyfikat")}</span>
                  <span>${escapeHtml(item.year || "")}</span>
                </div>
                ${item.issuer ? `<div class="item-sub">${escapeHtml(item.issuer)}</div>` : ""}
              </div>`,
            )}
          </section>`
              : ""
          }

          ${
            projects.length
              ? `
          <section class="section">
            <div class="section-title">Projekty</div>
            ${renderList(
              projects,
              (item) => `
              <div class="item">
                <div class="item-header">
                  <span>${escapeHtml(item.name || "Projekt")}</span>
                  <span>${escapeHtml(item.period || "")}</span>
                </div>
                ${item.description ? `<div class="item-sub">${escapeHtml(item.description)}</div>` : ""}
                ${item.bullets ? `<ul>${renderList(item.bullets, (bullet) => `<li>${escapeHtml(bullet)}</li>`)}</ul>` : ""}
              </div>`,
            )}
          </section>`
              : ""
          }
          <section class="consent">
            <p>
              Zgadzam się na przetwarzanie przez ${consentCompany} danych osobowych
              zawartych w moim CV lub w innych dokumentach dołączonych do CV (moje
              zgłoszenie rekrutacyjne), dla celów prowadzenia rekrutacji na stanowisko
              wskazane w ogłoszeniu o pracę.
            </p>
            <p>
              Dodatkowo zgadzam się na przetwarzanie przez pracodawcę danych osobowych
              zawartych w moim zgłoszeniu rekrutacyjnym dla celów przyszłych rekrutacji.
            </p>
          </section>
        </div>
      </main>
    </div>
  </body>
</html>`;
};
