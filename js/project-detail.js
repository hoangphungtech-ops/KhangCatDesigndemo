import { initNavigation } from "./navigation.js";
import { initReveal } from "./animations.js";
import { initGallery, openGallery } from "./gallery.js";
import { initContactForms } from "./contact.js";
import { loadProjects, findProject, projectUrl } from "./projects.js";

initNavigation();
initReveal();
initGallery();
initContactForms();

function infoRow(label, value) {
  return value ? `<div><span>${label}</span><b>${value}</b></div>` : "";
}

loadProjects().then((projects) => {
  const slug = new URLSearchParams(location.search).get("project");
  const project = findProject(projects, slug);
  const current = projects.indexOf(project);
  const prev = projects[(current - 1 + projects.length) % projects.length];
  const next = projects[(current + 1) % projects.length];

  document.title = `${project.title} — KHANGCAT Design & Build`;
  document.querySelector("[data-project-hero]").style.backgroundImage = `linear-gradient(0deg, rgba(17,21,20,.74), rgba(17,21,20,.22)), url('${project.cover}')`;
  document.querySelector("[data-project-title]").textContent = project.title;
  document.querySelector("[data-project-meta]").textContent = `${project.location} · ${project.year} · ${project.category}`;
  document.querySelector("[data-project-summary]").textContent = project.summary;
  document.querySelector("[data-project-info]").innerHTML = [
    infoRow("Mã dự án", project.code),
    infoRow("Địa điểm", project.location),
    infoRow("Diện tích", project.area),
    infoRow("Phạm vi", project.scope),
    infoRow("Tình trạng", project.status),
    infoRow("Năm", project.year),
  ].join("");
  document.querySelector("[data-project-challenge]").textContent = project.challenge;
  document.querySelector("[data-project-solution]").textContent = project.solution;
  document.querySelector("[data-project-input]").value = project.title;
  document.querySelector("[data-project-code]").value = project.code;
  document.querySelector("[data-project-gallery]").innerHTML = project.images.map((src, index) => `
    <button class="detail-image reveal" type="button" data-index="${index}">
      <img src="${src}" alt="${project.title} ${index + 1}" loading="${index < 2 ? "eager" : "lazy"}">
    </button>
  `).join("");
  document.querySelectorAll("[data-index]").forEach((button) => {
    button.addEventListener("click", () => openGallery(project.images, Number(button.dataset.index)));
  });
  document.querySelector("[data-prev-project]").href = projectUrl(prev);
  document.querySelector("[data-prev-project]").textContent = `← ${prev.title}`;
  document.querySelector("[data-next-project]").href = projectUrl(next);
  document.querySelector("[data-next-project]").textContent = `${next.title} →`;
  document.dispatchEvent(new CustomEvent("khangcat:refreshReveal"));
});
