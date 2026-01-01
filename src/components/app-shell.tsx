'use client'

import { useState } from 'react'
import { SidebarProvider, SidebarInset, SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { CreateEventDialog } from '@/components/create-event-dialog'
import { SettingsDialog } from '@/components/settings-dialog'
import { useUserSettings } from '@/hooks/use-settings'
import { useAppStore } from '@/lib/store'

function AppHeader() {
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'
  
  return (
    <header 
      className="fixed top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b bg-background px-4 transition-[left] duration-200 ease-linear" 
      style={{ 
        left: isCollapsed ? 'var(--sidebar-width-icon)' : 'var(--sidebar-width)', 
        right: 0 
      }}
    >
      <SidebarTrigger className="-ml-1" />
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Event Manager</span>
      </div>
    </header>
  )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [createEventOpen, setCreateEventOpen] = useState(false)
  
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed)
  const setSidebarCollapsed = useAppStore((state) => state.setSidebarCollapsed)

  // Load user settings on mount
  useUserSettings()

  return (
    <SidebarProvider 
      open={!sidebarCollapsed}
      onOpenChange={(open) => setSidebarCollapsed(!open)}
    >
      <AppSidebar 
        onOpenSettings={() => setSettingsOpen(true)}
        onCreateEvent={() => setCreateEventOpen(true)}
      />
      <SidebarInset>
        <AppHeader />
        <main className="flex flex-1 flex-col overflow-hidden" style={{ marginTop: '3rem' }}>
          {children}
        </main>
      </SidebarInset>
      
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <CreateEventDialog open={createEventOpen} onOpenChange={setCreateEventOpen} />
    </SidebarProvider>
  )
}
