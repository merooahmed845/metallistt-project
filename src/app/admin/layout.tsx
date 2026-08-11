import { requireAdmin } from '@/lib/auth/authorization'

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  await requireAdmin()

  return children
}
