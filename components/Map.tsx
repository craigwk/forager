"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import Papa from "papaparse";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const markerIcon = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

type TreeLocation = {
    SourceFile: string;
    FileName: string;
    DateTimeOriginal: string;
    GPSLatitude: string;
    GPSLongitude: string;
};

export default function Map() {
    const [trees, setTrees] = useState<TreeLocation[]>([]);

    useEffect(() => {
        Papa.parse<TreeLocation>("/data/eldertrees.csv", {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                setTrees(results.data);
            },
        });
    }, []);

    return (
        <MapContainer
            center={[55.674, -4.067]}
            zoom={14}
            style={{ height: "600px", width: "100%" }}
        >
            <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {trees.map((tree) => {
                const lat = Number(tree.GPSLatitude);
                const lng = Number(tree.GPSLongitude);

                if (!lat || !lng) return null;

                return (
                    <Marker
                        key={tree.FileName}
                        position={[lat, lng]}
                        icon={markerIcon}
                        eventHandlers={{
                            click: (e) => {
                                e.target._map.setView([lat, lng], e.target._map.getZoom(), {
                                    animate: true,
                                });
                            },
                        }}
                    >
                        <Popup>
                            <div style={{ width: "220px" }}>
                                <img
                                    src={`/photos/${tree.FileName}`}
                                    alt={tree.FileName}
                                    style={{
                                        width: "100%",
                                        borderRadius: "8px",
                                        marginBottom: "8px",
                                    }}
                                />

                                <strong>{tree.FileName}</strong>
                                <br />
                                Taken: {tree.DateTimeOriginal}
                            </div>
                        </Popup>
                    </Marker>
                );
            })}
        </MapContainer>
    );
}