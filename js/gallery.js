let images = [];
let index = 0;

function modal() {
  return document.querySelector("[data-gallery-modal]");
}

function update() {
  const root = modal();
  if (!root || !images.length) return;
  root.querySelector("[data-gallery-image]").src = images[index];
  root.querySelector("[data-gallery-count]").textContent = `${index + 1} / ${images.length}`;
}

export function openGallery(list, start = 0) {
  images = list;
  index = start;
  modal()?.classList.add("is-open");
  document.body.style.overflow = "hidden";
  update();
}

export function closeGallery() {
  modal()?.classList.remove("is-open");
  document.body.style.overflow = "";
}

export function initGallery() {
  const root = modal();
  if (!root) return;
  root.addEventListener("click", (event) => {
    if (event.target === root || event.target.closest("[data-gallery-close]")) closeGallery();
    if (event.target.closest("[data-gallery-next]")) {
      index = (index + 1) % images.length;
      update();
    }
    if (event.target.closest("[data-gallery-prev]")) {
      index = (index - 1 + images.length) % images.length;
      update();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (!root.classList.contains("is-open")) return;
    if (event.key === "Escape") closeGallery();
    if (event.key === "ArrowRight") {
      index = (index + 1) % images.length;
      update();
    }
    if (event.key === "ArrowLeft") {
      index = (index - 1 + images.length) % images.length;
      update();
    }
  });
}
