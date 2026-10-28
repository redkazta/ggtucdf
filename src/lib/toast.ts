/**
 * Muestra un toast temporal en la esquina inferior derecha.
 *
 * Usa estilos inline para no depender de Tailwind (el proyecto no lo instala).
 *
 * @param message - Texto del mensaje
 * @param type - 'success' | 'error'
 */
export function toast(message: string, type: "success" | "error" = "success"): void {
  if (typeof document === "undefined") return;

  const element = document.createElement("div");
  element.textContent = message;
  element.setAttribute("role", type === "error" ? "alert" : "status");
  element.setAttribute("aria-live", type === "error" ? "assertive" : "polite");

  Object.assign(element.style, {
    position: "fixed",
    right: "1rem",
    bottom: "1rem",
    zIndex: "9999",
    maxWidth: "min(22rem, calc(100vw - 2rem))",
    padding: "0.75rem 1rem",
    borderRadius: "8px",
    background: type === "error" ? "#b91c1c" : "#15803d",
    color: "#ffffff",
    font: '500 0.875rem/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
    opacity: "0",
    transform: "translateY(8px)",
    transition: "opacity 0.2s ease, transform 0.2s ease",
    pointerEvents: "none",
  });

  document.body.appendChild(element);

  requestAnimationFrame(() => {
    element.style.opacity = "1";
    element.style.transform = "translateY(0)";
  });

  window.setTimeout(() => {
    element.style.opacity = "0";
    element.style.transform = "translateY(8px)";
    window.setTimeout(() => element.remove(), 200);
  }, 3000);
}
