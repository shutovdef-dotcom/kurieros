type BreadcrumbItem = {
  name: string;
  url: string;
};

export const buildBreadcrumbSchema = (
  items: BreadcrumbItem[],
  site: URL | string,
) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: new URL(item.url, site).toString(),
  })),
});
