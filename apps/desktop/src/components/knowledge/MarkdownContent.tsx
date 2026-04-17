import Markdown from "react-markdown";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * Renders markdown or plain text as formatted HTML.
 * Used in flashcards, quiz questions, and review screens.
 */
export function MarkdownContent({ content, className = "" }: MarkdownContentProps) {
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none ${className}`}>
      <Markdown>{content}</Markdown>
    </div>
  );
}
