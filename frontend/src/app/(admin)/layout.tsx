import { Providers } from '@/components/Providers'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <Providers>{children}</Providers>
}