-- Adds the PostGIS geography column that earlier docs claimed already existed.
-- Not managed via schema.prisma (Prisma has no native PostGIS geography support) -
-- see packages/database/prisma/schema.prisma's Event model comment.
ALTER TABLE "Event" ADD COLUMN "geom" geography(Point, 4326);

CREATE INDEX "Event_geom_idx" ON "Event" USING GIST ("geom");
