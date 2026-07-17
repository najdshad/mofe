const tagColors = [
  ["bg-green-50", "border-green-300", "text-green-700"],
  ["bg-blue-50", "border-blue-300", "text-blue-700"],
  ["bg-amber-50", "border-amber-300", "text-amber-700"],
  ["bg-purple-50", "border-purple-300", "text-purple-700"],
  ["bg-rose-50", "border-rose-300", "text-rose-700"],
  ["bg-cyan-50", "border-cyan-300", "text-cyan-700"],
  ["bg-orange-50", "border-orange-300", "text-orange-700"],
  ["bg-teal-50", "border-teal-300", "text-teal-700"],
] as const;

const tagColorsActive = [
  ["bg-green-600", "border-green-600", "text-white"],
  ["bg-blue-600", "border-blue-600", "text-white"],
  ["bg-amber-600", "border-amber-600", "text-white"],
  ["bg-purple-600", "border-purple-600", "text-white"],
  ["bg-rose-600", "border-rose-600", "text-white"],
  ["bg-cyan-600", "border-cyan-600", "text-white"],
  ["bg-orange-600", "border-orange-600", "text-white"],
  ["bg-teal-600", "border-teal-600", "text-white"],
] as const;

type ColorTuple = readonly [string, string, string];

const colorCache = new Map<string, number>();

export function tagColor(tag: string): ColorTuple {
  if (!colorCache.has(tag)) {
    let h = 0;
    for (let i = 0; i < tag.length; i++) h = tag.charCodeAt(i) + ((h << 5) - h);
    colorCache.set(tag, (h & 0x7fffffff) % tagColors.length);
  }
  return tagColors[colorCache.get(tag)!];
}

export function tagColorActive(tag: string): ColorTuple {
  const idx = colorCache.get(tag) ?? (() => {
    let h = 0;
    for (let i = 0; i < tag.length; i++) h = tag.charCodeAt(i) + ((h << 5) - h);
    return (h & 0x7fffffff) % tagColors.length;
  })();
  return tagColorsActive[idx];
}
