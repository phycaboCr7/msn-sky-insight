import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';

function parseSegments(text: string) {
  const pattern = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^$\n]+?\$|\\\([\s\S]+?\\\))/g;
  const parts: { type: 'text' | 'inline' | 'block'; content: string }[] = [];
  let last = 0, match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push({ type: 'text', content: text.slice(last, match.index) });
    const raw = match[0];
    const isBlock = raw.startsWith('$$') || raw.startsWith('\\[');
    const expr = raw.replace(/^\$\$|\$\$$|^\\\[|\\\]$|^\$|\$$|^\\\(|\\\)$/g, '').trim();
    parts.push({ type: isBlock ? 'block' : 'inline', content: expr });
    last = match.index + raw.length;
  }
  if (last < text.length) parts.push({ type: 'text', content: text.slice(last) });
  return parts;
}

export function MathRenderer({ text, className }: { text: string; className?: string }) {
  const segments = parseSegments(text);
  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (seg.type === 'text') return <span key={i}>{seg.content}</span>;
        if (seg.type === 'inline') return (
          <span key={i} className="math-inline-wrap">
            <InlineMath math={seg.content} />
          </span>
        );
        return (
          <div key={i} className="math-block-wrap">
            <span className="math-label">Equation</span>
            <BlockMath math={seg.content} />
          </div>
        );
      })}
    </span>
  );
}
