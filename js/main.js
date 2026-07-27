import { initNavigation } from "./navigation.js";
import { initReveal } from "./animations.js";
import { initContactForms } from "./contact.js";
import { initGallery } from "./gallery.js";
import { loadProjects, renderEditorialGrid, renderFilters } from "./projects.js";

async function initHome() {
  const grid = document.querySelector("[data-project-grid]");
  const filters = document.querySelector("[data-project-filters]");
  if (!grid || !filters) return;
  const projects = await loadProjects();
  let active = "Tất cả";
  const update = (filter) => {
    active = filter;
    renderFilters(filters, active, update);
    renderEditorialGrid(grid, projects, active);
  };
  update(active);
}

initNavigation();
initReveal();
initGallery();
initContactForms();
initHome().catch((error) => console.error(error));
