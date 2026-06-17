"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import Papa from "papaparse";
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

type CsvLocation = {
    SourceFile: string;
    FileName: string;
    DateTimeOriginal: string;
    GPSLatitude: string;
    GPSLongitude: string;
};

type SavedLocation = {
    id: string;
    photoName: string;
    observedDate: string;
    latitude: number | null;
    longitude: number | null;
    species: string;
    stage: string;
    estimatedYield: string;
    access: string;
    notes: string;
    createdAt: string;
};

export default function Map() {
    const [csvLocations, setCsvLocations] = useState<CsvLocation[]>([]);
    const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);

    useEffect(() => {
        Papa.parse<CsvLocation>("/data/eldertrees.csv", {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                setCsvLocations(results.data);
            },
        });

        const stored = localStorage.getItem("foragerLocations");
        if (stored) {
            setSavedLocations(JSON.parse(stored));
        }
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

            {csvLocations.map((tree) => {
                const lat = Number(tree.GPSLatitude);
                const lng = Number(tree.GPSLongitude);

                if (!lat || !lng) return null;

                return (
                    <Marker key={tree.FileName} position={[lat, lng]} icon={markerIcon}>
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

            {savedLocations.map((location) => {
                if (!location.latitude || !location.longitude) return null;

                return (
                    <Marker
                        key={location.id}
                        position={[location.latitude, location.longitude]}
                        icon={markerIcon}
                    >
                        <Popup>
                            <div style={{ width: "220px" }}>
                                <strong>USER SAVED: {location.species}</strong>
                                <br />
                                Observed: {location.observedDate}
                                <br />
                                Stage: {location.stage}
                                <br />
                                Yield: {location.estimatedYield}
                                <br />
                                Access: {location.access}
                                {location.notes && (
                                    <>
                                        <br />
                                        Notes: {location.notes}
                                    </>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                );
            })}
        </MapContainer>
    );
}