'use client'

import { Sun, Moon, Desktop, GoogleLogo, Link as LinkIcon, LinkBreak } from '@phosphor-icons/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAppStore, type ThemePreference } from '@/lib/store'
import { useUpdateUserSettings } from '@/hooks/use-settings'
import { useGoogleConnection, useDisconnectGoogle } from '@/hooks/use-google-calendar'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const themes: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Light', icon: <Sun className="size-5" /> },
  { value: 'dark', label: 'Dark', icon: <Moon className="size-5" /> },
  { value: 'system', label: 'System', icon: <Desktop className="size-5" /> },
]

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const themePreference = useAppStore((state) => state.themePreference)
  const setThemePreference = useAppStore((state) => state.setThemePreference)
  const updateSettings = useUpdateUserSettings()
  const { data: googleConnection, isLoading: isLoadingGoogle } = useGoogleConnection()
  const disconnectGoogle = useDisconnectGoogle()

  const handleThemeChange = (theme: ThemePreference) => {
    setThemePreference(theme)
    updateSettings.mutate({ theme_preference: theme })
  }

  const handleConnectGoogle = () => {
    // Redirect to Google OAuth flow
    window.location.href = '/api/google/auth'
  }

  const handleDisconnectGoogle = () => {
    disconnectGoogle.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Customize your experience
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Theme Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Theme</Label>
              <p className="text-xs text-muted-foreground">
                Select your preferred theme. System matches your OS setting.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {themes.map((theme) => (
                <button
                  key={theme.value}
                  onClick={() => handleThemeChange(theme.value)}
                  disabled={updateSettings.isPending}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-none border p-4 transition-colors disabled:opacity-50',
                    themePreference === theme.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted'
                  )}
                >
                  <div className={cn(
                    'flex size-10 items-center justify-center rounded-none',
                    themePreference === theme.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}>
                    {theme.icon}
                  </div>
                  <span className="text-xs font-medium">{theme.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Google Calendar Section */}
          <div className="space-y-4 border-t pt-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <GoogleLogo className="size-4" weight="bold" />
                Google Calendar
              </Label>
              <p className="text-xs text-muted-foreground">
                Connect your Google Calendar to sync events and create Google Meet links.
              </p>
            </div>

            {isLoadingGoogle ? (
              <div className="flex items-center gap-3 p-4 border rounded-none bg-muted/30">
                <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm text-muted-foreground">Checking connection...</span>
              </div>
            ) : googleConnection?.connected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-4 border rounded-none bg-green-500/10 border-green-500/30">
                  <LinkIcon className="size-5 text-green-600" weight="bold" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Connected</p>
                    <p className="text-xs text-muted-foreground">
                      Calendar: {googleConnection.calendarId || 'Primary'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnectGoogle}
                  disabled={disconnectGoogle.isPending}
                  className="w-full"
                >
                  <LinkBreak className="size-4 mr-2" />
                  {disconnectGoogle.isPending ? 'Disconnecting...' : 'Disconnect Google Calendar'}
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={handleConnectGoogle}
                className="w-full"
              >
                <GoogleLogo className="size-4 mr-2" weight="bold" />
                Connect Google Calendar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

