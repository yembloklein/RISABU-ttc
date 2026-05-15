"use client"

import React from 'react';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  BookOpen, 
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { Logo } from '@/components/ui/logo';

interface ExamPassProps {
  student: any;
  program: any;
  templateImageUrl?: string;
  semester?: string;
  academicYear?: string;
}

export const ExamPass = React.forwardRef<HTMLDivElement, ExamPassProps>(({ student, program, templateImageUrl, semester = "Semester 1", academicYear = "2026/2027" }, ref) => {
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
        
        <div className="absolute z-10 top-[30%] left-[12%] right-[12%] text-lg leading-relaxed text-slate-800">
          <div className="flex justify-between items-end mb-8">
            <div>
              <p className="font-bold">Reg No: {student.admissionNumber || 'RTTC/ADM/TEMP'}</p>
            </div>
            <div>
              <p className="font-bold">Academic Year: {academicYear}</p>
            </div>
          </div>
          
          <h2 className="font-black text-2xl text-center mb-6 uppercase underline">Examination Pass</h2>
          
          <p className="mb-4">
            This is to certify that <strong>{student.firstName} {student.lastName}</strong> is a registered student 
            of Risabu Technical Training College and has met all academic and financial requirements for the current semester.
          </p>

          <p className="mb-6">
            The student is authorized to sit for the <strong>{semester}</strong> examinations for the course: 
            <strong> {program?.name || student.appliedCourse || 'Registered Course'}</strong>.
          </p>

          <div className="mt-8 border border-slate-900 p-4">
            <h3 className="font-bold mb-2">Rules & Regulations:</h3>
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li>This pass must be presented at the examination hall.</li>
              <li>Valid student ID must be presented alongside this pass.</li>
              <li>Any form of alteration invalidates this document.</li>
            </ul>
          </div>
          
          <div className="mt-16 flex justify-between">
            <div className="text-center">
              <div className="h-10 w-48 border-b border-slate-900 mb-1"></div>
              <p className="font-bold">Student Signature</p>
            </div>
            <div className="text-center">
              <div className="h-10 w-48 border-b border-slate-900 mb-1"></div>
              <p className="font-bold">Registrar</p>
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
      <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-lg ring-1 ring-slate-100 overflow-hidden p-1">
            <Logo size={64} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-emerald-900 tracking-tighter uppercase leading-none">Risabu Technical</h1>
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-[0.2em] mt-1">Examination Pass</p>
          </div>
        </div>
        
        <div className="text-right space-y-1.5">
          <div className="flex items-center justify-end gap-2 text-[11px] font-sans font-bold text-slate-500 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Cleared for Exams</span>
          </div>
          <div className="text-[10px] font-sans font-medium text-slate-400 leading-tight mt-2">
            <p className="flex items-center justify-end gap-1"><MapPin size={10} className="text-emerald-600" /> P.O. Box 12345, Nairobi</p>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-12 gap-8">
        {/* Sidebar info */}
        <div className="col-span-4 space-y-4">
          <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 shadow-sm">
            <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm mb-3">
              <UserCheck size={20} />
            </div>
            <h3 className="font-sans font-black text-emerald-900 text-[10px] uppercase tracking-wider mb-3 border-b border-emerald-200 pb-2">Student Verification</h3>
            <div className="space-y-3 font-sans">
              <div>
                <p className="text-[9px] font-bold text-emerald-600 uppercase mb-0.5">Full Name</p>
                <p className="text-sm font-bold text-slate-900 leading-tight">{student.firstName} {student.lastName}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-emerald-600 uppercase mb-0.5">Admission No</p>
                <p className="text-sm font-bold text-slate-900 leading-tight">{student.admissionNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-emerald-600 uppercase mb-0.5">Course Code</p>
                <p className="text-sm font-bold text-slate-900 leading-tight">{program?.code || 'REG-ICT-01'}</p>
              </div>
            </div>
          </div>

          <div className="px-5 space-y-3">
             <div className="flex items-center gap-3">
                <Calendar size={14} className="text-emerald-600" />
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Exam Period</p>
                  <p className="text-xs font-bold text-slate-700">{semester}, {academicYear}</p>
                </div>
             </div>
             <div className="flex items-center gap-3">
                <BookOpen size={14} className="text-emerald-600" />
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Program</p>
                  <p className="text-xs font-bold text-slate-700 leading-tight">{program?.name || student.appliedCourse || 'Registered Course'}</p>
                </div>
             </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="col-span-8 text-sm space-y-4 text-slate-700">
          <div className="bg-emerald-600 text-white p-3 text-center uppercase tracking-widest font-black rounded-lg">
            Authorized Entry
          </div>
          
          <p>
            This document certifies that the student named herein has fulfilled all necessary academic and financial obligations and is officially cleared to sit for the end-of-semester examinations.
          </p>

          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 mt-4">
            <h4 className="font-bold text-slate-900 mb-2 uppercase text-[10px] tracking-widest">Important Instructions</h4>
            <ul className="list-disc pl-4 text-xs space-y-1.5 text-slate-600 font-sans">
              <li>Present this pass to the invigilator before entering the exam room.</li>
              <li>Must be accompanied by a valid Student ID Card.</li>
              <li>Mobile phones and unauthorized materials are strictly prohibited.</li>
              <li>Any alteration or forgery of this document is a punishable offense.</li>
            </ul>
          </div>

          <div className="pt-8 flex items-end justify-between">
            <div className="text-center w-32">
              <div className="border-b border-dashed border-slate-400 mb-1 h-8"></div>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Student Sign</p>
            </div>
            
            <div className="text-center w-40">
              <div className="border-b border-slate-900 mb-1 h-8 relative">
                <span className="absolute bottom-1 left-2 font-cursive text-xl text-emerald-800 opacity-30 select-none">Approved</span>
              </div>
              <p className="text-[10px] font-black uppercase text-emerald-900">Chief Invigilator</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-12 pt-4 border-t border-slate-100 flex justify-between items-center">
        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter flex items-center gap-1 italic">
          <ShieldCheck size={10} className="text-emerald-400" />
          Generated on {today} • Valid for {academicYear}
        </p>
      </div>
    </div>
  );
});

ExamPass.displayName = 'ExamPass';
