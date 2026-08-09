-- Hand-written, not `prisma migrate dev`-generated (see docs/architecture/IMPLEMENTATION_NOTES.md
-- for why `migrate dev` isn't used non-interactively in this repo) — SQL matches exactly what
-- Prisma would generate for the @@index directives added to schema.prisma in the same change.

-- CreateIndex
-- Backs pagination (ORDER BY created_at) on GET /v1/events and GET /v1/events/playback, and the
-- WHERE created_at >= ? clause in events/geo-query.ts's findDuplicateCandidateEventId().
CREATE INDEX "Event_created_at_idx" ON "Event"("created_at");

-- CreateIndex
-- Backs the exact 3-column WHERE shape of findDuplicateCandidateEventId() (category + status +
-- created_at, checked on every POST /v1/events) better than combining the separate
-- Event_status_idx/Event_category_idx via a bitmap AND.
CREATE INDEX "Event_category_status_created_at_idx" ON "Event"("category", "status", "created_at");

-- CreateIndex
-- Postgres does not auto-index foreign key columns. recalculateConfidence() queries
-- report.findMany({ where: { event_id } }) on every event create/update — this was a real
-- missing index, not a precaution.
CREATE INDEX "Report_event_id_idx" ON "Report"("event_id");

-- CreateIndex
-- Same reasoning as Report_event_id_idx — evidence.count({ where: { event_id } }) runs on every
-- confidence recalculation.
CREATE INDEX "Evidence_event_id_idx" ON "Evidence"("event_id");
