# Prisma Integration Guide

This project uses **Prisma ORM 7** with **Supabase PostgreSQL** for type-safe database access.

## 🎯 Setup Complete

Prisma has been successfully integrated with the following configuration:

- **ORM**: Prisma 7.2.0
- **Database**: Supabase PostgreSQL
- **Adapter**: @prisma/adapter-pg (required for Prisma 7)
- **Connection**: PostgreSQL connection pooling via Supabase

## 📂 Key Files

```
prisma/
  ├── schema.prisma          # Database schema (auto-generated from Supabase)
  ├── migrations/            # Migration history
prisma.config.ts             # Prisma configuration
src/lib/prisma.ts            # Prisma Client singleton instance
src/lib/prisma-examples.ts   # Usage examples and patterns
```

## 🚀 Usage

### 1. Import Prisma Client

```typescript
import { prisma } from '@/lib/prisma'
```

### 2. Query Examples

#### Find Many
```typescript
const events = await prisma.events.findMany({
  where: { organizer_id: userId },
  include: {
    calendars: true,
    event_members: true,
  },
  orderBy: { created_at: 'desc' },
})
```

#### Create
```typescript
const event = await prisma.events.create({
  data: {
    name: 'My Event',
    organizer_id: userId,
    start_date: new Date(),
  },
})
```

#### Update
```typescript
const updated = await prisma.events.update({
  where: { id: eventId },
  data: { name: 'Updated Name' },
})
```

#### Delete
```typescript
await prisma.events.delete({
  where: { id: eventId },
})
```

## 🔧 Available Scripts

```bash
# Pull schema changes from database
pnpm db:pull

# Push schema changes to database
pnpm db:push

# Regenerate Prisma Client
pnpm db:generate

# Open Prisma Studio (database GUI)
pnpm db:studio
```

## 🧪 Testing

Test API endpoints have been created to verify the integration:

### Test Prisma Connection
```bash
curl http://localhost:3000/api/test-prisma
```

Returns:
- Organizer count
- Event count
- Recent events with relations
- Database information

### Events API (Prisma-powered)
```bash
# Get all events
curl http://localhost:3000/api/events-prisma

# Get events for specific organizer
curl http://localhost:3000/api/events-prisma?organizerId=<uuid>

# Create new event
curl -X POST http://localhost:3000/api/events-prisma \
  -H "Content-Type: application/json" \
  -d '{
    "organizer_id": "<uuid>",
    "name": "New Event",
    "description": "Event description",
    "start_date": "2026-01-15",
    "end_date": "2026-01-17"
  }'
```

## 📊 Database Models

Prisma automatically introspected **31 models** from your Supabase database:

### Core Models (Public Schema)
- `organizers` - Event organizers/users
- `events` - Main events
- `calendars` - Calendar configurations
- `calendar_events` - Calendar entries
- `tasks` - Task management
- `task_columns` - Task organization
- `event_members` - Event membership
- `event_teams` - Teams within events
- `team_members` - Team member assignments
- `event_invites` - Invitation system
- `user_settings` - User preferences

### Auth Models (Auth Schema)
- `users` - Supabase auth users
- `sessions` - User sessions
- `identities` - OAuth identities
- And more...

## 🔐 Environment Variables

The following are configured in `.env.local`:

```env
DATABASE_URL="postgres://..."  # Connection pooling (port 6543)
DIRECT_URL="postgres://..."    # Direct connection (port 5432)
```

- `DATABASE_URL`: Used by Prisma Client for queries (transaction pooling)
- `DIRECT_URL`: Used by Prisma CLI for migrations (direct connection)

## 🎨 Type Safety

Prisma provides full TypeScript support:

```typescript
// Auto-completion and type checking
const event: {
  id: string
  name: string
  description: string | null
  organizers: {
    email: string
    display_name: string | null
  }
} = await prisma.events.findUnique({
  where: { id: eventId },
  include: {
    organizers: {
      select: {
        email: true,
        display_name: true,
      },
    },
  },
})
```

## 🔄 Updating Schema

When your Supabase schema changes:

1. **Pull latest schema:**
   ```bash
   pnpm db:pull
   ```

2. **Regenerate types:**
   ```bash
   pnpm db:generate
   ```

3. **Restart dev server:**
   ```bash
   pnpm run dev
   ```

## 🤝 Using with Supabase

Prisma and Supabase work together:

- **Prisma**: Type-safe queries, migrations, better DX
- **Supabase**: Auth, RLS, real-time, storage, edge functions

You can use both in the same project:
- Use Prisma for complex queries and data modeling
- Use Supabase Client for auth, real-time, and RLS-protected queries

## 📝 Best Practices

1. **Use the singleton instance** from `src/lib/prisma.ts`
2. **Don't create multiple PrismaClient instances** (causes connection pool exhaustion)
3. **Use `include` and `select`** for efficient data fetching
4. **Use transactions** for multi-step operations
5. **Handle errors** appropriately in production

## 🐛 Troubleshooting

### Connection Issues
- Ensure `DATABASE_URL` is correct in `.env.local`
- Check Supabase project is not paused
- Verify network connectivity

### Type Errors
- Run `pnpm db:generate` after schema changes
- Restart TypeScript server in VS Code

### Migration Issues
- Use `DIRECT_URL` for migrations (non-pooled connection)
- Ensure you have database permissions

## 📚 Learn More

- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma with Supabase](https://www.prisma.io/docs/guides/supabase)
- [Prisma with Next.js](https://www.prisma.io/docs/guides/nextjs)

## ✅ Verified Working

- ✅ Database connection
- ✅ Query execution
- ✅ Type generation
- ✅ Relations and includes
- ✅ Aggregate queries
- ✅ Multi-schema support (auth + public)
- ✅ SSL/TLS connection to Supabase
- ✅ Connection pooling
