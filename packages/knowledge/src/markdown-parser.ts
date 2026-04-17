import type { MarkdownSection } from "./types";

const HEADING_REGEX = /^(#{1,6})\s+(.+)$/;
const BOLD_MD_REGEX = /\*\*([^*]+)\*\*/g;
const BOLD_HTML_REGEX = /<strong>([^<]+)<\/strong>/g;
const HTML_TAG_REGEX = /<[^>]+>/g;
const LIST_ITEM_MD_REGEX = /^[\s]*[-*+]\s+(.+)$/;
const ORDERED_LIST_MD_REGEX = /^[\s]*\d+\.\s+(.+)$/;

/**
 * Strip HTML tags to get plain text.
 */
function stripHtml(html: string): string {
  return html.replace(HTML_TAG_REGEX, "").trim();
}

/**
 * Detect if content is HTML (from TipTap) or raw markdown.
 */
function isHtmlContent(content: string): boolean {
  return content.includes("<p>") || content.includes("<h2") || content.includes("<h3");
}

/**
 * Convert HTML content to pseudo-markdown for uniform parsing.
 */
function htmlToMarkdownLines(html: string): string[] {
  const lines: string[] = [];

  // Replace heading tags with markdown headings (with newlines)
  const processed = html
    .replace(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi, (_m, level: string, text: string) =>
      `\n${"#".repeat(Number(level))} ${stripHtml(text)}\n`,
    )
    // Replace <li> with markdown list items, preserving bold inside
    .replace(/<li[^>]*>(.*?)<\/li>/gi, (_m, text: string) => `- ${stripHtml(text)}`)
    // Replace <p> with line + newline
    .replace(/<p[^>]*>(.*?)<\/p>/gi, (_m, text: string) => `${text}\n`)
    // Replace <br> with newline
    .replace(/<br\s*\/?>/gi, "\n")
    // Replace <strong> with markdown bold
    .replace(BOLD_HTML_REGEX, "**$1**")
    // Remove remaining tags but keep content
    .replace(/<(?!strong)[^>]+>/g, "");

  for (const line of processed.split("\n")) {
    const trimmed = line.trim();
    if (trimmed) lines.push(trimmed);
  }

  return lines;
}

/**
 * Parse content (markdown or HTML) into sections.
 * Supports documents without headings by creating a default section.
 */
export function parseMarkdown(content: string): MarkdownSection[] {
  if (!content || !content.trim()) return [];

  const lines = isHtmlContent(content)
    ? htmlToMarkdownLines(content)
    : content.split("\n");

  const sections: MarkdownSection[] = [];
  let currentSection: MarkdownSection | null = null;
  const contentLines: string[] = [];

  function flushSection(): void {
    if (currentSection) {
      const text = contentLines.join("\n").trim();
      currentSection.content = text;
      currentSection.boldTerms = extractBoldTerms(text);
      sections.push(currentSection);
      contentLines.length = 0;
    }
  }

  for (const line of lines) {
    const match = HEADING_REGEX.exec(line);
    if (match) {
      const hashes = match[1];
      const headingText = match[2];
      if (!hashes || !headingText) continue;

      const level = hashes.length;
      if (level === 1) continue;

      flushSection();
      currentSection = {
        heading: headingText.trim(),
        level,
        content: "",
        boldTerms: [],
      };
    } else if (currentSection) {
      contentLines.push(line);
    } else {
      // Content before any heading — create a default section
      if (line.trim()) {
        if (!currentSection) {
          currentSection = {
            heading: "Notes",
            level: 2,
            content: "",
            boldTerms: [],
          };
        }
        contentLines.push(line);
      }
    }
  }

  flushSection();

  return sections;
}

/**
 * Extract bold terms from text (both markdown and residual HTML bold).
 */
export function extractBoldTerms(text: string): string[] {
  const terms = new Set<string>();

  let match: RegExpExecArray | null;
  const mdRegex = new RegExp(BOLD_MD_REGEX.source, BOLD_MD_REGEX.flags);
  while ((match = mdRegex.exec(text)) !== null) {
    if (match[1]) terms.add(match[1]);
  }

  const htmlRegex = new RegExp(BOLD_HTML_REGEX.source, BOLD_HTML_REGEX.flags);
  while ((match = htmlRegex.exec(text)) !== null) {
    if (match[1]) terms.add(match[1]);
  }

  return [...terms];
}

/**
 * Extract list items from a section's content.
 */
export function extractListItems(content: string): string[] {
  const items: string[] = [];
  for (const line of content.split("\n")) {
    const mdMatch = LIST_ITEM_MD_REGEX.exec(line);
    if (mdMatch?.[1]) {
      items.push(stripHtml(mdMatch[1]));
      continue;
    }
    const olMatch = ORDERED_LIST_MD_REGEX.exec(line);
    if (olMatch?.[1]) {
      items.push(stripHtml(olMatch[1]));
    }
  }
  return items;
}

/**
 * Extract definition patterns ("X is Y", "X means Y", "X refers to Y").
 */
export function extractDefinitions(content: string): Array<{ term: string; definition: string }> {
  const patterns = [
    /\*\*([^*]+)\*\*\s+(?:is|are|was|were|means?|refers?\s+to|represents?|describes?)\s+(.+)/gi,
    /([A-Z][a-zA-Z\s]{2,30})\s+(?:is|are)\s+(?:a|an|the)\s+(.+)/g,
  ];

  const definitions: Array<{ term: string; definition: string }> = [];
  const seen = new Set<string>();

  for (const pattern of patterns) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const term = match[1]?.trim();
      const def = match[2]?.trim().replace(/\.$/, "");
      if (term && def && def.length > 10 && !seen.has(term.toLowerCase())) {
        seen.add(term.toLowerCase());
        definitions.push({ term, definition: def });
      }
    }
  }

  return definitions;
}
