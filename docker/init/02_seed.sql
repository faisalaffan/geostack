-- Ensure tables exist (also created by migration, but init runs first)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  keycloak_realm_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keycloak_user_id TEXT NOT NULL UNIQUE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- public.organizations
INSERT INTO organizations (id, name, slug, keycloak_realm_id)
VALUES (
  'd290f1ee-6c54-4b01-90e6-d701748f0851',
  'Demo Telecom',
  'demo_telecom',
  'geostack'
) ON CONFLICT DO NOTHING;

INSERT INTO users (id, keycloak_user_id, organization_id, role)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'demo-user-id',
  'd290f1ee-6c54-4b01-90e6-d701748f0851',
  'admin'
) ON CONFLICT DO NOTHING;

-- Create demo tenant schema
CREATE SCHEMA IF NOT EXISTS tenant_demo_telecom;

-- Sample layers table
CREATE TABLE IF NOT EXISTS tenant_demo_telecom.layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID,
  name TEXT,
  geom GEOMETRY(POINT, 4326),
  properties JSONB
);
CREATE INDEX IF NOT EXISTS idx_layers_geom ON tenant_demo_telecom.layers USING GIST (geom);

-- Seed sample data: cell towers in Indonesia (Bogor area)
INSERT INTO tenant_demo_telecom.layers (name, geom, properties)
VALUES
  ('Tower BTK-001', ST_SetSRID(ST_MakePoint(106.8272, -6.5971), 4326), '{"type": "macrocell", "height_m": 45, "band": "LTE1800", "status": "active"}'),
  ('Tower BTK-002', ST_SetSRID(ST_MakePoint(106.8136, -6.5895), 4326), '{"type": "microcell", "height_m": 15, "band": "LTE2100", "status": "active"}'),
  ('Tower BTK-003', ST_SetSRID(ST_MakePoint(106.8412, -6.6032), 4326), '{"type": "macrocell", "height_m": 60, "band": "NR3500", "status": "planned"}'),
  ('Tower BTK-004', ST_SetSRID(ST_MakePoint(106.7950, -6.6150), 4326), '{"type": "smallcell", "height_m": 8, "band": "LTE2600", "status": "active"}'),
  ('Tower BTK-005', ST_SetSRID(ST_MakePoint(106.8500, -6.5800), 4326), '{"type": "macrocell", "height_m": 50, "band": "NR3500", "status": "active"}');

-- Sample fiber routes
INSERT INTO tenant_demo_telecom.layers (name, geom, properties)
VALUES
  ('Fiber Route A', ST_SetSRID(ST_GeomFromText('LINESTRING(106.827 -6.597, 106.813 -6.589, 106.795 -6.615)'), 4326), '{"type": "backbone", "length_km": 3.2, "capacity_gbps": 100, "status": "active"}'),
  ('Fiber Route B', ST_SetSRID(ST_GeomFromText('LINESTRING(106.841 -6.603, 106.850 -6.580, 106.827 -6.597)'), 4326), '{"type": "distribution", "length_km": 4.8, "capacity_gbps": 40, "status": "active"}');
