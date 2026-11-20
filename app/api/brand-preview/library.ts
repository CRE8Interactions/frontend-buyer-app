import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const localStorybook = "http://127.0.0.1:6006";
const modalDocs = "molecules-dialog--docs";

type Entry = { importPath?: string; id: string; type: "docs" | "story"; title: string; name: string; tags?: string[] };
type Component = { name: string; group: string; badge?: "New" | "Updated"; docs?: string; stories: Entry[] };

const modalExamples = [
  ["sizes", "Sizes", "Try each width, from XS through full-screen. Cover keeps a viewport inset."],
  ["placement", "Placement", "Auto is centered on desktop and bottom-aligned on phones. The other placements apply at every width."],
  ["scroll-behavior", "Scroll behavior", "Scroll inside the body with the title and actions in view, or scroll the whole panel."],
  ["controlled-state", "Controlled state", "Use open and onOpenChange when the parent controls visibility."],
  ["with-form", "With a form", "Edit the ticket holder’s name. The form validates before saving and closing."],
  ["custom-trigger", "Custom trigger", "Use asChild to open the dialog from an existing button."],
  ["backdrop-variants", "Backdrop variants", "Compare opaque, blur, and transparent backdrops."],
  ["custom-backdrop", "Custom backdrop", "Apply backdropClassName to style the backdrop separately from the panel."],
  ["dismiss-behavior", "Dismiss behavior", "Backdrop dismissal and Escape can be controlled independently."],
  ["close-methods", "Close methods", "Use the close icon or a footer action. The icon can be hidden."],
  ["custom-animations", "Custom animations", "Compare a slide and fade with an instant open."],
  ["custom-portal", "Custom portal", "Use portalContainer to render the modal in a specified element."],
];

function escape(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] ?? char);
}

export async function localStoryIndex(): Promise<Entry[]> {
  try {
    const response = await fetch(localStorybook + "/index.json", { signal: AbortSignal.timeout(2000), cache: "no-store" });
    if (response.ok) return Object.values((await response.json()).entries);
  } catch {}
  try {
    const index = await readFile(join(process.cwd(), "storybook-static/index.json"), "utf8");
    return Object.values(JSON.parse(index).entries);
  } catch {
    return [];
  }
}

export function storySourcePath(importPath?: string) {
  const source = importPath?.replace(/^\.\//, "");
  return source && /^components\/ui\/(?:[\w-]+\/)*[\w-]+\.stories\.tsx?$/.test(source) ? source : undefined;
}

function preview(id: string, name: string, center = false, inlineCode = false, importPath?: string) {
  const source = storySourcePath(importPath);
  const code = inlineCode
    ? '<button type="button" class="ds-code-link" data-ds-code-toggle aria-controls="modal-code-panel" aria-expanded="false">Get the code <span aria-hidden="true">›</span></button>'
    : source ? `<button type="button" class="ds-code-link" data-ds-code-toggle data-source="/brand/story-source/${escape(source)}.txt" aria-controls="${escape(id)}-source" aria-expanded="false">Get the code <span aria-hidden="true">›</span></button>`
      : "";
  return `<div class="ds-stage">
  <div class="ds-stage-bar">
    ${code}
    <div class="ds-stage-actions">
      <button type="button" class="ds-icon-action" data-ds-preview-theme aria-label="Switch ${escape(name)} preview theme" title="Switch preview theme"><span data-ds-icon="sun" aria-hidden="true"></span></button>
      <button type="button" class="ds-icon-action" data-ds-expand aria-label="Expand ${escape(name)} preview" title="Fullscreen"><span data-ds-icon="corners-out" aria-hidden="true"></span></button>
      <div class="ds-viewport-controls" role="group" aria-label="${escape(name)} preview viewport">
        <button type="button" data-ds-viewport="mobile" aria-pressed="false">Mobile</button>
        <button type="button" data-ds-viewport="tablet" aria-pressed="false">Tablet</button>
        <button type="button" data-ds-viewport="desktop" aria-pressed="true">Desktop</button>
      </div>
    </div>
  </div>
  ${!inlineCode && source ? `<div class="code" id="${escape(id)}-source" hidden><button class="cp" type="button" data-copy-code>Copy</button><pre><code></code></pre></div>` : ""}
  <div class="ds-viewport">
    <iframe data-ds-story="${escape(id)}"${center ? ' data-ds-centered' : ''} title="${escape(name)} preview" allow="fullscreen" style="visibility:hidden"></iframe>
  </div>
</div>`;
}

export function getComponents(entries: Entry[]) {
  const byTitle = new Map<string, Component>();
  for (const entry of entries) {
    if (!storySourcePath(entry.importPath)) continue;
    const name = entry.id === modalDocs || entry.id.startsWith("molecules-dialog--") ? "Modal" : entry.title.split("/").at(-1)!;
    const item = byTitle.get(entry.title) ?? { name, group: entry.title.split("/")[0], stories: [] };
    // A `new` or `updated` tag on the story file shows a small badge beside the component in the sidebar.
    if (entry.tags?.includes("new")) item.badge = "New";
    else if (entry.tags?.includes("updated") && !item.badge) item.badge = "Updated";
    if (entry.type === "docs") item.docs = entry.id;
    if (entry.type === "story") item.stories.push(entry);
    byTitle.set(entry.title, item);
  }
  return [...byTitle.values()].filter((item) => item.stories.length)
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
}

export function renderLibrary(template: string, entries: Entry[], selection: string | null, storybook: string) {
  const components = getComponents(entries);
  const selected = components.find((item) => selection && (item.docs ?? item.stories[0].id) === selection);
  const links = components.map((item) => {
    const id = item.docs ?? item.stories[0].id;
    const href = id === modalDocs ? "/brand/#/dialog-guide" : `/brand/?component=${encodeURIComponent(id)}#/component-guide`;
    return `<a href="${href}" data-group="${escape(item.group)}"${item.badge ? ` data-badge="${item.badge}"` : ''}${selected === item ? ' data-ds-selected' : ''}${id === modalDocs ? ' data-ds-modal-link' : ''}>${escape(item.name)}</a>`;
  }).join("");

  const mainExample = selected?.stories.find((entry) => /^(default|playground)$/i.test(entry.name)) ?? selected?.stories[0];
  const guide = selected && mainExample ? `<p class="crumb">Components <span aria-hidden="true">/</span> ${escape(selected.name)}</p>
  <div class="ds-doc-heading">
    <h1>${escape(selected.name)}</h1>
    <button type="button" class="ds-copy-markdown" data-ds-copy-markdown><span data-ds-icon="copy" aria-hidden="true"></span>Copy Markdown</button>
  </div>
  <p class="lead">Try the component and its variants below.</p>
  <h2 id="component-usage">Usage</h2>
  ${preview(mainExample.id, selected.name, false, false, mainExample.importPath)}
  <h2 id="component-examples">Examples</h2>
  ${selected.stories.filter((entry) => entry !== mainExample).map((entry) => `<section class="ds-example"><h3 data-ds-section id="${escape(entry.id)}">${escape(entry.name)}</h3>${preview(entry.id, entry.name, false, false, entry.importPath)}</section>`).join("") || '<p>This component has one live example.</p>'}`
    : '<h1>Component guide</h1><p>Choose a component from the <a href="#/component-library">directory</a>.</p>';

  const modalStories = components.find((item) => item.docs === modalDocs)?.stories ?? [];
  const knownModalStories = new Set(["default", ...modalExamples.map(([id]) => id)].map((id) => "molecules-dialog--" + id));
  const additionalModalExamples = modalStories.filter(({ id }) => !knownModalStories.has(id))
    .map(({ id, name, importPath }) => `<section class="ds-example"><h3 data-ds-section id="${escape(id)}">${escape(name)}</h3>${preview(id, name, true, false, importPath)}</section>`)
    .join("");

  const replacements: Record<string, string> = {
    DIRECTORY: links || '<p>Start Storybook on port 6006 to load the component list.</p>',
    GUIDE: guide,
    MODAL_PREVIEW: preview("molecules-dialog--default", "Modal", true, true),
    MODAL_EXAMPLES: modalExamples.map(([id, name, text]) =>
      `<section class="ds-example"><h3 data-ds-section id="dialog-${id}">${name}</h3><p>${text}</p>${preview("molecules-dialog--" + id, name, true, false, "components/ui/dialog.stories.tsx")}</section>`
    ).join("") + additionalModalExamples,
  };
  return template
    .replaceAll("{{STORYBOOK}}", storybook)
    .replace(/<!-- (DIRECTORY|GUIDE|MODAL_PREVIEW|MODAL_EXAMPLES) -->/g, (_, key) => replacements[key]);
}

export function insertLibrary(guide: string, library: string) {
  return guide.replaceAll('class="page lbp"', 'class="lbp" hidden')
    .replace('<section class="page" id="social"', (marker) => library + "\n" + marker);
}
