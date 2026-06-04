import * as path from "path";

export type CssReferenceKind = "local-flask" | "cdn" | "inline-style";

export interface CssReference {
  kind: CssReferenceKind;
  value: string;
  templateDir: string;
}

const FLASK_URL_FOR = /url_for\s*\(\s*['"]static['"]\s*,\s*filename\s*=\s*['"]([^'"]+)['"]\s*\)/g;
const STATIC_HREF = /<link[^>]+href=["']([^"']*\/static\/[^"']+\.css)[^>]*>/gi;
const CDN_HREF = /<link[^>]+href=["'](https?:\/\/[^"']+\.css[^"']*)[^>]*>/gi;
const INLINE_STYLE = /<style[^>]*>([\s\S]*?)<\/style>/gi;

export function extractCssReferences(
  sources: Array<{ text: string; absPath: string }>
): CssReference[] {
  const seen = new Set<string>();
  const refs: CssReference[] = [];

  function add(ref: CssReference) {
    const key = `${ref.kind}::${ref.value}`;
    if (seen.has(key)) return;
    seen.add(key);
    refs.push(ref);
  }

  for (const { text, absPath } of sources) {
    const dir = path.dirname(absPath);

    for (const m of text.matchAll(FLASK_URL_FOR)) {
      add({ kind: "local-flask", value: m[1], templateDir: dir });
    }

    for (const m of text.matchAll(STATIC_HREF)) {
      const raw = m[1].replace(/^\//, "");
      add({ kind: "local-flask", value: raw, templateDir: dir });
    }

    for (const m of text.matchAll(CDN_HREF)) {
      add({ kind: "cdn", value: m[1], templateDir: dir });
    }

    for (const m of text.matchAll(INLINE_STYLE)) {
      const css = m[1].trim();
      if (css) add({ kind: "inline-style", value: css, templateDir: dir });
    }
  }

  return refs;
}

export const FALLBACK_CSS = `
body{font-family:system-ui,sans-serif;line-height:1.6;color:#1a1a1a;margin:0;padding:1rem 2rem}
header{background:#f0f4ff;border-bottom:2px solid #3b5bdb;padding:1rem 1.5rem;margin-bottom:1rem}
nav{background:#f8f9fa;border:1px solid #dee2e6;padding:.75rem 1.5rem;margin-bottom:1rem;border-radius:4px}
nav a{margin-right:1rem;color:#3b5bdb;text-decoration:none}
main{max-width:960px;margin:0 auto}
aside{background:#fff9db;border-left:4px solid #f08c00;padding:1rem 1.5rem;margin:1rem 0;border-radius:0 4px 4px 0}
section{border:1px dashed #ced4da;padding:1rem 1.5rem;margin-bottom:1.25rem;border-radius:4px;position:relative}
section::before{content:"<section>";font-size:.65rem;font-family:monospace;color:#868e96;position:absolute;top:4px;right:8px}
article{background:#fff;border:1px solid #dee2e6;padding:1.25rem 1.5rem;margin-bottom:1rem;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
footer{background:#f8f9fa;border-top:2px solid #dee2e6;padding:1rem 1.5rem;margin-top:2rem;color:#6c757d;font-size:.875rem}
h1,h2,h3,h4,h5,h6{margin-top:0}
ul,ol{padding-left:1.5rem}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #dee2e6;padding:.5rem .75rem;text-align:left}
th{background:#f8f9fa;font-weight:600}
a{color:#3b5bdb}
code{background:#f1f3f5;padding:.1em .3em;border-radius:3px;font-size:.875em}
pre{background:#f1f3f5;padding:1rem;border-radius:6px;overflow-x:auto}
`.trim();
