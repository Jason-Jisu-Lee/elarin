// modules/overlay.js
export function enableOverlayFeatures(floater) {
  if (!floater) return;

  // --- Dragging ---
  let isDragging = false;
  let offset = { x: 0, y: 0 };

  floater.addEventListener("mousedown", (e) => {
    isDragging = true;
    offset.x = e.clientX - floater.offsetLeft;
    offset.y = e.clientY - floater.offsetTop;
    floater.style.transition = "none";
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    floater.style.left = `${e.clientX - offset.x}px`;
    floater.style.top = `${e.clientY - offset.y}px`;
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
    floater.style.transition = "opacity 0.2s ease, transform 0.2s ease";
  });

  // --- Transparency control (optional) ---
  floater.addEventListener("mouseenter", () => (floater.style.opacity = 1));
  floater.addEventListener("mouseleave", () => (floater.style.opacity = 0.7));
}
