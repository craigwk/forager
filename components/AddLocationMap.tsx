"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const markerIcon = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

type Props = {
    latitude: number | null;
    longitude: number | null;
    setLatitude: (value: number) => void;
    setLongitude: (value: number) => void;
};

function MapClickHandler({ setLatitude, setLongitude }: Props) {
    useMapEvents({
        click(e) {
            setLatitude(e.latlng.lat);
            setLongitude(e.latlng.lng);
        },
    });

    return null;
}

export default function AddLocationMap({
    latitude,
    longitude,
    setLatitude,
    setLongitude,
}: Props) {
    const position: [number, number] =
        latitude && longitude ? [latitude, longitude] : [55.674, -4.067];

    return (
        <MapContainer
            center={position}
            zoom={latitude && longitude ? 16 : 14}
            style={{ height: "300px", width: "100%", borderRadius: "8px" }}

        >
            <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapClickHandler
                latitude={latitude}
                longitude={longitude}
                setLatitude={setLatitude}
                setLongitude={setLongitude}
            />

            {latitude && longitude && (
                <Marker
                    position={[latitude, longitude]}
                    icon={markerIcon}
                    draggable
                    eventHandlers={{
                        dragend: (e) => {
                            const marker = e.target;
                            const position = marker.getLatLng();
                            setLatitude(position.lat);
                            setLongitude(position.lng);
                        },
                    }}
                />
            )}
        </MapContainer>
    );
}