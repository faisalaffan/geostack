import { useRef, useEffect, createContext, useContext } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface Props {
  viewState: { longitude: number; latitude: number; zoom: number };
  onMove?: (viewState: { longitude: number; latitude: number; zoom: number }) => void;
  onClick?: (feature: any) => void;
  children?: React.ReactNode;
}

export const MapContext = createContext<maplibregl.Map | null>(null);

export function useMapInstance() {
  return useContext(MapContext);
}

export function MapContainer({ viewState, onMove, onClick, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm-layer',
            type: 'raster',
            source: 'osm',
          },
        ],
      },
      center: [viewState.longitude, viewState.latitude],
      zoom: viewState.zoom,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('click', (e) => {
      const features = map.queryRenderedFeatures(e.point);
      if (features.length > 0 && onClick) {
        onClick(features[0]);
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <MapContext.Provider value={mapRef.current}>
      <div ref={containerRef} className="w-full h-full min-h-[500px] rounded-lg overflow-hidden">
        {children}
      </div>
    </MapContext.Provider>
  );
}
