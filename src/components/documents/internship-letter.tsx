"use client"

import React from 'react';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  Briefcase, 
  ShieldCheck
} from 'lucide-react';
import { Logo } from '@/components/ui/logo';

interface InternshipLetterProps {
  student: any;
  program: any;
  templateImageUrl?: string;
}

export const InternshipLetter = React.forwardRef<HTMLDivElement, InternshipLetterProps>(({ student, program, templateImageUrl }, ref) => {
  const today = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  if (templateImageUrl) {
    return (
      <div ref={ref} className="relative w-[793px] h-[1122px] mx-auto bg-white overflow-hidden text-slate-900 font-serif print:m-0">
        <img 
          src={templateImageUrl} 
          alt="Official Template" 
          className="absolute inset-0 w-full h-full object-cover z-0" 
          crossOrigin="anonymous"
        />
        
        <div className="absolute z-10 top-[28%] left-[12%] right-[12%] text-lg leading-relaxed text-slate-800">
          <div className="flex justify-between items-end mb-8">
            <div>
              <p className="font-bold">Ref: RTTC/IND/{new Date().getFullYear()}/{student.admissionNumber?.split('/').pop() || '001'}</p>
            </div>
            <div>
              <p className="font-bold">Date: {today}</p>
            </div>
          </div>
          
          <h2 className="font-bold text-xl uppercase mb-6 underline">TO WHOM IT MAY CONCERN</h2>
          
          <h3 className="font-bold text-lg mb-4 uppercase text-center">RE: REQUEST FOR INDUSTRIAL ATTACHMENT</h3>

          <p className="mb-6">
            This is to certify that <strong>{student.firstName} {student.lastName}</strong>, Admission Number 
            <strong> {student.admissionNumber || 'N/A'}</strong>, is a bonafide student of Risabu Technical Training College.
          </p>

          <p className="mb-6">
            The student is currently pursuing a course in <strong>{program?.name || student.appliedCourse || 'their respective department'}</strong>. 
            As part of the academic curriculum, students are required to undertake a mandatory industrial attachment 
            for a period of at least three (3) months to gain practical, hands-on experience in the industry.
          </p>

          <p className="mb-6">
            We kindly request your esteemed organization to offer the student an opportunity to undergo this practical training 
            within your establishment. We believe that your organization will provide the ideal environment for the student 
            to apply theoretical knowledge to real-world scenarios.
          </p>

          <p className="mb-10">
            Any assistance accorded to the student will be highly appreciated. Please do not hesitate to contact the 
            college should you require any further information or clarification.
          </p>

          <div className="mt-12 flex items-center justify-between">
            <div className="space-y-1">
              <div className="h-10 w-48 border-b border-slate-900 mb-1"></div>
              <p className="font-bold">Industrial Liaison Officer</p>
              <p className="text-sm">Risabu Technical Training College</p>
            </div>
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
            <Briefcase size={14} className="text-emerald-600" />
            <span>Industrial Liaison Office</span>
          </div>
          <div className="text-[10px] font-sans font-medium text-slate-400 leading-tight">
            <p className="flex items-center justify-end gap-1"><MapPin size={10} className="text-emerald-600" /> P.O. Box 12345-00100, Nairobi</p>
            <p className="flex items-center justify-end gap-1"><Phone size={10} className="text-emerald-600" /> +254 700 000 000</p>
            <p className="flex items-center justify-end gap-1"><Mail size={10} className="text-emerald-600" /> ilo@risabu.ac.ke</p>
          </div>
        </div>
      </div>

      {/* Title & Ref */}
      <div className="mb-10 flex justify-between items-end">
        <div>
          <p className="text-emerald-600 font-sans font-black text-[10px] uppercase tracking-widest mb-1">Official Document</p>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Industrial Attachment</h2>
        </div>
        <div className="text-right font-sans">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date & Ref</p>
          <p className="text-sm font-bold text-emerald-600">{today}</p>
          <p className="text-xs font-medium text-slate-500">Ref: RTTC/IND/{new Date().getFullYear()}</p>
        </div>
      </div>

      {/* Main Body */}
      <div className="px-4 text-[15px] space-y-5 text-slate-700">
        <p className="font-bold text-slate-900 underline uppercase tracking-wider">To Whom It May Concern,</p>
        
        <h3 className="font-black text-slate-900 uppercase text-center my-8 text-lg underline underline-offset-4 decoration-2">
          Re: Request For Industrial Attachment
        </h3>

        <p className="text-justify leading-loose">
          This is to formally introduce and certify that <strong>{student.firstName} {student.lastName}</strong>, 
          bearing Admission Number <strong>{student.admissionNumber || 'N/A'}</strong>, is a bonafide student of Risabu Technical Training College.
        </p>

        <p className="text-justify leading-loose">
          The student is currently undertaking a program in <strong>{program?.name || student.appliedCourse || 'their respective discipline'}</strong>. 
          In partial fulfillment of the requirements for the award of the certificate/diploma, students are mandated to undergo an industrial attachment for a period of at least three (3) months. This enables them to acquire practical, industry-standard experience.
        </p>

        <p className="text-justify leading-loose">
          We kindly request your esteemed organization to consider offering the aforementioned student a placement 
          within your establishment. We are confident that your organization will provide an excellent professional environment 
          for our student to apply their theoretical knowledge and develop practical skills.
        </p>

        <p className="text-justify leading-loose">
          Any assistance and supervision provided to the student will be highly appreciated by the institution. 
          Please do not hesitate to contact the Industrial Liaison Office via the contact details provided above 
          should you require any further information or clarification regarding the student or the attachment program.
        </p>

        <div className="pt-16 flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-12 w-56 border-b border-slate-900 relative overflow-hidden">
              <span className="absolute bottom-1 left-2 font-cursive text-3xl text-emerald-800 opacity-40 select-none">Approved</span>
            </div>
            <p className="text-[11px] font-black uppercase text-emerald-900 tracking-widest mt-2">Industrial Liaison Officer</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Risabu Technical Training College</p>
          </div>
          
          <div className="h-24 w-24 opacity-10 grayscale">
             <Logo size={96} />
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-16 pt-8 border-t border-slate-100 flex justify-between items-center">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter flex items-center gap-1 italic">
          <ShieldCheck size={12} className="text-emerald-400" />
          Verified Digital Document • Student ID: {student.id?.substring(0,8)}
        </p>
        <p className="text-[10px] font-sans font-black text-emerald-700 uppercase tracking-widest">
          Industry Partnership
        </p>
      </div>
    </div>
  );
});

InternshipLetter.displayName = 'InternshipLetter';
