// After a new deploy, a tab that was already open asks for screens from the
// old build, which no longer exist. Reload once to pick up the new build
// instead of showing an error; the flag stops a reload loop.
const RELOADED = "zambot.reloaded-for-update";
window.addEventListener("vite:preloadError", (event) => {
  try {
    if (sessionStorage.getItem(RELOADED)) return;
    sessionStorage.setItem(RELOADED, "1");
  } catch {
    return;
  }
  event.preventDefault();
  window.location.reload();
});
window.addEventListener("load", () => {
  setTimeout(() => {
    try {
      sessionStorage.removeItem(RELOADED);
    } catch {
      /* storage can be blocked; the guard above then never reloads */
    }
  }, 10000);
});

export {};
