export function initReveal() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    document.querySelectorAll(".reveal").forEach((node) => node.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14 },
  );
  const observe = () => document.querySelectorAll(".reveal:not(.is-visible)").forEach((node) => observer.observe(node));
  observe();
  document.addEventListener("khangcat:refreshReveal", observe);
}
