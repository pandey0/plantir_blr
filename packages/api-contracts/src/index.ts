// Explicit named re-exports, not `export *` — ts-proto duplicates shared plumbing
// types (DeepPartial, Exact, MessageFns, protobufPackage) into every generated
// file, which collide on wildcard re-export. None of those are meaningful to
// consumers of this package anyway; only message/enum names are re-exported here.

export {
  Event,
  EventCategory,
  EventStatus,
  eventCategoryFromJSON,
  eventCategoryToJSON,
  eventStatusFromJSON,
  eventStatusToJSON,
} from './generated/plantir/events/v1/event.js';

export { CreateEventRequest, CreateEventResponse } from './generated/plantir/events/v1/create_event.js';
export { ListEventsRequest, ListEventsResponse } from './generated/plantir/events/v1/list_events.js';
export { UpdateEventStatusRequest, UpdateEventStatusResponse } from './generated/plantir/events/v1/update_event_status.js';

export {
  Arrival,
  TransitMode,
  ArrivalStatus,
  transitModeFromJSON,
  transitModeToJSON,
  arrivalStatusFromJSON,
  arrivalStatusToJSON,
} from './generated/plantir/transit/v1/arrival.js';

export { GetArrivalsRequest, GetArrivalsResponse } from './generated/plantir/transit/v1/get_arrivals.js';
export { GetFareEstimateRequest, GetFareEstimateResponse } from './generated/plantir/transit/v1/get_fare_estimate.js';

export * from './schemas.js';
