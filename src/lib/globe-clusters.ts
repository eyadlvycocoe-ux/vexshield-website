import type { GlobePlayerPoint } from "@/components/analytics/PlayerGlobe.types";

export type PlayerMapCluster = {
  id: string;
  lat: number;
  lng: number;
  country: string;
  count: number;
  players: string[];
};

/** Group geolocated players by country for map / globe cluster markers. */
export function clusterPlayersByCountry(points: GlobePlayerPoint[]): PlayerMapCluster[] {
  const buckets = new Map<string, PlayerMapCluster>();

  for (const p of points) {
    const key = p.country || "Unknown";
    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
      existing.players.push(p.name);
      existing.lat += p.lat;
      existing.lng += p.lng;
    } else {
      buckets.set(key, {
        id: key,
        lat: p.lat,
        lng: p.lng,
        country: key,
        count: 1,
        players: [p.name],
      });
    }
  }

  return [...buckets.values()]
    .map((c) => ({
      ...c,
      lat: c.lat / c.count,
      lng: c.lng / c.count,
    }))
    .sort((a, b) => b.count - a.count);
}

export function clustersToGlobePoints(clusters: PlayerMapCluster[]): GlobePlayerPoint[] {
  return clusters.map((c) => ({
    lat: c.lat,
    lng: c.lng,
    name: c.count > 1 ? `${c.country} (${c.count})` : c.players[0] ?? c.country,
    country: c.country,
    color: "#38bdf8",
    size: Math.min(0.85, 0.35 + c.count * 0.08),
    count: c.count,
  }));
}
