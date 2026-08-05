(() => {
  const allowed = new Set(["page_view", "product_view", "checkout_started", "affiliate_click", "access_page_view", "feedback_submitted"]);
  const session = () => { const key = "tripcash_session"; let id = sessionStorage.getItem(key); if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(key, id); } return id; };
  const track = (event, details = {}) => {
    if (!allowed.has(event)) return;
    const body = JSON.stringify({ event, path: location.pathname, session: session(), ...details });
    if (navigator.sendBeacon) navigator.sendBeacon("/.netlify/functions/conversion-event", new Blob([body], { type: "application/json" }));
    else fetch("/.netlify/functions/conversion-event", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
  };
  const start = () => {
    track("page_view");
    if (document.body.dataset.productAccess) track("access_page_view", { product: document.body.dataset.productAccess });
    const seen = new WeakSet();
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting && !seen.has(entry.target)) { seen.add(entry.target); track("product_view", { product: entry.target.dataset.product || "" }); } }), { threshold: .35 });
    document.querySelectorAll("[data-product-view]").forEach(element => observer.observe(element));
    document.addEventListener("click", event => {
      const link = event.target.closest && event.target.closest("a[href]"); if (!link) return;
      if (link.href.includes("buy.stripe.com")) track("checkout_started", { product: link.dataset.product || "Trip Cost Command Center" });
      else if (/tpo\.lv|kiwi\.com|klook\.com|tiqets\.com/.test(link.href)) track("affiliate_click", { label: (link.textContent || "").trim().slice(0, 120) });
    }, true);
    const form = document.querySelector('form[name="product-feedback"]');
    if (form) form.addEventListener("submit", () => track("feedback_submitted", { product: form.querySelector('[name="product"]')?.value || "" }));
    if (new URLSearchParams(location.search).get("feedback") === "thanks") { const status = document.getElementById("feedback-status"); if (status) status.hidden = false; }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
