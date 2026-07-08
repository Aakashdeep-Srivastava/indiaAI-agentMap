"use client";

/* Cluster Insights map — similar businesses across India, rendered on
 * OpenStreetMap tiles (open data). District bubbles use real coordinates
 * geocoded via OSM Nominatim into our gazetteer. */

import { MapContainer, TileLayer, CircleMarker, Tooltip, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface DistrictBubble {
  district: string;
  state: string;
  count: number;
  lat: number;
  lng: number;
}

export interface StateBubble {
  state: string;
  count: number;
  lat: number;
  lng: number;
}

const youIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#E8680C;border:3px solid #fff;box-shadow:0 0 0 3px rgba(232,104,12,.35),0 2px 6px rgba(0,0,0,.3)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export default function ClusterMap({
  byDistrict,
  byState,
  yourLocation,
  yourDistrict,
}: {
  byDistrict: DistrictBubble[];
  byState: StateBubble[];
  yourLocation?: [number, number] | null;
  yourDistrict?: string | null;
}) {
  const useDistricts = byDistrict.length > 0;
  const max = Math.max(
    1,
    ...(useDistricts ? byDistrict.map((b) => b.count) : byState.map((b) => b.count)),
  );
  const radius = (count: number) => 6 + 22 * Math.sqrt(count / max);

  return (
    <MapContainer
      center={[22.5, 79.5]}
      zoom={4.4}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%", borderRadius: "1rem", zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {(useDistricts ? byDistrict : []).map((b) => (
        <CircleMarker
          key={`${b.district}-${b.state}`}
          center={[b.lat, b.lng]}
          radius={radius(b.count)}
          pathOptions={{
            color: "#1B4FCC",
            weight: 1.5,
            fillColor: "#1B4FCC",
            fillOpacity: 0.35,
          }}
        >
          <Tooltip direction="top" offset={[0, -4]}>
            <span style={{ fontWeight: 600 }}>{b.district}, {b.state}</span>
            <br />
            {b.count} similar business{b.count > 1 ? "es" : ""}
          </Tooltip>
        </CircleMarker>
      ))}
      {!useDistricts &&
        byState.map((b) => (
          <CircleMarker
            key={b.state}
            center={[b.lat, b.lng]}
            radius={radius(b.count)}
            pathOptions={{ color: "#1B4FCC", weight: 1.5, fillColor: "#1B4FCC", fillOpacity: 0.35 }}
          >
            <Tooltip direction="top" offset={[0, -4]}>
              <span style={{ fontWeight: 600 }}>{b.state}</span>
              <br />
              {b.count} similar businesses
            </Tooltip>
          </CircleMarker>
        ))}
      {yourLocation && (
        <Marker position={yourLocation} icon={youIcon}>
          <Popup>
            <b>Your business</b>
            {yourDistrict ? ` — ${yourDistrict}` : ""}
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
