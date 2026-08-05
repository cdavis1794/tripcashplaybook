const allowed = new Set(["page_view", "product_view", "checkout_started", "affiliate_click", "access_page_view", "feedback_submitted"]);
const clean = (value, length) => typeof value === "string" ? value.trim().slice(0, length) : "";

export default async (request) => {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  try {
    const body = await request.json();
    const event = clean(body.event, 60);
    if (!allowed.has(event)) return Response.json({ error: "Unsupported event" }, { status: 400 });
    console.log(JSON.stringify({ event, path: clean(body.path, 180) || "/", product: clean(body.product, 100), label: clean(body.label, 140), session: clean(body.session, 80), recordedAt: new Date().toISOString() }));
    return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Invalid event" }, { status: 400 });
  }
};
