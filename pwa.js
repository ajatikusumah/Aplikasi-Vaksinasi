(() => {
  const isMobile = window.matchMedia("(max-width: 760px)").matches;
  let installPrompt = null;
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js", { scope: "./" }).catch(() => {});
    }, { once: true });
  }
  if (!isMobile) return;

  const style = document.createElement("style");
  style.textContent = ".pwa-install{border:1px solid #dce5e2;background:#fff;color:#183c43;border-radius:9px;padding:7px 10px;font:700 10px system-ui,sans-serif;white-space:nowrap}.pwa-install[hidden]{display:none}@media(max-width:380px){.pwa-install{font-size:9px;padding:7px}}";
  document.head.appendChild(style);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "pwa-install";
  button.textContent = "＋ Pasang";
  button.setAttribute("aria-label", "Pasang aplikasi iSIKHNAS Vaksinasi");
  const actions = document.querySelector(".top-actions");
  if (actions) actions.appendChild(button);

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
  });

  button.addEventListener("click", async () => {
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      button.hidden = true;
      return;
    }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    window.alert(ios
      ? "Untuk memasang aplikasi: ketuk tombol Bagikan di browser, lalu pilih “Add to Home Screen” atau “Tambahkan ke Layar Utama”."
      : "Jika pilihan pemasangan belum muncul, buka menu browser lalu pilih “Install app” atau “Tambahkan ke layar utama”.");
  });

  window.addEventListener("appinstalled", () => { button.hidden = true; });
})();
