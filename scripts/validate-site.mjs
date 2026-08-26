import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const ignoredDirs = new Set([".git", "node_modules"]);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return ignoredDirs.has(entry.name) ? [] : walk(full);
    return entry.isFile() && entry.name.endsWith(".html") ? [full] : [];
  });
}

function localTarget(href) {
  const clean = href.split(/[?#]/, 1)[0];
  if (!clean.startsWith("/") || clean.startsWith("//")) return null;
  if (clean === "/") return path.join(root, "index.html");
  const withoutSlash = clean.replace(/^\//, "");
  if (clean.endsWith("/")) return path.join(root, withoutSlash, "index.html");
  return path.join(root, withoutSlash);
}

const htmlFiles = walk(root);
const errors = [];
const canonicals = new Map();
let jsonLdBlocks = 0;

for (const file of htmlFiles) {
  const rel = path.relative(root, file).replaceAll("\\", "/");
  const html = fs.readFileSync(file, "utf8");
  const analyticsCount = (html.match(/\/assets\/analytics\.js/g) || []).length;
  if (analyticsCount !== 1) errors.push(`${rel}: expected one analytics loader, found ${analyticsCount}`);

  const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)/i)?.[1];
  if (!canonical) errors.push(`${rel}: missing canonical`);
  else if (canonicals.has(canonical)) errors.push(`${rel}: duplicate canonical also used by ${canonicals.get(canonical)}`);
  else canonicals.set(canonical, rel);

  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    jsonLdBlocks += 1;
    try { JSON.parse(match[1]); } catch (error) { errors.push(`${rel}: invalid JSON-LD (${error.message})`); }
  }

  for (const match of html.matchAll(/\bhref=["']([^"']+)["']/gi)) {
    const target = localTarget(match[1]);
    if (target && !fs.existsSync(target)) errors.push(`${rel}: broken local link ${match[1]}`);
  }
}

const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
if (sitemapUrls.length !== 19) errors.push(`sitemap.xml: expected 19 URLs, found ${sitemapUrls.length}`);
if (sitemapUrls.some((url) => url.includes("/access/"))) errors.push("sitemap.xml: private access route must not be listed");
for (const url of sitemapUrls) {
  const pathname = new URL(url).pathname;
  const target = localTarget(pathname);
  if (!target || !fs.existsSync(target)) errors.push(`sitemap.xml: URL has no local file ${url}`);
}

const expectedAffiliateCounts = new Map([
  ["https://ektatraveling.tpo.lv/Qo34KDBY", 4],
  ["https://gettransfer.tpo.lv/Firbe3Eb", 6],
  ["https://kiwi.tpo.lv/JKYNkcP1", 7],
  ["https://klook.tpo.lv/cI2cGUyC", 3],
  ["https://tiqets.tpo.lv/8ToSUBBg", 3],
  ["https://yesim.tpo.lv/iIR2yqdn", 5],
]);
const combinedHtml = htmlFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
for (const [url, expected] of expectedAffiliateCounts) {
  const actual = combinedHtml.split(url).length - 1;
  if (actual !== expected) errors.push(`${url}: expected ${expected} uses, found ${actual}`);
}
if (!combinedHtml.includes("https://tpembars.com/NTU2MjYw.js?t=556260")) {
  errors.push("Travelpayouts Drive loader is missing");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(JSON.stringify({
  htmlFiles: htmlFiles.length,
  canonicals: canonicals.size,
  jsonLdBlocks,
  sitemapUrls: sitemapUrls.length,
  affiliateLinks: [...expectedAffiliateCounts.values()].reduce((sum, value) => sum + value, 0),
  result: "pass"
}, null, 2));
