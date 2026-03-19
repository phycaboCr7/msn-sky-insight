/**
 * maintenancePopup.ts
 *
 * Displays a professional "Under Maintenance" modal for the Weather AI feature.
 * Call `showMaintenancePopup()` inside your chat `handleSend` handler, then
 * add an early `return;` to prevent further execution while maintenance is active.
 *
 * Usage:
 *   import { showMaintenancePopup } from "@/utils/maintenancePopup";
 *
 *   const handleSend = () => {
 *     showMaintenancePopup();
 *     return;
 *     // ... rest of send logic
 *   };
 */

const POPUP_ID = "weatherai-maintenance-popup";

export function showMaintenancePopup(): void {
  // Prevent duplicate popups
  if (document.getElementById(POPUP_ID)) return;

  /* ── Overlay ── */
  const overlay = document.createElement("div");
  overlay.id = POPUP_ID;
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "9999",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    backdropFilter: "blur(4px)",
  } as Partial<CSSStyleDeclaration>);

  /* ── Modal card ── */
  const modal = document.createElement("div");
  Object.assign(modal.style, {
    backgroundColor: "#0f172a",
    color: "#e2e8f0",
    borderRadius: "16px",
    padding: "32px 28px",
    maxWidth: "440px",
    width: "90%",
    boxShadow: "0 25px 60px rgba(0,0,0,0.7)",
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    border: "1px solid rgba(249,115,22,0.3)",
    boxSizing: "border-box",
  } as Partial<CSSStyleDeclaration>);

  /* ── Title ── */
  const title = document.createElement("h2");
  title.textContent = "🚧 Weather AI Under Maintenance";
  Object.assign(title.style, {
    margin: "0 0 16px",
    fontSize: "1.25rem",
    fontWeight: "700",
    color: "#f97316",
    lineHeight: "1.3",
  } as Partial<CSSStyleDeclaration>);

  /* ── Body ── */
  const body = document.createElement("p");
  body.textContent =
    "Weather AI by Rakshit Jain is currently under maintenance. Due to ongoing exams, consistent operation is temporarily paused. It will be restored soon.";
  Object.assign(body.style, {
    margin: "0 0 20px",
    fontSize: "0.95rem",
    lineHeight: "1.65",
    color: "#cbd5e1",
  } as Partial<CSSStyleDeclaration>);

  /* ── Contact info ── */
  const contact = document.createElement("div");
  Object.assign(contact.style, {
    margin: "0 0 24px",
    padding: "12px 14px",
    backgroundColor: "rgba(249,115,22,0.08)",
    borderRadius: "10px",
    border: "1px solid rgba(249,115,22,0.2)",
    fontSize: "0.875rem",
    lineHeight: "1.7",
    color: "#94a3b8",
  } as Partial<CSSStyleDeclaration>);

  const emailLine = document.createElement("div");
  emailLine.textContent = "📧 ";
  const emailAnchor = document.createElement("a");
  emailAnchor.href = "mailto:PHYCABO33@gmail.com";
  emailAnchor.textContent = "PHYCABO33@gmail.com";
  emailAnchor.style.color = "#f97316";
  emailAnchor.style.textDecoration = "none";
  emailLine.appendChild(emailAnchor);

  const linkLine = document.createElement("div");
  linkLine.textContent = "🔗 ";
  const linkAnchor = document.createElement("a");
  linkAnchor.href = "https://guns.lol/PHYCABO";
  linkAnchor.target = "_blank";
  linkAnchor.rel = "noopener noreferrer";
  linkAnchor.textContent = "guns.lol/PHYCABO";
  linkAnchor.style.color = "#f97316";
  linkAnchor.style.textDecoration = "none";
  linkLine.appendChild(linkAnchor);

  contact.appendChild(emailLine);
  contact.appendChild(linkLine);

  /* ── OK button ── */
  const okButton = document.createElement("button");
  okButton.textContent = "OK";
  Object.assign(okButton.style, {
    display: "block",
    width: "100%",
    padding: "12px",
    backgroundColor: "#f97316",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
    letterSpacing: "0.02em",
  } as Partial<CSSStyleDeclaration>);

  // Use function declarations (hoisted) so handleKey and dismiss can reference each other.
  function dismiss() {
    overlay.remove();
    document.removeEventListener("keydown", handleKey);
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === "Escape") dismiss();
  }

  okButton.addEventListener("mouseenter", () => {
    okButton.style.backgroundColor = "#ea6c0a";
  });
  okButton.addEventListener("mouseleave", () => {
    okButton.style.backgroundColor = "#f97316";
  });
  okButton.addEventListener("click", dismiss);

  // Also close when clicking outside the modal
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) dismiss();
  });

  document.addEventListener("keydown", handleKey);

  /* ── Assemble ── */
  modal.appendChild(title);
  modal.appendChild(body);
  modal.appendChild(contact);
  modal.appendChild(okButton);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}
