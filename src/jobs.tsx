import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { JobsApp } from "./components/JobsApp";
import "./jobs.scss";

const container = document.getElementById("root");

if (container) {
  createRoot(container).render(
    <StrictMode>
      <JobsApp />
    </StrictMode>,
  );
}
