(() => {
  const allowed = new Set(["page_view", "product_view", "checkout_started", "affiliate_click", "access_page_view", "feedback_submitted"]);
  const session = () => { const key = "tripcash_session"; let id = sessionStorage.getItem(key); if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(key, id); } return id; };
  const track = (event, details = {}) => {
    if (!allowed.has(event)) return;
    const body = JSON.stringify({ event, path: location.pathname, session: session(), ...details });
    if (navigator.sendBeacon) navigator.sendBeacon("/.netlify/functions/conversion-event", new Blob([body], { type: "application/json" }));
    else fetch("/.netlify/functions/conversion-event", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
    if (typeof window.gtag === "function") {
      if (event === "checkout_started") {
        const product = details.product || "Trip Cost Command Center";
        window.gtag("event", "begin_checkout", {
          currency: "USD",
          value: 29,
          items: [{ item_name: product, price: 29, quantity: 1 }]
        });
      } else if (event === "affiliate_click") {
        window.gtag("event", "affiliate_outbound", {
          affiliate_partner: details.partner || "Affiliate partner",
          link_domain: (() => { try { return new URL(details.destination).hostname; } catch { return ""; } })(),
          placement: String(details.placement || "page").slice(0, 120)
        });
      } else if (event === "product_view") {
        window.gtag("event", "view_item", { items: [{ item_name: details.product || "Trip Cost Command Center" }] });
      }
    }
  };
  const affiliatePartner = hostname => {
    const host = hostname.replace(/^www\./, "").toLowerCase();
    if (host === "villiers.ai" || host.endsWith(".villiers.ai")) return "Villiers";
    if (host === "viator.com" || host.endsWith(".viator.com") || host === "vi.me") return "Viator";
    if (host.endsWith("tpo.lv")) return ({
      "yesim.tpo.lv": "Yesim", "gettransfer.tpo.lv": "GetTransfer", "kiwi.tpo.lv": "Kiwi",
      "ektatraveling.tpo.lv": "EKTA", "klook.tpo.lv": "Klook", "tiqets.tpo.lv": "Tiqets"
    })[host] || "Travelpayouts";
    return "";
  };
  const placement = link => link.dataset.placement || link.closest("[data-affiliate-placement]")?.dataset.affiliatePlacement || link.closest("section,header,footer,aside,article")?.id || link.closest("section,header,footer,aside,article")?.className || "page";
  const start = () => {
    track("page_view");
    if (document.body.dataset.productAccess) track("access_page_view", { product: document.body.dataset.productAccess });
    const seen = new WeakSet();
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting && !seen.has(entry.target)) { seen.add(entry.target); track("product_view", { product: entry.target.dataset.product || "" }); } }), { threshold: .35 });
    document.querySelectorAll("[data-product-view]").forEach(element => observer.observe(element));
    document.addEventListener("click", event => {
      const link = event.target.closest && event.target.closest("a[href]"); if (!link) return;
      if (link.href.includes("buy.stripe.com")) track("checkout_started", { product: link.dataset.product || "Trip Cost Command Center" });
      else { try { const url = new URL(link.href, location.href); const partner = affiliatePartner(url.hostname); if (partner) track("affiliate_click", { partner, destination: url.origin + url.pathname, placement: String(placement(link)).slice(0, 120), label: (link.textContent || "").trim().replace(/\s+/g, " ").slice(0, 120) }); } catch {} }
    }, true);
    const form = document.querySelector('form[name="product-feedback"]');
    if (form) form.addEventListener("submit", () => track("feedback_submitted", { product: form.querySelector('[name="product"]')?.value || "" }));
    if (new URLSearchParams(location.search).get("feedback") === "thanks") { const status = document.getElementById("feedback-status"); if (status) status.hidden = false; }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
