import versions from "./asset-versions.json";

/** The version follows the bytes, rather than a manual ?v=2 that can be missed. */
export function avatarAssetUrl(asset: string): string {
  const [path, query] = asset.split("?");
  const version = (versions as Record<string, string>)[path];
  if (!version) return asset;
  const params = new URLSearchParams(query);
  params.set("v", version);
  return `${path}?${params}`;
}
