export const config = {
  rootDomain: process.env.ROOT_DOMAIN || "mofe.ir",
  appDomain: process.env.APP_DOMAIN || "app.mofe.ir",
  menuDomain: process.env.MENU_DOMAIN || "menu.mofe.ir",
};

export function getPublicMenuUrl(slug: string): string {
  return `https://${config.menuDomain}/m/${slug}`;
}
