export const CATEGORY_REGISTRY = {
  POTHOLE:                  { label: 'Pothole',        color: '#f97316' },
  GARBAGE:                  { label: 'Garbage',        color: '#22c55e' },
  WATER_LOGGING:            { label: 'Water Logging',  color: '#3b82f6' },
  TRAFFIC_INCIDENT:         { label: 'Traffic',        color: '#ef4444' },
  STREET_LIGHT_FAILURE:     { label: 'Street Light',   color: '#eab308' },
  UNAUTHORIZED_CONSTRUCTION:{ label: 'Construction',   color: '#8b5cf6' },
  OTHER:                    { label: 'Other',          color: '#71717a' },
} as const;

export type EventCategory = keyof typeof CATEGORY_REGISTRY;

export const CATEGORY_KEYS = Object.keys(CATEGORY_REGISTRY) as EventCategory[];

export function getCategoryColor(type: string): string {
  return (CATEGORY_REGISTRY as any)[type]?.color ?? CATEGORY_REGISTRY.OTHER.color;
}

export function getCategoryLabel(type: string): string {
  return (CATEGORY_REGISTRY as any)[type]?.label ?? type;
}
