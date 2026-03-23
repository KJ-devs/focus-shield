import type { MarkdownSection } from "./types";

const HEADING_REGEX = /^(#{2,6})\s+(.+)$/;
const BOLD_REGEX = /\*\*([^*]+)\*\*/g;

export function parseMarkdown(content: string): MarkdownSection[] {
  const lines = content.split("\n");
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
      // Ignore H1
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
    }
  }

  flushSection();

  return sections;
}

function extractBoldTerms(text: string): string[] {
  const terms: string[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(BOLD_REGEX.source, BOLD_REGEX.flags);

  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      terms.push(match[1]);
    }
  }

  return terms;
}
