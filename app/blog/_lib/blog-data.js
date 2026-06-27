import { cache } from "react";

const firebaseConfig = {
  apiKey: "AIzaSyB1buIPplZjwjfUsf8uHNe9JrtB0pcq_sM",
  projectId: "teboatech-mvp",
};

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value, maxLength) {
  if (!isNonEmptyString(value) || value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}

function toDateValue(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const dateValue = new Date(value);
    return Number.isNaN(dateValue.getTime()) ? null : dateValue;
  }

  if (typeof value?.seconds === "number") {
    const dateValue = new Date(value.seconds * 1000);
    return Number.isNaN(dateValue.getTime()) ? null : dateValue;
  }

  return null;
}

function pickFirstString(source, keys) {
  for (const key of keys) {
    if (isNonEmptyString(source?.[key])) {
      return source[key].trim();
    }
  }

  return "";
}

function unwrapFirestoreValue(value) {
  if (!value || typeof value !== "object") {
    return value;
  }

  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;

  if ("mapValue" in value) {
    const fields = value.mapValue?.fields || {};
    return Object.fromEntries(
      Object.entries(fields).map(([key, nestedValue]) => [key, unwrapFirestoreValue(nestedValue)])
    );
  }

  if ("arrayValue" in value) {
    const values = value.arrayValue?.values || [];
    return values.map(unwrapFirestoreValue);
  }

  return value;
}

function fromFirestoreDocument(document) {
  const fields = document?.fields || {};
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, unwrapFirestoreValue(value)])
  );
}

function documentIdFromName(name) {
  const parts = String(name || "").split("/");
  return parts[parts.length - 1] || "";
}

function normalizePost(id, rawData) {
  const slug = isNonEmptyString(rawData?.slug) ? rawData.slug.trim() : "";
  const title = isNonEmptyString(rawData?.title) ? rawData.title.trim() : "Untitled Post";

  if (!slug) {
    return null;
  }

  const createdAtDate = toDateValue(rawData?.createdAt);
  const updatedAtDate = toDateValue(rawData?.updatedAt);
  const htmlContent = pickFirstString(rawData, ["contentHtml", "bodyHtml", "html"]);
  const textContent = pickFirstString(rawData, ["content", "body", "markdown", "text"]);
  const excerptSource =
    pickFirstString(rawData, ["excerpt", "summary", "description", "metaDescription"]) ||
    stripHtml(htmlContent || textContent);

  return {
    id,
    slug,
    title,
    excerpt: truncate(excerptSource, 220),
    metaDescription:
      pickFirstString(rawData, ["metaDescription", "excerpt", "summary", "description"]) ||
      truncate(stripHtml(htmlContent || textContent), 160) ||
      title,
    createdAt: createdAtDate,
    createdAtIso: createdAtDate ? createdAtDate.toISOString() : null,
    createdAtLabel: createdAtDate
      ? createdAtDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "",
    createdAtMs: createdAtDate ? createdAtDate.getTime() : 0,
    updatedAtIso: updatedAtDate ? updatedAtDate.toISOString() : null,
    published: rawData?.published === true,
    author: pickFirstString(rawData, ["author", "authorName"]),
    coverImage: pickFirstString(rawData, ["coverImage", "image", "featuredImage"]),
    htmlContent,
    textContent,
  };
}

function getBlogEndpoint() {
  return `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents:runQuery?key=${firebaseConfig.apiKey}`;
}

async function runBlogQuery(structuredQuery) {
  const response = await fetch(getBlogEndpoint(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ structuredQuery }),
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`Firestore REST request failed with status ${response.status}`);
  }

  const payload = await response.json();

  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((entry) => entry?.document)
    .filter(Boolean)
    .map((document) => normalizePost(documentIdFromName(document.name), fromFirestoreDocument(document)))
    .filter(Boolean);
}

export function isHtmlContent(value) {
  return /<\/?[a-z][\s\S]*>/i.test(String(value || ""));
}

export function buildParagraphs(textValue) {
  return String(textValue || "")
    .split(/\r?\n\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export const getPublishedPosts = cache(async () => {
  try {
    const posts = await runBlogQuery({
      from: [{ collectionId: "blog_posts" }],
      where: {
        fieldFilter: {
          field: { fieldPath: "published" },
          op: "EQUAL",
          value: { booleanValue: true },
        },
      },
    });

    return posts.sort((left, right) => right.createdAtMs - left.createdAtMs);
  } catch {
    return [];
  }
});

export const getPublishedPostBySlug = cache(async (slug) => {
  if (!isNonEmptyString(slug)) {
    return null;
  }

  const posts = await getPublishedPosts();
  return posts.find((post) => post.slug === slug) || null;
});

export const getPublishedSlugs = cache(async () => {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({ slug: post.slug }));
});
