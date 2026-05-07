export function isPoint(lon: number, lat: number) {
  return {
    type: 'Point' as const,
    coordinates: [lon, lat],
  };
}

export function isPolygon(coords: number[][][]) {
  return {
    type: 'Polygon' as const,
    coordinates: coords,
  };
}
