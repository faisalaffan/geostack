import { useSearchParams } from 'react-router-dom';
import { useMap } from '../hooks/useMap';
import { MapContainer } from '../components/map/MapContainer';
import { VectorLayer } from '../components/map/VectorLayer';
import { RasterLayer } from '../components/map/RasterLayer';
import { LayerControl } from '../components/map/LayerControl';
import { PopupCard } from '../components/map/PopupCard';

export function MapView() {
  const [searchParams] = useSearchParams();
  const datasetId = searchParams.get('dataset');
  const {
    viewState,
    setViewState,
    layers,
    toggleLayer,
    selectedFeature,
    setSelectedFeature,
  } = useMap();

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const layerDefs = [
    { id: 'vector', label: 'Vector Tiles (Martin)', visible: layers.vector },
    { id: 'raster', label: 'Raster Tiles (TiTiler)', visible: layers.raster },
    { id: 'geoserver', label: 'GeoServer WMS', visible: layers.geoserver },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">
        Map Viewer {datasetId && (
          <span className="text-sm text-gray-500 font-normal">
            — Dataset {datasetId.slice(0, 8)}
          </span>
        )}
      </h1>

      <div className="relative w-full h-[calc(100vh-10rem)]">
        <MapContainer
          viewState={viewState}
          onMove={setViewState}
          onClick={setSelectedFeature}
        >
          <VectorLayer
            visible={layers.vector}
            tileUrl={`${API_BASE}/api/v1/tiles/vector/{z}/{x}/{y}`}
            layerId="vector-layer"
          />

          <RasterLayer
            visible={layers.raster}
            tileUrl={`${API_BASE}/api/v1/tiles/raster/{z}/{x}/{y}`}
            layerId="raster-layer"
          />

          <LayerControl layers={layerDefs} onToggle={toggleLayer} />

          {selectedFeature && (
            <PopupCard feature={selectedFeature} onClose={() => setSelectedFeature(null)} />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
