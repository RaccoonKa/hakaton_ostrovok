import React from "react";

export interface MarkdownTextProps {
  content: string;
  className?: string;
}

/**
 * Parses markdown typography (**bold**, *italic*, numbered lists, bullet points)
 * into semantic React elements without raw asterisks.
 */
export const MarkdownText: React.FC<MarkdownTextProps> = ({ content, className = "" }) => {
  const parseInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
        return (
          <strong key={index} className="font-semibold text-content-primary">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
        return (
          <em key={index} className="italic text-content-muted">
            {part.slice(1, -1)}
          </em>
        );
      }
      return part;
    });
  };

  const paragraphs = content.split(/\n\s*\n/);

  return (
    <div className={`flex flex-col gap-2.5 text-xs sm:text-sm leading-relaxed ${className}`}>
      {paragraphs.map((p, pIdx) => {
        const trimmed = p.trim();
        if (!trimmed) return null;

        const lines = trimmed.split("\n");
        const isList = lines.every((l) => /^\s*([•\-*]|\d+\.)\s/.test(l));

        if (isList) {
          return (
            <div key={pIdx} className="flex flex-col gap-1.5 pl-1 my-0.5">
              {lines.map((line, lIdx) => {
                const numMatch = line.match(/^\s*(\d+\.)\s+(.*)/);
                if (numMatch) {
                  return (
                    <div key={lIdx} className="flex items-start gap-2">
                      <span className="font-semibold text-header/80 shrink-0 select-none">
                        {numMatch[1]}
                      </span>
                      <span className="flex-1">{parseInline(numMatch[2])}</span>
                    </div>
                  );
                }

                const bulletMatch = line.match(/^\s*([•\-*])\s+(.*)/);
                if (bulletMatch) {
                  return (
                    <div key={lIdx} className="flex items-start gap-2">
                      <span className="text-header font-bold shrink-0 select-none">•</span>
                      <span className="flex-1">{parseInline(bulletMatch[2])}</span>
                    </div>
                  );
                }

                return (
                  <div key={lIdx} className="leading-relaxed">
                    {parseInline(line)}
                  </div>
                );
              })}
            </div>
          );
        }

        return (
          <p key={pIdx} className="leading-relaxed whitespace-pre-wrap">
            {lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {parseInline(line)}
                {lIdx < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
};
