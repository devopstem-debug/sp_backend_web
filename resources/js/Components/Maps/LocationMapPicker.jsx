import {
    MapContainer,
    Marker,
    TileLayer,
    useMap,
    useMapEvents,
} from 'react-leaflet';
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import L from 'leaflet';
import {
    CheckCircleIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER = [53.9023, 27.5619];

const markerIcon = L.divIcon({
    className: '',
    html: '<div style="width:20px;height:20px;border-radius:50%;background:#6366f1;border:3px solid white;box-shadow:0 2px 10px rgba(99,102,241,.55)"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
});

function MapClickHandler({ onPick }) {
    useMapEvents({
        click(event) {
            onPick(event.latlng.lat, event.latlng.lng);
        },
    });

    return null;
}

function MapUpdater({ center, zoom, recenterToken }) {
    const map = useMap();

    useEffect(() => {
        if (recenterToken === 0) {
            return;
        }

        map.setView(center, zoom, { animate: true });
    }, [recenterToken, center, zoom, map]);

    return null;
}

function fieldClass(hasError) {
    return `mt-1.5 block w-full rounded-lg border bg-[#0e172b] px-3 py-2.5 text-sm text-slate-100 shadow-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
        hasError
            ? 'border-red-400/70 focus:border-red-500'
            : 'border-slate-700 focus:border-indigo-500'
    }`;
}

export default function LocationMapPicker({
    latitude,
    longitude,
    address = '',
    city = '',
    onChange,
    errors = {},
    fillHeight = false,
}) {
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [recenterToken, setRecenterToken] = useState(0);

    const hasCoords =
        latitude !== '' &&
        latitude !== null &&
        longitude !== '' &&
        longitude !== null &&
        !Number.isNaN(Number(latitude)) &&
        !Number.isNaN(Number(longitude));

    const center = useMemo(() => {
        if (hasCoords) {
            return [Number(latitude), Number(longitude)];
        }

        return DEFAULT_CENTER;
    }, [hasCoords, latitude, longitude]);

    useEffect(() => {
        setSuggestions([]);
        setSearchError('');
    }, [address, city]);

    const applyCoords = (lat, lng, patch = {}, recenter = false) => {
        onChange({
            latitude: Number(lat).toFixed(7),
            longitude: Number(lng).toFixed(7),
            ...patch,
        });

        if (recenter) {
            setRecenterToken((value) => value + 1);
        }
    };

    const geocode = async () => {
        const value = String(address || '').trim();

        if (!value) {
            setSearchError('Сначала укажите адрес.');
            return;
        }

        setSearching(true);
        setSearchError('');
        setSuggestions([]);

        try {
            const { data } = await axios.get(route('stores.geocode'), {
                params: {
                    address: value,
                    city: city || undefined,
                },
            });

            const results = data.results || [];

            if (results.length === 0) {
                setSearchError(
                    'Адрес не найден. Уточните город и улицу или отметьте точку на карте.',
                );
                return;
            }

            if (results.length === 1) {
                const hit = results[0];
                applyCoords(hit.latitude, hit.longitude, {
                    city: hit.city || city,
                    address: hit.address || address,
                }, true);
                return;
            }

            setSuggestions(results);
        } catch (err) {
            setSearchError(
                err?.response?.data?.message ||
                    err?.response?.data?.errors?.address?.[0] ||
                    'Не удалось найти адрес на карте.',
            );
        } finally {
            setSearching(false);
        }
    };

    const locationError =
        searchError || errors.location || errors.latitude || errors.longitude;

    return (
        <div
            className={clsx(
                'flex min-h-0 flex-col',
                fillHeight ? 'h-full' : 'space-y-4',
            )}
        >
            <div
                className={clsx(
                    'shrink-0',
                    fillHeight
                    ? 'border-b border-slate-800 bg-[#152033]/80 px-4 py-4 backdrop-blur sm:px-5'
                    : 'space-y-4',
                )}
            >
                <div
                    className={clsx(
                        'grid gap-3',
                        fillHeight
                            ? 'lg:grid-cols-[180px_minmax(0,1fr)_auto_auto] lg:items-end'
                            : 'sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] sm:items-end',
                    )}
                >
                    <div>
                        <label
                            htmlFor="store_city"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Город
                        </label>
                        <input
                            id="store_city"
                            type="text"
                            value={city}
                            onChange={(e) =>
                                onChange({ city: e.target.value })
                            }
                            className={fieldClass(Boolean(errors.city))}
                            placeholder="Минск"
                        />
                        {errors.city ? (
                            <p className="mt-1.5 text-sm text-red-400">
                                {errors.city}
                            </p>
                        ) : null}
                    </div>

                    <div>
                        <label
                            htmlFor="store_address"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Адрес
                        </label>
                        <input
                            id="store_address"
                            type="text"
                            value={address}
                            onChange={(e) =>
                                onChange({ address: e.target.value })
                            }
                            className={fieldClass(Boolean(errors.address))}
                            placeholder="ул. Победы, 12"
                        />
                        {errors.address ? (
                            <p className="mt-1.5 text-sm text-red-400">
                                {errors.address}
                            </p>
                        ) : null}
                    </div>

                    <button
                        type="button"
                        onClick={geocode}
                        disabled={searching}
                        className="inline-flex h-[42px] items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
                    >
                        <MagnifyingGlassIcon className="h-4 w-4" />
                        {searching ? 'Поиск…' : 'Найти'}
                    </button>

                    {fillHeight ? (
                        hasCoords ? (
                            <span className="inline-flex h-[42px] items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 text-sm font-medium text-emerald-300 ring-1 ring-emerald-500/20">
                                <CheckCircleIcon className="h-4 w-4" />
                                Точка выбрана
                            </span>
                        ) : (
                            <span className="inline-flex h-[42px] items-center rounded-lg bg-slate-800/80 px-3 text-sm text-slate-400">
                                Точка не выбрана
                            </span>
                        )
                    ) : null}
                </div>

                {locationError ? (
                    <p className="mt-3 text-sm text-red-400">{locationError}</p>
                ) : null}

                {suggestions.length > 0 ? (
                    <ul className="mt-3 max-h-40 space-y-2 overflow-y-auto">
                        {suggestions.map((item, index) => (
                            <li key={`${item.latitude}-${item.longitude}-${index}`}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        applyCoords(
                                            item.latitude,
                                            item.longitude,
                                            {
                                                city: item.city || city,
                                                address:
                                                    item.address || address,
                                            },
                                            true,
                                        );
                                        setSuggestions([]);
                                    }}
                                    className="w-full rounded-lg border border-slate-700 bg-[#0e172b] px-3 py-2.5 text-left text-sm text-slate-200 transition hover:border-indigo-500/40 hover:bg-indigo-500/10"
                                >
                                    {item.display_name}
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : null}
            </div>

            <div
                className={clsx(
                    'min-h-0 overflow-hidden',
                    fillHeight ? 'relative flex-1' : 'rounded-xl ring-1 ring-slate-700',
                )}
            >
                <MapContainer
                    center={center}
                    zoom={hasCoords ? 16 : 12}
                    scrollWheelZoom
                    className={clsx(
                        'w-full',
                        fillHeight ? 'absolute inset-0 h-full' : 'h-56 sm:h-72',
                    )}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapUpdater
                        center={center}
                        zoom={hasCoords ? 16 : 12}
                        recenterToken={recenterToken}
                    />
                    <MapClickHandler onPick={applyCoords} />
                    {hasCoords ? (
                        <Marker
                            position={[Number(latitude), Number(longitude)]}
                            icon={markerIcon}
                            draggable
                            eventHandlers={{
                                dragend: (event) => {
                                    const { lat, lng } =
                                        event.target.getLatLng();
                                    applyCoords(lat, lng);
                                },
                            }}
                        />
                    ) : null}
                </MapContainer>
            </div>

            {!fillHeight ? (
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <p>
                        Кликните по карте или перетащите маркер, чтобы уточнить
                        вход.
                    </p>
                    {hasCoords ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-300 ring-1 ring-emerald-500/20">
                            <CheckCircleIcon className="h-3.5 w-3.5" />
                            Точка выбрана
                        </span>
                    ) : (
                        <span className="rounded-full bg-slate-800 px-2.5 py-1 text-slate-400">
                            Точка не выбрана
                        </span>
                    )}
                </div>
            ) : null}
        </div>
    );
}
