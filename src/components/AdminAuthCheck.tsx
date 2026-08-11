'use client'

export default function AdminAuthCheck({ children }: { children: React.ReactNode }) {
  // Authorization is enforced by src/app/admin/layout.tsx on the server.
  // This component remains temporarily to avoid changing the existing admin UI.
  return children
}
