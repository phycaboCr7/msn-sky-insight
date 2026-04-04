import { SPLATS } from '@/data/splats';
import type { SplatEntry } from '@/data/splats';

const THRESHOLD = 0.15;
const MAX_RESULTS = 3;

const STOP_WORDS = new Set([
  'the','a','an','and','or','in','of','is','are','was','were',
  'what','how','why','can','you','me','my','i','show','give',
  'tell','find','get','look','please','want','see','display'
]);

const FORCE_TRIGGERS = [
  /show\s+(me\s+)?(a\s+)?gaussian\s+splat/i,
  /show\s+(me\s+)?3d\s+(scene|model|splat)/i,
  /gaussian\s+splat/i,
  /open\s+(the\s+)?splat\s+viewer/i,
  /show\s+(me\s+)?something\s+in\s+3d/i,
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function scoreEntry(splat: SplatEntry, queryTokens: string[]): number {
  const splatWords = new Set([
    ...tokenize(splat.title),
    ...splat.tags.flatMap(tokenize),
    ...splat.keywords.flatMap(tokenize),
    ...tokenize(splat.category),
  ]);

  let hits = 0;
  for (const token of queryTokens) {
    if (splatWords.has(token)) { hits += 1.0; continue; }
    for (const w of splatWords) {
      if (w.includes(token) || token.includes(w)) { hits += 0.4; break; }
    }
  }

  return queryTokens.length > 0 ? hits / queryTokens.length : 0;
}

export interface MatchResult {
  splats: SplatEntry[];
  forced: boolean;
}

export function findMatchingSplats(
  userQuery: string,
  aiResponse: string = ''
): MatchResult {
  const combined = `${userQuery} ${aiResponse}`;

  const forced = FORCE_TRIGGERS.some(r => r.test(combined));
  if (forced) {
    const tokens = tokenize(combined);
    const scored = SPLATS
      .map(s => ({ splat: s, score: scoreEntry(s, tokens) }))
      .sort((a, b) => b.score - a.score);
    return { forced: true, splats: scored.slice(0, MAX_RESULTS).map(x => x.splat) };
  }

  const tokens = tokenize(combined);
  if (tokens.length === 0) return { forced: false, splats: [] };

  const scored = SPLATS
    .map(s => ({ splat: s, score: scoreEntry(s, tokens) }))
    .filter(x => x.score > THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS);

  return { forced: false, splats: scored.map(x => x.splat) };
}
