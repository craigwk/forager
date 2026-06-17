"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import Papa from "papaparse";
import "leaflet/dist/leaflet.css";

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
                    <Marker key={tree.FileName} position={[lat, lng]}>
                        <Popup>
                            <strong>{tree.FileName}</strong>
                            <br />
                            Taken: {tree.DateTimeOriginal}
                        </Popup>
                    </Marker>
                );
            })}
        </MapContainer>
    );
}