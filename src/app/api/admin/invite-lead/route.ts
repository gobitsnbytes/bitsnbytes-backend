import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
    try {
        const { email, password, cityId } = await request.json()

        if (!email || !password || !cityId) {
            return NextResponse.json(
                { error: 'Email, password, and city are required' },
                { status: 400 }
            )
        }

        // Check if current user is sudo
        const serverSupabase = await createServerClient()
        const { data: { user } } = await serverSupabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: platformUser } = await serverSupabase
            .from('platform_users')
            .select('role')
            .eq('user_id', user.id)
            .single()

        if (platformUser?.role !== 'sudo') {
            return NextResponse.json({ error: 'Only sudo can invite leads' }, { status: 403 })
        }

        // Create admin client to create users
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.backend_SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Create the user in auth
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Skip email verification
        })

        if (createError) {
            console.error('Failed to create user:', createError)
            return NextResponse.json(
                { error: createError.message },
                { status: 400 }
            )
        }

        // Create organizer record
        const { error: organizerError } = await supabaseAdmin
            .from('organizers')
            .insert({
                auth_user_id: newUser.user.id,
                email: email,
                display_name: email.split('@')[0],
            })

        if (organizerError) {
            console.error('Failed to create organizer:', organizerError)
        }

        // Create platform_user with admin role
        const { error: platformError } = await supabaseAdmin
            .from('platform_users')
            .insert({
                user_id: newUser.user.id,
                role: 'admin',
                city_id: cityId,
            })

        if (platformError) {
            console.error('Failed to create platform user:', platformError)
            // Clean up: delete the auth user
            await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
            return NextResponse.json(
                { error: 'Failed to assign role' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            userId: newUser.user.id,
            email: email,
        })
    } catch (error) {
        console.error('Invite lead error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
