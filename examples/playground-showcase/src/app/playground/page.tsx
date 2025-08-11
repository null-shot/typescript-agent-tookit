'use client'

import { PlaygroundProvider, Playground } from '@xava-labs/playground'
import '@xava-labs/playground/styles'

export default function PlaygroundPage() {
  return (
    <div className="min-h-screen bg-background">
      <PlaygroundProvider 
        config={{
          mcpProxyUrl: 'http://localhost:6050',
          mcpProxyWsUrl: 'ws://localhost:6050/client/ws',
          theme: 'dark',
          enabledFeatures: {
            chat: true,
            mcpServerDirectory: true,
            modelSelector: true,
          },
        }}
        imageAssets={{
          defaultAvatar: '/images/default-avatar.png',
          badgeLightBg: '/images/badge_light_bg.png', 
          gears: '/images/gears.png',
          cursorLogo: '/images/cursor-logo.svg',
          ellipse: '/images/ellipse.svg'
        }}
      >
        <Playground 
          className="h-screen"
          layout="horizontal"
          showModelSelector={true}
          showMCPDirectory={true}
        />
      </PlaygroundProvider>
    </div>
  )
} 