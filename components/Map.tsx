"use client";

import { MutableRefObject, useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import L from "leaflet";
import { supabase } from "../lib/supabase";
import ObservationModal from "./ObservationModal";
import { SPECIES } from "../data/species";
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    useMap,
    useMapEvents,
    CircleMarker,
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
    createdBy?: string;
    photoName: string;
    photoUrl?: string;
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

type SpotGroup = {
    id: string;
    latitude: number;
    longitude: number;
    locations: GroupedLocation[];
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
    photo_url: string | null;
    created_by: string | null;
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
    clearToast,
    ignoreNextMapClick,
}: {
    setNewPin: (pin: { lat: number; lng: number }) => void;
    clearToast: () => void;
    ignoreNextMapClick: MutableRefObject<boolean>
}) {
    useMapEvents({
        click(e) {
            if (ignoreNextMapClick.current) {
                ignoreNextMapClick.current = false;
                return;
            }

            clearToast();
            setNewPin({ lat: e.latlng.lat, lng: e.latlng.lng });
        },
    });

    return null;
}

function CurrentLocationButton({
    setUserLocation,
    ignoreNextMapClick,
}: {
    setUserLocation: (location: { lat: number; lng: number }) => void;
    ignoreNextMapClick: MutableRefObject<boolean>
}) {
    const map = useMap();

    function goToCurrentLocation() {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };

                setUserLocation(location);
                map.flyTo([location.lat, location.lng], 17);
            },
            (error) => {
                console.error("Location error:", error);
                alert("Could not get your current location.");
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    }

    return (
        <button
            type="button"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                ignoreNextMapClick.current = true;
                goToCurrentLocation();
            }}

            style={{
                position: "absolute",
                pointerEvents: "auto",
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

function getSpeciesEmoji(species: string) {
    return (
        SPECIES.find((item) => item.name.toLowerCase() === species.toLowerCase())
            ?.emoji ?? "📍"
    );
}

function getSpeciesIcon(species: string) {
    return L.divIcon({
        html: `
            <div style="
                font-size: 28px;
                text-align:center;
            ">
                ${getSpeciesEmoji(species)}
            </div>
        `,
        className: "",
        iconSize: [30, 30],
        iconAnchor: [15, 30],
    });
}

function getSpotIcon(locations: GroupedLocation[]) {
    const primaryLocation = [...locations].sort(
        (a, b) => b.observations.length - a.observations.length
    )[0];

    const extraCount = locations.length - 1;

    return L.divIcon({
        html: `
            <div style="
                position: relative;
                font-size: 28px;
                text-align: center;
                width: 38px;
                height: 38px;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                ${getSpeciesEmoji(primaryLocation.species)}
                ${extraCount > 0
                ? `<span style="
                            position: absolute;
                            right: -6px;
                            top: -6px;
                            background: var(--forest);
                            color: white;
                            border-radius: 999px;
                            font-size: 12px;
                            font-weight: 800;
                            padding: 2px 5px;
                            border: 2px solid white;
                        ">+${extraCount}</span>`
                : ""
            }
            </div>
        `,
        className: "",
        iconSize: [38, 38],
        iconAnchor: [19, 38],
    });
}

function groupLocationsIntoSpots(locations: GroupedLocation[]) {
    const spots: SpotGroup[] = [];

    locations.forEach((location) => {
        const existingSpot = spots.find(
            (spot) =>
                distanceInMetres(
                    spot.latitude,
                    spot.longitude,
                    location.latitude,
                    location.longitude
                ) <= 10
        );

        if (existingSpot) {
            existingSpot.locations.push(location);
            return;
        }

        spots.push({
            id: `${location.latitude}-${location.longitude}`,
            latitude: location.latitude,
            longitude: location.longitude,
            locations: [location],
        });
    });

    return spots;
}

type MapProps = {
    addRequest?: number;
};

export default function Map({ addRequest = 0 }: MapProps) {
    const [newPin, setNewPin] = useState<{ lat: number; lng: number } | null>(null);
    const [groupedLocations, setGroupedLocations] = useState<GroupedLocation[]>([]);
    const [speciesFilter, setSpeciesFilter] = useState("All");
    const [viewMode, setViewMode] = useState<"all" | "mine">("all");
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [mapStyle, setMapStyle] = useState<"standard" | "satellite">("standard");
    const [toastMessage, setToastMessage] = useState("");
    const [showAddChoice, setShowAddChoice] = useState(false);
    const [selectedLocation, setSelectedLocation] =
        useState<GroupedLocation | null>(null);
    const [selectedSpot, setSelectedSpot] = useState<SpotGroup | null>(null);
    const [previousSpot, setPreviousSpot] = useState<SpotGroup | null>(null);
    const lastHandledAddRequest = useRef(0);
    const ignoreNextMapClick = useRef(false);
    const mapRef = useRef<L.Map | null>(null);

    const [observationTarget, setObservationTarget] = useState<{
        latitude: number;
        longitude: number;
        species: string;
    } | null>(null);

    function showToast(message: string) {
        setToastMessage(message);

        setTimeout(() => {
            setToastMessage("");
        }, 3500);
    }

    async function loadMapData() {
        const response = await fetch("/data/eldertrees.csv");
        const csvText = await response.text();

        Papa.parse<CsvLocation>(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const groups: GroupedLocation[] = [];

                if (viewMode === "all") {
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
                }

                const {
                    data: { user },
                } = await supabase.auth.getUser();

                let query = supabase.from("observations").select("*");

                if (viewMode === "mine") {
                    if (!user) {
                        setGroupedLocations([]);
                        return;
                    }

                    query = query.eq("created_by", user.id);
                }

                const { data: savedLocations, error } = await query;

                if (error) {
                    console.error("Error loading observations:", error);
                } else if (savedLocations) {
                    (savedLocations as SupabaseObservation[]).forEach((location) => {
                        if (!location.latitude || !location.longitude) return;

                        addToGroups(
                            groups,
                            location.latitude,
                            location.longitude,
                            location.species,
                            {
                                source: "user",
                                savedLocationId: location.id,
                                createdBy: location.created_by ?? undefined,
                                photoName: location.photo_name ?? "",
                                photoUrl: location.photo_url ?? "",
                                observedDate: location.observed_date ?? "",
                                species: location.species,
                                stage: location.stage ?? undefined,
                                estimatedYield: location.estimated_yield ?? undefined,
                                access: location.access ?? undefined,
                                notes: location.notes ?? undefined,
                            }
                        );
                    });
                }

                setGroupedLocations(groups);
            },
        });
    }

    useEffect(() => {
        loadMapData();
    }, [viewMode]);

    useEffect(() => {
        if (addRequest === 0) return;
        if (addRequest === lastHandledAddRequest.current) return;

        lastHandledAddRequest.current = addRequest;
        setShowAddChoice(true);
    }, [addRequest]);

    async function handleDeleteObservation(id: string) {
        const confirmed = confirm("Delete this observation?");

        if (!confirmed) return;

        console.log("Deleting observation:", id);

        const { data, error } = await supabase
            .from("observations")
            .delete()
            .eq("id", id)
            .select();

        console.log("Delete result:", { data, error });

        if (error) {
            console.error("Delete error:", error);
            alert("Could not delete observation.");
            return;
        }

        if (!data || data.length === 0) {
            alert("Nothing was deleted. This may be a permissions/RLS issue.");
            return;
        }

        await loadMapData();
    }

    const availableSpecies = [
        "All",
        ...Array.from(new Set(groupedLocations.map((location) => location.species))),
    ];

    const filteredLocations = groupedLocations.filter(
        (location) => speciesFilter === "All" || location.species === speciesFilter
    );

    const spotGroups = groupLocationsIntoSpots(filteredLocations);

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
                    top: "12px",
                    right: "12px",
                    zIndex: 1000,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "rgba(247, 244, 237, 0.95)",
                    color: "var(--bark)",
                    padding: "6px",
                    borderRadius: "999px",
                    boxShadow: "0 4px 14px rgba(47, 93, 80, 0.2)",
                    backdropFilter: "blur(8px)",
                }}
            >
                <select
                    value={speciesFilter}
                    onChange={(e) => setSpeciesFilter(e.target.value)}
                    style={{
                        border: "1px solid var(--sage)",
                        borderRadius: "999px",
                        padding: "5px 28px 5px 10px",
                        background: "var(--cream)",
                        color: "var(--bark)",
                        fontWeight: 600,
                        fontSize: "13px",
                        height: "34px",
                    }}
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
                    style={{
                        borderRadius: "999px",
                        background: "var(--forest)",
                        color: "white",
                        border: "1px solid var(--forest)",
                        padding: "5px 10px",
                        fontWeight: 600,
                        fontSize: "13px",
                        height: "34px",
                        lineHeight: "1",
                    }}
                >
                    {mapStyle === "standard" ? "Satellite" : "Map"}
                </button>

                <button
                    type="button"
                    onClick={async () => {
                        const {
                            data: { user },
                        } = await supabase.auth.getUser();

                        if (!user && viewMode === "all") {
                            showToast("Sign in to view your observations.");
                            return;
                        }

                        setViewMode(viewMode === "all" ? "mine" : "all");
                    }}
                    style={{
                        borderRadius: "999px",
                        background: viewMode === "mine" ? "var(--forest)" : "var(--cream)",
                        color: viewMode === "mine" ? "white" : "var(--bark)",
                        border: "1px solid var(--sage)",
                        padding: "5px 10px",
                        fontWeight: 600,
                        fontSize: "13px",
                        height: "34px",
                        lineHeight: "1",
                    }}
                >
                    {viewMode === "all" ? "All" : "Mine"}
                </button>
            </div>

            <MapContainer
                center={[55.674, -4.067]}
                zoom={14}
                style={{ height: "100%", width: "100%" }}
                ref={mapRef}
            >
                <TileLayer attribution={attribution} url={tileUrl} />

                <ResizeMapOnMount />

                <MapClickHandler
                    setNewPin={setNewPin}
                    clearToast={() => setToastMessage("")}
                    ignoreNextMapClick={ignoreNextMapClick}
                />

                <CurrentLocationButton
                    setUserLocation={setUserLocation}
                    ignoreNextMapClick={ignoreNextMapClick}
                />

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



                {userLocation && (
                    <CircleMarker
                        center={[userLocation.lat, userLocation.lng]}
                        radius={8}
                        pathOptions={{
                            color: "#2563eb",
                            fillColor: "#3b82f6",
                            fillOpacity: 0.9,
                            weight: 3,
                        }}
                    >
                        <Popup>Your current location</Popup>
                    </CircleMarker>
                )}

                {spotGroups.map((spot) => (
                    <Marker
                        key={spot.id}
                        position={[spot.latitude, spot.longitude]}
                        icon={getSpotIcon(spot.locations)}
                        eventHandlers={{
                            click: () => {
                                if (spot.locations.length === 1) {
                                    setSelectedLocation(spot.locations[0]);
                                    setSelectedSpot(null);
                                    return;
                                }

                                setSelectedSpot(spot);
                                setSelectedLocation(null);
                            },
                        }}
                    />
                ))}
            </MapContainer>

            {showAddChoice && (
                <div
                    style={{
                        position: "absolute",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "min(500px, calc(100% - 24px))",
                        bottom: "12px",
                        zIndex: 1600,
                        background: "rgba(247, 244, 237, 0.92)",
                        backdropFilter: "blur(12px)",
                        animation: "slideUpSheet 180ms ease-out",
                        borderRadius: "24px",
                        padding: "14px",
                        boxShadow: "0 -4px 20px rgba(0,0,0,0.2)",
                    }}
                >
                    <button
                        type="button"
                        onClick={() => setShowAddChoice(false)}
                        style={{
                            position: "absolute",
                            right: "16px",
                            top: "12px",
                            fontSize: "24px",
                            background: "none",
                            border: "none",
                        }}
                    >
                        ×
                    </button>

                    <h2
                        style={{
                            fontSize: "18px",
                            fontWeight: 800,
                            color: "var(--forest)",
                            marginBottom: "8px",
                        }}
                    >
                        Add observation
                    </h2>

                    <p style={{ marginBottom: "12px", fontSize: "14px" }}>
                        Choose how to set the observation location.
                    </p>

                    <button
                        type="button"
                        onClick={() => {
                            setShowAddChoice(false);

                            setObservationTarget({
                                latitude: userLocation?.lat ?? newPin?.lat ?? 55.674,
                                longitude: userLocation?.lng ?? newPin?.lng ?? -4.067,
                                species: "Elder",
                            });

                            showToast("📸 Add a photo. If it contains GPS, Forager will use the photo location.");
                        }}
                        style={{
                            width: "100%",
                            marginBottom: "8px",
                            padding: "12px",
                            borderRadius: "14px",
                            background: "rgba(255,255,255,0.85)",
                            border: "1px solid var(--sage)",
                            textAlign: "left",
                            fontWeight: 700,
                            color: "var(--forest)",
                        }}
                    >
                        📸 From photo
                        <span style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--bark)" }}>
                            Uses photo GPS and date if available.
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            if (!navigator.geolocation) {
                                showToast("Your browser does not support location.");
                                return;
                            }

                            navigator.geolocation.getCurrentPosition(
                                (position) => {
                                    const location = {
                                        lat: position.coords.latitude,
                                        lng: position.coords.longitude,
                                    };

                                    setUserLocation(location);
                                    mapRef.current?.flyTo([location.lat, location.lng], 17);
                                    setShowAddChoice(false);
                                    setObservationTarget({
                                        latitude: location.lat,
                                        longitude: location.lng,
                                        species: "Elder",
                                    });
                                },
                                (error) => {
                                    console.error("Location error:", error);
                                    showToast("Could not get your current location.");
                                },
                                {
                                    enableHighAccuracy: true,
                                    timeout: 10000,
                                    maximumAge: 0,
                                }
                            );
                        }}
                        style={{
                            width: "100%",
                            marginBottom: "8px",
                            padding: "12px",
                            borderRadius: "14px",
                            background: "rgba(255,255,255,0.85)",
                            border: "1px solid var(--sage)",
                            textAlign: "left",
                            fontWeight: 700,
                            color: "var(--forest)",
                        }}
                    >
                        📍 Current location
                        <span style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--bark)" }}>
                            Best when you are standing beside the plant.
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setShowAddChoice(false);
                            showToast("🗺️ Tap the map to place a pin, then choose Add location here.");
                        }}
                        style={{
                            width: "100%",
                            padding: "12px",
                            borderRadius: "14px",
                            background: "rgba(255,255,255,0.85)",
                            border: "1px solid var(--sage)",
                            textAlign: "left",
                            fontWeight: 700,
                            color: "var(--forest)",
                        }}
                    >
                        🗺️ Pick on map
                        <span style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--bark)" }}>
                            Best for adding something you saw earlier.
                        </span>
                    </button>
                </div>
            )}

            {selectedSpot && (
                <div
                    style={{
                        position: "absolute",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "min(500px, calc(100% - 24px))",
                        bottom: "12px",
                        zIndex: 1500,
                        background: "rgba(247, 244, 237, 0.5)",
                        backdropFilter: "blur(12px)",
                        animation: "slideUpSheet 180ms ease-out",
                        borderRadius: "24px",
                        padding: "14px",
                        maxHeight: "42vh",
                        overflowY: "auto",
                        boxShadow: "0 -4px 20px rgba(0,0,0,0.2)",
                    }}
                >
                    <button
                        type="button"
                        onClick={() => setSelectedSpot(null)}
                        style={{
                            position: "absolute",
                            right: "16px",
                            top: "12px",
                            fontSize: "24px",
                            background: "none",
                            border: "none",
                        }}
                    >
                        ×
                    </button>

                    <h2
                        style={{
                            fontSize: "18px",
                            fontWeight: 800,
                            color: "var(--forest)",
                            marginBottom: "8px",
                        }}
                    >
                        Multiple species here
                    </h2>

                    <p style={{ marginBottom: "12px", fontSize: "14px" }}>
                        Choose which one to view, or add a new observation here.
                    </p>

                    <button
                        type="button"
                        onClick={() => {
                            setObservationTarget({
                                latitude: selectedSpot.latitude,
                                longitude: selectedSpot.longitude,
                                species: selectedSpot.locations[0].species,
                            });
                            setSelectedSpot(null);
                        }}
                        style={{
                            width: "100%",
                            marginBottom: "12px",
                            padding: "10px",
                            borderRadius: "999px",
                            background: "var(--forest)",
                            color: "white",
                            border: "none",
                            fontWeight: 700,
                        }}
                    >
                        + Add observation here
                    </button>

                    {selectedSpot.locations.map((location) => (
                        <button
                            key={location.id}
                            type="button"
                            onClick={() => {
                                setPreviousSpot(selectedSpot);
                                setSelectedLocation(location);
                                setSelectedSpot(null);
                            }}
                            style={{
                                width: "100%",
                                marginBottom: "8px",
                                padding: "10px",
                                borderRadius: "14px",
                                background: "rgba(255, 255, 255, 0.78)",
                                border: "1px solid var(--sage)",
                                textAlign: "left",
                                fontWeight: 700,
                                color: "var(--forest)",
                            }}
                        >
                            {getSpeciesEmoji(location.species)} {location.species}
                            <span
                                style={{
                                    display: "block",
                                    marginTop: "2px",
                                    fontSize: "12px",
                                    fontWeight: 500,
                                    color: "var(--bark)",
                                }}
                            >
                                {location.observations.length} observation
                                {location.observations.length === 1 ? "" : "s"}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {selectedLocation && (
                <div
                    style={{
                        position: "absolute",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "min(500px, calc(100% - 24px))",
                        bottom: "12px",
                        zIndex: 1500,
                        background: "rgba(247, 244, 237, 0.5)",
                        backdropFilter: "blur(12px)",
                        animation: "slideUpSheet 180ms ease-out",
                        borderRadius: "24px",
                        padding: "14px",
                        maxHeight: "42vh",
                        overflowY: "auto",
                        boxShadow: "0 -4px 20px rgba(0,0,0,0.2)",
                    }}
                >
                    <div
                        style={{
                            position: "sticky",
                            top: "-14px",
                            zIndex: 50,
                            margin: "-14px -14px 12px -14px",
                            padding: "12px 14px",
                            background: "rgba(247, 244, 237, 0.75)",
                            backdropFilter: "blur(12px)",
                            borderTopLeftRadius: "24px",
                            borderTopRightRadius: "24px",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "12px",
                            }}
                        >
                            <div>
                                {previousSpot && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedSpot(previousSpot);
                                            setSelectedLocation(null);
                                        }}
                                        style={{
                                            background: "none",
                                            border: "none",
                                            padding: 0,
                                            marginBottom: "4px",
                                            color: "var(--forest)",
                                            fontWeight: 700,
                                            fontSize: "14px",
                                        }}
                                    >
                                        ← Species list
                                    </button>
                                )}

                                <h2
                                    style={{
                                        fontSize: "20px",
                                        fontWeight: 800,
                                        color: "var(--forest)",
                                        margin: 0,
                                    }}
                                >
                                    {getSpeciesEmoji(selectedLocation.species)} {selectedLocation.species}
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedLocation(null);
                                    setPreviousSpot(null);
                                }}
                                style={{
                                    flexShrink: 0,
                                    fontSize: "22px",
                                    background: "rgba(255, 255, 255, 0.75)",
                                    border: "none",
                                    borderRadius: "999px",
                                    width: "36px",
                                    height: "36px",
                                    lineHeight: "1",
                                    color: "var(--bark)",
                                }}
                            >
                                ×
                            </button>
                        </div>
                    </div>

                    <div style={{ marginBottom: "12px" }}>
                        {selectedLocation.observations.length} observation
                        {selectedLocation.observations.length === 1 ? "" : "s"}
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            setObservationTarget({
                                latitude: selectedLocation.latitude,
                                longitude: selectedLocation.longitude,
                                species: selectedLocation.species,
                            })
                        }
                        style={{
                            width: "100%",
                            borderRadius: "999px",
                            background: "var(--forest)",
                            color: "white",
                            padding: "10px",
                            fontWeight: 700,
                            marginBottom: "16px",
                        }}
                    >
                        Add observation
                    </button>

                    {selectedLocation.observations.map((observation, index) => (
                        <div
                            key={`${observation.photoName}-${index}`}
                            style={{
                                marginBottom: "10px",
                                padding: "10px",
                                borderRadius: "12px",
                                background: "rgba(255, 255, 255, 0.78)",
                                border: "1px solid #ddd",
                            }}
                        >

                            {observation.photoUrl && (
                                <img
                                    src={observation.photoUrl}
                                    alt={observation.photoName}
                                    style={{
                                        width: "100%",
                                        borderRadius: "12px",
                                        marginBottom: "8px",
                                    }}
                                />
                            )}

                            <strong>
                                {observation.source === "user"
                                    ? "User observation"
                                    : "Imported photo"}
                            </strong>

                            <div>Date: {observation.observedDate}</div>

                            {observation.stage && (
                                <div>Stage: {observation.stage}</div>
                            )}

                            {observation.estimatedYield && (
                                <div>Yield: {observation.estimatedYield}</div>
                            )}

                            {observation.access && (
                                <div>Access: {observation.access}</div>
                            )}

                            {observation.notes && (
                                <div>Notes: {observation.notes}</div>
                            )}

                            {observation.source === "user" &&
                                observation.savedLocationId && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleDeleteObservation(
                                                observation.savedLocationId!
                                            )
                                        }
                                        style={{
                                            marginTop: "8px",
                                            color: "#b42318",
                                            textDecoration: "underline",
                                        }}
                                    >
                                        Delete
                                    </button>
                                )}
                        </div>
                    ))}
                </div>
            )}

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
                    onPhotoLocationFound={(location) => {
                        setNewPin(location);
                        setUserLocation(location);
                        mapRef.current?.flyTo([location.lat, location.lng], 17);
                    }}
                />
            )}

            {toastMessage && (
                <div
                    style={{
                        position: "absolute",
                        left: "50%",
                        bottom: "72px",
                        transform: "translateX(-50%)",
                        zIndex: 2000,
                        maxWidth: "90%",
                        background: "var(--forest)",
                        color: "white",
                        padding: "10px 14px",
                        borderRadius: "999px",
                        fontWeight: 600,
                        fontSize: "14px",
                        boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
                        textAlign: "center",
                    }}
                >
                    {toastMessage}
                </div>
            )}

        </div>
    );
}