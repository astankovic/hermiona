/**
 * Hermione PWA — service worker registration (self-registers on load).
 * Does not throw if SW is unavailable or registration fails.
 */
(function (global) {
  "use strict";

  var SW_URL = "sw.js";
  var registration = null;

  function isSecureContextForSW() {
    try {
      var h = location.hostname;
      var secure =
        location.protocol === "https:" ||
        h === "localhost" ||
        h === "127.0.0.1" ||
        h === "[::1]";
      return secure;
    } catch (e) {
      return false;
    }
  }

  function register() {
    if (!("serviceWorker" in navigator)) {
      return Promise.resolve(null);
    }
    if (!isSecureContextForSW()) {
      return Promise.resolve(null);
    }

    return navigator.serviceWorker
      .register(SW_URL)
      .then(function (reg) {
        registration = reg;
        return reg;
      })
      .catch(function (err) {
        console.warn("[HermionePWA] registration failed:", err && err.message);
        return null;
      });
  }

  /** Optional: check for waiting/updated worker and trigger update cycle. */
  function checkForUpdate() {
    if (!registration) {
      return Promise.resolve(null);
    }
    return registration.update().catch(function (err) {
      console.warn("[HermionePWA] update check failed:", err && err.message);
      return null;
    });
  }

  function getRegistration() {
    return registration;
  }

  // Optional: when a new SW takes control, reload once so clients get the new shell.
  // Disabled by default hard-reload to avoid surprising the editor mid-session;
  // expose a flag listeners can use.
  var controllerChanged = false;
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      controllerChanged = true;
      try {
        if (typeof global.dispatchEvent === "function") {
          global.dispatchEvent(
            new CustomEvent("hermione:sw-controllerchange", {
              detail: { registration: registration },
            })
          );
        }
      } catch (e) {
        /* ignore */
      }
    });
  }

  var api = {
    register: register,
    checkForUpdate: checkForUpdate,
    getRegistration: getRegistration,
    get controllerChanged() {
      return controllerChanged;
    },
  };

  global.HermionePWA = api;

  // Self-register on load so app.js need not call us.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      register();
    });
  } else {
    register();
  }
})(typeof window !== "undefined" ? window : this);
