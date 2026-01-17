'use client'

import { useState } from 'react'
import {
    useCities,
    useCreateCity,
    useDeleteCity,
    usePlatformUsers,
    useDeletePlatformUser,
} from '@/hooks/use-rbac'
import {
    Buildings,
    Plus,
    Trash,
    User,
    EnvelopeSimple,
    X,
    UserCirclePlus,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { createClient } from '@/lib/supabase/client'

interface AdminPanelDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function AdminPanelDialog({ open, onOpenChange }: AdminPanelDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Admin Panel</DialogTitle>
                    <DialogDescription>
                        Manage cities and local leads
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="cities" className="mt-4">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="cities" className="gap-2">
                            <Buildings className="size-4" />
                            Cities
                        </TabsTrigger>
                        <TabsTrigger value="leads" className="gap-2">
                            <User className="size-4" />
                            Local Leads
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="cities" className="mt-4">
                        <CitiesTab />
                    </TabsContent>

                    <TabsContent value="leads" className="mt-4">
                        <LocalLeadsTab />
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}

// ============================================
// Cities Tab
// ============================================
function CitiesTab() {
    const { data: cities, isLoading } = useCities()
    const createCity = useCreateCity()
    const deleteCity = useDeleteCity()
    const [newCityName, setNewCityName] = useState('')
    const [deleteCityId, setDeleteCityId] = useState<string | null>(null)

    const handleAddCity = async () => {
        if (!newCityName.trim()) return
        await createCity.mutateAsync({ name: newCityName.trim() })
        setNewCityName('')
    }

    const handleDeleteCity = async () => {
        if (!deleteCityId) return
        await deleteCity.mutateAsync(deleteCityId)
        setDeleteCityId(null)
    }

    return (
        <div className="space-y-4">
            {/* Add City */}
            <div className="flex gap-2">
                <Input
                    placeholder="City name..."
                    value={newCityName}
                    onChange={(e) => setNewCityName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCity()}
                />
                <Button
                    onClick={handleAddCity}
                    disabled={!newCityName.trim() || createCity.isPending}
                    className="gap-2"
                >
                    <Plus className="size-4" />
                    Add
                </Button>
            </div>

            {/* Cities List */}
            <div className="space-y-2">
                {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : !cities || cities.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No cities yet. Add one above.
                    </div>
                ) : (
                    cities.map((city) => (
                        <div
                            key={city.id}
                            className="flex items-center justify-between p-3 border rounded-none"
                        >
                            <div className="flex items-center gap-2">
                                <Buildings className="size-4 text-muted-foreground" />
                                <span className="font-medium">{city.name}</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setDeleteCityId(city.id)}
                                className="text-destructive hover:text-destructive"
                            >
                                <Trash className="size-4" />
                            </Button>
                        </div>
                    ))
                )}
            </div>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteCityId} onOpenChange={(open) => !open && setDeleteCityId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete City?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove the city and may affect local leads assigned to it.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteCity}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

// ============================================
// Local Leads Tab
// ============================================
function LocalLeadsTab() {
    const { data: cities } = useCities()
    const { data: platformUsers, isLoading } = usePlatformUsers()
    const deletePlatformUser = useDeletePlatformUser()
    const [inviteOpen, setInviteOpen] = useState(false)
    const [deleteUserId, setDeleteUserId] = useState<string | null>(null)

    // Filter to only show admins (local leads)
    const localLeads = platformUsers?.filter(u => u.role === 'admin') || []

    const handleDeleteUser = async () => {
        if (!deleteUserId) return
        await deletePlatformUser.mutateAsync(deleteUserId)
        setDeleteUserId(null)
    }

    return (
        <div className="space-y-4">
            {/* Invite Button */}
            <Button onClick={() => setInviteOpen(true)} className="gap-2 w-full">
                <UserCirclePlus className="size-4" />
                Invite Local Lead
            </Button>

            {/* Leads List */}
            <div className="space-y-2">
                {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : localLeads.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No local leads yet. Invite one above.
                    </div>
                ) : (
                    localLeads.map((lead) => (
                        <div
                            key={lead.id}
                            className="flex items-center justify-between p-3 border rounded-none"
                        >
                            <div className="flex items-center gap-3">
                                <div className="size-8 rounded-full bg-muted flex items-center justify-center">
                                    <User className="size-4" />
                                </div>
                                <div>
                                    <div className="font-medium">User ID: {lead.user_id.slice(0, 8)}...</div>
                                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Buildings className="size-3" />
                                        {lead.city?.name || 'No city assigned'}
                                    </div>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setDeleteUserId(lead.id)}
                                className="text-destructive hover:text-destructive"
                            >
                                <Trash className="size-4" />
                            </Button>
                        </div>
                    ))
                )}
            </div>

            {/* Invite Dialog */}
            <InviteLeadDialog
                open={inviteOpen}
                onOpenChange={setInviteOpen}
                cities={cities || []}
            />

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Local Lead?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove their admin access. They'll need to be re-invited.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteUser}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

// ============================================
// Invite Lead Dialog
// ============================================
interface InviteLeadDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    cities: { id: string; name: string }[]
}

function InviteLeadDialog({ open, onOpenChange, cities }: InviteLeadDialogProps) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [selectedCityId, setSelectedCityId] = useState<string>('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const handleInvite = async () => {
        if (!email || !password || !selectedCityId) return

        setIsSubmitting(true)
        setError(null)

        try {
            // Create user via API
            const response = await fetch('/api/admin/invite-lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    cityId: selectedCityId,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to invite lead')
            }

            setSuccess(true)
            setTimeout(() => {
                onOpenChange(false)
                setEmail('')
                setPassword('')
                setSelectedCityId('')
                setSuccess(false)
            }, 1500)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to invite')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Invite Local Lead</DialogTitle>
                    <DialogDescription>
                        Create a new local lead account for a city
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Email</label>
                        <Input
                            type="email"
                            placeholder="lead@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Password</label>
                        <Input
                            type="text"
                            placeholder="Temporary password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">City</label>
                        <Select value={selectedCityId} onValueChange={setSelectedCityId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a city" />
                            </SelectTrigger>
                            <SelectContent>
                                {cities.map((city) => (
                                    <SelectItem key={city.id} value={city.id}>
                                        {city.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {error && (
                        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-none">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="p-3 bg-green-500/10 text-green-600 text-sm rounded-none">
                            ✓ Local lead invited successfully!
                        </div>
                    )}
                </div>

                <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleInvite}
                        disabled={!email || !password || !selectedCityId || isSubmitting}
                    >
                        {isSubmitting ? 'Inviting...' : 'Invite'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
