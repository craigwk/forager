"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function Map() {
    return (
        <MapContainer
            center={[55.674, -4.067]}
            zoom={14}
            style={{ height: "600px", width: "100%" }}
        >
            <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <Marker position={[55.677922, -4.060106]}>
                <Popup>Cemetery Elder Tree</Popup>
            </Marker>
        </MapContainer>
    );
}