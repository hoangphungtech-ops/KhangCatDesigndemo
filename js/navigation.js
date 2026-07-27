export function initNavigation() {
  const header = document.querySelector(".site-header");
  const menu = document.querySelector("[data-mobile-menu]");
  const toggle = document.querySelector("[data-menu-toggle]");
  const close = document.querySelector("[data-menu-close]");

  const onScroll = () => header?.classList.toggle("is-scrolled", window.scrollY > 24);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const setMenu = (open) => {
    if (!menu || !toggle) return;
    menu.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
  };

  toggle?.addEventListener("click", () => setMenu(true));
  close?.addEventListener("click", () => setMenu(false));
  menu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenu(false);
  });
}
