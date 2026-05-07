import { useEffect, useContext } from 'react';
import { MapContext } from './MapContainer';

interface Props {
  visible: boolean;
  tileUrl: string;
  layerId: string;
}

export function RasterLayer({ visible, tileUrl, layerId }: Props) {
  const map = useContext(MapContext);
  const sourceId = `${layerId}-source`;

  useEffect(() => {
    if (!map) return;

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'raster',
        tiles: [tileUrl],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 22,
      });
    }

    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: 'raster',
        source: sourceId,
        paint: { 'raster-opacity': 0.8 },
      });
    }

    return () => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map]);

  useEffect(() => {
    if (!map?.getLayer(layerId)) return;
    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
  }, [map, visible, layerId]);

  return null;
}
