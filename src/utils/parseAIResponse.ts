export type Segment =
  | { type: 'text'; content: string }
  | { type: 'widget'; content: string; id: string };

export function parseAIResponse(raw: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /<widget>([\s\S]*?)<\/widget>/gi;
  let last = 0, match: RegExpExecArray | null, counter = 0;

  while ((match = regex.exec(raw)) !== null) {
    if (match.index > last) {
      const text = raw.slice(last, match.index).trim();
      if (text) segments.push({ type: 'text', content: text });
    }
    segments.push({
      type: 'widget',
      content: match[1].trim(),
      id: `wz-widget-${Date.now()}-${counter++}`
    });
    last = match.index + match[0].length;
  }

  const tail = raw.slice(last).trim();
  if (tail) segments.push({ type: 'text', content: tail });

  if (segments.length === 0) {
    segments.push({ type: 'text', content: raw });
  }

  return segments;
}
