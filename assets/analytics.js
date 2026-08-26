(() => {
  const measurementId = "G-5ZKYNRVL5M";
  const internalKey = "tripcash_internal_traffic";
  const marker = new URLSearchParams(window.location.search).get("tcp_internal");

  if (marker === "1") localStorage.setItem(internalKey, "1");
  if (marker === "0") localStorage.removeItem(internalKey);

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    traffic_type: localStorage.getItem(internalKey) === "1" ? "internal" : undefined
  });

  const loader = document.createElement("script");
  loader.async = true;
  loader.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(loader);
})();
