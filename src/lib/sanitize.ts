// Server-side HTML sanitizer for article content. The editor JSON is the source
// of truth; the rendered HTML (content_html) is sanitized here before being
// stored and later injected via set:html on the public blog.

import sanitizeHtml from 'sanitize-html';

const allowedTags = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'a', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'strong', 'em', 'u', 's', 'br', 'hr', 'span', 'mark', 'sub', 'sup',
  'img', 'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  // Column-width structure emitted by TipTap resizable tables.
  'colgroup', 'col',
  // Task list (checklist) structure emitted by TipTap TaskList/TaskItem.
  'div', 'label', 'input',
];

// Table column widths use `style="width:NNpx"` / min-width. Allow only that.
const TABLE_WIDTH = [/^\d{1,4}px$/, /^\d{1,3}(\.\d+)?%$/];

// Whitelist of font-family values the editor can apply (matches FONT_FAMILIES
// in EditorToolbar). Anything else is dropped to avoid CSS injection.
const FONT_FAMILY = [
  /^Georgia, "Times New Roman", serif$/,
  /^ui-monospace, "JetBrains Mono", monospace$/,
];
// font-size limited to small rem/px/em values produced by the toolbar.
const FONT_SIZE = [/^(0?\.\d+|[0-3](\.\d+)?)(rem|em)$/, /^([1-9]|[1-4]\d)px$/];

// CSS color validation: 3, 4, 6, or 8 hex digits after `#`. Tightened from the
// original loose regex (which allowed `#0x` and arbitrary lengths).
const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_COLOR = /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/;

// Only safe image data URIs. SVG in data: is excluded because SVG can carry
// CSS exfil references; even inside <img>, defense-in-depth is cheap.
const IMAGE_DATA_SCHEMES = ['data:image/png', 'data:image/jpeg', 'data:image/jpg', 'data:image/webp', 'data:image/gif'];

export function sanitizeArticleHtml(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags,
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      span: ['class', 'style'],
      mark: ['style', 'data-color'],
      code: ['class'],
      pre: ['class'],
      td: ['colspan', 'rowspan', 'colwidth', 'style'],
      th: ['colspan', 'rowspan', 'colwidth', 'style'],
      col: ['span', 'style'],
      colgroup: ['span'],
      // TextAlign writes `style="text-align:…"` on block nodes.
      p: ['style'],
      h1: ['style'], h2: ['style'], h3: ['style'], h4: ['style'], h5: ['style'], h6: ['style'],
      // Checklist: keep the checkbox state but it is forced read-only below.
      input: ['type', 'checked', 'disabled'],
      ul: ['data-type'],
      li: ['data-type', 'data-checked', 'style'],
      '*': ['data-*'],
    },
    // No `data:` in anchor href — prevents data:text/html phishing links.
    allowedSchemes: ['https', 'http', 'mailto'],
    allowedSchemesByTag: {
      img: ['https', 'http', ...IMAGE_DATA_SCHEMES],
    },
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          ...(attribs.target === '_blank' ? { rel: 'noopener noreferrer nofollow' } : {}),
        },
      }),
      // Checklist checkboxes render in public articles read-only: force disabled
      // and drop any name/value so they can never be a real form control.
      input: (tagName, attribs) => ({
        tagName,
        attribs: {
          type: 'checkbox',
          disabled: 'disabled',
          ...(attribs.checked ? { checked: 'checked' } : {}),
        },
      }),
      // Strip event handlers and javascript: URLs that slipped through scheme filtering.
      '*': (tagName, attribs) => {
        const cleaned: Record<string, string> = {};
        for (const [k, v] of Object.entries(attribs)) {
          if (k.startsWith('on')) continue; // onclick, onerror, etc.
          if (typeof v === 'string' && /javascript:/i.test(v)) continue;
          cleaned[k] = v;
        }
        return { tagName, attribs: cleaned };
      },
    },
    allowedStyles: {
      '*': {
        'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
        color: [HEX_COLOR, RGB_COLOR],
        'background-color': [HEX_COLOR, RGB_COLOR],
        'font-family': FONT_FAMILY,
        'font-size': FONT_SIZE,
      },
      // Table column widths (resizable tables).
      col: { width: TABLE_WIDTH, 'min-width': TABLE_WIDTH },
      td: { width: TABLE_WIDTH, 'min-width': TABLE_WIDTH },
      th: { width: TABLE_WIDTH, 'min-width': TABLE_WIDTH },
    },
  });
}
