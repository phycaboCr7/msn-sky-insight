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

export const SPLATS: SplatEntry[] = [
  { id: 'a4826a74', title: 'Architecture Scene', embedUrl: 'https://superspl.at/s?id=a4826a74', sceneUrl: 'https://superspl.at/scene/a4826a74', tags: ['architecture', 'building', 'structure'], keywords: ['building', 'design', 'urban'], category: 'architecture' },
  { id: '6f697c4d', title: 'Nature Landscape', embedUrl: 'https://superspl.at/s?id=6f697c4d', sceneUrl: 'https://superspl.at/scene/6f697c4d', tags: ['nature', 'landscape', 'outdoor'], keywords: ['forest', 'tree', 'green'], category: 'nature' },
  { id: '2c64c162', title: 'Urban Scene', embedUrl: 'https://superspl.at/s?id=2c64c162', sceneUrl: 'https://superspl.at/scene/2c64c162', tags: ['city', 'urban', 'street'], keywords: ['city', 'road', 'downtown'], category: 'urban' },
  { id: 'aba8c704', title: 'Historical Monument', embedUrl: 'https://superspl.at/s?id=aba8c704', sceneUrl: 'https://superspl.at/scene/aba8c704', tags: ['history', 'monument', 'heritage'], keywords: ['ancient', 'temple', 'historic'], category: 'history' },
  { id: '11f85c13', title: 'Garden Scene', embedUrl: 'https://superspl.at/s?id=11f85c13', sceneUrl: 'https://superspl.at/scene/11f85c13', tags: ['garden', 'flowers', 'park'], keywords: ['botanical', 'plants', 'bloom'], category: 'nature' },
  { id: '5efedd95', title: 'Interior Design', embedUrl: 'https://superspl.at/s?id=5efedd95', sceneUrl: 'https://superspl.at/scene/5efedd95', tags: ['interior', 'design', 'room'], keywords: ['furniture', 'decor', 'home'], category: 'interior' },
  { id: 'a3eff32b', title: 'Sculpture Art', embedUrl: 'https://superspl.at/s?id=a3eff32b', sceneUrl: 'https://superspl.at/scene/a3eff32b', tags: ['art', 'sculpture', 'museum'], keywords: ['statue', 'carving', 'gallery'], category: 'art' },
  { id: 'b1605c14', title: 'Mountain View', embedUrl: 'https://superspl.at/s?id=b1605c14', sceneUrl: 'https://superspl.at/scene/b1605c14', tags: ['mountain', 'snow', 'peak'], keywords: ['alpine', 'summit', 'elevation'], category: 'nature' },
  { id: 'b6cfafaf', title: 'Coastal Scene', embedUrl: 'https://superspl.at/s?id=b6cfafaf', sceneUrl: 'https://superspl.at/scene/b6cfafaf', tags: ['coast', 'ocean', 'beach'], keywords: ['sea', 'wave', 'shore'], category: 'nature' },
  { id: '46d13a94', title: 'Science Lab', embedUrl: 'https://superspl.at/s?id=46d13a94', sceneUrl: 'https://superspl.at/scene/46d13a94', tags: ['science', 'lab', 'technology'], keywords: ['experiment', 'research', 'instrument'], category: 'science' },
];

export const SPLAT_MAP = new Map(SPLATS.map(s => [s.id, s]));
