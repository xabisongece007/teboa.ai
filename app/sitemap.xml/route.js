import { readFile } from "fs/promises";
import path from "path";
import { getPublishedPosts } from "../blog/_lib/blog-data";

const SITE_URL = "https://teboatech.com";

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const dateValue = new Date(value);

  if (Number.isNaN(dateValue.getTime())) {
    return "";
  }

  return dateValue.toISOString().slice(0, 10);
}

function buildUrlEntry(loc, lastmod, priority) {
  const lastmodTag = lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : "";
  const priorityTag =
    typeof priority === "string" ? `\n    <priority>${escapeXml(priority)}</priority>` : "";

  return `  <url>\n    <loc>${escapeXml(loc)}</loc>${lastmodTag}${priorityTag}\n  </url>`;
}

function parseExistingEntries(xml) {
  const entries = [];
  const pattern = /<url>\s*<loc>(.*?)<\/loc>(?:\s*<lastmod>(.*?)<\/lastmod>)?(?:\s*<priority>(.*?)<\/priority>)?[\s\S]*?<\/url>/g;

  for (const match of xml.matchAll(pattern)) {
    entries.push({
      loc: match[1]?.trim(),
      lastmod: match[2]?.trim() || "",
      priority: match[3]?.trim() || "",
    });
  }

  return entries;
}

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET() {
  const staticSitemapPath = path.join(process.cwd(), "sitemap.xml");
  const staticSitemap = await readFile(staticSitemapPath, "utf8");
  const existingEntries = parseExistingEntries(staticSitemap);
  const posts = await getPublishedPosts();

  const deduped = new Map();

  for (const entry of existingEntries) {
    if (entry.loc) {
      deduped.set(entry.loc, entry);
    }
  }

  if (!deduped.has(`${SITE_URL}/blog`)) {
    const latestPostDate =
      posts.find((post) => post.updatedAtIso || post.createdAtIso)?.updatedAtIso ||
      posts.find((post) => post.createdAtIso)?.createdAtIso ||
      new Date().toISOString();

    deduped.set(`${SITE_URL}/blog`, {
      loc: `${SITE_URL}/blog`,
      lastmod: formatDate(latestPostDate),
      priority: "",
    });
  }

  for (const post of posts) {
    deduped.set(`${SITE_URL}/blog/${post.slug}`, {
      loc: `${SITE_URL}/blog/${post.slug}`,
      lastmod: formatDate(post.updatedAtIso || post.createdAtIso),
      priority: "",
    });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[
    ...deduped.values(),
  ]
    .map((entry) => buildUrlEntry(entry.loc, entry.lastmod, entry.priority))
    .join("\n")}\n</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
