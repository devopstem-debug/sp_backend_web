import {
    MapContainer,
    Marker,
    Polygon,
    TileLayer,
    useMap,
    useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';

const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ESRI_URL =
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

const vertexIcon = L.divIcon({
    className: '',
    html: '<div style="width:14px;height:14px;border-radius:50%;background:#22c55e;border:2px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.45);cursor:move"></div>',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
});

const searchIcon = L.divIcon({
    className: '',
    html: '<div style="width:18px;height:18px;border-radius:50%;background:#6366f1;border:3px solid #fff;box-shadow:0 2px 10px rgba(99,102,241,.55)"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
});

function MapRecenter({ center, zoom, token }) {
    const map = useMap();
    useEffect(() => {
        if (!token || !center) return;
        map.setView(center, zoom, { animate: true });
    }, [token, center, zoom, map]);
    return null;
}

function ClickCapture({ enabled, onClick }) {
    useMapEvents({
        click(e) {
            if (!enabled) return;
            onClick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

/**
 * @param {{ lat: number, lng: number }[]} vertices
 */
export function measurePolygon(vertices) {
    if (!vertices || vertices.length < 3) {
        return {
            width_meters: 0,
            height_meters: 0,
            area_sqm: 0,
            center: null,
            bearing_degrees: 0,
        };
    }

    const R = 6371000;
    const lat0 = (vertices.reduce((s, p) => s + p.lat, 0) / vertices.length) * (Math.PI / 180);
    const lng0 =
        (vertices.reduce((s, p) => s + p.lng, 0) / vertices.length) * (Math.PI / 180);

    const local = vertices.map((p) => {
        const lat = p.lat * (Math.PI / 180);
        const lng = p.lng * (Math.PI / 180);
        return {
            x: (lng - lng0) * Math.cos(lat0) * R,
            y: (lat - lat0) * R,
        };
    });

    const xs = local.map((p) => p.x);
    const ys = local.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    // Shoelace area in local meters
    let area = 0;
    for (let i = 0; i < local.length; i++) {
        const j = (i + 1) % local.length;
        area += local[i].x * local[j].y - local[j].x * local[i].y;
    }
    area = Math.abs(area) / 2;

    const centerLat = vertices.reduce((s, p) => s + p.lat, 0) / vertices.length;
    const centerLng = vertices.reduce((s, p) => s + p.lng, 0) / vertices.length;

    return {
        width_meters: Math.round((maxX - minX) * 10) / 10,
        height_meters: Math.round((maxY - minY) * 10) / 10,
        area_sqm: Math.round(area * 10) / 10,
        center: { lat: centerLat, lng: centerLng },
        bearing_degrees: 0, // север карты = вверх
    };
}

export default function HallBoundaryMap({
    center = [53.9023, 27.5619],
    zoom = 18,
    recenterToken = 0,
    layer = 'osm', // osm | satellite
    mode = 'view', // view | draw | edit
    searchMarker = null, // {lat,lng}
    vertices = [],
    onAddVertex,
    onMoveVertex,
    heightClass = 'h-[420px]',
}) {
    const positions = useMemo(
        () => vertices.map((v) => [v.lat, v.lng]),
        [vertices],
    );

    return (
        <div
            className={`hall-boundary-map relative z-0 isolate overflow-hidden rounded-xl ring-1 ring-slate-700 ${heightClass}`}
        >
            <style>{`
                .hall-boundary-map .leaflet-container { z-index: 0 !important; height: 100%; width: 100%; }
                .hall-boundary-map .leaflet-pane { z-index: 1 !important; }
                .hall-boundary-map .leaflet-top,
                .hall-boundary-map .leaflet-bottom { z-index: 2 !important; }
            `}</style>
            <MapContainer
                key={`layer-${layer}`}
                center={center}
                zoom={zoom}
                className="h-full w-full"
                scrollWheelZoom
                style={{ zIndex: 0 }}
            >
                <TileLayer
                    attribution={
                        layer === 'satellite'
                            ? 'Tiles &copy; Esri'
                            : '&copy; OpenStreetMap'
                    }
                    url={layer === 'satellite' ? ESRI_URL : OSM_URL}
                    maxZoom={20}
                />
                <MapRecenter center={center} zoom={zoom} token={recenterToken} />
                <ClickCapture
                    enabled={mode === 'draw'}
                    onClick={(lat, lng) => onAddVertex?.({ lat, lng })}
                />

                {searchMarker ? (
                    <Marker
                        position={[searchMarker.lat, searchMarker.lng]}
                        icon={searchIcon}
                    />
                ) : null}

                {positions.length >= 2 ? (
                    <Polygon
                        positions={positions}
                        pathOptions={{
                            color: '#22c55e',
                            fillColor: '#22c55e',
                            fillOpacity: 0.25,
                            weight: 3,
                        }}
                    />
                ) : null}

                {(mode === 'draw' || mode === 'edit') &&
                    vertices.map((v, index) => (
                        <Marker
                            key={`${v.lat}-${v.lng}-${index}`}
                            position={[v.lat, v.lng]}
                            icon={vertexIcon}
                            draggable={mode === 'edit'}
                            eventHandlers={{
                                dragend: (e) => {
                                    const ll = e.target.getLatLng();
                                    onMoveVertex?.(index, {
                                        lat: ll.lat,
                                        lng: ll.lng,
                                    });
                                },
                            }}
                        />
                    ))}
            </MapContainer>
        </div>
    );
}
