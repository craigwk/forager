"use client";

import { useEffect, useState } from "react";
import Papa from "papaparse";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "../lib/supabase";
import ObservationModal from "./ObservationModal";
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    useMap,
    useMapEvents,
} from "react-leaflet";

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

type Observation = {
    source: "csv" | "user";
    savedLocationId?: string;
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

type SupabaseObservation = {
    id: string;
    species: string;
    observed_date: string | null;
    latitude: number | null;
    longitude: number | null;
    stage: string | null;
    estimated_yield: string | null;
    access: string | null;
    notes: string | null;
    photo_name: string | null;
};

function distanceInMetres(lat1: number, lon1: number, lat2: number, lon2: number) {
    const earthRadius = 6371000;
    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) ** 2;

    return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function addToGroups(
    groups: GroupedLocation[],
    latitude: number,
    longitude: number,
    species: string,
    observation: Observation
) {
    const existingGroup = groups.find(
        (group) =>
            group.species === species &&
            distanceInMetres(group.latitude, group.longitude, latitude, longitude) <= 10
    );

    if (existingGroup) {
        existingGroup.observations.push(observation);
        return;
    }

    groups.push({
        id: `${species}-${latitude}-${longitude}`,
        latitude,
        longitude,
        species,
        observations: [observation],
    });
}

function MapClickHandler({
    setNewPin,
}: {
    setNewPin: (pin: { lat: number; lng: number }) => void;
}) {
    useMapEvents({
        click(e) {
            setNewPin({ lat: e.latlng.lat, lng: e.latlng.lng });
        },
    });

    return null;
}

function CurrentLocationButton() {
    const map = useMap();

    function goToCurrentLocation() {
        navigator.geolocation.getCurrentPosition((position) => {
            map.flyTo([position.coords.latitude, position.coords.longitude], 17);
        });
    }

    return (
        <button
            type="button"
            onClick={goToCurrentLocation}
            style={{
                position: "absolute",
                right: "10px",
                bottom: "20px",
                zIndex: 1000,
                background: "white",
                border: "1px solid #ccc",
                borderRadius: "999px",
                padding: "10px 12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            }}
        >
            ◎
        </button>
    );
}

function ResizeMapOnMount() {
    const map = useMap();

    useEffect(() => {
        setTimeout(() => {
            map.invalidateSize();
        }, 250);
    }, [map]);

    return null;
}

export default function Map() {
    const [newPin, setNewPin] = useState<{ lat: number; lng: number } | null>(null);
    const [groupedLocations, setGroupedLocations] = useState<GroupedLocation[]>([]);
    const [speciesFilter, setSpeciesFilter] = useState("All");
    const [mapStyle, setMapStyle] = useState<"standard" | "satellite">("standard");
    const [observationTarget, setObservationTarget] = useState<{
        latitude: number;
        longitude: number;
        species: string;
    } | null>(null);

    async function loadMapData() {
        const response = await fetch("/data/eldertrees.csv");
        const csvText = await response.text();

        Papa.parse<CsvLocation>(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
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

                const { data: savedLocations, error } = await supabase
                    .from("observations")
                    .select("*");

                if (error) {
                    console.error("Error loading observations:", error);
                } else if (savedLocations) {
                    (savedLocations as SupabaseObservation[]).forEach((location) => {
                        if (!location.latitude || !location.longitude) return;

                        addToGroups(groups, location.latitude, location.longitude, location.species, {
                            source: "user",
                            savedLocationId: location.id,
                            photoName: location.photo_name ?? "",
                            observedDate: location.observed_date ?? "",
                            species: location.species,
                            stage: location.stage ?? undefined,
                            estimatedYield: location.estimated_yield ?? undefined,
                            access: location.access ?? undefined,
                            notes: location.notes ?? undefined,
                        });
                    });
                }

                setGroupedLocations(groups);
            },
        });
    }

    useEffect(() => {
        loadMapData();
    }, []);

    function handleDeleteObservation(id: string) {
        console.log("Delete later:", id);
        alert("Delete from Supabase still needs wiring back in.");
    }

    const availableSpecies = [
        "All",
        ...Array.from(new Set(groupedLocations.map((location) => location.species))),
    ];

    const filteredLocations = groupedLocations.filter(
        (location) => speciesFilter === "All" || location.species === speciesFilter
    );

    let tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    let attribution = "&copy; OpenStreetMap contributors";

    if (mapStyle === "satellite") {
        tileUrl =
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
        attribution = "Tiles &copy; Esri";
    }

    return (
        <div style={{ position: "relative", height: "100%", width: "100%" }}>
            <div
                style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    zIndex: 1000,
                    display: "flex",
                    gap: "6px",
                    background: "white",
                    color: "black",
                    padding: "8px",
                    borderRadius: "10px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                }}
            >
                <select
                    value={speciesFilter}
                    onChange={(e) => setSpeciesFilter(e.target.value)}
                >
                    {availableSpecies.map((species) => (
                        <option key={species}>{species}</option>
                    ))}
                </select>

                <button
                    type="button"
                    onClick={() =>
                        setMapStyle(mapStyle === "standard" ? "satellite" : "standard")
                    }
                >
                    {mapStyle === "standard" ? "Satellite" : "Map"}
                </button>
            </div>

            <MapContainer
                center={[55.674, -4.067]}
                zoom={14}
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer attribution={attribution} url={tileUrl} />

                <ResizeMapOnMount />
                <MapClickHandler setNewPin={setNewPin} />
                <CurrentLocationButton />

                {newPin && (
                    <Marker position={[newPin.lat, newPin.lng]} icon={markerIcon}>
                        <Popup>
                            <div style={{ width: "220px" }}>
                                <strong>New harvest location</strong>

                                <br />

                                <button
                                    type="button"
                                    onClick={() => {
                                        setObservationTarget({
                                            latitude: newPin.lat,
                                            longitude: newPin.lng,
                                            species: "Elder",
                                        });
                                    }}
                                    style={{
                                        marginTop: "8px",
                                        textDecoration: "underline",
                                    }}
                                >
                                    Add location here
                                </button>
                            </div>
                        </Popup>
                    </Marker>
                )}

                {filteredLocations.map((location) => {
                    const latestObservation = [...location.observations].reverse()[0];

                    return (
                        <Marker
                            key={location.id}
                            position={[location.latitude, location.longitude]}
                            icon={markerIcon}
                            eventHandlers={{
                                click: (e) => {
                                    e.target._map.setView(
                                        [location.latitude, location.longitude],
                                        e.target._map.getZoom(),
                                        { animate: true }
                                    );
                                },
                            }}
                        >
                            <Popup maxWidth={320}>
                                <div
                                    style={{
                                        width: "280px",
                                        maxHeight: "420px",
                                        overflowY: "auto",
                                    }}
                                >
                                    <strong>{location.species}</strong>
                                    <br />
                                    Observations: {location.observations.length}

                                    {latestObservation && (
                                        <>
                                            <hr style={{ margin: "8px 0" }} />
                                            <strong>Latest</strong>
                                            <br />
                                            Date: {latestObservation.observedDate}
                                            {latestObservation.stage && (
                                                <>
                                                    <br />
                                                    Stage: {latestObservation.stage}
                                                </>
                                            )}
                                            {latestObservation.estimatedYield && (
                                                <>
                                                    <br />
                                                    Yield: {latestObservation.estimatedYield}
                                                </>
                                            )}
                                            {latestObservation.access && (
                                                <>
                                                    <br />
                                                    Access: {latestObservation.access}
                                                </>
                                            )}
                                        </>
                                    )}

                                    <br />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setObservationTarget({
                                                latitude: location.latitude,
                                                longitude: location.longitude,
                                                species: location.species,
                                            })
                                        }
                                        style={{
                                            display: "inline-block",
                                            marginTop: "8px",
                                            marginBottom: "8px",
                                            textDecoration: "underline",
                                        }}
                                    >
                                        Add observation here
                                    </button>

                                    <hr style={{ margin: "8px 0" }} />
                                    <strong>History</strong>

                                    {location.observations.map((observation, index) => (
                                        <div key={`${observation.photoName}-${index}`}>
                                            <hr style={{ margin: "8px 0" }} />

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

                                            {observation.source === "user" && observation.savedLocationId && (
                                                <>
                                                    <br />
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleDeleteObservation(observation.savedLocationId!)
                                                        }
                                                        style={{
                                                            marginTop: "8px",
                                                            color: "red",
                                                            textDecoration: "underline",
                                                        }}
                                                    >
                                                        Delete observation
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>

            {observationTarget && (
                <ObservationModal
                    latitude={observationTarget.latitude}
                    longitude={observationTarget.longitude}
                    species={observationTarget.species}
                    onClose={() => setObservationTarget(null)}
                    onSaved={() => {
                        setObservationTarget(null);
                        loadMapData();
                    }}
                />
            )}
        </div>
    );
}