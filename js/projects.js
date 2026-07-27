export const PROJECT_DATA_URL = "data/projects.json";

export async function loadProjects() {
  const response = await fetch(PROJECT_DATA_URL);
  if (!response.ok) throw new Error("Không tải được dữ liệu dự án.");
  return response.json();
}

export const FILTERS = [
  "Tất cả",
  "Kiến trúc",
  "Nội thất",
  "Biệt thự",
  "Nhà phố",
  "Nhà xưởng",
  "Văn phòng",
  "BIM",
  "PCCC",
  "Cảnh quan",
];

export function projectUrl(project) {
  return `project-detail.html?project=${encodeURIComponent(project.slug)}`;
}

export function renderFilters(container, active = "Tất cả", onSelect = () => {}) {
  container.innerHTML = FILTERS.map(
    (filter) =>
      `<button class="filter-chip ${filter === active ? "is-active" : ""}" type="button" data-filter="${filter}">${filter}</button>`,
  ).join("");
  container.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => onSelect(button.dataset.filter));
  });
}

export function projectCard(project, index, variant = "medium") {
  const number = String(index + 1).padStart(2, "0");
  return `
    <a class="project-card ${variant} reveal" href="${projectUrl(project)}" data-filters="${project.filters.join("|")}" aria-label="Xem dự án ${project.title}">
      <img src="${project.cover}" alt="${project.title}" loading="${index < 2 ? "eager" : "lazy"}">
      <div class="project-info">
        <div class="project-kicker">
          <span>${project.category} / ${project.location}</span>
          <span>${number}</span>
        </div>
        <h3>${project.title}</h3>
        <p>${project.summary}</p>
      </div>
    </a>
  `;
}

export function renderEditorialGrid(container, projects, active = "Tất cả") {
  const filtered =
    active === "Tất cả"
      ? projects
      : projects.filter((project) => project.filters.includes(active));
  const variants = ["large", "tall", "medium", "medium", "wide", "medium", "medium", "wide"];
  container.innerHTML = filtered
    .map((project, index) => projectCard(project, index, variants[index % variants.length]))
    .join("");
  document.dispatchEvent(new CustomEvent("khangcat:refreshReveal"));
}

export function findProject(projects, slug) {
  return projects.find((project) => project.slug === slug) || projects[0];
}
