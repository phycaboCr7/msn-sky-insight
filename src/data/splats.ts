export interface SplatEntry {
  id: string;
  title: string;
  embedUrl: string;
  sceneUrl: string;
  thumbnail?: string;
  tags: string[];
  keywords: string[];
  category: string;
}

const SUPER_SPLAT_EMBED_REGEX = /https?:\/\/superspl\.at\/embed\/([^/?#]+)/i;

const normalizeSuperSplatEmbedUrl = (url: string, id: string): string => {
  const match = url.match(SUPER_SPLAT_EMBED_REGEX);
  if (match) return `https://superspl.at/s?id=${match[1] || id}`;
  return url;
};

// Nature-focused splats only
export const SPLATS: SplatEntry[] = [
  { id: '7a475d38', title: 'Winter Garden Jastrzębia Góra Poland', embedUrl: 'https://superspl.at/embed/7a475d38', sceneUrl: 'https://superspl.at/scene/7a475d38', thumbnail: 'https://s3-eu-west-1.amazonaws.com/images.playcanvas.com/splat/7a475d38/v1/xl.webp', tags: ['garden','winter','poland','nature','outdoor','greenhouse'], keywords: ['greenhouse','botanical','snow','cold','europe'], category: 'nature' },
  { id: '6ba8df00', title: 'Ghost Cicada', embedUrl: 'https://superspl.at/embed/6ba8df00', sceneUrl: 'https://superspl.at/scene/6ba8df00', thumbnail: 'https://s3-eu-west-1.amazonaws.com/images.playcanvas.com/splat/6ba8df00/v1/xl.webp', tags: ['insect','biology','nature','macro','science','cicada'], keywords: ['ghost','transparent','entomology','arthropod','wings'], category: 'nature' },
  { id: '85dd3c91', title: 'Honeybee Macroscan High Quality', embedUrl: 'https://superspl.at/embed/85dd3c91', sceneUrl: 'https://superspl.at/scene/85dd3c91', thumbnail: 'https://s3-eu-west-1.amazonaws.com/images.playcanvas.com/splat/85dd3c91/v1/xl.webp', tags: ['insect','biology','bee','nature','science','macro','pollinator'], keywords: ['honeybee','apis','mellifera','scan','close-up'], category: 'nature' },
  { id: 'a4826a74', title: 'Huashan Mountain China', embedUrl: 'https://superspl.at/embed/a4826a74', sceneUrl: 'https://superspl.at/scene/a4826a74', thumbnail: 'https://s3-eu-west-1.amazonaws.com/images.playcanvas.com/splat/a4826a74/v2/xl.webp', tags: ['mountain','china','landscape','nature','outdoor','hiking'], keywords: ['huashan','peak','cliff','sacred','shaanxi'], category: 'nature' },
  { id: '6f697c4d', title: 'Botanical Garden Victoria House VR Ready', embedUrl: 'https://superspl.at/embed/6f697c4d', sceneUrl: 'https://superspl.at/scene/6f697c4d', thumbnail: 'https://s3-eu-west-1.amazonaws.com/images.playcanvas.com/splat/6f697c4d/v1/xl.webp', tags: ['garden','botanical','indoor','plants','nature','vr','greenhouse'], keywords: ['victoria','lily','tropical','glasshouse','kew'], category: 'nature' },
  { id: '169aee54', title: 'URBEX Greenhouse Abandoned', embedUrl: 'https://superspl.at/embed/169aee54', sceneUrl: 'https://superspl.at/scene/169aee54', thumbnail: 'https://s3-eu-west-1.amazonaws.com/images.playcanvas.com/splat/169aee54/v1/xl.webp', tags: ['urbex','abandoned','greenhouse','decay','nature','plants'], keywords: ['urban exploration','overgrown','ruins','glass','plants'], category: 'nature' },
  { id: 'e38961ae', title: 'Amphimallon Solstitiale Beetle', embedUrl: 'https://superspl.at/embed/e38961ae', sceneUrl: 'https://superspl.at/scene/e38961ae', thumbnail: 'https://s3-eu-west-1.amazonaws.com/images.playcanvas.com/splat/e38961ae/v1/xl.webp', tags: ['insect','beetle','biology','science','macro','nature'], keywords: ['amphimallon','solstitiale','summer chafer','scarab'], category: 'nature' },
  { id: 'd10c5638', title: 'Housefly Musca Domestica', embedUrl: 'https://superspl.at/embed/d10c5638', sceneUrl: 'https://superspl.at/scene/d10c5638', thumbnail: 'https://s3-eu-west-1.amazonaws.com/images.playcanvas.com/splat/d10c5638/v1/xl.webp', tags: ['insect','fly','biology','science','macro','nature'], keywords: ['musca','domestica','housefly','compound eye','wing'], category: 'nature' },
  { id: 'a3eff32b', title: 'Nevada Fire Valley', embedUrl: 'https://superspl.at/embed/a3eff32b', sceneUrl: 'https://superspl.at/scene/a3eff32b', thumbnail: 'https://s3-eu-west-1.amazonaws.com/images.playcanvas.com/splat/a3eff32b/v1/xl.webp', tags: ['desert','nature','landscape','valley','outdoor'], keywords: ['nevada','fire','valley','rock','canyon'], category: 'nature' },
  { id: 'b1605c14', title: 'Great Buddha', embedUrl: 'https://superspl.at/embed/b1605c14', sceneUrl: 'https://superspl.at/scene/b1605c14', thumbnail: 'https://s3-eu-west-1.amazonaws.com/images.playcanvas.com/splat/b1605c14/v1/xl.webp', tags: ['buddha','temple','nature','outdoor','spiritual'], keywords: ['great','buddha','statue','temple','japan'], category: 'nature' },
  { id: 'd2a15b01', title: 'The Greenhouse', embedUrl: 'https://superspl.at/embed/d2a15b01', sceneUrl: 'https://superspl.at/scene/d2a15b01', thumbnail: 'https://s3-eu-west-1.amazonaws.com/images.playcanvas.com/splat/d2a15b01/v1/xl.webp', tags: ['greenhouse','plants','nature','botanical','indoor'], keywords: ['greenhouse','glass','tropical','plants','green'], category: 'nature' },
  { id: 'ca700512', title: 'Cherry Blossom', embedUrl: 'https://superspl.at/embed/ca700512', sceneUrl: 'https://superspl.at/scene/ca700512', thumbnail: 'https://s3-eu-west-1.amazonaws.com/images.playcanvas.com/splat/ca700512/v1/xl.webp', tags: ['cherry','blossom','flower','spring','nature','sakura'], keywords: ['cherry','blossom','sakura','pink','spring'], category: 'nature' },
  { id: '23c50045', title: 'Orchan Rocks Calderdale', embedUrl: 'https://superspl.at/embed/23c50045', sceneUrl: 'https://superspl.at/scene/23c50045', thumbnail: 'https://s3-eu-west-1.amazonaws.com/images.playcanvas.com/splat/23c50045/v1/xl.webp', tags: ['rocks','nature','landscape','outdoor','geology'], keywords: ['orchan','rocks','calderdale','moor','peak'], category: 'nature' },
  { id: '806a0bbb', title: 'Shaver Lake Island', embedUrl: 'https://superspl.at/embed/806a0bbb', sceneUrl: 'https://superspl.at/scene/806a0bbb', thumbnail: 'https://s3-eu-west-1.amazonaws.com/images.playcanvas.com/splat/806a0bbb/v1/xl.webp', tags: ['lake','island','nature','water','outdoor'], keywords: ['shaver','lake','island','california','trees'], category: 'nature' },
  { id: 'bc83f7bc', title: 'Tree Camp', embedUrl: 'https://superspl.at/embed/bc83f7bc', sceneUrl: 'https://superspl.at/scene/bc83f7bc', thumbnail: 'https://s3-eu-west-1.amazonaws.com/images.playcanvas.com/splat/bc83f7bc/v1/xl.webp', tags: ['tree','camp','nature','forest','outdoor'], keywords: ['tree','camp','forest','woodland','green'], category: 'nature' },
  { id: '0978c0d6', title: 'Spider Lily', embedUrl: 'https://superspl.at/embed/0978c0d6', sceneUrl: 'https://superspl.at/scene/0978c0d6', thumbnail: 'https://s3-eu-west-1.amazonaws.com/images.playcanvas.com/splat/0978c0d6/v1/xl.webp', tags: ['flower','lily','nature','plant','macro'], keywords: ['spider','lily','red','bloom','garden'], category: 'nature' },
  { id: 'ae156134', title: 'SAKURA Shinjukugyoen 2026', embedUrl: 'https://superspl.at/embed/ae156134', sceneUrl: 'https://superspl.at/scene/ae156134', thumbnail: 'https://s3-eu-west-1.amazonaws.com/images.playcanvas.com/splat/ae156134/v1/xl.webp', tags: ['sakura','cherry','blossom','japan','nature','park'], keywords: ['shinjuku','gyoen','park','tokyo','spring'], category: 'nature' },
  { id: 'da3fe4a9', title: 'Aggitis Canyon Greece', embedUrl: 'https://superspl.at/embed/da3fe4a9', sceneUrl: 'https://superspl.at/scene/da3fe4a9', thumbnail: 'https://s3-eu-west-1.amazonaws.com/images.playcanvas.com/splat/da3fe4a9/v1/xl.webp', tags: ['canyon','nature','landscape','river','greece'], keywords: ['aggitis','canyon','gorge','water','cliff'], category: 'nature' },
  { id: 'd8bb6d24', title: 'Solheimajokull Glacier V2', embedUrl: 'https://superspl.at/embed/d8bb6d24', sceneUrl: 'https://superspl.at/scene/d8bb6d24', thumbnail: 'https://s3-eu-west-1.amazonaws.com/images.playcanvas.com/splat/d8bb6d24/v1/xl.webp', tags: ['glacier','ice','nature','iceland','landscape'], keywords: ['solheimajokull','glacier','ice','arctic','frozen'], category: 'nature' },
  { id: 'fa9d2513', title: 'Silver Falls', embedUrl: 'https://superspl.at/embed/fa9d2513', sceneUrl: 'https://superspl.at/scene/fa9d2513', thumbnail: 'https://s3-eu-west-1.amazonaws.com/images.playcanvas.com/splat/fa9d2513/v1/xl.webp', tags: ['waterfall','nature','forest','water','outdoor'], keywords: ['silver','falls','waterfall','cascade','stream'], category: 'nature' },
  { id: '6a7ec1dc', title: 'Coast Stump', embedUrl: 'https://superspl.at/embed/6a7ec1dc', sceneUrl: 'https://superspl.at/scene/6a7ec1dc', thumbnail: 'https://s3-eu-west-1.amazonaws.com/images.playcanvas.com/splat/6a7ec1dc/v1/xl.webp', tags: ['coast','beach','nature','ocean','driftwood'], keywords: ['coast','stump','beach','shore','sea'], category: 'nature' },
  { id: '6150b18c', title: 'Udaipur Sunset', embedUrl: 'https://superspl.at/embed/6150b18c', sceneUrl: 'https://superspl.at/scene/6150b18c', thumbnail: 'https://s3-eu-west-1.amazonaws.com/images.playcanvas.com/splat/6150b18c/v1/xl.webp', tags: ['sunset','nature','india','landscape','city'], keywords: ['udaipur','sunset','lake','rajasthan','golden'], category: 'nature' },
  { id: 'df38a05c', title: 'Crego Park Lansing', embedUrl: 'https://superspl.at/embed/df38a05c', sceneUrl: 'https://superspl.at/scene/df38a05c', thumbnail: 'https://s3-eu-west-1.amazonaws.com/images.playcanvas.com/splat/df38a05c/v1/xl.webp', tags: ['park','nature','trees','outdoor','green'], keywords: ['crego','park','lansing','michigan','garden'], category: 'nature' },
  { id: '6e7334bc', title: 'Quarantine Bay - 6 Caves', embedUrl: 'https://superspl.at/embed/6e7334bc', sceneUrl: 'https://superspl.at/scene/6e7334bc', thumbnail: 'https://s3-eu-west-1.amazonaws.com/images.playcanvas.com/splat/6e7334bc/v1/xl.webp', tags: ['cave','bay','nature','coastal','ocean'], keywords: ['quarantine','bay','caves','rock','sea'], category: 'nature' },
].map((splat) => ({
  ...splat,
  embedUrl: normalizeSuperSplatEmbedUrl(splat.embedUrl, splat.id),
}));

export const SPLAT_MAP = new Map(SPLATS.map(s => [s.id, s]));
