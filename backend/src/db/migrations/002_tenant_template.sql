CREATE TABLE IF NOT EXISTS datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('point', 'line', 'polygon', 'raster')),
  geometry_column TEXT,
  bbox GEOMETRY(GEOMETRY, 4326),
  storage_path TEXT,
  feature_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'error')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS layers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  name TEXT,
  geom GEOMETRY(GEOMETRY, 4326),
  properties JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_layers_geom ON layers USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_layers_dataset ON layers(dataset_id);
CREATE INDEX IF NOT EXISTS idx_layers_properties ON layers USING GIN (properties);

CREATE TABLE IF NOT EXISTS etl_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'failed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  error TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);
