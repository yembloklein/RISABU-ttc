"use client"

import React from 'react'

interface FinancialStatementProps {
  student: any
  ledger: any[]
  stats: any
}

import { OfficialSignature } from '@/components/ui/signature'

export const FinancialStatement = React.forwardRef<HTMLDivElement, FinancialStatementProps>(
  ({ student, ledger, stats }, ref) => {

    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    const isCleared = stats.balance <= 0

    // Build chronological running balance per transaction
    const chronological = [...ledger].sort((a, b) => (a.sortDate || 0) - (b.sortDate || 0))
    const balanceMap: Record<string, number> = {}
    let running = 0
    for (const item of chronological) {
      if (item.ledgerType === 'invoice') running += Number(item.amount) || 0
      else running -= Number(item.amount) || 0
      balanceMap[item.id] = Math.max(0, running)
    }

    // Display newest-first
    const displayLedger = [...ledger].sort((a, b) => (b.sortDate || 0) - (a.sortDate || 0))

    const sans = "'Arial', 'Helvetica Neue', sans-serif"
    const serif = "'Georgia', 'Times New Roman', serif"

    return (
      <div ref={ref} style={{ fontFamily: serif, backgroundColor: '#ffffff', width: '100%', maxWidth: '860px', margin: '0 auto', color: '#111827' }}>

        {/* ── Top green bar ── */}
        <div style={{ height: '8px', background: 'linear-gradient(90deg, #14532d 0%, #16a34a 50%, #14532d 100%)' }} />

        <div style={{ padding: '32px 40px 28px', border: '1px solid #d1d5db', borderTop: 'none' }}>

          {/* ── HEADER ── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', paddingBottom: '20px', borderBottom: '2px solid #111827' }}>
            <tbody>
              <tr>
                {/* Logo + School */}
                <td style={{ verticalAlign: 'middle', paddingBottom: '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <img src="/risabuu.png" alt="Risabu TTC" width={64} height={64} style={{ objectFit: 'contain', display: 'block' }} />
                    <div>
                      <div style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#14532d', lineHeight: 1.1, fontFamily: serif }}>
                        Risabu TTC
                      </div>
                      <div style={{ fontSize: '10px', fontFamily: sans, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#166534', marginTop: '4px' }}>
                        Technical Training College
                      </div>
                      <div style={{ fontSize: '9px', fontFamily: sans, color: '#6b7280', marginTop: '3px', lineHeight: 1.6 }}>
                        P.O. Box 00100, Nairobi, Kenya<br />
                        Tel: +254 705 493 567 &nbsp;|&nbsp; info@risabutechnicaltrainingcollege.co.ke
                      </div>
                    </div>
                  </div>
                </td>

                {/* Document title block */}
                <td style={{ verticalAlign: 'middle', textAlign: 'right', paddingBottom: '0' }}>
                  <div style={{
                    display: 'inline-block',
                    border: '2px solid #14532d',
                    padding: '10px 20px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontFamily: sans, fontSize: '9px', fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#166534', marginBottom: '4px' }}>
                      Official Document
                    </div>
                    <div style={{ fontFamily: serif, fontSize: '18px', fontWeight: 900, color: '#14532d', letterSpacing: '0.04em', lineHeight: 1.1 }}>
                      Fee Statement
                    </div>
                    <div style={{ fontFamily: sans, fontSize: '9px', color: '#6b7280', marginTop: '6px', lineHeight: 1.7 }}>
                      <div>Generated: <b style={{ color: '#111827' }}>{today}</b></div>
                      <div>Ref: <b style={{ color: '#111827', fontFamily: 'monospace' }}>FS-{student?.admissionNumber || 'N/A'}</b></div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── STUDENT DETAILS + SUMMARY ── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', border: '1.5px solid #111827' }}>
            <tbody>
              <tr>
                {/* Student info */}
                <td style={{ width: '50%', padding: '0', verticalAlign: 'top', borderRight: '1.5px solid #111827' }}>
                  <div style={{ backgroundColor: '#14532d', padding: '6px 12px' }}>
                    <span style={{ fontFamily: sans, fontSize: '8.5px', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#bbf7d0' }}>
                      Student Account Details
                    </span>
                  </div>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: '17px', fontWeight: 900, color: '#14532d', marginBottom: '10px', fontFamily: serif }}>
                      {student?.firstName} {student?.lastName}
                    </div>
                    <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                      <tbody>
                        {[
                          ['Admission No.', student?.admissionNumber || 'N/A'],
                          ['Programme', student?.appliedCourse || 'N/A'],
                          ['Email', student?.contactEmail || 'N/A'],
                        ].map(([k, v]) => (
                          <tr key={k}>
                            <td style={{ fontFamily: sans, fontSize: '9.5px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '3px 12px 3px 0', width: '38%' }}>{k}</td>
                            <td style={{ fontFamily: sans, fontSize: '11px', fontWeight: 700, color: '#111827', padding: '3px 0' }}>{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </td>

                {/* Financial summary */}
                <td style={{ width: '50%', padding: '0', verticalAlign: 'top' }}>
                  <div style={{ backgroundColor: '#14532d', padding: '6px 12px' }}>
                    <span style={{ fontFamily: sans, fontSize: '8.5px', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#bbf7d0' }}>
                      Account Summary
                    </span>
                  </div>
                  <div style={{ padding: '14px 16px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ fontFamily: sans, fontSize: '9.5px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '5px 0' }}>Total Programme Fee</td>
                          <td style={{ fontFamily: sans, fontSize: '13px', fontWeight: 800, color: '#111827', textAlign: 'right', padding: '5px 0' }}>KES {stats.totalInvoiced.toLocaleString()}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ fontFamily: sans, fontSize: '9.5px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '5px 0' }}>Total Paid</td>
                          <td style={{ fontFamily: sans, fontSize: '13px', fontWeight: 800, color: '#15803d', textAlign: 'right', padding: '5px 0' }}>KES {stats.totalPaid.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td style={{ fontFamily: sans, fontSize: '9.5px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '5px 0' }}>Outstanding Balance</td>
                          <td style={{ fontFamily: sans, fontSize: '14px', fontWeight: 900, color: isCleared ? '#15803d' : '#b91c1c', textAlign: 'right', padding: '5px 0' }}>
                            {isCleared ? '✓ NIL' : `KES ${stats.balance.toLocaleString()}`}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── TRANSACTION TABLE ── */}
          <div style={{ marginBottom: '28px' }}>
            {/* Section heading */}
            <div style={{
              fontFamily: sans, fontSize: '8.5px', fontWeight: 800,
              letterSpacing: '0.2em', textTransform: 'uppercase', color: '#ffffff',
              backgroundColor: '#14532d', padding: '6px 12px', marginBottom: '0',
            }}>
              Transaction History
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', border: '1.5px solid #14532d' }}>
              <thead>
                <tr style={{ backgroundColor: '#166534' }}>
                  {[
                    { label: 'Date', align: 'left', w: '15%' },
                    { label: 'Reference', align: 'left', w: '20%' },
                    { label: 'Description', align: 'left', w: '33%' },
                    { label: 'Debit (KES)', align: 'right', w: '14%' },
                    { label: 'Credit (KES)', align: 'right', w: '14%' },
                    { label: 'Balance (KES)', align: 'right', w: '4%' },
                  ].map(col => (
                    <th key={col.label} style={{
                      padding: '9px 10px',
                      fontFamily: sans, fontSize: '8px', fontWeight: 800,
                      letterSpacing: '0.12em', textTransform: 'uppercase',
                      color: '#ffffff', textAlign: col.align as any,
                      width: col.w, borderRight: '1px solid #14532d',
                    }}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayLedger.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '28px', textAlign: 'center', fontFamily: sans, fontSize: '12px', color: '#6b7280', borderTop: '1px solid #d1fae5' }}>
                      No transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  displayLedger.map((item, idx) => {
                    const bal = balanceMap[item.id]
                    const isPayment = item.ledgerType === 'payment'
                    const rowBg = idx % 2 === 0 ? '#ffffff' : '#f0fdf4'
                    return (
                      <tr key={item.id || idx} style={{ backgroundColor: rowBg, borderTop: '1px solid #d1fae5' }}>
                        <td style={{ padding: '8px 10px', fontFamily: sans, fontSize: '11px', color: '#111827', borderRight: '1px solid #d1fae5', whiteSpace: 'nowrap' }}>
                          {item.date ? new Date(item.date).toLocaleDateString('en-GB') : '—'}
                        </td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '10px', color: '#14532d', fontWeight: 700, borderRight: '1px solid #d1fae5' }}>
                          {item.transactionReference || item.invoiceNumber || '—'}
                        </td>
                        <td style={{ padding: '8px 10px', fontFamily: sans, fontSize: '11px', fontWeight: 600, color: '#111827', borderRight: '1px solid #d1fae5' }}>
                          {item.description || (isPayment ? 'Fee Payment' : 'Tuition Fee Charge')}
                        </td>

                        {/* Debit — black */}
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: sans, fontWeight: 700, fontSize: '12px', color: '#111827', borderRight: '1px solid #d1fae5' }}>
                          {!isPayment ? Number(item.amount).toLocaleString() : ''}
                        </td>
                        {/* Credit — green */}
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: sans, fontWeight: 700, fontSize: '12px', color: '#14532d', borderRight: '1px solid #d1fae5' }}>
                          {isPayment ? Number(item.amount).toLocaleString() : ''}
                        </td>
                        {/* Running balance — black */}
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: sans, fontWeight: 800, fontSize: '12px', color: '#111827' }}>
                          {bal !== undefined ? bal.toLocaleString() : '—'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>

              {/* Totals footer */}
              <tfoot>
                <tr style={{ backgroundColor: '#14532d', borderTop: '2px solid #14532d' }}>
                  <td colSpan={3} style={{ padding: '10px 12px', fontFamily: sans, fontSize: '9px', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#ffffff' }}>
                    Account Totals
                  </td>
                  <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: sans, fontWeight: 900, fontSize: '13px', color: '#ffffff', borderRight: '1px solid #166534' }}>
                    {stats.totalInvoiced.toLocaleString()}
                  </td>
                  <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: sans, fontWeight: 900, fontSize: '13px', color: '#ffffff', borderRight: '1px solid #166534' }}>
                    {stats.totalPaid.toLocaleString()}
                  </td>
                  <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: sans, fontWeight: 900, fontSize: '14px', color: '#ffffff' }}>
                    {isCleared ? 'NIL' : stats.balance.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ── DECLARATION + SIGNATURE ── */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
            paddingTop: '18px', borderTop: '1.5px solid #111827',
            marginBottom: '20px',
          }}>
            {/* Declaration */}
            <div style={{ maxWidth: '380px' }}>
              <div style={{ fontFamily: sans, fontSize: '8px', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#14532d', marginBottom: '8px' }}>
                Declaration
              </div>
              <p style={{ fontFamily: sans, fontSize: '9.5px', color: '#4b5563', lineHeight: 1.8, margin: 0, fontStyle: 'italic' }}>
                This statement is an official record of all financial transactions for the above-named
                student with Risabu TTC. For any discrepancies, please contact the Finance Office
                within <b>7 working days</b> of this date of issue.
              </p>
            </div>

            {/* Signature */}
            <div>
              <OfficialSignature role="Finance Director" subLabel="Risabu TTC · Digitally Signed" width={170} />
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            paddingTop: '12px', borderTop: '1px solid #d1d5db',
          }}>
            {/* Stamp */}
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              border: '2px solid #14532d', opacity: 0.25,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <img src="/risabuu.png" alt="" width={38} height={38} style={{ objectFit: 'contain' }} />
            </div>

            <div style={{ textAlign: 'center', fontFamily: sans, fontSize: '8.5px', color: '#6b7280', lineHeight: 1.8 }}>
              <div style={{ fontWeight: 700, color: '#14532d' }}>
                Risabu Technical Training College &nbsp;|&nbsp; Nairobi, Kenya
              </div>
              <div>
                Tel: +254 705 493 567 &nbsp;|&nbsp; info@risabutechnicaltrainingcollege.co.ke
              </div>
              <div style={{ color: '#9ca3af', marginTop: '2px' }}>
                Generated {today} &nbsp;·&nbsp; Ref: FS-{student?.admissionNumber || 'N/A'} &nbsp;·&nbsp; This is a computer-generated document
              </div>
            </div>

          </div>

        </div>

        {/* ── Bottom green bar ── */}
        <div style={{ height: '8px', background: 'linear-gradient(90deg, #14532d 0%, #16a34a 50%, #14532d 100%)' }} />
      </div>
    )
  })

FinancialStatement.displayName = 'FinancialStatement'
