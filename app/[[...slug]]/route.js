import { readFile, stat } from "fs/promises";
import path from "path";

const ROOT_DIR = process.cwd();
const RESERVED_PREFIXES = ["_next", "api", "blog", "robots.txt", "sitemap.xml"];
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8",
};
const INTERCOM_POSITION_STYLE_TAG = `<style id="teboa-intercom-position-styles">
iframe[name="intercom-messenger-frame"],
iframe[name="intercom-notification-stack-frame"] {
  position: fixed !important;
  right: 24px !important;
  left: auto !important;
  bottom: 96px !important;
  top: auto !important;
  transform: none !important;
}

iframe[name="intercom-messenger-frame"] {
  width: 400px !important;
  max-width: calc(100vw - 48px) !important;
  max-height: calc(100vh - 128px) !important;
}

@media (max-width: 640px) {
  iframe[name="intercom-messenger-frame"],
  iframe[name="intercom-notification-stack-frame"] {
    right: 16px !important;
    bottom: 80px !important;
    max-width: calc(100vw - 32px) !important;
  }

  iframe[name="intercom-messenger-frame"] {
    width: calc(100vw - 32px) !important;
  }
}
</style>`;
const INTERCOM_SCRIPT_TAG = '<script src="/intercom.js" defer></script>';

function getContentType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function getCacheControl(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".html") {
    return "public, max-age=0, must-revalidate";
  }

  if (ext === ".xml" || ext === ".txt" || ext === ".json") {
    return "public, max-age=300, must-revalidate";
  }

  return "public, max-age=31536000, immutable";
}

function isSafePath(relativePath) {
  return (
    relativePath &&
    !relativePath.includes("..") &&
    !path.isAbsolute(relativePath) &&
    !relativePath.startsWith(".")
  );
}

async function resolveExistingFile(slugSegments) {
  const requestPath = slugSegments.length > 0 ? slugSegments.join("/") : "index";

  if (
    RESERVED_PREFIXES.some(
      (prefix) => requestPath === prefix || requestPath.startsWith(`${prefix}/`)
    )
  ) {
    return null;
  }

  const candidates = path.extname(requestPath)
    ? [requestPath]
    : [`${requestPath}.html`, requestPath];

  for (const candidate of candidates) {
    if (!isSafePath(candidate)) {
      continue;
    }

    const absolutePath = path.resolve(ROOT_DIR, candidate);

    if (!absolutePath.startsWith(ROOT_DIR)) {
      continue;
    }

    try {
      const fileStat = await stat(absolutePath);

      if (fileStat.isFile()) {
        return { absolutePath, fileStat };
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function serveStaticFile(slugSegments, method) {
  const resolved = await resolveExistingFile(slugSegments);

  if (!resolved) {
    return new Response("Not Found", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  const headers = new Headers();
  headers.set("Content-Type", getContentType(resolved.absolutePath));
  headers.set("Cache-Control", getCacheControl(resolved.absolutePath));
  headers.set("Last-Modified", resolved.fileStat.mtime.toUTCString());
  headers.set("X-Content-Type-Options", "nosniff");

  if (method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }

  const fileBuffer = await readFile(resolved.absolutePath);

  if (path.extname(resolved.absolutePath).toLowerCase() === ".html") {
    const html = fileBuffer.toString("utf-8");
    const bodyCloseIndex = html.lastIndexOf("</body>");
    const intercomTags = `${html.includes(INTERCOM_POSITION_STYLE_TAG) ? "" : INTERCOM_POSITION_STYLE_TAG}${html.includes(INTERCOM_SCRIPT_TAG) ? "" : INTERCOM_SCRIPT_TAG}`;
    const htmlWithIntercom =
      bodyCloseIndex === -1 || intercomTags.length === 0
        ? html
        : `${html.slice(0, bodyCloseIndex)}${intercomTags}${html.slice(bodyCloseIndex)}`;

    return new Response(htmlWithIntercom, { status: 200, headers });
  }

  return new Response(fileBuffer, { status: 200, headers });
}

export async function GET(_request, context) {
  const params = await context.params;
  const slugSegments = Array.isArray(params?.slug) ? params.slug : [];
  return serveStaticFile(slugSegments, "GET");
}

export async function HEAD(_request, context) {
  const params = await context.params;
  const slugSegments = Array.isArray(params?.slug) ? params.slug : [];
  return serveStaticFile(slugSegments, "HEAD");
}
