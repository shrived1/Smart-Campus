import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { Calendar, Clock, MapPin, User, ChevronRight } from 'lucide-react';

export const StudentTimetablePage: React.FC = () => {
  const [timetable, setTimetable] = useState<any[]>([]);
  const [activeDay, setActiveDay] = useState('Monday');
  const [loading, setLoading] = useState(true);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  useEffect(() => {
    setLoading(true);
    api.getStudentTimetable(activeDay).then(res => {
      if (res.success) setTimetable(res.timetable);
    }).finally(() => setLoading(false));
  }, [activeDay]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Academic Timetable &amp; Schedule</h1>
          <p className="text-xs text-slate-400 mt-1">Class Group: CS-3A &bull; Semester 5 (Autumn 2026)</p>
        </div>
        <div className="text-xs font-mono text-[#00E5FF] px-3 py-1.5 rounded-lg bg-[#050505] border border-[#2a1e45]">
          Live Weekly Schedule
        </div>
      </div>

      {/* Day Selector Pills/Tabs */}
      <div className="grid grid-cols-5 gap-2 bg-[#141021] p-1.5 rounded-2xl border border-[#2a1e45]">
        {days.map(day => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            className={`py-2 px-3 text-xs font-bold rounded-xl transition-all text-center ${
              activeDay === day
                ? 'bg-[#3B0A6B] text-white shadow-sm border border-[#5c14a3]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1c162f]'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Lectures for Selected Day */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading schedule...</div>
        ) : timetable.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-[#141021] rounded-2xl border border-[#2a1e45]">
            No scheduled lectures on this day.
          </div>
        ) : (
          timetable.map((slot, index) => (
            <div
              key={slot.id || index}
              className="p-5 rounded-2xl bg-[#141021] border border-[#2a1e45] hover:border-[#3B0A6B] transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#050505] border border-[#2a1e45] flex flex-col items-center justify-center font-mono">
                  <span className="text-[10px] text-slate-400">LECTURE</span>
                  <span className="text-sm font-bold text-[#00E5FF]">#{index + 1}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-[#00E5FF] uppercase block">
                    {slot.subjectCode} &bull; {slot.classGroup}
                  </span>
                  <h3 className="text-sm font-bold text-white">{slot.subjectName}</h3>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <User size={13} className="text-slate-400" />
                      {slot.facultyName}
                    </span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1">
                      <MapPin size={13} className="text-slate-400" />
                      {slot.room}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end md:self-auto">
                <div className="px-3.5 py-1.5 rounded-xl bg-[#050505] border border-[#2a1e45] text-right font-mono">
                  <span className="text-xs font-bold text-white block">{slot.startTime} - {slot.endTime}</span>
                  <span className="text-[10px] text-slate-400">75 Minutes</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StudentTimetablePage;
