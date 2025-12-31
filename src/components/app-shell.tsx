'use client'

import { useState } from 'react'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { CreateEventDialog } from '@/components/create-event-dialog'
import { SettingsDialog } from '@/components/settings-dialog'
import { useUserSettings } from '@/hooks/use-settings'
import { useAppStore } from '@/lib/store'

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
        <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Event Manager</span>
          </div>
        </header>
        <div className="flex flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </SidebarInset>
      
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <CreateEventDialog open={createEventOpen} onOpenChange={setCreateEventOpen} />
    </SidebarProvider>
  )
}
