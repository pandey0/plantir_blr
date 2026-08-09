"use client"

import { useState, useEffect, useRef, useMemo } from 'react'
import Map from '@/components/Map'
import { CommandHUD } from '@/components/HUD/CommandHUD'
import { ActiveStack } from '@/components/HUD/ActiveStack'
import { ContextPanel } from '@/components/HUD/ContextPanel'
import { TopBar } from '@/components/TopBar'
import { EventTicker } from '@/components/EventTicker'
import { DOMAIN_REGISTRY, LAYER_REGISTRY, LayerNode, DomainNode } from '@/lib/layers'
import { DEFAULT_VISUAL, VisualState } from '@/components/VisualControls'
import { BANGALORE_HIERARCHY } from '@/lib/hierarchy'
import { HierarchyType } from '@/lib/geo-utils'
import { MapActions } from '@/components/Map/MapInner'
import { DisplayControl } from '@/components/DisplayControl'
import { listEvents, getWsUrl, type MapEvent } from '@/lib/api'

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [domains, setDomains] = useState<DomainNode[]>(DOMAIN_REGISTRY)
  const [baseLayers, setBaseLayers] = useState<LayerNode[]>(LAYER_REGISTRY)
  const [events, setEvents] = useState<MapEvent[]>([])
  const [visuals, setVisuals] = useState<VisualState>(DEFAULT_VISUAL)
  const [wsConnected, setWsConnected] = useState(false)

  // Corp filter — set by map drill-down
  const [activeCorpId, setActiveCorpId] = useState<string | null>(null)

  // Category filter
  const [categoryFilter, setCategoryFilter] = useState('ALL')

  // Drill state mirrored from MapInner
  const [currentLevel, setCurrentLevel] = useState<HierarchyType>('CORP')
  const [activeName, setActiveName] = useState('GREATER_BENGALURU')

  const mapActionsRef = useRef<MapActions | null>(null)

  // Random constituency enrichment — the engine has no ward/constituency data on an Event (see
  // apps/intelligence-engine/src/wards/README.md: wardId is a read-side FILTER, never written
  // back onto the event), so this is a deliberate placeholder to let corp-zone filtering
  // (activeCorpId) work against something until that's wired up for real. Pre-existing
  // behavior, applied consistently to both WS-pushed and GET-hydrated events below — not
  // something this change introduces or fixes.
  function randomConstituency(): string {
    const constituencies = BANGALORE_HIERARCHY.flatMap(c => c.constituencies)
    return constituencies[Math.floor(Math.random() * constituencies.length)]
  }

  useEffect(() => {
    setMounted(true)

    // Initial hydration — previously this app only ever learned about events via WS NEW_EVENT
    // pushes, so a page refresh showed zero events until new ones streamed in. See
    // docs/architecture/IMPLEMENTATION_NOTES.md's "Coordinates missing from read responses"
    // note for the engine-side fix (attachCoordinates()) this depends on.
    listEvents({ limit: 20 })
      .then(({ events: hydrated }) => {
        setEvents(hydrated.map(e => ({ ...e, constituency: randomConstituency() })))
      })
      .catch(() => {
        // Engine unreachable on load — non-fatal, WS will populate events as they arrive live,
        // same degraded-but-usable behavior this app already had before hydration existed.
      })

    const socket = new WebSocket(getWsUrl())
    socket.onopen = () => setWsConnected(true)
    socket.onclose = () => setWsConnected(false)
    socket.onerror = () => setWsConnected(false)
    socket.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data)
        if (data.type === 'NEW_EVENT') {
          const enriched = { ...data.payload, constituency: data.payload.constituency || randomConstituency() }
          setEvents(prev => [enriched, ...prev].slice(0, 20))
        } else if (data.type === 'EVENT_UPDATED') {
          // Status/confidence change, or a duplicate-detection merge on an existing event (see
          // docs/api/intelligence-engine.md's GET /ws section) — payload has no lat/lng/category,
          // so this can only ever update an event already in state, never add a new marker.
          setEvents(prev => prev.map(e =>
            e.id === data.payload.id
              ? { ...e, status: data.payload.status, confidence_score: data.payload.confidence_score ?? e.confidence_score }
              : e
          ))
        }
      } catch (e) {}
    }
    return () => socket.close()
  }, [])

  const handleToggleLayer = (id: string, visible: boolean) => {
    setDomains(prev => prev.map(d => ({
      ...d,
      layers: d.layers.map(l => l.id === id ? { ...l, visible } : l)
    })))
    setBaseLayers(prev => prev.map(n => {
      if (n.id === id) return { ...n, visible }
      if (n.children) return { ...n, children: n.children.map(c => c.id === id ? { ...c, visible } : c) }
      return n
    }))
  }

  const handleFlush = () => {
    setActiveCorpId(null)
    setDomains(prev => prev.map(d => ({
      ...d,
      layers: d.layers.map(l => ({ ...l, visible: false }))
    })))
  }

  // Filter by corp zone + category
  const filteredEvents = useMemo(() => {
    let result = events
    if (activeCorpId) {
      const corp = BANGALORE_HIERARCHY.find(c => c.id === activeCorpId)
      if (corp) result = result.filter(e => !!e.constituency && corp.constituencies.includes(e.constituency))
    }
    if (categoryFilter !== 'ALL') {
      result = result.filter(e => e.type === categoryFilter)
    }
    return result
  }, [events, activeCorpId, categoryFilter])

  const allLayers = [
    ...baseLayers,
    ...domains.flatMap(d => d.layers)
  ]

  if (!mounted) return <div className="h-screen w-screen bg-black" />

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black text-white font-sans antialiased">

      {/* TOP BAR */}
      <TopBar
        currentLevel={currentLevel}
        activeName={activeName}
        corpId={activeCorpId}
        onRetract={() => mapActionsRef.current?.retract()}
        eventCount={filteredEvents.length}
        wsConnected={wsConnected}
        categoryFilter={categoryFilter}
        onCategoryFilter={setCategoryFilter}
      />

      {/* MAP — inset below TopBar and above EventTicker */}
      <div className="absolute top-12 left-0 right-0 bottom-16 z-0">
        <Map
          layers={allLayers}
          events={filteredEvents}
          visuals={visuals}
          onCorpDrill={(id: string | null) => setActiveCorpId(id)}
          onLevelChange={(level: HierarchyType, name: string) => { setCurrentLevel(level); setActiveName(name); }}
          mapActionsRef={mapActionsRef}
        />
      </div>

      {/* Subtle edge vignette */}
      <div className="absolute top-12 left-0 right-0 bottom-16 pointer-events-none z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_60%,rgba(0,0,0,0.15)_100%)]" />
      </div>

      {/* COMMAND HUD — layer/domain controls */}
      <CommandHUD
        layers={allLayers}
        domains={domains}
        onToggleLayer={handleToggleLayer}
        visuals={visuals}
        onVisualChange={setVisuals}
        events={events}
      />

      {/* CONTEXT PANEL — slides in when drilled to WARD/BLOCK */}
      <ContextPanel
        level={currentLevel}
        name={activeName}
        corpId={activeCorpId}
        events={filteredEvents}
        onRetract={() => mapActionsRef.current?.retract()}
      />

      {/* DISPLAY CONTROL — floating above zoom */}
      <DisplayControl visuals={visuals} onChange={setVisuals} />

      {/* ACTIVE LAYERS BAR */}
      <ActiveStack
        layers={allLayers}
        onToggleLayer={handleToggleLayer}
        onFlush={handleFlush}
      />

      {/* EVENT TICKER */}
      <EventTicker
        events={filteredEvents}
        onEngage={(event) => {
          if (event.latitude && event.longitude) {
            mapActionsRef.current?.flyTo(event.latitude, event.longitude, 15)
          }
        }}
      />

      {/* CRT scanline overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025] z-[200] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />

    </main>
  )
}
