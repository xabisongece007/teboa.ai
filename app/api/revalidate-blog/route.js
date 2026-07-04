import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { BLOG_POSTS_TAG } from "../../blog/_lib/blog-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request) {
  const secret = process.env.BLOG_REVALIDATE_SECRET;

  if (!secret) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "BLOG_REVALIDATE_SECRET is not configured." },
        { status: 500 }
      ),
    };
  }

  const bearer = request.headers.get("authorization") || "";
  const token = bearer.startsWith("Bearer ") ? bearer.slice(7).trim() : "";

  if (token !== secret) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true };
}

function normalizeSlugs(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(
    value
      .map((entry) => String(entry || "").trim())
      .filter(Boolean)
  )];
}

export async function POST(request) {
  const auth = isAuthorized(request);
  if (!auth.ok) {
    return auth.response;
  }

  let payload = {};

  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const slugs = normalizeSlugs(payload?.slugs);

  revalidateTag(BLOG_POSTS_TAG);
  revalidatePath("/blog");
  revalidatePath("/sitemap.xml");

  for (const slug of slugs) {
    revalidatePath(`/blog/${slug}`);
  }

  return NextResponse.json({
    ok: true,
    revalidated: {
      tag: BLOG_POSTS_TAG,
      paths: ["/blog", "/sitemap.xml", ...slugs.map((slug) => `/blog/${slug}`)],
    },
  });
}
