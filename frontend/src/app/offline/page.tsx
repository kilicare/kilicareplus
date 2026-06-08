'use client'

export default function OfflinePage() {
  return (
    <div
      style={{
        background: '#0A0A0F',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '20px',
        color: '#F0F0F5',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div>
        <div style={{ fontSize: 64, marginBottom: 20 }}>📡</div>
        <h1 style={{ color: '#F5A623', fontSize: 28, fontWeight: 900, marginBottom: 10 }}>
          Hakuna Mtandao
        </h1>
        <p style={{ color: '#8B8BA7', marginBottom: 24, maxWidth: 300 }}>
          Tafadhali unganisha na mtandao ili kutumia KilicareGO+
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: 'linear-gradient(135deg,#F5A623,#E8892A)',
            color: '#000',
            border: 'none',
            padding: '12px 28px',
            borderRadius: 14,
            fontWeight: 900,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Jaribu Tena
        </button>
      </div>
    </div>
  )
}