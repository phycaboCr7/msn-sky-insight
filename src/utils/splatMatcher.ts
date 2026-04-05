import { SPLATS } from '@/data/splats';
import type { SplatEntry } from '@/data/splats';

const THRESHOLD = 0.12;
const MAX_RESULTS = 3;

const STOP_WORDS = new Set([
  'the','a','an','and','or','in','of','is','are','was','were','what',
  'how','why','can','you','me','my','i','show','give','tell','find',
  'get','look','please','want','see','display','some','any','this','that'
]);

const FORCE_TRIGGERS = [
  /show\s+(me\s+)?(a\s+)?gaussian\s+splat/i,
  /gaussian\s+splat/i,
  /show\s+(me\s+)?3d\s+(scene|model|splat|view)/i,
  /open\s+(the\s+)?splat/i,
  /show\s+(me\s+)?something\s+in\s+3d/i,
  /3d\s+viewer/i,
  /splat\s+viewer/i,
];

// Nature-related triggers — only show splats for nature topics
const NATURE_TRIGGERS = [
  /\b(nature|natural|forest|tree|flower|plant|garden|mountain|lake|river|ocean|sea|beach|waterfall|canyon|glacier|island|sunset|sunrise|landscape|outdoor|valley|cliff|rock|cave|desert|meadow|wildlife|insect|bee|butterfly|beetle|bird|animal|flora|fauna|botanical|park|cherry\s*blossom|sakura|lily|stump|coast|falls|camp)\b/i,
];

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
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

export function findMatchingSplats(userQuery: string, aiResponse: string = ''): MatchResult {
  const combined = `${userQuery} ${aiResponse}`;
  
  // Check if forced 3D trigger
  const forced = FORCE_TRIGGERS.some(r => r.test(combined));
  
  // Only show splats if nature-related or forced
  const isNatureRelated = NATURE_TRIGGERS.some(r => r.test(combined));
  if (!forced && !isNatureRelated) {
    return { forced: false, splats: [] };
  }

  const tokens = tokenize(combined);
  const scored = SPLATS
    .map(s => ({ splat: s, score: scoreEntry(s, tokens) }))
    .sort((a, b) => b.score - a.score);
  
  if (forced) return { forced: true, splats: scored.slice(0, MAX_RESULTS).map(x => x.splat) };
  
  const matches = scored.filter(x => x.score > THRESHOLD).slice(0, MAX_RESULTS);
  return { forced: false, splats: matches.map(x => x.splat) };
}
