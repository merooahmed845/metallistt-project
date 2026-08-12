import { requireAdmin } from '@/lib/auth/authorization'
import AdminShell from '@/components/admin/AdminShell'

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  await requireAdmin()

  return <AdminShell>{children}</AdminShell>
}