export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-8 py-4">
        <span className="font-bold text-lg">MenuCast</span>
      </nav>
      <main>{children}</main>
    </div>
  )
}
