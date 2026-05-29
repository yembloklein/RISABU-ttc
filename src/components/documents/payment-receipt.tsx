"use client"

import React from 'react'
import { OfficialSignature } from '@/components/ui/signature'

interface PaymentReceiptProps {
  student: any
  payment: any
  allPayments?: any[]
  totalInvoiced?: number
  templateImageUrl?: string
}

export const PaymentReceipt = React.forwardRef<HTMLDivElement, PaymentReceiptProps>(
  ({ student, payment, allPayments = [], totalInvoiced = 0, templateImageUrl }, ref) => {

    const today = new Date().toLocaleDateString('en-GB', {
      day: '2-digit', month: 'long', year: 'numeric'
    })

    const parsedPaymentDate = payment.paymentDate
      ? new Date(payment.paymentDate).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'long', year: 'numeric'
      })
      : today

    const receiptNo = payment.transactionReference || payment.id?.slice(0, 8).toUpperCase() || '—'

    const runningBalance = (() => {
      const sorted = [...allPayments]
        .filter(p => p.type === 'Fee')
        .sort((a, b) => {
          const da = a.paymentDate ? new Date(a.paymentDate).getTime() : (a.createdAt?.toMillis?.() || 0)
          const db = b.paymentDate ? new Date(b.paymentDate).getTime() : (b.createdAt?.toMillis?.() || 0)
          return da - db
        })
      let cumulative = 0
      for (const p of sorted) {
        cumulative += Number(p.amount) || 0
        if (p.id === payment.id) break
      }
      return Math.max(0, totalInvoiced - cumulative)
    })()

    const academicYear = (() => {
      const d = payment.paymentDate ? new Date(payment.paymentDate) : new Date()
      const y = d.getFullYear()
      return d.getMonth() >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`
    })()

    return (
      <div
        ref={ref}
        style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          backgroundColor: '#ffffff',
          width: '794px', // Standard A4 width at 96 DPI
          minHeight: '1123px', // Standard A4 height at 96 DPI
          margin: '0 auto',
          color: '#1e293b',
          boxSizing: 'border-box',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.03)',
        }}
      >
        {/* Top Decorative Border Stripe */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '8px', background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)' }} />

        {/* Content Wrapper */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1, zIndex: 10 }}>
          
          {/* Institution Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '48px', marginTop: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <img src="/risabuu.png" alt="Risabu TTC Logo" width={64} height={64} style={{ objectFit: 'contain' }} />
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', margin: '0 0 2px 0', letterSpacing: '-0.02em' }}>RISABU TTC</h1>
                <p style={{ fontSize: '11px', color: '#059669', margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Technical Training College</p>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 0 0', fontWeight: 500 }}>PO Box 12345-00100, Nairobi, Kenya</p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.03em', textTransform: 'uppercase' }}>Receipt</h2>
              <div style={{ backgroundColor: '#ecfdf5', color: '#065f46', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, display: 'inline-block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Official Copy
              </div>
            </div>
          </div>

          {/* Key Details Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', padding: '20px 0', marginBottom: '40px' }}>
            <div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Receipt No.</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{receiptNo}</span>
            </div>
            <div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Date Issued</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>{parsedPaymentDate}</span>
            </div>
            <div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Method</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>{payment.paymentMethod || 'M-Pesa'}</span>
            </div>
            <div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>Acad. Year</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>{academicYear}</span>
            </div>
          </div>

          {/* Student Info (Billing / Receipt Target) */}
          <div style={{ backgroundColor: '#f8fafc', borderLeft: '4px solid #10b981', padding: '24px', borderRadius: '0 12px 12px 0', marginBottom: '40px' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>Student Profile</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>{student?.firstName} {student?.lastName}</h3>
                <p style={{ fontSize: '13px', color: '#475569', margin: 0, fontWeight: 500 }}>
                  <strong style={{ color: '#0f172a' }}>Course:</strong> {student?.appliedCourse || 'General Studies'}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 4px 0', fontWeight: 500 }}>
                  <strong style={{ color: '#0f172a' }}>Admission No:</strong> {student?.admissionNumber || 'N/A'}
                </p>
                <p style={{ fontSize: '13px', color: '#475569', margin: 0, fontWeight: 500 }}>
                  <strong style={{ color: '#0f172a' }}>Status:</strong> Active Scholar
                </p>
              </div>
            </div>
          </div>

          {/* Transaction Ledger Table */}
          <div style={{ marginBottom: '40px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 800 }}>Description</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 800 }}>Ref Reference</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 800 }}>Paid (KES)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '24px 16px', fontSize: '14px', color: '#0f172a', fontWeight: 700 }}>
                    {payment.description || 'Tuition Fee Payment'}
                  </td>
                  <td style={{ padding: '24px 16px', fontSize: '14px', color: '#475569', textAlign: 'center', fontFamily: 'monospace', fontWeight: 600 }}>
                    {payment.transactionReference || 'N/A'}
                  </td>
                  <td style={{ padding: '24px 16px', fontSize: '14px', color: '#0f172a', textAlign: 'right', fontWeight: 800 }}>
                    {Number(payment.amount).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bottom Grid: Terms & Total Summary */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '48px', marginBottom: '48px' }}>
            {/* Terms and Conditions block */}
            <div style={{ flex: 1.2 }}>
              <h4 style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0f172a', marginBottom: '12px' }}>Important Policy</h4>
              <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.5, display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#10b981', fontWeight: 900 }}>•</span>
                  All college payments are strictly non-refundable and non-transferable.
                </li>
                <li style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.5, display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#10b981', fontWeight: 900 }}>•</span>
                  Please retain this computer-generated receipt for clearance and exam processing.
                </li>
              </ul>
            </div>

            {/* Receipt Summary Totals */}
            <div style={{ flex: 0.8, borderTop: '3px solid #10b981', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px', color: '#475569' }}>
                <span style={{ fontWeight: 600 }}>Subtotal:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>KES {Number(payment.amount).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '13px', color: '#475569', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontWeight: 600 }}>Remaining Balance:</span>
                <span style={{ fontWeight: 700, color: runningBalance <= 0 ? '#10b981' : '#ef4444' }}>
                  {runningBalance <= 0 ? 'CLEARED' : `KES ${runningBalance.toLocaleString()}`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Grand Total</span>
                <span style={{ fontSize: '24px', fontWeight: 900, color: '#059669', letterSpacing: '-0.02em' }}>KES {Number(payment.amount).toLocaleString()}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Area */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '24px', marginTop: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
            <div>
              <p style={{ fontSize: '10px', color: '#94a3b8', margin: 0, fontWeight: 500 }}>
                This is a digitally issued official document of Risabu TTC. Valid without physical stamp.
              </p>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <OfficialSignature role="Finance Officer" subLabel="Risabu TTC" width={120} />
              <p style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a', margin: '4px 0 0 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Finance Office
              </p>
            </div>
          </div>

          {/* Contact coordinates bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8', fontWeight: 600, borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
            <span>Tel: +254 705 493 567</span>
            <span>Email: info@risabuttc.co.ke</span>
            <span>Website: www.risabuttc.co.ke</span>
            <span>Nairobi, Kenya</span>
          </div>
        </div>

      </div>
    )
  })

PaymentReceipt.displayName = 'PaymentReceipt'
