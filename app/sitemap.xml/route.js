import { getPublishedPosts } from "../blog/_lib/blog-data";

const SITE_URL = "https://teboatech.com";
const STATIC_ROUTES = [
  { path: "/", changefreq: "monthly", priority: "1.0" },

  // Core business pages
  { path: "/about", changefreq: "monthly", priority: "0.8" },
  { path: "/pricing", changefreq: "monthly", priority: "0.8" },
  { path: "/contact", changefreq: "monthly", priority: "0.8" },
  { path: "/blog", changefreq: "weekly", priority: "0.8" },
  { path: "/docs", changefreq: "monthly", priority: "0.7" },
  { path: "/help", changefreq: "monthly", priority: "0.6" },

  // Main SEO/resource pages
  { path: "/shopify-automation", changefreq: "monthly", priority: "0.7" },
  { path: "/shopify-automation-vs-apps", changefreq: "monthly", priority: "0.6" },
  { path: "/shopify-store-launch-checklist", changefreq: "monthly", priority: "0.6" },
  { path: "/shopify-customer-retention-automation", changefreq: "monthly", priority: "0.6" },
  { path: "/shopify-customer-support-automation", changefreq: "monthly", priority: "0.6" },
  { path: "/customer-data-compliance-checklist", changefreq: "monthly", priority: "0.6" },
  { path: "/ecommerce-growth-context", changefreq: "monthly", priority: "0.5" },

  // Trust/legal pages
  { path: "/privacy-policy", changefreq: "monthly", priority: "0.4" },
  { path: "/terms-of-service", changefreq: "monthly", priority: "0.4" },
  { path: "/popia-compliance", changefreq: "monthly", priority: "0.4" },
  { path: "/gdpr-compliance", changefreq: "monthly", priority: "0.4" },
];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toIsoDate(value) {
  if (!value) {
    return new Date().toISOString();
  }

  const dateValue = new Date(value);
  return Number.isNaN(dateValue.getTime()) ? new Date().toISOString() : dateValue.toISOString();
}

function buildUrlEntry({ loc, lastmod, changefreq, priority }) {
  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    `    <lastmod>${escapeXml(lastmod)}</lastmod>`,
    `    <changefreq>${escapeXml(changefreq)}</changefreq>`,
    `    <priority>${escapeXml(priority)}</priority>`,
    "  </url>",
  ].join("\n");
}

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET() {
  const posts = await getPublishedPosts();
  const now = new Date().toISOString();

  const staticEntries = STATIC_ROUTES.map((route) => ({
    loc: `${SITE_URL}${route.path === "/" ? "" : route.path}`,
    lastmod: now,
    changefreq: route.changefreq,
    priority: route.priority,
  }));

  const blogEntries = posts.map((post) => ({
    loc: `${SITE_URL}/blog/${post.slug}`,
    lastmod: toIsoDate(post.updatedAtIso || post.createdAtIso),
    changefreq: "weekly",
    priority: "0.7",
  }));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[
    ...staticEntries,
    ...blogEntries,
  ]
    .map(buildUrlEntry)
    .join("\n")}\n</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
