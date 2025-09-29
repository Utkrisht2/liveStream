-- Prisma baseline schema
CREATE TABLE IF NOT EXISTS "User" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Camera" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rtspUrl TEXT NOT NULL,
  location TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  detectionEnabled BOOLEAN NOT NULL DEFAULT TRUE,
  fpsTarget INTEGER NOT NULL DEFAULT 8,
  status TEXT NOT NULL DEFAULT 'stopped',
  createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
  updatedAt TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Alert" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cameraId UUID NOT NULL REFERENCES "Camera"(id) ON DELETE CASCADE,
  timestamp TIMESTAMP NOT NULL,
  bboxJson TEXT NOT NULL,
  snapshotUrl TEXT NOT NULL,
  confidence DOUBLE PRECISION NOT NULL,
  metadataJson TEXT NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_camera_created ON "Alert"(cameraId, createdAt DESC);
