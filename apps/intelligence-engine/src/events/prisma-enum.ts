import { EventCategory as PrismaEventCategory, EventStatus as PrismaEventStatus } from '@prisma/client';
import type { EventCategory as ApiEventCategory, EventStatus as ApiEventStatus } from '@plantir/api-contracts';

// The one place @plantir/api-contracts' generated enums cross into @prisma/client's.
// Both are TS string enums with identical member names/values by design (see
// proto/plantir/events/v1/event.proto's comment) — but TS string enums are nominally
// typed, not structurally, so a plain value from one isn't assignable to the other
// without a boundary conversion. This indexes into Prisma's enum object by string key,
// which is type-checked (a typo here is a compile error, unlike `as unknown as X`).
export function toPrismaCategory(category: ApiEventCategory): PrismaEventCategory {
  return PrismaEventCategory[category as unknown as keyof typeof PrismaEventCategory];
}

export function toPrismaStatus(status: ApiEventStatus): PrismaEventStatus {
  return PrismaEventStatus[status as unknown as keyof typeof PrismaEventStatus];
}
