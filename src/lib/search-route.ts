/** Path to the Search page — always the global /search. */
export function getSearchPagePath(_serverId?: string, pathname?: string): string {
  if (pathname?.startsWith("/demo")) return "/demo/search";
  return "/search";
}
