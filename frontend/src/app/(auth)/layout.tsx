export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-dvh w-full relative flex flex-col overflow-hidden">
      {/* BACKGROUND IMAGE */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/backend/background.jpg')",
          backgroundAttachment: 'fixed',
        }}
      />

      {/* DARK OVERLAY - Gradient for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />

      {/* CONTENT - Relative positioning above background */}
      <div className="relative z-10 flex flex-col w-full min-h-dvh">
        {children}
      </div>
    </div>
  )
}