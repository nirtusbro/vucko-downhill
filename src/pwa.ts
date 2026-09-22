import { registerSW } from "virtual:pwa-register";

const CHECK_INTERVAL = 60 * 60 * 1000;

/**
 * Registers the offline service worker. A new build is never applied
 * mid-run: the given button appears on the menu and the player chooses
 * when to restart into the fresh version.
 */
export function setupPwa(updateButton: HTMLButtonElement) {
  if (!("serviceWorker" in navigator)) return;
  const applyUpdate = registerSW({
    onNeedRefresh() {
      updateButton.hidden = false;
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => {
        if (navigator.onLine) void registration.update().catch(() => {});
      };
      setInterval(check, CHECK_INTERVAL);
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) check();
      });
    },
    onRegisterError(error) {
      console.warn("Service worker registration failed", error);
    },
  });
  updateButton.addEventListener("click", () => {
    updateButton.disabled = true;
    updateButton.textContent = "Restarting…";
    void applyUpdate(true);
  });
}
