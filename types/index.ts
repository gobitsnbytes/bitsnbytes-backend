import { UserRole } from "@prisma/client"

declare module "next-auth" {
  interface User {
    role: UserRole
    id: string
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: UserRole
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole
    id: string
  }
}

export type TaskCategory = "EVENT_SETUP" | "SPONSORSHIP" | "TECH" | "LOGISTICS" | "GRAPHICS" | "OUTREACH"
export type TaskStatus = "PENDING" | "IN_PROGRESS" | "BLOCKED" | "DONE"
export type GraphicsStatus = "REQUESTED" | "DESIGNING" | "REVIEW" | "APPROVED" | "DELIVERED"
export type OutreachStatus = "PENDING" | "SCHEDULED" | "PUBLISHED" | "FAILED"
export type LogisticsStatus = "NOT_READY" | "READY" | "ISSUE"

