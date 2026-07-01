"use client"

import dynamic from 'next/dynamic'

const MapInner = dynamic(() => import('./MapInner'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-black flex flex-col items-center justify-center gap-4">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white animate-spin rounded-full" />
      <div className="text-white text-[10px] font-black tracking-[0.4em] uppercase opacity-50">
        Initializing_Satellite_Link
      </div>
    </div>
  )
})

export default MapInner
