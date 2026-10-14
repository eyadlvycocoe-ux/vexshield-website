import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import Map, { Source, Layer, Marker, MapRef } from "@vis.gl/react-maplibre";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Feature, Polygon } from "geojson";
import type { GlobePlayerPoint } from "@/components/analytics/PlayerGlobe.types";

export type { GlobePlayerPoint } from "@/components/analytics/PlayerGlobe.types";

export type PlayerGlobeHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
};

type PlayerGlobeProps = {
  points?: GlobePlayerPoint[];
  selectedPoint?: GlobePlayerPoint | null;
  className?: string;
};

const DARK_MAP_STYLE = {
  version: 8 as const,
  projection: {
    type: "globe" as const,
  },
  sources: {
    carto_dark_base: {
      type: "raster" as const,
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png",
        "https://d.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png"
      ],
      tileSize: 256,
      attribution: ""
    },
    carto_dark_labels: {
      type: "raster" as const,
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png",
        "https://d.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png"
      ],
      tileSize: 256,
      attribution: ""
    }
  },
  layers: [
    {
      id: "background",
      type: "background" as const,
      paint: { "background-color": "#12131A" }
    },
    {
      id: "carto-dark-base-layer",
      type: "raster" as const,
      source: "carto_dark_base",
      minzoom: 0,
      maxzoom: 19
    },
    {
      id: "carto-dark-labels-layer",
      type: "raster" as const,
      source: "carto_dark_labels",
      minzoom: 0,
      maxzoom: 19,
      paint: {
        "raster-opacity": 1.0
      }
    }
  ]
};

/**
 * 1. Calculate Geographic Circle Polygon (Spherical Trigonometry)
 */
export function circlePolygon(
  lng: number,
  lat: number,
  radiusM: number,
  steps = 72
): Feature<Polygon> {
  const coords: [number, number][] = [];
  const earth = 6371008.8;
  const latR = (lat * Math.PI) / 180;
  const lngR = (lng * Math.PI) / 180;
  const d = Math.max(1, radiusM) / earth;

  for (let i = 0; i <= steps; i++) {
    const brng = (2 * Math.PI * i) / steps;
    const lat2 = Math.asin(
      Math.sin(latR) * Math.cos(d) + Math.cos(latR) * Math.sin(d) * Math.cos(brng)
    );
    const lng2 =
      lngR +
      Math.atan2(
        Math.sin(brng) * Math.sin(d) * Math.cos(latR),
        Math.cos(d) - Math.sin(latR) * Math.sin(lat2)
      );

    const lngDeg = ((((lng2 * 180) / Math.PI) + 540) % 360) - 180;
    const latDeg = (lat2 * 180) / Math.PI;

    coords.push([lngDeg, latDeg]);
  }

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [coords],
    },
  };
}

/**
 * 2. Setup Globe Projection & Dark Atmosphere (#12131A)
 */
export const enableGlobe = (map: any) => {
  if (!map) return;
  try {
    if (typeof map.setProjection === "function") {
      map.setProjection({ type: "globe" });
    }
  } catch {
    /* ignore */
  }

  try {
    if (typeof map.setSky === "function") {
      map.setSky({
        "sky-color": "#12131A",
        "sky-horizon-blend": 0,
        "horizon-color": "#12131A",
        "horizon-fog-blend": 0,
        "fog-color": "#12131A",
        "fog-ground-blend": 0,
        "atmosphere-blend": 0,
      });
    }
  } catch {
    /* ignore */
  }
};

export const PlayerGlobe = forwardRef<PlayerGlobeHandle, PlayerGlobeProps>(
  ({ points = [], selectedPoint, className }, ref) => {
    const mapRef = useRef<MapRef | null>(null);

    const circleCenter = useMemo(() => {
      if (selectedPoint) {
        return { lng: selectedPoint.lng, lat: selectedPoint.lat };
      }
      if (points.length > 0) {
        return { lng: points[0].lng, lat: points[0].lat };
      }
      return { lng: 46.6753, lat: 24.7136 };
    }, [selectedPoint, points]);

    const circleData = useMemo(() => {
      return circlePolygon(circleCenter.lng, circleCenter.lat, 500000);
    }, [circleCenter]);

    useImperativeHandle(ref, () => ({
      zoomIn: () => {
        mapRef.current?.zoomIn();
      },
      zoomOut: () => {
        mapRef.current?.zoomOut();
      },
      resetView: () => {
        mapRef.current?.flyTo({
          center: [25, 15],
          zoom: 1.6,
          duration: 1200,
        });
      },
    }));

    useEffect(() => {
      if (selectedPoint && mapRef.current) {
        mapRef.current.flyTo({
          center: [selectedPoint.lng, selectedPoint.lat],
          zoom: 4,
          duration: 1500,
        });
      }
    }, [selectedPoint]);

    const handleMapLoad = useCallback((event: { target: any }) => {
      enableGlobe(event.target);
      if (event.target?.resize) {
        event.target.resize();
      }
    }, []);

    return (
      <div className={className ?? "relative h-full w-full min-h-[320px] overflow-hidden bg-[#12131A]"}>
        <style>{`
          .maplibregl-ctrl-attrib, .maplibregl-ctrl-bottom-right {
            display: none !important;
          }
        `}</style>
        <Map
          ref={mapRef}
          mapLib={maplibregl as any}
          projection="globe"
          attributionControl={false}
          initialViewState={{
            longitude: circleCenter.lng,
            latitude: circleCenter.lat,
            zoom: 1.6,
            pitch: 0,
            bearing: 0,
          }}
          mapStyle={DARK_MAP_STYLE as any}
          onLoad={handleMapLoad}
          style={{ width: "100%", height: "100%" }}
        >
          {/* Render Yellow Circle (#FFF112) with Source & Layer */}
          <Source id="place-area" type="geojson" data={circleData}>
            <Layer
              id="place-area-fill"
              type="fill"
              paint={{
                "fill-color": "#FFF112",
                "fill-opacity": 0.22,
              }}
            />
            <Layer
              id="place-area-outline"
              type="line"
              paint={{
                "line-color": "#FFF112",
                "line-width": 2.75,
              }}
            />
          </Source>

          {/* Render Player Markers */}
          {points.map((p, idx) => {
            const isSel = selectedPoint && selectedPoint.lat === p.lat && selectedPoint.lng === p.lng;
            return (
              <Marker key={idx} longitude={p.lng} latitude={p.lat} anchor="bottom">
                <div className="group relative flex flex-col items-center cursor-pointer">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow-lg transition-transform ${isSel ? "scale-125 bg-amber-400 shadow-amber-400/50" : "bg-sky-500 shadow-sky-500/50"
                      }`}
                  >
                    <span className="text-[11px] font-bold text-white">📍</span>
                  </div>
                  <div className="mt-1 rounded-md border border-white/10 bg-zinc-950/90 px-2 py-0.5 text-[11px] font-bold text-white shadow-xl backdrop-blur-md whitespace-nowrap">
                    {p.name} <span className="text-[10px] text-zinc-400">({p.country || "Live"})</span>
                  </div>
                </div>
              </Marker>
            );
          })}
        </Map>

        {selectedPoint && (
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-xl border border-yellow-500/40 bg-black/90 px-3.5 py-2 text-white backdrop-blur-md shadow-xl">
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400 animate-ping" />
            <div className="text-xs font-bold">
              📍 Focused Target: <span className="text-yellow-400">{selectedPoint.name}</span> ({selectedPoint.country || "Live"})
            </div>
          </div>
        )}
      </div>
    );
  }
);

PlayerGlobe.displayName = "PlayerGlobe";
