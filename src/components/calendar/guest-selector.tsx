'use client'

import * as React from 'react'
import { Combobox, ComboboxInput, ComboboxList, ComboboxItem, ComboboxContent, ComboboxEmpty, ComboboxChips, ComboboxChip, ComboboxChipsInput } from '@/components/ui/combobox'
import { useSearchUsers } from '@/hooks/use-search-users'
import { Check, X } from '@phosphor-icons/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface GuestSelectorProps {
    value: string[]
    onValueChange: (value: string[]) => void
}

export function GuestSelector({ value, onValueChange }: GuestSelectorProps) {
    const [inputValue, setInputValue] = React.useState('')
    const { data: users = [], isLoading } = useSearchUsers(inputValue)

    const handleValueChange = (newValue: string[]) => {
        onValueChange(newValue)
        setInputValue('')
    }

    // Filter out users already selected
    const availableUsers = users.filter(user => !value.includes(user.email))

    // Check if input is a valid email
    const isValidEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }

    const showCreateOption = inputValue && isValidEmail(inputValue) && !users.some(u => u.email === inputValue) && !value.includes(inputValue)

    return (
        <Combobox value={value} onValueChange={handleValueChange} multiple>
            <div className="relative">
                <ComboboxChips className="flex-wrap gap-1 p-1">
                    {value.map((email) => (
                        <ComboboxChip key={email} className="bg-primary/10 text-primary border-primary/20">
                            {email}
                        </ComboboxChip>
                    ))}
                    <ComboboxChipsInput
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={value.length === 0 ? "Add guests..." : ""}
                        className="flex-1 min-w-[120px]"
                    />
                </ComboboxChips>

                <ComboboxContent className="w-[var(--radix-popover-trigger-width)] min-w-[300px] p-0">
                    <ComboboxList>
                        {isLoading && (
                            <div className="p-2 text-sm text-muted-foreground text-center">Searching...</div>
                        )}

                        {!isLoading && availableUsers.length === 0 && !showCreateOption && (
                            <ComboboxEmpty className="py-2 text-sm text-muted-foreground text-center">
                                No users found. Type an email to invite.
                            </ComboboxEmpty>
                        )}

                        {availableUsers.map((user) => (
                            <ComboboxItem key={user.id} value={user.email} className="flex items-center gap-2 p-2">
                                <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-[10px]">
                                        {user.display_name?.slice(0, 2).toUpperCase() || user.email.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium">{user.display_name || 'Unknown'}</span>
                                    <span className="text-xs text-muted-foreground">{user.email}</span>
                                </div>
                            </ComboboxItem>
                        ))}

                        {showCreateOption && (
                            <ComboboxItem value={inputValue} className="flex items-center gap-2 p-2">
                                <span className="text-sm">Invite <strong>{inputValue}</strong></span>
                            </ComboboxItem>
                        )}
                    </ComboboxList>
                </ComboboxContent>
            </div>
        </Combobox>
    )
}
