"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";

interface MapActivity {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
  time?: string;
}

interface MapProps {
  activities: MapActivity[];
  destination: string;
  centerCoords?: { lat: number; lng: number } | null;
  isGeocoding?: boolean;
}

// ─── Tile layer configuration ────────────────────────────────────────────────
const TILE_LAYERS = {
  voyager: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: "&copy; <a href='https://carto.com/'>Carto</a> contributors",
    subdomains: "abcd",
    maxZoom: 19,
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; <a href='https://carto.com/'>Carto</a> contributors",
    subdomains: "abcd",
    maxZoom: 19,
  },
  osm: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
    // OSM only has a, b, c — NOT d. Using "abcd" causes grey tile 404s.
    subdomains: "abc",
    maxZoom: 19,
  },
} as const;

type LayerKey = keyof typeof TILE_LAYERS;

export default function Map({ activities, destination, centerCoords, isGeocoding }: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const outerContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const [mapLayer, setMapLayer] = React.useState<LayerKey>("osm");

  // ─── Map initialisation + tile-layer swap + marker rendering ──────────────
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    const initialLat = centerCoords?.lat ?? 20.5937;
    const initialLng = centerCoords?.lng ?? 78.9629;
    const zoomLevel = centerCoords ? 12 : 5;

    // Create map once
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: true,
      }).setView([initialLat, initialLng], zoomLevel);

      L.control.zoom({ position: "topright" }).addTo(mapRef.current);
      L.control.scale({ position: "bottomright", imperial: false }).addTo(mapRef.current);

      // ── ResizeObserver — call invalidateSize() whenever the outer map
      //    container changes size (e.g. after flex-layout reflow, sidebar collapse, or tab switches)
      if (typeof ResizeObserver !== "undefined" && outerContainerRef.current) {
        resizeObserverRef.current = new ResizeObserver(() => {
          mapRef.current?.invalidateSize();
        });
        resizeObserverRef.current.observe(outerContainerRef.current);
      }
    } else {
      // Pan to new center if it changed
      if (centerCoords) {
        mapRef.current.setView([centerCoords.lat, centerCoords.lng], zoomLevel, {
          animate: true,
        });
      }
    }

    // ── Fix a: swap tile layer whenever mapLayer state changes ──────────────
    if (mapRef.current) {
      if (tileLayerRef.current) {
        tileLayerRef.current.remove();
        tileLayerRef.current = null;
      }
      const cfg = TILE_LAYERS[mapLayer];
      tileLayerRef.current = L.tileLayer(cfg.url, {
        maxZoom: cfg.maxZoom,
        subdomains: cfg.subdomains,
        attribution: cfg.attribution,
      });

      // Add tileerror event listener to fall back on OpenStreetMap standard tiles
      tileLayerRef.current.on("tileerror", (errorEvent: any) => {
        const { x, y, z } = errorEvent.coords;
        // OpenStreetMap standard tile fallback URL
        const fallbackUrl = `https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`;
        if (errorEvent.tile && errorEvent.tile.src !== fallbackUrl) {
          console.warn(`[Map] Tile error on layer ${mapLayer}. Retrying with fallback: ${fallbackUrl}`);
          errorEvent.tile.src = fallbackUrl;
        }
      });

      tileLayerRef.current.addTo(mapRef.current);

      // Force tile refresh immediately after layer swap (fix b)
      mapRef.current.invalidateSize();
    }

    const mapInstance = mapRef.current!;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Clear old polyline
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }



    // Filter activities with valid coordinates
    const validActivities = activities.filter(
      (act) => typeof act.lat === "number" && typeof act.lng === "number"
    );

    if (validActivities.length > 0) {
      const latlngs: L.LatLngExpression[] = [];

      validActivities.forEach((act, index) => {
        const lat = act.lat!;
        const lng = act.lng!;
        latlngs.push([lat, lng]);

        // ── Fix e: divIcon contains ONLY the numbered circle. No floating label
        //    text that could bleed outside the icon boundary. The popup is bound
        //    via Leaflet's bindPopup so it anchors to the exact marker position.
        const numberIcon = L.divIcon({
          // Inline styles avoid any Tailwind purge/SSR mismatch
          html: `<div style="
            width:28px;height:28px;
            display:flex;align-items:center;justify-content:center;
            border-radius:50%;
            border:2.5px solid #fff;
            box-shadow:0 2px 8px rgba(0,0,0,0.35);
            background:linear-gradient(135deg,#0d9488,#4f46e5);
            color:#fff;
            font-weight:800;
            font-size:11px;
            font-family:system-ui,sans-serif;
            cursor:pointer;
            transition:transform .15s;
          ">${index + 1}</div>`,
          // className must be empty — any default leaflet-div-icon class adds
          // a white background box that shows behind the circle
          className: "",
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          popupAnchor: [0, -16],
        });

        // ── Fix e: bindPopup properly tied to its own marker lat/lng via Leaflet
        const popupContent = `
          <div style="font-family:system-ui,sans-serif;padding:4px 2px;min-width:120px">
            <strong style="display:block;font-size:12px;color:#1f2937;margin-bottom:4px">
              ${index + 1}. ${act.name}
            </strong>
            ${
              act.time
                ? `<span style="display:inline-block;padding:2px 6px;border-radius:4px;background:#ccfbf1;color:#134e4a;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em">${act.time}</span>`
                : ""
            }
            <div style="font-size:9px;color:#9ca3af;margin-top:4px">${lat.toFixed(5)}, ${lng.toFixed(5)}</div>
          </div>`;

        const marker = L.marker([lat, lng], { icon: numberIcon })
          .addTo(mapInstance)
          .bindPopup(popupContent, {
            closeButton: true,
            maxWidth: 220,
            className: "traveloop-popup",
          });

        markersRef.current.push(marker);
      });

      // Draw dashed polyline connecting stops in order
      if (latlngs.length > 1) {
        polylineRef.current = L.polyline(latlngs, {
          color: "rgba(58, 150, 135, 0.85)",
          weight: 4,
          dashArray: "6, 8",
          lineCap: "round",
          lineJoin: "round",
        }).addTo(mapInstance);
      }

      // Fit map to all markers
      const bounds = L.latLngBounds(latlngs);
      mapInstance.fitBounds(bounds, { padding: [50, 50], animate: true });
    }
  }, [activities, centerCoords, mapLayer]);

  // Global cleanup on unmount
  useEffect(() => {
    return () => {
      resizeObserverRef.current?.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div ref={outerContainerRef} className="relative w-full h-full min-h-[400px] md:min-h-full rounded-2xl overflow-hidden border border-gray-200 shadow-2xl">
      {/* Map canvas — absolute fill so Leaflet always has a measurable size */}
      <div ref={mapContainerRef} className="absolute inset-0 z-0 bg-[#F4F1E9]" />

      {/* Geocoding skeleton loader overlay */}
      {isGeocoding && (
        <div className="absolute inset-0 z-[500] bg-gray-50/90 backdrop-blur-sm animate-pulse flex flex-col items-center justify-center text-center p-6 select-none">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-teal-500/35 flex items-center justify-center animate-spin bg-teal-500/5">
              <MapPin className="w-5 h-5 text-teal-600 " />
            </div>
            <p className="text-sm font-extrabold text-slate-800 animate-bounce">Geocoding route stops...</p>
            <p className="text-xs text-slate-450 mt-0.5">Resolving activity stop coordinates</p>
          </div>
        </div>
      )}

      {/* No locations overlay placeholder */}
      {!isGeocoding && activities.filter(act => typeof act.lat === "number" && typeof act.lng === "number").length === 0 && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center bg-gray-50/90 backdrop-blur-sm p-6 text-center select-none">
          <div className="w-full max-w-sm py-8 px-6 rounded-2xl border-2 border-dashed border-teal-500/20 bg-white/40 flex flex-col items-center shadow-sm">
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-teal-500/30 flex items-center justify-center mb-3 bg-teal-500/5">
              <MapPin className="w-5 h-5 text-teal-600 " />
            </div>
            <p className="text-sm font-extrabold text-slate-800 ">No locations to display</p>
            <p className="text-[11px] text-slate-450 mt-1 max-w-[240px] leading-relaxed">
              Add stops with valid coordinates to view them on the route planner map.
            </p>
          </div>
        </div>
      )}

      {/* Destination badge — top-left */}
      <div className="absolute top-4 left-4 z-[400] pointer-events-none">
        <div className="px-4 py-2 rounded-xl bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg text-xs font-semibold text-gray-700">
          📍 Map Router:{" "}
          <span className="text-teal-700 font-bold">{destination}</span>
        </div>
      </div>

      {/* ── OpenStreetMap (OSM) Only Indicator ── */}
      <div className="absolute top-4 right-14 z-[400] flex items-center gap-1.5 bg-white/95 border border-teal-200 px-3 py-1.5 rounded-xl shadow-md">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] font-black text-slate-800">OpenStreetMap (OSM)</span>
      </div>

      {/* Popup styles — injected as a style tag so we stay SSR-safe */}
      <style>{`
        .traveloop-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.18);
          padding: 0;
        }
        .traveloop-popup .leaflet-popup-content {
          margin: 10px 12px;
        }
        .traveloop-popup .leaflet-popup-tip-container {
          margin-top: -1px;
        }
      `}</style>
    </div>
  );
}
