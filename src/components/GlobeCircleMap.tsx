import React, { useCallback, useMemo, useState } from 'react';
import Map, { Source, Layer } from '@vis.gl/react-maplibre';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Feature, Polygon } from 'geojson';

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
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
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
    if (typeof map.setProjection === 'function') {
      map.setProjection({ type: 'globe' });
    }
  } catch {
    /* ignore */
  }

  try {
    if (typeof map.setSky === 'function') {
      map.setSky({
        'sky-color': '#12131A',
        'sky-horizon-blend': 0,
        'horizon-color': '#12131A',
        'horizon-fog-blend': 0,
        'fog-color': '#12131A',
        'fog-ground-blend': 0,
        'atmosphere-blend': 0,
      });
    }
  } catch {
    /* ignore */
  }
};

interface GlobeCircleMapProps {
  initialLng?: number;
  initialLat?: number;
  initialRadius?: number;
  className?: string;
}

export const GlobeCircleMap: React.FC<GlobeCircleMapProps> = ({
  initialLng = 46.6753,
  initialLat = 24.7136,
  initialRadius = 500000,
  className = 'w-full h-[600px] relative rounded-xl overflow-hidden shadow-2xl border border-zinc-800',
}) => {
  const [lng, setLng] = useState<number>(initialLng);
  const [lat, setLat] = useState<number>(initialLat);
  const [radius, setRadius] = useState<number>(initialRadius);

  const circleData = useMemo(() => {
    return circlePolygon(lng, lat, radius);
  }, [lng, lat, radius]);

  const handleMapLoad = useCallback((event: { target: any }) => {
    enableGlobe(event.target);
    if (event.target?.resize) {
      event.target.resize();
    }
  }, []);

  return (
    <div className={className}>
      <Map
        mapLib={maplibregl as any}
        projection="globe"
        initialViewState={{
          longitude: lng,
          latitude: lat,
          zoom: 1.5,
          pitch: 25,
          bearing: 0,
        }}
        mapStyle={DARK_MAP_STYLE as any}
        onLoad={handleMapLoad}
        style={{ width: '100%', height: '100%' }}
      >
        <Source id="place-area" type="geojson" data={circleData}>
          <Layer
            id="place-area-fill"
            type="fill"
            paint={{
              'fill-color': '#FFF112',
              'fill-opacity': 0.22,
            }}
          />
          <Layer
            id="place-area-outline"
            type="line"
            paint={{
              'line-color': '#FFF112',
              'line-width': 2.75,
            }}
          />
        </Source>
      </Map>

      <div className="absolute top-4 left-4 bg-zinc-950/90 text-white p-4 rounded-xl backdrop-blur-md border border-zinc-800 shadow-xl space-y-3 z-10 w-72 text-left">
        <h3 className="font-bold text-sm text-yellow-400 border-b border-zinc-800 pb-2">
          Circle Area Settings
        </h3>

        <div>
          <label className="text-xs text-zinc-400 block mb-1">Longitude: {lng.toFixed(4)}</label>
          <input
            type="range"
            min="-180"
            max="180"
            step="0.1"
            value={lng}
            onChange={(e) => setLng(parseFloat(e.target.value))}
            className="w-full accent-yellow-400"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-400 block mb-1">Latitude: {lat.toFixed(4)}</label>
          <input
            type="range"
            min="-85"
            max="85"
            step="0.1"
            value={lat}
            onChange={(e) => setLat(parseFloat(e.target.value))}
            className="w-full accent-yellow-400"
          />
        </div>

        <div>
          <label className="text-xs text-zinc-400 block mb-1">Radius: {(radius / 1000).toFixed(0)} km</label>
          <input
            type="range"
            min="1000"
            max="5000000"
            step="5000"
            value={radius}
            onChange={(e) => setRadius(parseFloat(e.target.value))}
            className="w-full accent-yellow-400"
          />
        </div>
      </div>
    </div>
  );
};

export default GlobeCircleMap;
