export const config = {
  rootDomain: process.env.ROOT_DOMAIN || "mofe.ir",
  appDomain: process.env.APP_DOMAIN || "app.mofe.ir",
  menuDomain: process.env.MENU_DOMAIN || "menu.mofe.ir",
};

export function getPublicMenuUrl(slug: string): string {
  if (/[\/\\]/.test(slug)) {
    throw new Error("Invalid slug");
  }
  return `https://${config.menuDomain}/m/${slug}`;
}
