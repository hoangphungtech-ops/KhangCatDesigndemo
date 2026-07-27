import { initNavigation } from "./navigation.js";
import { initReveal } from "./animations.js";
import { loadProjects, renderEditorialGrid, renderFilters } from "./projects.js";

initNavigation();
initReveal();

const grid = document.querySelector("[data-project-grid]");
const filters = document.querySelector("[data-project-filters]");

loadProjects().then((projects) => {
  const params = new URLSearchParams(location.search);
  let active = params.get("filter") || "Tất cả";
  const update = (filter) => {
    active = filter;
    history.replaceState(null, "", `projects.html?filter=${encodeURIComponent(active)}`);
    renderFilters(filters, active, update);
    renderEditorialGrid(grid, projects, active);
  };
  update(active);
});
