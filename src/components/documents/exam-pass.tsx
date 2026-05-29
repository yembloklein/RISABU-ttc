"use client"

import React from 'react'
import { OfficialSignature } from '@/components/ui/signature'

interface ExamPassProps {
  student: any
  program: any
  templateImageUrl?: string
  semester?: string
  academicYear?: string
}

export const ExamPass = React.forwardRef<HTMLDivElement, ExamPassProps>(
  ({ student, program, templateImageUrl, semester = "Semester 1", academicYear = "2026/2027" }, ref) => {
    
    const today = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })

    const studentName = `${student?.firstName || ''} ${student?.lastName || ''}`.trim() || 'Student Name'
    const admNo = student?.admissionNumber || 'RTTC/ADM/PENDING'
    const courseName = program?.name || student?.appliedCourse || 'Registered Course'

    return (
      <div
        ref={ref}
        style={{
          fontFamily: "'Times New Roman', Times, serif",
          backgroundColor: '#ffffff',
          width: '794px', // Standard A4 width at 96 DPI
          minHeight: '1123px', // Standard A4 height at 96 DPI
          margin: '0 auto',
          color: '#000000',
          boxSizing: 'border-box',
          position: 'relative',
          padding: '48px 64px',
          border: '1px solid #ffffff', // Invisible border to prevent margin collapse
          overflow: 'hidden'
        }}
      >
        {templateImageUrl && (
          <img 
            src={templateImageUrl} 
            alt="Official Background Template" 
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} 
            crossOrigin="anonymous"
          />
        )}

        {/* Outer decorative border for the page */}
        {!templateImageUrl && (
          <>
            <div style={{ position: 'absolute', top: '16px', left: '16px', right: '16px', bottom: '16px', border: '2px solid #1e293b', pointerEvents: 'none', zIndex: 1 }} />
            <div style={{ position: 'absolute', top: '20px', left: '20px', right: '20px', bottom: '20px', border: '1px solid #cbd5e1', pointerEvents: 'none', zIndex: 1 }} />
          </>
        )}

        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #065f46', paddingBottom: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <img src="/risabuu.png" alt="Risabu TTC Logo" width={80} height={80} style={{ objectFit: 'contain' }} />
              <div>
                <h1 style={{ fontSize: '28px', fontWeight: 900, margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.02em', color: '#065f46' }}>Risabu TTC</h1>
                <p style={{ fontSize: '13px', margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#059669' }}>Technical Training College</p>
                <p style={{ fontSize: '12px', margin: '4px 0 0 0', fontStyle: 'italic', color: '#065f46' }}>P.O. Box 12345 - 00100, Nairobi</p>
              </div>
            </div>
            <div style={{ width: '100px', height: '120px', border: '2px solid #94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Passport</span>
              <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Photo</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px 0', textDecoration: 'underline', color: '#065f46' }}>Official Examination Pass</h2>
          </div>

          {/* Student Information Section */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '32px', fontFamily: "'Inter', system-ui, sans-serif" }}>
            <tbody>
              <tr>
                <td style={{ padding: '12px 16px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', width: '30%', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase' }}>Candidate Name:</td>
                <td style={{ padding: '12px 16px', border: '1px solid #cbd5e1', fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>{studentName}</td>
              </tr>
              <tr>
                <td style={{ padding: '12px 16px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase' }}>Admission Number:</td>
                <td style={{ padding: '12px 16px', border: '1px solid #cbd5e1', fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>{admNo}</td>
              </tr>
              <tr>
                <td style={{ padding: '12px 16px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase' }}>Programme / Course:</td>
                <td style={{ padding: '12px 16px', border: '1px solid #cbd5e1', fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>{courseName}</td>
              </tr>
            </tbody>
          </table>

          {/* Verification Box */}
          <div style={{ border: '2px dashed #059669', backgroundColor: '#ecfdf5', padding: '24px', textAlign: 'center', marginBottom: '40px', position: 'relative', overflow: 'hidden' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#065f46', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Financial Clearance Verified</h3>
            <p style={{ fontSize: '14px', color: '#047857', margin: 0, fontWeight: 500 }}>This candidate has fulfilled all financial obligations and is officially authorized to sit for the registered examinations.</p>
            {/* Watermark inside the box */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-15deg)', fontSize: '80px', fontWeight: 900, color: '#10b981', opacity: 0.1, pointerEvents: 'none', letterSpacing: '0.1em' }}>
              CLEARED
            </div>
          </div>

          {/* Modules/Units (Placeholder area for realism) */}
          <div style={{ marginBottom: '40px', fontFamily: "'Inter', system-ui, sans-serif" }}>
            <h4 style={{ fontSize: '14px', fontWeight: 800, borderBottom: '1px solid #1e293b', paddingBottom: '8px', marginBottom: '16px', textTransform: 'uppercase' }}>Registered Modules / Units</h4>
            <div style={{ border: '1px solid #cbd5e1', padding: '16px', textAlign: 'center', backgroundColor: '#f8fafc', color: '#64748b', fontStyle: 'italic', fontSize: '13px' }}>
              All officially registered modules for {semester}
            </div>
          </div>

          {/* Exam Rules */}
          <div style={{ marginBottom: '48px', flex: 1 }}>
            <h4 style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '12px', textDecoration: 'underline' }}>Rules to Candidates</h4>
            <ol style={{ margin: 0, paddingLeft: '24px', fontSize: '12.5px', lineHeight: 1.6, textAlign: 'justify' }}>
              <li style={{ marginBottom: '6px' }}>Candidates must present this Examination Pass and their original Student ID Card at the entrance of the examination hall.</li>
              <li style={{ marginBottom: '6px' }}>Candidates should be seated in the examination hall 15 minutes before the scheduled start time. No candidate will be allowed in 30 minutes after the exam has commenced.</li>
              <li style={{ marginBottom: '6px' }}>Mobile phones, smartwatches, and any unauthorized electronic devices or materials are strictly prohibited.</li>
              <li style={{ marginBottom: '6px' }}>Candidates must not communicate with one another during the examination. Any form of malpractice will lead to immediate disqualification.</li>
              <li style={{ marginBottom: '6px' }}>This pass is non-transferable and must not be altered in any way.</li>
            </ol>
          </div>

          {/* Signatures */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #cbd5e1', paddingTop: '32px' }}>
            <div style={{ width: '200px', textAlign: 'center' }}>
              <div style={{ borderBottom: '1px solid #1e293b', height: '40px', marginBottom: '8px' }}></div>
              <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>Candidate's Signature</span>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
                <OfficialSignature role="Registrar (AA)" subLabel="Risabu TTC" width={150} />
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>Registrar, Academic Affairs</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '32px', fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
            Document generated securely on {today}. Ref: EX-{admNo.replace(/\//g, '')}
          </div>

        </div>
      </div>
    )
  }
)

ExamPass.displayName = 'ExamPass'
