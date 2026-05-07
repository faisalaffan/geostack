import { useState, useCallback } from 'react';

interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
}

interface MapLayers {
  vector: boolean;
  raster: boolean;
  geoserver: boolean;
}

export function useMap() {
  const [viewState, setViewState] = useState<ViewState>({
    longitude: 106.8272,
    latitude: -6.5971,
    zoom: 12,
  });

  const [layers, setLayers] = useState<MapLayers>({
    vector: true,
    raster: false,
    geoserver: false,
  });

  const [selectedFeature, setSelectedFeature] = useState<any>(null);

  const toggleLayer = useCallback((id: string) => {
    setLayers((prev) => ({ ...prev, [id]: !prev[id as keyof MapLayers] }));
  }, []);

  return {
    viewState,
    setViewState,
    layers,
    toggleLayer,
    selectedFeature,
    setSelectedFeature,
  };
}
