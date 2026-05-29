'use client'

interface OfficialSignatureProps {
  role?: string
  subLabel?: string
  width?: number
}

export function OfficialSignature({
  role = 'Finance Officer',
  subLabel = 'Risabu TTC · Digitally Signed',
  width = 160,
}: OfficialSignatureProps) {
  return (
    <div style={{ display: 'inline-block', textAlign: 'left' }}>
      {/* Signature image */}
      <div style={{ marginBottom: '4px', height: '56px' }}>
        <img
          src="/signature.png"
          alt="Official Signature"
          crossOrigin="anonymous"
          style={{
            display: 'block',
            width: `${width}px`,
            height: '56px',
            objectFit: 'contain',
            objectPosition: 'left center',
          }}
        />
      </div>

      {/* Ruled line + labels */}
      <div style={{
        borderTop: '1px solid #166534',
        paddingTop: '5px',
        width: `${width}px`,
      }}>
        <div style={{
          fontFamily: "'Arial', 'Helvetica Neue', sans-serif",
          fontSize: '8.5px',
          fontWeight: 800,
          letterSpacing: '0.15em',
          textTransform: 'uppercase' as const,
          color: '#14532d',
        }}>
          {role}
        </div>
        <div style={{
          fontFamily: "'Arial', 'Helvetica Neue', sans-serif",
          fontSize: '8px',
          color: '#4b7a5a',
          marginTop: '1px',
        }}>
          {subLabel}
        </div>
      </div>
    </div>
  )
}
