export const config = {
  rootDomain: process.env.ROOT_DOMAIN || "mofe.ir",
};

export function getPublicMenuUrl(slug: string): string {
  if (/[\/\\]/.test(slug)) {
    throw new Error("Invalid slug");
  }
  return `https://${config.rootDomain}/m/${slug}`;
}