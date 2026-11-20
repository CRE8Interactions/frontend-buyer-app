import { readFile, realpath } from "node:fs/promises";
import { extname, join, sep } from "node:path";
import { insertLibrary, localStorybook, localStoryIndex, renderLibrary, storySourcePath } from "../library";

const mimeTypes: Record<string, string> = {
  ".ai": "application/octet-stream",
  ".css": "text/css",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "text/javascript",
  ".json": "application/json",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

export async function GET(request: Request, { params }: RouteContext<"/api/brand-preview/[[...asset]]">) {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });

  const { asset = ["index.html"] } = await params;
  const contentType = mimeTypes[extname(asset.at(-1) ?? "")];
  if (!contentType || asset.some((segment) => !/^[a-z0-9][a-z0-9._@-]*$/i.test(segment))) {
    return new Response(null, { status: 404 });
  }

  try {
    const previewDirectory = join(process.cwd(), "app/api/brand-preview");
    if (asset.length === 1 && ["component-docs.css", "component-docs.js"].includes(asset[0])) {
      return new Response(await readFile(join(previewDirectory, asset[0]), "utf8"), {
        headers: { "Content-Type": contentType, "Cache-Control": "no-store" },
      });
    }

    const source = asset[0] === "story-source" && asset.at(-1)?.endsWith(".txt")
      ? storySourcePath(asset.slice(1).join("/").slice(0, -4)) : undefined;
    if (source) {
      const components = await realpath(join(process.cwd(), "components/ui"));
      const file = await realpath(join(process.cwd(), source));
      if (!file.startsWith(components + sep)) return new Response(null, { status: 404 });
      return new Response(await readFile(file, "utf8"), { headers: { "Content-Type": contentType } });
    }

    const root = await realpath(join(process.cwd(), "brand"));
    const file = await realpath(join(root, ...asset));
    if (!file.startsWith(root + sep)) return new Response(null, { status: 404 });

    if (file === join(root, "index.html")) {
      const [guide, library] = await Promise.all([
        readFile(file, "utf8"),
        readFile(join(previewDirectory, "library.html"), "utf8"),
      ]);
      const libraryPages = renderLibrary(library, await localStoryIndex(), new URL(request.url).searchParams.get("component"), localStorybook);
      const preview = insertLibrary(guide, libraryPages);
      return new Response(preview, {
        headers: { "Content-Type": contentType, "Cache-Control": "no-store" },
      });
    }

    return new Response(new Uint8Array(await readFile(file)), {
      headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=3600" },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
