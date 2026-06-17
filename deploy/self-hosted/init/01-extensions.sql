-- PostgreSQL extensions for dir
-- Auto-runs on first container start via docker-entrypoint-initdb.d

CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- trigram autocomplete
CREATE EXTENSION IF NOT EXISTS unaccent;     -- accent-insensitive search
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- UUID generation
CREATE EXTENSION IF NOT EXISTS btree_gin;   -- composite GIN indexes
