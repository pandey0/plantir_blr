import type { Event, EventStatus as PrismaEventStatus } from '@prisma/client';
import type { EventCategory as ApiEventCategory, EventStatus as ApiEventStatus } from '@plantir/api-contracts';
import { prisma, type Db } from '../db.js';
import { broadcast } from '../ws/index.js';
import { toPrismaCategory, toPrismaStatus } from './prisma-enum.js';
import { invalidate as invalidateListCache } from './list-cache.js';
import { findDuplicateCandidateEventId } from './geo-query.js';

export interface CreateEventInput {
  category: ApiEventCategory;
  latitude: number;
  longitude: number;
  location?: string;
  reporterId?: string;
  mediaUrls?: string[];
  source: { id: string; trustWeight: number };
}

export interface ListEventsInput {
  cursor?: string;
  limit: number;
  /** Pre-computed by geo-query.ts's findEventIdsInBbox/findEventIdsInRadius when a spatial
   *  filter is present; undefined means "no spatial filter." */
  idFilter?: string[];
}

export interface ListEventsResult {
  events: Event[];
  nextCursor: string | null;
}

// This function's existence, not just its body, is the fix for
// docs/architecture/STANDARDS_COMPLIANCE.md's "controllers must not contain direct DB
// queries" row — app.ts's ListEvents handler used to call prisma.event.findMany() directly.
// Reverses an earlier documented stance (events/README.md previously said "reads don't need
// to go through events/") — the standards doc's rule wins; see TECH_STACK.md decision log.
export async function listEvents(input: ListEventsInput): Promise<ListEventsResult> {
  const { cursor, limit, idFilter } = input;

  // Short-circuit rather than querying with `id: { in: [] }` — same result, one fewer round
  // trip, and avoids relying on Prisma treating an empty IN-list as "match nothing" (which it
  // does, but there's no reason to depend on that when we already know the answer).
  if (idFilter && idFilter.length === 0) {
    return { events: [], nextCursor: null };
  }

  const events = await prisma.event.findMany({
    where: {
      status: { not: 'FRAUD' },
      ...(idFilter ? { id: { in: idFilter } } : {}),
    },
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = events.length > limit;
  const page = hasMore ? events.slice(0, limit) : events;
  return { events: page, nextCursor: hasMore ? page[page.length - 1].id : null };
}

export interface ListEventsInRangeInput {
  from: Date;
  to: Date;
  idFilter?: string[];
}

// docs/product/VISION.md's Playback Mode ("select a time window, map reconstructs city state,
// timeline animation shows event progression"). Deliberately a separate function from
// listEvents(), not a from/to extension of it: playback wants every event in the window in
// created_at ASCENDING order (oldest first, for chronological animation) with no cursor —
// the caller already knows the bound (`to`), unlike the main feed's open-ended "keep loading
// more" pagination. A plain Prisma range filter, no raw SQL needed — created_at isn't a
// spatial predicate.
const PLAYBACK_MAX_EVENTS = 1000; // see docs/architecture/IMPLEMENTATION_NOTES.md — abuse/scan guard, same reasoning as listEventsRequestSchema's radiusKm cap.

export async function listEventsInRange(input: ListEventsInRangeInput): Promise<Event[]> {
  const { from, to, idFilter } = input;

  if (idFilter && idFilter.length === 0) {
    return [];
  }

  return prisma.event.findMany({
    where: {
      status: { not: 'FRAUD' },
      created_at: { gte: from, lte: to },
      ...(idFilter ? { id: { in: idFilter } } : {}),
    },
    orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
    take: PLAYBACK_MAX_EVENTS,
  });
}

// Confidence Engine v2 — multi-signal bucketed model, superseding the flat additive formula
// shipped 2026-08-09. Reverses that logged decision; see docs/architecture/TECH_STACK.md's
// decision log and docs/product/VISION.md's Event Confidence Engine section (now marked
// shipped there). Score is 0-100, interpreted client-side via VISION.md's bucket ranges
// (0-30 Low / 30-60 Moderate / 60-80 High / 80-100 Critical) — no separate bucket field is
// stored or returned; a numeric range check is not worth an API/DTO change (see
// docs/architecture/STANDARDS_COMPLIANCE.md row #4's DTO reasoning).
//
// Signals implemented (see README.md for the full breakdown of what's in vs. deliberately
// out of scope):
//   - Reporter signal: unique reporter count, diminishing returns (not unbounded flat
//     points-per-reporter — a 10th corroborating report shouldn't be worth as much as the 2nd).
//   - Evidence signal: photo/video attachments, capped (no AI image validation — that's a
//     real VISION.md signal this repo doesn't build; see README.md).
//   - Spatial + temporal signals: NOT separate additive terms. A report only ever counts
//     toward the reporter signal above if it passed duplicate/corroboration detection's
//     radius+time-window gate (geo-query.ts's findDuplicateCandidateEventId()) — proximity in
//     space and time is the ELIGIBILITY condition for corroboration, not an extra score on
//     top of it. Documented explicitly so this isn't mistaken for a missing signal.
//   - Authority confirmation: flat bonus once an authority has acted on the event (any
//     transition out of REPORTED), per VISION.md's "Authority acknowledgment greatly
//     increases confidence."
//   - Fraud penalty: unchanged from v1, applied last.
//
// Exact weights below are reasonable defaults, not calibrated against real usage — there is
// no production traffic yet to tune them against. Revisit once the app has real beta usage
// data; don't hand-tune further pre-beta on guesses. `trustWeight` (on CreateEventInput) is
// still accepted but not factored in, same reasoning as v1 — see README.md.
const REPORTER_BASE_POINTS = 20;
const REPORTER_INCREMENT_POINTS = 15;
const REPORTER_SIGNAL_CAP = 60;
const EVIDENCE_POINTS_PER_ITEM = 15;
const EVIDENCE_SIGNAL_CAP = 30;
const AUTHORITY_CONFIRMATION_BONUS = 25;
const FRAUD_PENALTY = 50;

function reporterSignal(uniqueReporterCount: number): number {
  if (uniqueReporterCount <= 0) return 0;
  return Math.min(REPORTER_SIGNAL_CAP, REPORTER_BASE_POINTS + REPORTER_INCREMENT_POINTS * (uniqueReporterCount - 1));
}

function evidenceSignal(evidenceCount: number): number {
  return Math.min(EVIDENCE_SIGNAL_CAP, EVIDENCE_POINTS_PER_ITEM * evidenceCount);
}

// Any status other than REPORTED means an authority has taken an action on this event
// (verified, escalated, moved it into progress, resolved it, or flagged it fraudulent) — the
// bonus applies uniformly to all of them except FRAUD, which gets the penalty instead.
const AUTHORITY_CONFIRMED_STATUSES: PrismaEventStatus[] = ['VERIFIED', 'ESCALATED', 'IN_PROGRESS', 'RESOLVED'];

export async function recalculateConfidence(eventId: string, db: Db = prisma): Promise<number> {
  const [reporters, evidenceCount, event] = await Promise.all([
    db.report.findMany({ where: { event_id: eventId }, distinct: ['user_id'], select: { user_id: true } }),
    db.evidence.count({ where: { event_id: eventId } }),
    db.event.findUniqueOrThrow({ where: { id: eventId } }),
  ]);

  const raw =
    reporterSignal(reporters.length) +
    evidenceSignal(evidenceCount) +
    (AUTHORITY_CONFIRMED_STATUSES.includes(event.status) ? AUTHORITY_CONFIRMATION_BONUS : 0) -
    (event.status === 'FRAUD' ? FRAUD_PENALTY : 0);
  const score = Math.max(0, Math.min(100, raw));

  await db.event.update({ where: { id: eventId }, data: { confidence_score: score } });
  return score;
}

export async function createEvent(input: CreateEventInput): Promise<Event> {
  // Transaction, not N sequential unguarded writes: duplicate lookup + event.create/attach +
  // geom write + optional Report + optional Evidence rows + confidence recalc used to be (pre
  // duplicate-detection) independent statements — a failure partway (e.g. the process
  // crashing between event.create and the geom UPDATE) left a real, permanent, half-created
  // Event with no coordinates. See docs/architecture/STANDARDS_COMPLIANCE.md's Transactions row.
  const { event, confidence_score, isNewEvent } = await prisma.$transaction(async (tx) => {
    // Duplicate/corroboration detection — docs/product/VISION.md's Fraud Prevention +
    // Confidence Signals. A report close in space+time to an existing non-terminal event of
    // the same category attaches to that event as a new Report/Evidence rather than creating a
    // second Event for the same real-world issue. See geo-query.ts's
    // findDuplicateCandidateEventId() for the exact radius/window/eligibility rules.
    const duplicateId = await findDuplicateCandidateEventId(
      tx,
      toPrismaCategory(input.category),
      input.latitude,
      input.longitude,
    );

    if (duplicateId) {
      if (input.reporterId) {
        await tx.report.create({ data: { event_id: duplicateId, user_id: input.reporterId } });
      }
      if (input.mediaUrls?.length) {
        await tx.evidence.createMany({
          data: input.mediaUrls.map((media_url) => ({ event_id: duplicateId, media_url, is_authority_proof: false })),
        });
      }
      const confidence_score = await recalculateConfidence(duplicateId, tx);
      const event = await tx.event.findUniqueOrThrow({ where: { id: duplicateId } });
      return { event, confidence_score, isNewEvent: false };
    }

    const created = await tx.event.create({
      data: { category: toPrismaCategory(input.category), status: 'REPORTED' }, // confidence_score defaults to 0, set below
    });
    // geom has no first-class Prisma field (see schema.prisma comment) — written via raw SQL.
    await tx.$executeRaw`UPDATE "Event" SET geom = ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326) WHERE id = ${created.id}`;

    if (input.reporterId) {
      await tx.report.create({ data: { event_id: created.id, user_id: input.reporterId } });
    }
    if (input.mediaUrls?.length) {
      await tx.evidence.createMany({
        data: input.mediaUrls.map((media_url) => ({ event_id: created.id, media_url, is_authority_proof: false })),
      });
    }

    const confidence_score = await recalculateConfidence(created.id, tx);
    return { event: created, confidence_score, isNewEvent: true };
  });

  const ev = { ...event, confidence_score };

  invalidateListCache();

  // A corroborating report doesn't create a new map marker — the existing event's confidence
  // (and possibly report count, if the frontend ever renders it) changed, which is exactly
  // what EVENT_UPDATED already models. Only a genuinely new Event broadcasts NEW_EVENT.
  if (isNewEvent) {
    broadcast({
      type: 'NEW_EVENT',
      payload: {
        id: ev.id,
        type: ev.category,
        location: input.location ?? 'Unknown',
        latitude: input.latitude,
        longitude: input.longitude,
        status: ev.status,
        confidence_score: ev.confidence_score,
        created_at: ev.created_at,
      },
    });
  } else {
    broadcast({
      type: 'EVENT_UPDATED',
      payload: { id: ev.id, status: ev.status, updated_at: ev.updated_at, confidence_score: ev.confidence_score },
    });
  }

  return ev;
}

export class EventNotFoundError extends Error {
  constructor(public eventId: string) {
    super(`Event ${eventId} not found`);
  }
}

export class InvalidStatusTransitionError extends Error {
  constructor(public from: PrismaEventStatus, public to: PrismaEventStatus) {
    super(`Cannot transition Event from ${from} to ${to}`);
  }
}

// Per docs/product/VISION.md's Event Lifecycle (Observation -> Creation -> Confidence
// Growth -> Escalation -> Authority Response -> Resolution -> Archival), mapped onto the
// EventStatus enum. RESOLVED and FRAUD are terminal — reopening isn't designed yet, don't
// add it speculatively; if that's needed later it's a new decision, not an oversight here.
const ALLOWED_TRANSITIONS: Record<PrismaEventStatus, PrismaEventStatus[]> = {
  REPORTED: ['VERIFIED', 'ESCALATED', 'FRAUD'],
  VERIFIED: ['ESCALATED', 'IN_PROGRESS', 'FRAUD'],
  ESCALATED: ['IN_PROGRESS', 'FRAUD'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: [],
  FRAUD: [],
};

export async function updateStatus(eventId: string, status: ApiEventStatus): Promise<Event> {
  const targetStatus = toPrismaStatus(status);

  const current = await prisma.event.findUnique({ where: { id: eventId } });
  if (!current) {
    throw new EventNotFoundError(eventId);
  }
  if (!ALLOWED_TRANSITIONS[current.status].includes(targetStatus)) {
    throw new InvalidStatusTransitionError(current.status, targetStatus);
  }

  // Transaction wraps the CAS write + the FRAUD confidence recalc together — previously these
  // were two independent statements, so a crash between them could persist a FRAUD status with
  // a stale (not yet penalized) confidence_score. Throwing inside the callback (the CAS-lost
  // case below) rolls back automatically — no separate rollback logic needed.
  const updated = await prisma.$transaction(async (tx) => {
    // Compare-and-swap, not a plain update: a plain update after only reading `current` above
    // is a read-then-write race — two concurrent PATCHes (two authority users, or a
    // double-click) could both read the same `current.status`, both pass the transition check,
    // and the second write would silently clobber the first with no error. The `where` clause
    // below makes the write only succeed if the status is still what we just checked;
    // updateMany's count tells us if we lost the race, surfaced as the same
    // InvalidStatusTransitionError a real illegal transition would produce — from the caller's
    // perspective it's indistinguishable ("someone already moved this event on") and doesn't
    // need its own error type.
    const { count } = await tx.event.updateMany({
      where: { id: eventId, status: current.status },
      data: { status: targetStatus },
    });
    if (count === 0) {
      throw new InvalidStatusTransitionError(current.status, targetStatus);
    }

    // Confidence Engine v2's formula references status for both the authority-confirmation
    // bonus (VERIFIED/ESCALATED/IN_PROGRESS/RESOLVED) and the FRAUD penalty — unlike v1, where
    // only the FRAUD transition mattered, every status transition can now change the score.
    await recalculateConfidence(eventId, tx);

    return tx.event.findUniqueOrThrow({ where: { id: eventId } });
  });

  invalidateListCache();

  // Unlike createEvent, this used to deliberately not broadcast (a new WS payload shape
  // public-map didn't handle). Confirmed safe to enable: public-map's WS handler is a plain
  // `if (data.type === 'NEW_EVENT')`, so an unrecognized type is silently ignored, not an
  // error. public-map picking this up on the map is still its own future change.
  broadcast({
    type: 'EVENT_UPDATED',
    payload: {
      id: updated.id,
      status: updated.status,
      updated_at: updated.updated_at,
      confidence_score: updated.confidence_score,
    },
  });

  return updated;
}
