"use client"

import React from 'react';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Calendar, 
  User, 
  BookOpen, 
  ShieldCheck,
  Award
} from 'lucide-react';
import { Logo } from '@/components/ui/logo';

interface AdmissionLetterProps {
  student: any;
  program: any;
  templateImageUrl?: string;
}

export const AdmissionLetter = React.forwardRef<HTMLDivElement, AdmissionLetterProps>(({ student, program, templateImageUrl }, ref) => {
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Theme Color: Deep Emerald Green
  const themeGreen = "#059669";
  const lightGreen = "#ecfdf5";

  if (templateImageUrl) {
    return (
      <div ref={ref} className="relative w-[793px] h-[1122px] mx-auto bg-white overflow-hidden text-slate-900 font-serif print:m-0">
        {/* Letterhead Background */}
        <img 
          src={templateImageUrl} 
          alt="Official Template" 
          className="absolute inset-0 w-full h-full object-cover z-0" 
          crossOrigin="anonymous"
        />
        
        {/* 
          Letter Content Container 
          Positioned using exact pixels for a 793x1122 A4 page.
          Top: 260px (Leaves ample room for school header)
          Left/Right: 85px (Standard 1-inch margins)
          Bottom: 100px (Leaves room for footer)
        */}
        <div className="absolute z-10 text-[15px] leading-[1.6] text-slate-800 flex flex-col" style={{ top: '260px', left: '85px', right: '85px', bottom: '100px' }}>
          
          <div className="flex justify-between items-end mb-10">
            <div>
              <p className="font-bold text-slate-900 tracking-wide">REF: {student.admissionNumber || 'RTTC/ADM/TEMP'}</p>
            </div>
            <div>
              <p className="font-bold text-slate-900 tracking-wide">DATE: {today}</p>
            </div>
          </div>
          
          <p className="font-bold text-[17px] mb-6 text-slate-900">Dear {student.firstName} {student.lastName},</p>
          
          <div className="space-y-5 flex-1 text-justify">
            <p>
              Congratulations! We are pleased to inform you that you have been offered admission to 
              <strong className="text-slate-900 font-bold"> Risabu Technical Training College</strong>.
            </p>

            <p>
              You have been selected to pursue <strong className="text-slate-900 font-bold">{student.appliedCourse || program?.name || 'your chosen program'}</strong>. 
              Your application and academic record demonstrated a commitment to excellence that aligns perfectly with our institutional values.
            </p>

            {/* Admission Details Table */}
            <div className="my-8">
              <h3 className="font-bold text-slate-900 mb-2 uppercase text-sm tracking-widest text-center">Admission Details</h3>
              <div className="border-t-2 border-b-2 border-slate-800 py-3 bg-slate-50/50">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="py-2.5 font-bold text-slate-700 w-2/5 pl-2">Admitted Program:</td>
                      <td className="py-2.5 font-bold text-slate-900">{student.appliedCourse || program?.name || 'General'}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-2.5 font-bold text-slate-700 w-2/5 pl-2">Intake Period:</td>
                      <td className="py-2.5 font-bold text-slate-900">May 2026 Intake</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="py-2.5 font-bold text-slate-700 w-2/5 pl-2">Reporting Date:</td>
                      <td className="py-2.5 font-bold text-slate-900">{student.admissionDate || today}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-bold text-slate-700 w-2/5 pl-2">Student ID:</td>
                      <td className="py-2.5 font-bold text-slate-900">{student.admissionNumber || 'Pending Registration'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <p>
              You are required to report for orientation and registration on the date indicated above. 
              Please ensure you bring your original academic certificates, your national ID, and the required fee payment as outlined in the fee structure.
            </p>
            
            <p>
              We look forward to welcoming you to our vibrant academic community and seeing you excel in your chosen field of study.
            </p>
          </div>

          {/* Signatures */}
          <div className="mt-4 pt-4">
            <p className="mb-10">Yours Sincerely,</p>
            <div className="h-12 w-56 border-b border-slate-800 relative mb-2">
              {/* Fake signature placeholder */}
              <svg className="absolute bottom-1 left-2 h-16 w-32 text-slate-800 opacity-60" viewBox="0 0 100 40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 20c10-15 20 10 30-5s20 15 30-5 20 15 25 5" />
              </svg>
            </div>
            <p className="font-bold text-slate-900 uppercase text-xs tracking-widest mt-3">Office of the Registrar</p>
            <p className="text-[11px] text-slate-600 uppercase">Risabu Technical Training College</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="bg-white p-12 max-w-[850px] mx-auto text-slate-800 font-serif leading-relaxed shadow-2xl relative overflow-hidden">
      {/* Decorative Border */}
      <div className="absolute top-0 left-0 w-full h-2 bg-emerald-600" />
      <div className="absolute bottom-0 left-0 w-full h-2 bg-emerald-600" />
      
      {/* Header Section */}
      <div className="flex justify-between items-center mb-10 pb-8 border-b border-slate-100">
        <div className="flex items-center gap-5">
          <div className="h-20 w-20 bg-white rounded-2xl flex items-center justify-center shadow-lg ring-1 ring-slate-100 overflow-hidden p-1">
            <Logo size={80} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-emerald-900 tracking-tighter uppercase leading-none">Risabu Technical</h1>
            <p className="text-sm font-bold text-emerald-600 uppercase tracking-[0.2em] mt-1">Training College • Excellence</p>
          </div>
        </div>
        
        <div className="text-right space-y-1.5">
          <div className="flex items-center justify-end gap-2 text-[11px] font-sans font-bold text-slate-500 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Accredited Institution</span>
          </div>
          <div className="text-[10px] font-sans font-medium text-slate-400 leading-tight">
            <p className="flex items-center justify-end gap-1"><MapPin size={10} className="text-emerald-600" /> P.O. Box 12345-00100, Nairobi</p>
            <p className="flex items-center justify-end gap-1"><Phone size={10} className="text-emerald-600" /> +254 700 000 000</p>
            <p className="flex items-center justify-end gap-1"><Mail size={10} className="text-emerald-600" /> admissions@risabu.ac.ke</p>
          </div>
        </div>
      </div>

      {/* Title Card */}
      <div className="mb-10 flex justify-between items-end">
        <div>
          <p className="text-emerald-600 font-sans font-black text-[10px] uppercase tracking-widest mb-1">Official Document</p>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Admission Notification</h2>
        </div>
        <div className="text-right font-sans">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Document Ref</p>
          <p className="text-sm font-black text-emerald-600">{student.admissionNumber || 'RTTC/ADM/TEMP'}</p>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-12 gap-10">
        {/* Sidebar info */}
        <div className="col-span-4 space-y-6">
          <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 shadow-sm">
            <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm mb-4">
              <Award size={24} />
            </div>
            <h3 className="font-sans font-black text-emerald-900 text-xs uppercase tracking-wider mb-4 border-b border-emerald-200 pb-2">Student Profile</h3>
            <div className="space-y-4 font-sans">
              <div>
                <p className="text-[9px] font-bold text-emerald-600 uppercase mb-0.5">Full Name</p>
                <p className="text-sm font-bold text-slate-900 leading-tight">{student.firstName} {student.lastName}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-emerald-600 uppercase mb-0.5">National ID</p>
                <p className="text-sm font-bold text-slate-900 leading-tight">{student.nationalId || 'Verified'}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-emerald-600 uppercase mb-0.5">Course Code</p>
                <p className="text-sm font-bold text-slate-900 leading-tight">{program?.code || 'REG-ICT-01'}</p>
              </div>
            </div>
          </div>

          <div className="px-6 space-y-4">
             <div className="flex items-center gap-3">
                <Calendar size={16} className="text-emerald-600" />
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Issue Date</p>
                  <p className="text-xs font-bold text-slate-700">{today}</p>
                </div>
             </div>
             <div className="flex items-center gap-3">
                <BookOpen size={16} className="text-emerald-600" />
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Department</p>
                  <p className="text-xs font-bold text-slate-700">{program?.department || 'Main Campus'}</p>
                </div>
             </div>
          </div>
        </div>

        {/* Letter Body */}
        <div className="col-span-8 text-[15px] space-y-5 text-slate-700">
          <p className="font-bold text-slate-900">Dear {student.firstName},</p>
          
          <p>
            Congratulations! I am delighted to offer you admission to 
            <strong> Risabu Technical Training College</strong> for the 2026 Academic Year.
          </p>

          <p>
            You have been selected to pursue a <strong>{student.appliedCourse}</strong>. Your performance 
            and application demonstrated a commitment to excellence that aligns with our college values.
          </p>

          <div className="bg-slate-50 border-l-4 border-emerald-600 p-5 italic text-sm">
            "Your journey to technical expertise and professional growth begins here. Welcome to the Risabu family."
          </div>

          <p>
            You are required to report for orientation and registration on <strong>{student.admissionDate || today}</strong>. 
            Please ensure you have your original academic certificates and the first semester fee receipt as per the fee structure provided.
          </p>

          <p>
            Congratulations on your admission, and we look forward to seeing you excel in your chosen field of study.
          </p>

          <div className="pt-10 flex items-center justify-between">
            <div className="space-y-1">
              <div className="h-12 w-48 border-b border-slate-900 relative overflow-hidden">
                <span className="absolute bottom-1 left-2 font-cursive text-3xl text-emerald-800 opacity-40 select-none">Registrar</span>
              </div>
              <p className="text-[11px] font-black uppercase text-emerald-900 tracking-widest">Office of the Registrar</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Risabu Technical Training College</p>
            </div>
            
            <div className="h-20 w-20 opacity-10 grayscale">
               <Logo size={80} />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-16 pt-8 border-t border-slate-100 flex justify-between items-center">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter flex items-center gap-1 italic">
          <ShieldCheck size={12} className="text-emerald-400" />
          Verified Digital Document • ID: {student.id?.substring(0,12)}
        </p>
        <p className="text-[10px] font-sans font-black text-emerald-700 uppercase tracking-widest">
          Build Your Future
        </p>
      </div>
    </div>
  );
});

AdmissionLetter.displayName = 'AdmissionLetter';
