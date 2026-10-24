import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { Sparkles, Calendar, MapPin, Users, CheckCircle, XCircle } from 'lucide-react';

export const StudentEventsPage: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      const res = await api.getStudentEvents();
      if (res.success) setEvents(res.events);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleRegister = async (eventId: string) => {
    try {
      const res = await api.registerForEvent(eventId);
      if (res.success) {
        setActionNotice(res.message);
        await fetchEvents();
        setTimeout(() => setActionNotice(null), 3000);
      }
    } catch (err: any) {
      setActionNotice(err.message);
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  const handleCancel = async (eventId: string) => {
    try {
      const res = await api.cancelEventRegistration(eventId);
      if (res.success) {
        setActionNotice(res.message);
        await fetchEvents();
        setTimeout(() => setActionNotice(null), 3000);
      }
    } catch (err: any) {
      setActionNotice(err.message);
      setTimeout(() => setActionNotice(null), 3000);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading campus events...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="p-6 rounded-2xl bg-[#141021] border border-[#2a1e45] flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">College Events &amp; Technical Symposiums</h1>
          <p className="text-xs text-slate-400 mt-1">Register for intercollegiate hackathons, workshops, and sports.</p>
        </div>
        <span className="text-xs font-mono text-[#00E5FF] px-3 py-1.5 rounded-xl bg-[#050505] border border-[#2a1e45]">
          Active Season 2026
        </span>
      </div>

      {actionNotice && (
        <div className="p-3 bg-[#3B0A6B]/50 border border-[#00E5FF]/40 text-xs text-white rounded-xl flex items-center gap-2">
          <Sparkles size={16} className="text-[#00E5FF]" />
          {actionNotice}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {events.map(e => (
          <div
            key={e.id}
            className="rounded-2xl bg-[#141021] border border-[#2a1e45] overflow-hidden flex flex-col hover:border-[#3B0A6B] transition-all"
          >
            <div className="h-44 relative overflow-hidden bg-black">
              <img
                src={e.posterUrl}
                alt={e.title}
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-[#050505]/90 border border-[#2a1e45] text-[10px] font-mono text-[#00E5FF] uppercase">
                {e.category}
              </div>
              {e.isRegistered && (
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-emerald-500/90 text-white text-[10px] font-bold flex items-center gap-1 shadow-md">
                  <CheckCircle size={12} />
                  Registered
                </div>
              )}
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-base font-bold text-white leading-snug mb-2">{e.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{e.description}</p>

                <div className="mt-4 pt-3 border-t border-[#2a1e45] space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-[#00E5FF]" />
                    <span>{e.date} &bull; {e.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-[#00E5FF]" />
                    <span>{e.venue}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-[#00E5FF]" />
                    <span className="font-mono text-[11px]">
                      {e.registeredCount} / {e.capacity} Enrolled
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                {e.isRegistered ? (
                  <button
                    onClick={() => handleCancel(e.id)}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all flex items-center justify-center gap-1.5"
                  >
                    <XCircle size={14} />
                    Cancel Registration
                  </button>
                ) : (
                  <button
                    onClick={() => handleRegister(e.id)}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#3B0A6B] hover:bg-[#5c14a3] border border-[#5c14a3] shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    Register for Event
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentEventsPage;
