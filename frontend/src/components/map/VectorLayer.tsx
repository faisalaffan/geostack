import { useEffect, useContext } from 'react';
import { MapContext } from './MapContainer';

interface Props {
  visible: boolean;
  tileUrl: string;
  layerId: string;
  color?: string;
}

export function VectorLayer({ visible, tileUrl, layerId, color = '#2563eb' }: Props) {
  const map = useContext(MapContext);
  const sourceId = `${layerId}-source`;

  useEffect(() => {
    if (!map) return;

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'vector',
        tiles: [tileUrl],
        minzoom: 0,
        maxzoom: 22,
      });
    }

    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: 'circle',
        source: sourceId,
        'source-layer': 'default',
        paint: {
          'circle-color': color,
          'circle-radius': 6,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
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
