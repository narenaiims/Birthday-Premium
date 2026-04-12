/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Refactored to Local Storage (Zero-Config Mode)
 */
/// <reference types="vite/client" />

import React, { useState, useEffect, useMemo, Key } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, Search, LayoutDashboard, Clock, Calendar, Users, Download, X, Copy, Phone, MessageCircle,
  ChevronLeft, ChevronRight, Cake, ExternalLink, Facebook, FileText, Trash2, LogOut, Mail, Lock,
  CheckCircle, AlertCircle, User as UserIcon, Bell, CalendarDays, Camera, Upload, Loader2,
  Sparkles, Gift, Star, Heart, Laugh, Briefcase, Music, Share2, CalendarPlus, ArrowRight, Mic,
  Sun, Moon, Settings, Info
} from "lucide-react";
import confetti from "canvas-confetti";
import { generateSmartWish, generateGiftIdeas } from "./services/aiService";
import { Analytics } from "@vercel/analytics/react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Person {
  id: string;
  name: string;
  dob: string;
  avatar: string;
  phone: string;
  group: string;
  relationship?: string;
  interests?: string[];
  notes?: string;
  isFavorite?: boolean;
  createdAt: string;
}

interface GiftItem {
  id: string;
  item: string;
  cost: number;
  pledgedBy?: string;
  status: 'suggested' | 'bought' | 'delivered';
}

interface Group {
  id: string;
  name: string;
  giftPlanner?: GiftItem[];
  createdAt: string;
}

interface WishTemplate {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const RELATIONSHIPS = [
  "Family", "Sibling", "Parent", "Partner", "Best Friend", "Close Friend", 
  "Friend", "Work Bestie", "Colleague", "Manager", "Mentor", "Acquaintance", "Other"
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDaysUntilBirthday(dobStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dob = new Date(dobStr);
  const next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  const diff = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff === 365 ? 0 : diff;
}

function getAge(dobStr: string) {
  const today = new Date();
  const dob = new Date(dobStr);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function getBirthdayMonth(dobStr: string) { return new Date(dobStr).getMonth(); }
function getBirthdayDay(dobStr: string) { return new Date(dobStr).getDate(); }

function getZodiacSign(dobStr: string) {
  const date = new Date(dobStr);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return { sign: "Aquarius", icon: "♒" };
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return { sign: "Pisces", icon: "♓" };
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return { sign: "Aries", icon: "♈" };
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return { sign: "Taurus", icon: "♉" };
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return { sign: "Gemini", icon: "♊" };
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return { sign: "Cancer", icon: "♋" };
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return { sign: "Leo", icon: "♌" };
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return { sign: "Virgo", icon: "♍" };
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return { sign: "Libra", icon: "♎" };
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return { sign: "Scorpio", icon: "♏" };
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return { sign: "Sagittarius", icon: "♐" };
  return { sign: "Capricorn", icon: "♑" };
}

function isMilestoneBirthday(age: number) {
  return [1, 5, 10, 13, 16, 18, 21, 25, 30, 40, 50, 60, 70, 75, 80, 90, 100].includes(age);
}

function downloadICS(person: Person) {
  const date = new Date(person.dob);
  const year = new Date().getFullYear();
  const start = new Date(year, date.getMonth(), date.getDate());
  const end = new Date(year, date.getMonth(), date.getDate() + 1);
  const formatDate = (d: Date) => d.toISOString().replace(/-|:|\\.\\d+/g, "");
  const icsContent = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT",
    `SUMMARY:🎂 ${person.name}'s Birthday`,
    `DTSTART;VALUE=DATE:${formatDate(start).slice(0, 8)}`,
    `DTEND;VALUE=DATE:${formatDate(end).slice(0, 8)}`,
    "RRULE:FREQ=YEARLY", "DESCRIPTION:Birthday reminder from Birthday App",
    "END:VEVENT", "END:VCALENDAR"
  ].join("\r\n");
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute("download", `${person.name}_birthday.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function getReminderLabel(days: number) {
  if (days === 0) return { label: "🎂 Today!", color: "#FF6B6B", bg: "rgba(255,107,107,0.15)" };
  if (days === 1) return { label: "🎁 Tomorrow", color: "#FFD93D", bg: "rgba(255,217,61,0.1)" };
  if (days <= 7) return { label: "✨ This Week", color: "#6BCB77", bg: "rgba(107,203,119,0.1)" };
  return { label: "🗓️ Upcoming", color: "#4D96FF", bg: "rgba(77,150,255,0.1)" };
}

// ─── Components ───────────────────────────────────────────────────────────────
function Avatar({ initials, color, size = 44 }: { initials: string, color: string, size?: number }) {
  const colors: Record<string, string> = {
    Family: "linear-gradient(135deg, #FF6B6B, #FF8E53)",
    Office: "linear-gradient(135deg, #667EEA, #764BA2)",
    "College Friends": "linear-gradient(135deg, #11998E, #38EF7D)",
    default: "linear-gradient(135deg, #F7971E, #FFD200)",
  };
  return (
    <div className="flex items-center justify-center font-bold text-white shrink-0 shadow-lg"
      style={{ width: size, height: size, borderRadius: "50%", background: colors[color] || colors.default, fontSize: size * 0.36, letterSpacing: "0.5px" }}>
      {initials}
    </div>
  );
}

function BirthdayCard({ person, onWish, onDelete, onShowDetail, compact = false }: { key?: React.Key, person: Person, onWish: (p: Person) => void, onDelete: (id: string) => void, onShowDetail: (p: Person) => void, compact?: boolean }) {
  const days = getDaysUntilBirthday(person.dob);
  const { label, color, bg } = getReminderLabel(days);
  const age = getAge(person.dob) + (days === 0 ? 0 : 1);
  const dob = new Date(person.dob);
  const zodiac = getZodiacSign(person.dob);
  const isMilestone = isMilestoneBirthday(age);

  return (
    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
      onClick={() => onShowDetail(person)}
      className={`group relative overflow-hidden flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-white/5 cursor-pointer transition-colors hover:bg-white/10 ${compact ? 'py-3' : 'py-4'}`}>
      {days === 0 && <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent pointer-events-none" />}
      <div className="relative">
        <Avatar initials={person.avatar} color={person.group} size={compact ? 40 : 48} />
        {person.isFavorite && (
          <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-0.5 border-2 border-[#0D0C1D]">
            <Star size={8} className="text-white fill-current" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-bold text-white truncate ${compact ? 'text-sm' : 'text-base'}`}>{person.name}</span>
          {isMilestone && <span className="bg-purple-500/20 text-purple-400 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter border border-purple-500/30">Milestone</span>}
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: bg, color }}>{label}</span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-white/40">{MONTHS[dob.getMonth()]} {dob.getDate()} · Turns {age}</span>
          <span className="text-[10px] text-white/20 flex items-center gap-1"><span className="text-indigo-400/50">{zodiac.icon}</span> {zodiac.sign}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={(e) => { e.stopPropagation(); downloadICS(person); }}
          className="p-2 rounded-xl text-white/20 hover:text-white hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100" title="Export to Calendar">
          <CalendarPlus size={16} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(person.id); }}
          className="p-2 rounded-xl text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100">
          <Trash2 size={16} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onWish(person); }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all whitespace-nowrap ${days === 0 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] shadow-lg shadow-red-500/20' : 'bg-white/10 hover:bg-white/20'}`}>
          {days === 0 ? "🎉 Wish!" : "Send Wish"}
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [people, setPeople] = useState<Person[]>(() => {
    const saved = localStorage.getItem("bp_people");
    return saved ? JSON.parse(saved) : [];
  });
  const [groups, setGroups] = useState<Group[]>(() => {
    const saved = localStorage.getItem("bp_groups");
    return saved ? JSON.parse(saved) : [{ id: "default", name: "My Birthdays", createdAt: new Date().toISOString() }];
  });
  const [activeGroupId, setActiveGroupId] = useState<string>(() => {
    return localStorage.getItem("bp_activeGroupId") || "default";
  });
  const [wishTemplates, setWishTemplates] = useState<WishTemplate[]>(() => {
    const saved = localStorage.getItem("bp_wishTemplates");
    return saved ? JSON.parse(saved) : [
      { id: "1", title: "Funny", content: "Happy Birthday {name}! You're not getting older, you're just becoming a classic! 🎂🚗", createdAt: new Date().toISOString() },
      { id: "2", title: "Heartfelt", content: "Happy Birthday {name}! Wishing you a day as special as you are. May all your dreams come true! ❤️✨", createdAt: new Date().toISOString() }
    ];
  });
  const [userPrefs, setUserPrefs] = useState(() => {
    const saved = localStorage.getItem("bp_userPrefs");
    return saved ? JSON.parse(saved) : { name: "Guest User", avatar: "", remindOnDay: true, remind1DayBefore: false, remind3DaysBefore: false };
  });

  const [showAdd, setShowAdd] = useState(false);
  const [showWish, setShowWish] = useState<Person | null>(null);
  const [showPersonDetail, setShowPersonDetail] = useState<Person | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiGiftIdeas, setAiGiftIdeas] = useState<string[]>([]);
  const [customWish, setCustomWish] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [addForm, setAddForm] = useState({ name: "", dob: "", phone: "", relationship: "Friend" });
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem("theme") as 'light' | 'dark') || 'dark';
  });

  // ── Persistence ─────────────────────────────────────────────────────────────
  useEffect(() => { localStorage.setItem("bp_people", JSON.stringify(people)); }, [people]);
  useEffect(() => { localStorage.setItem("bp_groups", JSON.stringify(groups)); }, [groups]);
  useEffect(() => { localStorage.setItem("bp_activeGroupId", activeGroupId); }, [activeGroupId]);
  useEffect(() => { localStorage.setItem("bp_wishTemplates", JSON.stringify(wishTemplates)); }, [wishTemplates]);
  useEffect(() => { localStorage.setItem("bp_userPrefs", JSON.stringify(userPrefs)); }, [userPrefs]);
  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem("theme", theme);
  }, [theme]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleAddPerson = () => {
    if (!addForm.name || !addForm.dob) return;
    const initials = addForm.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
    const newPerson: Person = {
      id: Math.random().toString(36).substr(2, 9),
      name: addForm.name,
      dob: addForm.dob,
      avatar: initials,
      phone: addForm.phone,
      group: activeGroupId,
      relationship: addForm.relationship,
      interests: [],
      notes: "",
      isFavorite: false,
      createdAt: new Date().toISOString()
    };
    setPeople(prev => [newPerson, ...prev]);
    setAddForm({ name: "", dob: "", phone: "", relationship: "Friend" });
    setShowAdd(false);
    showToast(`🎂 ${addForm.name} added!`);
  };

  const handleDeletePerson = (id: string) => {
    setPeople(prev => prev.filter(p => p.id !== id));
    showToast("Contact deleted");
  };

  const handleUpdatePerson = (updated: Person) => {
    setPeople(prev => prev.map(p => p.id === updated.id ? updated : p));
    if (showPersonDetail?.id === updated.id) setShowPersonDetail(updated);
  };

  const handleGenerateSmartWish = async (person: Person, vibe: "funny" | "heartfelt" | "professional" | "poetic") => {
    setIsAiLoading(true);
    try {
      const wish = await generateSmartWish({
        name: person.name,
        vibe,
        relationship: person.relationship || "Friend",
        interests: person.interests || []
      });
      setCustomWish(wish);
    } catch (err) { showToast("AI failed to generate wish", "error"); }
    finally { setIsAiLoading(false); }
  };

  const handleGenerateGiftIdeas = async (person: Person) => {
    setIsAiLoading(true);
    try {
      const ideas = await generateGiftIdeas(person.name, person.interests || [], person.relationship || "Friend");
      setAiGiftIdeas(ideas);
    } catch (err) { showToast("AI failed to generate ideas", "error"); }
    finally { setIsAiLoading(false); }
  };

  const handleCopyWish = (msg: string) => {
    navigator.clipboard.writeText(msg).then(() => showToast("Wish copied! 📋")).catch(() => showToast("Failed to copy", "error"));
  };

  const handleWhatsApp = (person: Person, msg: string) => {
    if (!person.phone) { showToast("No phone number!", "error"); return; }
    window.open(`https://wa.me/${person.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // ── Computed ────────────────────────────────────────────────────────────────
  const groupPeople = useMemo(() => people.filter(p => p.group === activeGroupId), [people, activeGroupId]);
  const todayBdays = useMemo(() => groupPeople.filter(p => getDaysUntilBirthday(p.dob) === 0), [groupPeople]);
  const upcomingBdays = useMemo(() => groupPeople.filter(p => { const d = getDaysUntilBirthday(p.dob); return d > 0 && d <= 30; }).sort((a,b) => getDaysUntilBirthday(a.dob) - getDaysUntilBirthday(b.dob)), [groupPeople]);
  
  const filteredPeople = useMemo(() => {
    let result = [...groupPeople];
    if (searchQuery) result = result.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filter === "favorites") result = result.filter(p => p.isFavorite);
    return result.sort((a,b) => getDaysUntilBirthday(a.dob) - getDaysUntilBirthday(b.dob));
  }, [groupPeople, searchQuery, filter]);

  return (
    <div className={`min-h-screen bg-[#0D0C1D] text-white font-sans selection:bg-indigo-500/30`}>
      {/* ── TOAST ── */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border backdrop-blur-md ${toast.type === "success" ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
            {toast.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span className="text-sm font-bold">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 bg-[#0D0C1D]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Cake size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight">BirthDay Premium</h1>
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Local Mode</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
              {userPrefs.avatar ? <img src={userPrefs.avatar} className="w-full h-full object-cover" /> : <UserIcon size={18} className="text-white/40" />}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 pb-32">
        {tab === "dashboard" && (
          <div className="space-y-8 animate-fade-in">
            {/* ── TODAY'S BIRTHDAYS ── */}
            {todayBdays.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={18} className="text-yellow-400" />
                  <h2 className="text-xl font-black">Today's Celebrations</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {todayBdays.map(p => <BirthdayCard key={p.id} person={p} onWish={setShowWish} onDelete={handleDeletePerson} onShowDetail={setShowPersonDetail} />)}
                </div>
              </section>
            )}

            {/* ── UPCOMING ── */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black">Upcoming Birthdays</h2>
                <button onClick={() => setTab("all")} className="text-xs text-indigo-400 font-bold hover:underline">View All →</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingBdays.length > 0 ? (
                  upcomingBdays.map(p => <BirthdayCard key={p.id} person={p} onWish={setShowWish} onDelete={handleDeletePerson} onShowDetail={setShowPersonDetail} compact />)
                ) : (
                  <div className="col-span-full py-12 bg-white/5 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4"><Calendar size={24} className="text-white/20" /></div>
                    <p className="text-sm text-white/40 font-bold">No birthdays in the next 30 days.</p>
                    <button onClick={() => setShowAdd(true)} className="mt-4 text-xs bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded-lg font-bold transition-all">Add Someone</button>
                  </div>
                )}
              </div>
            </section>

            {/* ── STATS / QUICK ACTIONS ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 border border-white/10 p-5 rounded-3xl">
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Total</p>
                <p className="text-2xl font-black">{people.length}</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-5 rounded-3xl">
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Groups</p>
                <p className="text-2xl font-black">{groups.length}</p>
              </div>
              <button onClick={() => setTab("calendar")} className="bg-indigo-500/10 border border-indigo-500/20 p-5 rounded-3xl text-left hover:bg-indigo-500/20 transition-all">
                <CalendarDays size={20} className="text-indigo-400 mb-2" />
                <p className="text-xs font-bold text-indigo-400">Calendar View</p>
              </button>
              <button onClick={() => setShowAdd(true)} className="bg-purple-500/10 border border-purple-500/20 p-5 rounded-3xl text-left hover:bg-purple-500/20 transition-all">
                <Plus size={20} className="text-purple-400 mb-2" />
                <p className="text-xs font-bold text-purple-400">Add Birthday</p>
              </button>
            </div>
          </div>
        )}

        {tab === "all" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by name..." className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
              </div>
              <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
                {["all", "favorites"].map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap ${filter === f ? "bg-indigo-500 text-white" : "bg-white/5 text-white/40 hover:bg-white/10"}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPeople.map(p => <BirthdayCard key={p.id} person={p} onWish={setShowWish} onDelete={handleDeletePerson} onShowDetail={setShowPersonDetail} />)}
            </div>
          </div>
        )}

        {tab === "calendar" && (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 animate-fade-in">
             <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black">Birthday Calendar</h2>
              <div className="flex gap-2">
                <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))} className="p-2 rounded-xl bg-white/5 hover:bg-white/10"><ChevronLeft size={20} /></button>
                <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))} className="p-2 rounded-xl bg-white/5 hover:bg-white/10"><ChevronRight size={20} /></button>
              </div>
            </div>
            <div className="text-center py-12 text-white/20 font-bold italic">
              Calendar view is active for {FULL_MONTHS[calendarDate.getMonth()]} {calendarDate.getFullYear()}
              <p className="text-[10px] mt-2 uppercase tracking-widest">Select a day to see birthdays</p>
            </div>
          </div>
        )}

        {tab === "settings" && (
          <div className="max-w-xl mx-auto space-y-8 animate-fade-in">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
              <h3 className="text-xl font-black mb-6 flex items-center gap-3"><Settings size={22} className="text-indigo-400" /> Settings</h3>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 block">Display Name</label>
                  <input value={userPrefs.name} onChange={e => setUserPrefs({...userPrefs, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                </div>
                <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                  <div className="flex items-center gap-3 mb-2">
                    <Info size={16} className="text-indigo-400" />
                    <p className="text-xs font-bold text-indigo-400">Local Storage Mode</p>
                  </div>
                  <p className="text-[10px] text-indigo-400/60 leading-relaxed">
                    Your data is stored locally in this browser. If you clear your browser cache or use a different device, your data will not be available.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── NAVIGATION ── */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1A1935]/80 backdrop-blur-xl border border-white/10 rounded-[28px] p-2 flex items-center gap-1 shadow-2xl">
        {[
          { id: "dashboard", icon: LayoutDashboard, label: "Home" },
          { id: "all", icon: Users, label: "Contacts" },
          { id: "calendar", icon: Calendar, label: "Calendar" },
          { id: "settings", icon: Settings, label: "Settings" },
        ].map(item => (
          <button key={item.id} onClick={() => setTab(item.id)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl transition-all ${tab === item.id ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-white/40 hover:text-white hover:bg-white/5"}`}>
            <item.icon size={20} />
            {tab === item.id && <span className="text-xs font-bold">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* ── ADD MODAL ── */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAdd(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-card-bg border border-white/10 rounded-[32px] p-8 shadow-2xl overflow-hidden">
              <h2 className="text-2xl font-black mb-6">Add New Birthday</h2>
              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 block">Full Name</label>
                  <input value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})}
                    placeholder="e.g. John Doe" className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 block">Date of Birth</label>
                  <input type="date" value={addForm.dob} onChange={e => setAddForm({...addForm, dob: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 block">Relationship</label>
                    <select value={addForm.relationship} onChange={e => setAddForm({...addForm, relationship: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                      {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 block">Phone (Optional)</label>
                    <input value={addForm.phone} onChange={e => setAddForm({...addForm, phone: e.target.value})}
                      placeholder="+1..." className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                  </div>
                </div>
                <button onClick={handleAddPerson} className="w-full bg-indigo-500 hover:bg-indigo-600 py-4 rounded-2xl font-black shadow-lg shadow-indigo-500/20 transition-all mt-4">Save Birthday</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── DETAIL MODAL ── */}
      <AnimatePresence>
        {showPersonDetail && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPersonDetail(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-card-bg border border-white/10 rounded-[32px] p-8 shadow-2xl overflow-hidden">
              <div className="flex items-center gap-4 mb-8">
                <Avatar initials={showPersonDetail.avatar} color={showPersonDetail.group} size={64} />
                <div>
                  <h2 className="text-2xl font-black">{showPersonDetail.name}</h2>
                  <p className="text-xs text-white/40">{MONTHS[new Date(showPersonDetail.dob).getMonth()]} {new Date(showPersonDetail.dob).getDate()} · {showPersonDetail.relationship}</p>
                </div>
              </div>
              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Notes</p>
                  <textarea value={showPersonDetail.notes} onChange={e => handleUpdatePerson({...showPersonDetail, notes: e.target.value})}
                    placeholder="Add some notes about them..." className="w-full bg-transparent border-none text-sm focus:outline-none resize-none h-20" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setShowWish(showPersonDetail); setShowPersonDetail(null); }}
                    className="flex-1 bg-indigo-500 hover:bg-indigo-600 py-4 rounded-2xl font-black transition-all">Send Wish</button>
                  <button onClick={() => { handleUpdatePerson({...showPersonDetail, isFavorite: !showPersonDetail.isFavorite}); }}
                    className={`p-4 rounded-2xl border transition-all ${showPersonDetail.isFavorite ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" : "bg-white/5 border-white/10 text-white/20"}`}>
                    <Star size={20} className={showPersonDetail.isFavorite ? "fill-current" : ""} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── WISH MODAL ── */}
      <AnimatePresence>
        {showWish && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowWish(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-card-bg border border-white/10 rounded-[32px] p-8 shadow-2xl overflow-hidden">
              <h2 className="text-2xl font-black mb-2">Wish {showWish.name}</h2>
              <p className="text-xs text-white/40 mb-6">Choose a template or write your own message.</p>
              
              <div className="space-y-4">
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                  {(["funny", "heartfelt", "professional"] as const).map(v => (
                    <button key={v} onClick={() => handleGenerateSmartWish(showWish, v)}
                      className="px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-500/20 transition-all whitespace-nowrap text-indigo-400">
                      {v}
                    </button>
                  ))}
                  {wishTemplates.map(t => (
                    <button key={t.id} onClick={() => setCustomWish(t.content.replace(/{name}/g, showWish.name))}
                      className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all whitespace-nowrap">
                      {t.title}
                    </button>
                  ))}
                </div>
                <textarea value={customWish} onChange={e => setCustomWish(e.target.value)}
                  placeholder="Happy Birthday..." className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none" />
                
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Gift size={14} className="text-indigo-400" />
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">AI Gift Ideas</span>
                    </div>
                    <button onClick={() => handleGenerateGiftIdeas(showWish)} disabled={isAiLoading} className="text-[10px] font-bold text-indigo-400 hover:underline">
                      {isAiLoading ? "Thinking..." : "Get Ideas"}
                    </button>
                  </div>
                  {aiGiftIdeas.length > 0 && (
                    <div className="space-y-1">
                      {aiGiftIdeas.slice(0, 3).map((idea, i) => <p key={i} className="text-[10px] text-white/60">• {idea}</p>)}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => handleWhatsApp(showWish, customWish)} className="bg-[#25D366] hover:bg-[#128C7E] py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all">
                    <MessageCircle size={18} /> WhatsApp
                  </button>
                  <button onClick={() => handleCopyWish(customWish)} className="bg-white/5 hover:bg-white/10 py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all">
                    <Copy size={18} /> Copy
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <Analytics />
    </div>
  );
}
