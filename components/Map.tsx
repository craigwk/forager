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

type Observation = {
    source: "csv" | "user";
    photoName: string;
    observedDate: string;
    species: string;
    stage?: string;
    estimatedYield?: string;
    access?: string;
    notes?: string;
};

type GroupedLocation = {
    id: string;
    latitude: number;
    longitude: number;
    species: string;
    observations: Observation[];
};

function distanceInMetres(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
) {
    const earthRadius = 6371000;
    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function addToGroups(
    groups: GroupedLocation[],
    latitude: number,
    longitude: number,
    species: string,
    observation: Observation
) {
    const mergeDistanceMetres = 10;

    const existingGroup = groups.find(
        (group) =>
            group.species === species &&
            distanceInMetres(group.latitude, group.longitude, latitude, longitude) <=
            mergeDistanceMetres
    );

    if (existingGroup) {
        existingGroup.observations.push(observation);
        return;
    }

    groups.push({
        id: crypto.randomUUID(),
        latitude,
        longitude,
        species,
        observations: [observation],
    });
}

export default function Map() {
    const [groupedLocations, setGroupedLocations] = useState<GroupedLocation[]>(
        []
    );

    useEffect(() => {
        Papa.parse<CsvLocation>("/data/eldertrees.csv", {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const groups: GroupedLocation[] = [];

                results.data.forEach((tree) => {
                    const lat = Number(tree.GPSLatitude);
                    const lng = Number(tree.GPSLongitude);

                    if (!lat || !lng) return;

                    addToGroups(groups, lat, lng, "Elder", {
                        source: "csv",
                        photoName: tree.FileName,
                        observedDate: tree.DateTimeOriginal,
                        species: "Elder",
                    });
                });

                const stored = localStorage.getItem("foragerLocations");

                if (stored) {
                    const savedLocations: SavedLocation[] = JSON.parse(stored);

                    savedLocations.forEach((location) => {
                        if (!location.latitude || !location.longitude) return;

                        addToGroups(
                            groups,
                            location.latitude,
                            location.longitude,
                            location.species,
                            {
                                source: "user",
                                photoName: location.photoName,
                                observedDate: location.observedDate,
                                species: location.species,
                                stage: location.stage,
                                estimatedYield: location.estimatedYield,
                                access: location.access,
                                notes: location.notes,
                            }
                        );
                    });
                }

                setGroupedLocations(groups);
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

            {groupedLocations.map((location) => (
                <Marker
                    key={location.id}
                    position={[location.latitude, location.longitude]}
                    icon={markerIcon}
                >
                    <Popup maxWidth={320}>
                        <div style={{ width: "280px", maxHeight: "420px", overflowY: "auto" }}>
                            <strong>{location.species}</strong>
                            <br />
                            Observations: {location.observations.length}

                            <br />
                            <a
                                href={`/add?lat=${location.latitude}&lng=${location.longitude}&species=${encodeURIComponent(
                                    location.species
                                )}`}
                                style={{
                                    display: "inline-block",
                                    marginTop: "8px",
                                    marginBottom: "8px",
                                    textDecoration: "underline",
                                }}
                            >
                                Add observation here
                            </a>

                            <hr style={{ margin: "8px 0" }} />

                            {location.observations.map((observation, index) => (
                                <div key={`${observation.photoName}-${index}`}>
                                    {observation.photoName && (
                                        <img
                                            src={`/photos/${observation.photoName}`}
                                            alt={observation.photoName}
                                            style={{
                                                width: "100%",
                                                maxHeight: "140px",
                                                objectFit: "cover",
                                                borderRadius: "8px",
                                                marginBottom: "8px",
                                            }}
                                        />
                                    )}

                                    <strong>
                                        {observation.source === "user"
                                            ? "User observation"
                                            : "Imported photo"}
                                    </strong>
                                    <br />
                                    Date: {observation.observedDate}

                                    {observation.stage && (
                                        <>
                                            <br />
                                            Stage: {observation.stage}
                                        </>
                                    )}

                                    {observation.estimatedYield && (
                                        <>
                                            <br />
                                            Yield: {observation.estimatedYield}
                                        </>
                                    )}

                                    {observation.access && (
                                        <>
                                            <br />
                                            Access: {observation.access}
                                        </>
                                    )}

                                    {observation.notes && (
                                        <>
                                            <br />
                                            Notes: {observation.notes}
                                        </>
                                    )}

                                    {index < location.observations.length - 1 && (
                                        <hr style={{ margin: "8px 0" }} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}