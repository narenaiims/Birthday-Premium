/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Migrated from Firebase → Supabase
 */
/// <reference types="vite/client" />

import React, { useState, useEffect, useMemo, Key, createContext, useContext } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, Search, LayoutDashboard, Clock, Calendar, Users, Download, X, Copy, Phone, MessageCircle,
  ChevronLeft, ChevronRight, Cake, ExternalLink, Facebook, FileText, Trash2, LogOut, Mail, Lock,
  CheckCircle, AlertCircle, User as UserIcon, Bell, CalendarDays, Camera, Upload, Loader2,
  Sparkles, Gift, Star, Heart, Laugh, Briefcase, Music, Share2, CalendarPlus, ArrowRight, Mic,
  Sun, Moon
} from "lucide-react";
import confetti from "canvas-confetti";
import { generateSmartWish, generateGiftIdeas, polishWish } from "./services/aiService";
import { supabase, isConfigured } from "./supabase";
import type { Session, User } from "@supabase/supabase-js";

// ─── Auth Context ─────────────────────────────────────────────────────────────
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, session: null, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

// ─── Login Component ──────────────────────────────────────────────────────────
function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0C1D] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-card-bg border border-card-border rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[80px] rounded-full" />
        
        <div className="relative z-10 text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mx-auto mb-4">
            <Cake size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-display font-extrabold tracking-tight">BirthDay Premium</h1>
          <p className="text-white/40 text-sm mt-2">Never miss a celebration again.</p>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4 relative z-10">
          <div>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              />
            </div>
          </div>
          <div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-xs text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
          >
            {loading ? "Processing..." : isRegister ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div className="relative z-10 mt-6 flex items-center gap-4">
          <div className="flex-1 h-[1px] bg-white/10" />
          <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">OR</span>
          <div className="flex-1 h-[1px] bg-white/10" />
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="w-full mt-6 bg-white/5 border border-white/10 hover:bg-white/10 text-white py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-3"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Continue with Google
        </button>

        <p className="relative z-10 text-center mt-8 text-sm text-white/40">
          {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-indigo-400 font-bold hover:underline"
          >
            {isRegister ? "Sign In" : "Sign Up"}
          </button>
        </p>
      </div>
    </div>
  );
}

// ─── Data & Helpers ───────────────────────────────────────────────────────────
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
  createdBy: string;
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
  ownerId: string;
  giftPlanner?: GiftItem[];
  createdAt: string;
}

interface Member {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'viewer';
  joinedAt: string;
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
  if (days === 1) return { label: "⚡ Tomorrow", color: "#FFB347", bg: "rgba(255,179,71,0.15)" };
  if (days <= 7) return { label: `🗓 In ${days} days`, color: "#A8E6CF", bg: "rgba(168,230,207,0.15)" };
  if (days <= 30) return { label: `📅 In ${days} days`, color: "#88D8FF", bg: "rgba(136,216,255,0.15)" };
  return { label: `${days}d away`, color: "#B8A9FF", bg: "rgba(184,169,255,0.15)" };
}

// ─── Components ───────────────────────────────────────────────────────────────
function Confetti({ active }: { active: boolean }) {
  if (!active) return null;
  const pieces = Array.from({ length: 40 }, (_, i) => i);
  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {pieces.map(i => (
        <div key={i} className="absolute animate-confetti" style={{
          left: `${Math.random() * 100}%`, top: "-20px",
          width: `${6 + Math.random() * 8}px`, height: `${6 + Math.random() * 8}px`,
          borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          background: ["#FF6B6B","#FFB347","#A8E6CF","#88D8FF","#B8A9FF","#FFD700","#FF69B4"][Math.floor(Math.random()*7)],
          animationDelay: `${Math.random() * 2}s`, animationDuration: `${1.5 + Math.random() * 2}s`,
          transform: `rotate(${Math.random() * 360}deg)`,
        }} />
      ))}
    </div>
  );
}

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

interface BirthdayCardProps {
  key?: Key;
  person: Person;
  onWish: (p: Person) => void;
  onDelete: (id: string) => void;
  onShowDetail: (p: Person) => void;
  onGroupWish?: (p: Person) => void;
  compact?: boolean;
  userRole?: 'admin' | 'viewer';
}

function BirthdayCard({ person, onWish, onDelete, onShowDetail, onGroupWish, compact = false, userRole = 'viewer' }: BirthdayCardProps) {
  const days = getDaysUntilBirthday(person.dob);
  const { label, color, bg } = getReminderLabel(days);
  const age = getAge(person.dob) + (days === 0 ? 0 : 1);
  const dob = new Date(person.dob);
  const zodiac = getZodiacSign(person.dob);
  const isMilestone = isMilestoneBirthday(age);

  return (
    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
      onClick={() => onShowDetail(person)}
      className={`group relative overflow-hidden flex items-center gap-4 p-4 rounded-2xl border border-card-border bg-card-bg cursor-pointer transition-colors hover:bg-white/10 hover:border-white/20 ${compact ? 'py-3' : 'py-4'}`}>
      {days === 0 && <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent pointer-events-none" />}
      <div className="relative">
        <Avatar initials={person.avatar} color={person.group} size={compact ? 40 : 48} />
        {person.isFavorite && (
          <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-0.5 border-2 border-[#141329]">
            <Star size={8} className="text-white fill-current" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-bold text-text-main truncate ${compact ? 'text-sm' : 'text-base'}`}>{person.name}</span>
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
        {onGroupWish && days <= 7 && (
          <button onClick={(e) => { e.stopPropagation(); onGroupWish(person); }}
            className="p-2 rounded-xl text-green-400 hover:bg-green-400/10 transition-all flex items-center gap-1" title="Send Group Wish">
            <MessageCircle size={16} /><span className="text-[10px] font-bold hidden sm:inline">Group Wish</span>
          </button>
        )}
        {userRole === 'admin' && (
          <button onClick={(e) => { e.stopPropagation(); onDelete(person.id); }}
            className="p-2 rounded-xl text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100">
            <Trash2 size={16} />
          </button>
        )}
        <button onClick={(e) => { e.stopPropagation(); onWish(person); }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all whitespace-nowrap ${days === 0 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] shadow-lg shadow-red-500/20' : 'bg-white/10 hover:bg-white/20'}`}>
          {days === 0 ? "🎉 Wish!" : "Send Wish"}
        </button>
      </div>
    </motion.div>
  );
}

function GroupCard({ name, count, link, onCopy, onDelete, onBroadcast }: { name: string, count: number, link: string, onCopy: (l: string) => void, onDelete: (n: string) => void, onBroadcast: () => void }) {
  const colors: Record<string, { bg: string, border: string, icon: string }> = {
    Family: { bg: "linear-gradient(135deg, rgba(255,107,107,0.15), rgba(255,142,83,0.1))", border: "rgba(255,107,107,0.3)", icon: "👨‍👩‍👧‍👦" },
    Office: { bg: "linear-gradient(135deg, rgba(102,126,234,0.15), rgba(118,75,162,0.1))", border: "rgba(102,126,234,0.3)", icon: "💼" },
    "College Friends": { bg: "linear-gradient(135deg, rgba(17,153,142,0.15), rgba(56,239,125,0.1))", border: "rgba(17,153,142,0.3)", icon: "🎓" },
  };
  const c = colors[name] || { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)", icon: "👥" };
  return (
    <div className="group p-5 rounded-2xl border transition-all relative overflow-hidden" style={{ background: c.bg, borderColor: c.border }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{c.icon}</span>
          <div>
            <div className="text-base font-bold text-[#F0EEE9]">{name}</div>
            <div className="text-xs text-white/50">{count} members</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs bg-white/10 px-2.5 py-1 rounded-full text-white/60">{count} 🎂</div>
          {count === 0 && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(name); }}
              className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      <div className="bg-black/20 rounded-xl p-3 mb-3">
        <div className="text-[10px] text-white/40 mb-1 uppercase tracking-wider font-bold">Invite Link</div>
        <div className="text-[11px] text-white/70 font-mono truncate">{link}</div>
      </div>
      <div className="flex gap-2">
        <button onClick={(e) => { e.stopPropagation(); onCopy(link); }}
          className="flex-1 bg-white/10 border border-white/10 hover:bg-white/20 rounded-xl py-2 text-xs font-bold text-[#F0EEE9] transition-colors flex items-center justify-center gap-2">
          <Copy size={14} /> Copy Link
        </button>
        <button onClick={(e) => { e.stopPropagation(); onBroadcast(); }}
          className="flex-1 bg-gradient-to-r from-[#25D366] to-[#128C7E] rounded-xl py-2 text-xs font-bold text-white shadow-lg shadow-green-500/10 flex items-center justify-center gap-2">
          <MessageCircle size={14} /> Broadcast
        </button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AuthWrapper />
    </AuthProvider>
  );
}

function AuthWrapper() {
  const { user, loading } = useAuth();

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-[#0D0C1D] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-card-bg border border-red-500/30 rounded-[32px] p-8 shadow-2xl text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Configuration Required</h1>
          <p className="text-white/60 text-sm mb-8">
            Supabase keys are missing. Add these 2 variables to your Vercel project:
          </p>
          <div className="space-y-3 text-left bg-black/20 p-4 rounded-xl border border-white/5 mb-8">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Required Variables:</p>
            <code className="block text-[11px] text-indigo-300">VITE_SUPABASE_URL</code>
            <code className="block text-[11px] text-indigo-300">VITE_SUPABASE_ANON_KEY</code>
          </div>
          <button onClick={() => window.location.reload()}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-xl font-bold transition-all">
            Check Again
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0C1D] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Login />;

  const isJoin = window.location.pathname.startsWith("/join/");
  if (isJoin) return <JoinGroup />;

  return <BirthdayApp />;
}

// ─── Join Group ───────────────────────────────────────────────────────────────
function JoinGroup() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const token = window.location.pathname.split("/join/")[1];

  useEffect(() => {
    if (authLoading || !token) return;
    if (!user) { setLoading(false); return; }

    const join = async () => {
      try {
        const { data: invite, error: inviteErr } = await supabase
          .from("invites").select("group_id").eq("token", token).single();
        if (inviteErr || !invite) { setError("Invalid or expired invite link."); setLoading(false); return; }

        const { error: memberErr } = await supabase.from("group_members").upsert({
          group_id: invite.group_id,
          user_id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
          role: "viewer",
          joined_at: new Date().toISOString(),
        });
        if (memberErr) throw memberErr;

        localStorage.setItem("activeGroupId", invite.group_id);
        window.location.href = "/";
      } catch (err) {
        setError("Failed to join group.");
        setLoading(false);
      }
    };
    join();
  }, [user, authLoading, token]);

  if (authLoading || (user && loading)) {
    return (
      <div className="min-h-screen bg-[#0D0C1D] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold">Joining Group...</h2>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0D0C1D] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold mb-4">Sign in to join this group</h2>
        <Login />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0D0C1D] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h2 className="text-xl font-bold mb-2">Could not join</h2>
        <p className="text-white/50 mb-6">{error}</p>
        <a href="/" className="text-indigo-400 underline">Go to app</a>
      </div>
    );
  }

  return null;
}

// ─── Settings / Profile Panel ─────────────────────────────────────────────────
function SettingsPanel({ user, userPrefs, setUserPrefs, showToast, wishTemplates, setShowManageTemplates }: {
  user: User | null;
  userPrefs: any;
  setUserPrefs: any;
  showToast: (msg: string, type?: "success" | "error") => void;
  wishTemplates: WishTemplate[];
  setShowManageTemplates: (show: boolean) => void;
}) {
  const [name, setName] = useState(user?.user_metadata?.full_name || user?.email?.split("@")[0] || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpdateName = async () => {
    if (!user || !name.trim()) return;
    setIsSaving(true);
    try {
      await supabase.auth.updateUser({ data: { full_name: name } });
      const { error } = await supabase.from("profiles").update({ name }).eq("id", user.id);
      if (error) throw error;
      showToast("Profile name updated successfully!");
    } catch (error) {
      showToast("Failed to update name", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePref = async (key: string) => {
    if (!user) return;
    const newVal = !userPrefs[key];
    setUserPrefs((prev: any) => ({ ...prev, [key]: newVal }));
    const dbKey = key === "remindOnDay" ? "remind_on_day"
      : key === "remind1DayBefore" ? "remind_1_day_before"
      : "remind_3_days_before";
    const { error } = await supabase.from("profiles").update({ [dbKey]: newVal }).eq("id", user.id);
    if (error) {
      showToast("Failed to update preference", "error");
      setUserPrefs((prev: any) => ({ ...prev, [key]: !newVal }));
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) { showToast("Please upload an image file", "error"); return; }
    if (file.size > 2 * 1024 * 1024) { showToast("Image size should be less than 2MB", "error"); return; }
    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `profiles/${user.id}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      await supabase.from("profiles").update({ photo_url: publicUrl }).eq("id", user.id);
      showToast("Profile picture updated!");
    } catch (error) {
      showToast("Failed to upload photo", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleEnableNotifications = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      showToast("Push notifications not supported in this browser", "error");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { showToast("Notification permission denied", "error"); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
      });
      await supabase.from("profiles").update({ push_subscription: JSON.stringify(sub) }).eq("id", user!.id);
      showToast("🔔 Push notifications enabled!");
    } catch (err) {
      showToast("Could not enable notifications", "error");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 animate-slide-up">
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><UserIcon size={20} className="text-indigo-400" /> Profile</h3>
        <div className="flex items-center gap-5 mb-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center overflow-hidden">
              {user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-white">{(name || user?.email || "?")[0].toUpperCase()}</span>
              )}
            </div>
            <label className="absolute -bottom-2 -right-2 bg-indigo-500 rounded-full p-1.5 cursor-pointer hover:bg-indigo-600 transition-colors">
              {isUploading ? <Loader2 size={14} className="text-white animate-spin" /> : <Camera size={14} className="text-white" />}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isUploading} />
            </label>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-white/80">{user?.email}</p>
            <p className="text-xs text-white/40 mt-1">Member since {new Date(user?.created_at || Date.now()).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            placeholder="Your display name" />
          <button onClick={handleUpdateName} disabled={isSaving}
            className="bg-indigo-500 hover:bg-indigo-600 px-5 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50">
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Bell size={20} className="text-indigo-400" /> Notification Preferences</h3>
        <div className="space-y-4">
          {[
            { key: "remindOnDay", label: "Remind on birthday", desc: "Get notified on the actual birthday" },
            { key: "remind1DayBefore", label: "1 day before", desc: "Early reminder the day before" },
            { key: "remind3DaysBefore", label: "3 days before", desc: "Plan ahead with a 3-day notice" },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
              <div>
                <p className="text-sm font-bold">{label}</p>
                <p className="text-xs text-white/40">{desc}</p>
              </div>
              <button onClick={() => handleTogglePref(key)}
                className={`w-12 h-6 rounded-full transition-all relative ${userPrefs[key] ? "bg-indigo-500" : "bg-white/10"}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${userPrefs[key] ? "left-7" : "left-1"}`} />
              </button>
            </div>
          ))}
        </div>
        <button onClick={handleEnableNotifications}
          className="mt-4 w-full bg-white/5 border border-white/10 hover:bg-white/10 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all">
          <Bell size={16} /> Enable Push Notifications
        </button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2"><FileText size={20} className="text-indigo-400" /> Wish Templates</h3>
          <button onClick={() => setShowManageTemplates(true)}
            className="text-xs text-indigo-400 hover:underline">{wishTemplates.length} templates →</button>
        </div>
        <p className="text-sm text-white/40">Save your favourite birthday messages for quick access.</p>
      </div>
    </motion.div>
  );
}

// ─── Manage Templates Modal ────────────────────────────────────────────────────
function ManageTemplatesModal({ templates, onAdd, onDelete, onClose }: {
  templates: WishTemplate[];
  onAdd: (title: string, content: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#141329] border border-white/10 rounded-3xl p-6 shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">Wish Templates</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 mb-4">
          {templates.length === 0 && <p className="text-white/40 text-sm text-center py-8">No templates yet. Add one below!</p>}
          {templates.map(t => (
            <div key={t.id} className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-bold text-sm">{t.title}</p>
                  <p className="text-xs text-white/50 mt-1 line-clamp-2">{t.content}</p>
                </div>
                <button onClick={() => onDelete(t.id)} className="text-white/30 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
        {isAdding ? (
          <div className="space-y-3">
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Template title"
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
            <textarea value={newContent} onChange={e => setNewContent(e.target.value)} placeholder="Template content..." rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none" />
            <div className="flex gap-2">
              <button onClick={() => setIsAdding(false)} className="flex-1 bg-white/5 border border-white/10 py-3 rounded-xl text-sm font-bold">Cancel</button>
              <button onClick={() => { onAdd(newTitle, newContent); setNewTitle(""); setNewContent(""); setIsAdding(false); }}
                className="flex-1 bg-indigo-500 hover:bg-indigo-600 py-3 rounded-xl text-sm font-bold transition-all">Save Template</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setIsAdding(true)}
            className="w-full bg-white/5 border border-white/10 hover:bg-white/10 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
            <Plus size={16} /> Add Template
          </button>
        )}
      </motion.div>
    </div>
  );
}

// ─── Calendar View ────────────────────────────────────────────────────────────
function CalendarView({ people, calendarDate, setCalendarDate, selectedCalendarDay, setSelectedCalendarDay, onWish, onDelete, userRole, onGroupWish, onShowDetail }: {
  people: Person[];
  calendarDate: Date;
  setCalendarDate: (d: Date) => void;
  selectedCalendarDay: number | null;
  setSelectedCalendarDay: (d: number | null) => void;
  onWish: (p: Person) => void;
  onDelete: (id: string) => void;
  userRole: 'admin' | 'viewer';
  onGroupWish: (p: Person) => void;
  onShowDetail: (p: Person) => void;
}) {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const prevMonth = () => setCalendarDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(year, month + 1, 1));
  const birthdaysByDay = useMemo(() => {
    const map: Record<number, Person[]> = {};
    people.forEach(p => {
      if (getBirthdayMonth(p.dob) === month) {
        const day = getBirthdayDay(p.dob);
        if (!map[day]) map[day] = [];
        map[day].push(p);
      }
    });
    return map;
  }, [people, month]);
  const selectedBirthdays = selectedCalendarDay ? birthdaysByDay[selectedCalendarDay] || [] : [];

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="text-4xl font-black text-indigo-400 font-mono">{(month + 1).toString().padStart(2, '0')}</div>
            <div><h3 className="text-xl font-bold">{FULL_MONTHS[month]}</h3><p className="text-xs text-white/30 uppercase tracking-widest font-bold">{year}</p></div>
          </div>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all"><ChevronLeft size={20} /></button>
            <button onClick={nextMonth} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all"><ChevronRight size={20} /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2 mb-4">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-white/20 uppercase tracking-widest py-2">{d}</div>
          ))}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const bdays = birthdaysByDay[day] || [];
            const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
            const isSelected = selectedCalendarDay === day;
            return (
              <button key={day} onClick={() => setSelectedCalendarDay(isSelected ? null : day)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-bold transition-all relative ${isSelected ? "bg-indigo-500 text-white" : isToday ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "hover:bg-white/10 text-white/60"}`}>
                {day}
                {bdays.length > 0 && (
                  <div className={`absolute bottom-1 flex gap-0.5 ${isSelected ? "opacity-100" : ""}`}>
                    {bdays.slice(0, 3).map((_, i) => <div key={i} className="w-1 h-1 rounded-full bg-[#FF6B6B]" />)}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
      {selectedCalendarDay && selectedBirthdays.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest">{FULL_MONTHS[month]} {selectedCalendarDay}</h3>
          {selectedBirthdays.map(p => <BirthdayCard key={p.id} person={p} onWish={onWish} onDelete={onDelete} onShowDetail={onShowDetail} onGroupWish={onGroupWish} userRole={userRole} />)}
        </div>
      )}
    </div>
  );
}

// ─── BirthdayApp (main authenticated view) ────────────────────────────────────
function BirthdayApp() {
  const { user } = useAuth();

  const [tab, setTab] = useState("dashboard");
  const [people, setPeople] = useState<Person[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(localStorage.getItem("activeGroupId"));
  const [members, setMembers] = useState<Member[]>([]);
  const [userRole, setUserRole] = useState<'admin' | 'viewer'>(user?.email === "narenaiims@gmail.com" ? 'admin' : 'viewer');

  const [showAdd, setShowAdd] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [showManageMembers, setShowManageMembers] = useState(false);
  const [showWish, setShowWish] = useState<Person | null>(null);
  const [showPersonDetail, setShowPersonDetail] = useState<Person | null>(null);
  const [isCustomGroup, setIsCustomGroup] = useState(false);
  const [customGroupName, setCustomGroupName] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem("theme") as 'light' | 'dark') || 'dark';
  });
  const [aiGiftIdeas, setAiGiftIdeas] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const [filter, setFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth());
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [addForm, setAddForm] = useState({ name: "", dob: "", phone: "", relationship: "Friend" });
  const [importText, setImportText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGroupInvite, setActiveGroupInvite] = useState<string | null>(null);
  const [groupInvites, setGroupInvites] = useState<Record<string, string>>({});
  const [importMode, setImportMode] = useState<"csv" | "whatsapp" | "facebook" | "contacts">("csv");
  const [importStep, setImportStep] = useState(0);
  const [importPreview, setImportPreview] = useState<Person[]>([]);
  const [proximityFilter, setProximityFilter] = useState("all");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(null);
  const [wishTemplates, setWishTemplates] = useState<WishTemplate[]>([]);
  const [showManageTemplates, setShowManageTemplates] = useState(false);
  const [templateForm, setTemplateForm] = useState({ title: "", content: "" });
  const [customWish, setCustomWish] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [userPrefs, setUserPrefs] = useState({ remindOnDay: true, remind1DayBefore: false, remind3DaysBefore: false });

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── 0. Fetch user preferences ──────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("remind_on_day,remind_1_day_before,remind_3_days_before").eq("id", user.id).single()
      .then(({ data }) => {
        if (data) setUserPrefs({
          remindOnDay: data.remind_on_day ?? true,
          remind1DayBefore: data.remind_1_day_before ?? false,
          remind3DaysBefore: data.remind_3_days_before ?? false,
        });
      });
  }, [user]);

  // ── 1. Fetch groups the user belongs to ───────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const loadGroups = async () => {
      const { data: memberRows } = await supabase
        .from("group_members").select("group_id").eq("user_id", user.id);
      if (!memberRows?.length) { setGroups([]); return; }
      const ids = memberRows.map(r => r.group_id);
      const { data: groupRows } = await supabase.from("groups").select("*").in("id", ids);
      if (!groupRows) return;
      const mapped: Group[] = groupRows.map(g => ({
        id: g.id, name: g.name, ownerId: g.owner_id,
        giftPlanner: g.gift_planner || [], createdAt: g.created_at,
      }));
      setGroups(mapped);
      if (!activeGroupId && mapped.length > 0) setActiveGroupId(mapped[0].id);
    };
    loadGroups();

    // Realtime subscription for group_members changes
    const sub = supabase.channel("group-members-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "group_members", filter: `user_id=eq.${user.id}` }, loadGroups)
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [user]);

  // ── 2. Fetch birthdays & members for the active group ─────────────────────
  useEffect(() => {
    if (!user || !activeGroupId) return;
    localStorage.setItem("activeGroupId", activeGroupId);

    const loadBirthdays = async () => {
      const { data } = await supabase.from("birthdays").select("*").eq("group_id", activeGroupId).order("created_at", { ascending: false });
      if (data) setPeople(data.map(d => ({
        id: d.id, name: d.name, dob: d.dob, avatar: d.avatar || d.name.slice(0,2).toUpperCase(),
        phone: d.phone || "", group: activeGroup?.name || "", relationship: d.relationship, 
        interests: d.interests || [], notes: d.notes || "", isFavorite: d.is_favorite || false,
        createdAt: d.created_at, createdBy: d.created_by,
      })));
    };

    const loadMembers = async () => {
      const { data } = await supabase.from("group_members").select("*").eq("group_id", activeGroupId);
      if (data) {
        const mapped: Member[] = data.map(m => ({ uid: m.user_id, email: m.email, name: m.name, role: m.role, joinedAt: m.joined_at }));
        setMembers(mapped);
        const me = mapped.find(m => m.uid === user.id);
        if (user.email === "narenaiims@gmail.com") setUserRole('admin');
        else if (me) setUserRole(me.role);
      }
    };

    loadBirthdays();
    loadMembers();

    const bdaySub = supabase.channel(`birthdays-${activeGroupId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "birthdays", filter: `group_id=eq.${activeGroupId}` }, loadBirthdays)
      .subscribe();

    return () => { bdaySub.unsubscribe(); };
  }, [user, activeGroupId]);

  // ── 3. Fetch invites for active group ─────────────────────────────────────
  useEffect(() => {
    if (!activeGroupId) return;
    supabase.from("invites").select("token,group_id").eq("group_id", activeGroupId).then(({ data }) => {
      if (data?.length) {
        setActiveGroupInvite(data[0].token);
        setGroupInvites(prev => ({ ...prev, [activeGroupId]: data[0].token }));
      }
    });
  }, [activeGroupId]);

  // ── 4. Fetch wish templates ────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    supabase.from("wish_templates").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setWishTemplates(data.map(t => ({ id: t.id, title: t.title, content: t.content, createdAt: t.created_at })));
      });
  }, [user]);

  const activeGroup = useMemo(() => groups.find(g => g.id === activeGroupId), [groups, activeGroupId]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleAddPerson = async () => {
    if (!user || !activeGroupId || !addForm.name || !addForm.dob) return;
    const initials = addForm.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
    const { error } = await supabase.from("birthdays").insert({
      group_id: activeGroupId, name: addForm.name, dob: addForm.dob,
      phone: addForm.phone, relationship: addForm.relationship,
      avatar: initials, created_by: user.id,
      interests: [], notes: "", is_favorite: false
    });
    if (error) { showToast("Failed to add birthday", "error"); return; }
    setAddForm({ name: "", dob: "", phone: "", relationship: "Friend" });
    setShowAdd(false);
    showToast(`🎂 ${addForm.name} added successfully!`);
  };

  const handleDeletePerson = async (id: string) => {
    if (userRole !== 'admin') { showToast("Only admins can delete birthdays", "error"); return; }
    const { error } = await supabase.from("birthdays").delete().eq("id", id);
    if (error) { showToast("Failed to delete birthday", "error"); return; }
    showToast("Contact deleted");
  };

  const handleCreateGroup = async () => {
    if (!user || !newGroupName.trim()) return;
    const { data: group, error } = await supabase.from("groups").insert({ name: newGroupName.trim(), owner_id: user.id }).select().single();
    if (error || !group) { showToast("Failed to create group", "error"); return; }
    await supabase.from("group_members").insert({
      group_id: group.id, user_id: user.id, email: user.email,
      name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
      role: "admin", joined_at: new Date().toISOString(),
    });
    setActiveGroupId(group.id);
    setNewGroupName("");
    setShowCreateGroup(false);
    showToast(`Group "${newGroupName}" created!`);
  };

  const handleUpdateMemberRole = async (memberUid: string, newRole: 'admin' | 'viewer') => {
    if (userRole !== 'admin') return;
    const { error } = await supabase.from("group_members").update({ role: newRole }).eq("group_id", activeGroupId!).eq("user_id", memberUid);
    if (error) { showToast("Failed to update role", "error"); return; }
    showToast("Role updated");
  };

  const handleRemoveMember = async (memberUid: string) => {
    if (userRole !== 'admin' || memberUid === user?.id) { showToast("Cannot remove yourself", "error"); return; }
    const { error } = await supabase.from("group_members").delete().eq("group_id", activeGroupId!).eq("user_id", memberUid);
    if (error) { showToast("Failed to remove member", "error"); return; }
    showToast("Member removed");
  };

  const handleGenerateInvite = async () => {
    if (!user || !activeGroupId || userRole !== 'admin') return;
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const { error } = await supabase.from("invites").insert({ token, group_id: activeGroupId, created_by: user.id });
    if (error) { showToast("Failed to generate invite", "error"); return; }
    const link = `${window.location.origin}/join/${token}`;
    handleCopyLink(link);
    setActiveGroupInvite(token);
  };

  const handleSignOut = () => supabase.auth.signOut();

  const handleCopyLink = (link: string) => {
    navigator.clipboard?.writeText(link).then(() => showToast("🔗 Link copied to clipboard!")).catch(() => showToast("Failed to copy link", "error"));
  };

  const handleAddTemplate = async (title: string, content: string) => {
    if (!user || !title.trim() || !content.trim()) return;
    const { data, error } = await supabase.from("wish_templates").insert({ user_id: user.id, title: title.trim(), content: content.trim() }).select().single();
    if (error) { showToast("Failed to add template", "error"); return; }
    if (data) setWishTemplates(prev => [{ id: data.id, title: data.title, content: data.content, createdAt: data.created_at }, ...prev]);
    showToast("Template added");
  };

  const handleDeleteTemplate = async (id: string) => {
    const { error } = await supabase.from("wish_templates").delete().eq("id", id);
    if (error) { showToast("Failed to delete template", "error"); return; }
    setWishTemplates(prev => prev.filter(t => t.id !== id));
    showToast("Template deleted");
  };

  const handleConfirmImport = async () => {
    if (!user || !activeGroupId || userRole !== 'admin' || importPreview.length === 0) return;
    const rows = importPreview.map(p => ({
      group_id: activeGroupId, name: p.name, dob: p.dob, phone: p.phone || "",
      avatar: p.avatar || p.name.slice(0,2).toUpperCase(), created_by: user.id,
    }));
    const { error } = await supabase.from("birthdays").insert(rows);
    if (error) { showToast("Failed to import contacts", "error"); return; }
    setImportText(""); setImportPreview([]); setImportStep(3);
    showToast(`✅ Successfully imported ${importPreview.length} contacts!`);
  };

  const handleAddGiftItem = async (groupId: string) => {
    const item = prompt("What's the gift idea?");
    const cost = prompt("Estimated cost?");
    if (!item || !cost) return;
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    const newItem: GiftItem = { id: Math.random().toString(36).substr(2, 9), item, cost: parseFloat(cost) || 0, status: 'suggested', pledgedBy: user?.user_metadata?.full_name || user?.email || "Anonymous" };
    const updatedPlanner = [...(group.giftPlanner || []), newItem];
    await supabase.from("groups").update({ gift_planner: updatedPlanner }).eq("id", groupId);
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, giftPlanner: updatedPlanner } : g));
    showToast("Gift idea added! 🎁");
  };

  const handleUpdateGiftStatus = async (groupId: string, itemId: string, status: 'suggested' | 'bought' | 'delivered') => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    const updatedPlanner = group.giftPlanner?.map(item => item.id === itemId ? { ...item, status } : item);
    await supabase.from("groups").update({ gift_planner: updatedPlanner }).eq("id", groupId);
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, giftPlanner: updatedPlanner } : g));
    showToast(`Status updated to ${status}`);
  };

  const handleGenerateSmartWish = async (person: Person, vibe: any) => {
    setIsAiLoading(true);
    try {
      const wish = await generateSmartWish({
        name: person.name,
        vibe,
        relationship: person.relationship || "Friend",
        interests: person.interests || []
      });
      setCustomWish(wish);
    } catch (err) { showToast("Failed to generate wish", "error"); }
    finally { setIsAiLoading(false); }
  };

  const handleGenerateGiftIdeas = async (person: Person) => {
    setIsAiLoading(true);
    try {
      const ideas = await generateGiftIdeas(
        person.name,
        person.interests || [],
        person.relationship || "Friend"
      );
      setAiGiftIdeas(ideas);
    } catch (err) { showToast("Failed to generate gift ideas", "error"); }
    finally { setIsAiLoading(false); }
  };

  const handleWish = (person: Person) => { setShowWish(person); setCustomWish(""); };
  const handleCall = (person: Person) => { if (!person.phone) { showToast("No phone number provided", "error"); return; } window.location.href = `tel:${person.phone}`; setShowWish(null); };
  const handleCopyWish = (person: Person, message?: string) => {
    const msg = message || `Happy Birthday ${person.name}! Wishing you a year full of joy, health, and success. Have a great one! 🎂✨`;
    navigator.clipboard.writeText(msg).then(() => { showToast("Wish message copied! 📋"); setShowWish(null); }).catch(() => showToast("Failed to copy wish", "error"));
  };
  const handleGroupWish = (person: Person) => {
    const groupName = activeGroup?.name || "the group";
    const days = getDaysUntilBirthday(person.dob);
    const when = days === 0 ? "today" : `on ${MONTHS[getBirthdayMonth(person.dob)]} ${getBirthdayDay(person.dob)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(`Hey ${groupName}! It's ${person.name}'s birthday ${when}! Don't forget to wish them! 🎂✨`)}`, "_blank");
  };
  const handleClearAll = async () => {
    if (!activeGroupId || userRole !== 'admin') return;
    if (!window.confirm("Clear all birthdays in this group? This cannot be undone.")) return;
    await supabase.from("birthdays").delete().eq("group_id", activeGroupId);
    showToast("Group data cleared");
  };

  // ── Computed values ──────────────────────────────────────────────────────────
  const todayBdays = useMemo(() => people.filter(p => getDaysUntilBirthday(p.dob) === 0), [people]);
  const tomorrowBdays = useMemo(() => people.filter(p => getDaysUntilBirthday(p.dob) === 1), [people]);
  const weekBdays = useMemo(() => people.filter(p => { const d = getDaysUntilBirthday(p.dob); return d > 0 && d <= 7; }), [people]);
  const upcomingBdays = useMemo(() => people.filter(p => { const d = getDaysUntilBirthday(p.dob); return d > 0 && d <= 30; }).sort((a,b) => getDaysUntilBirthday(a.dob) - getDaysUntilBirthday(b.dob)), [people]);
  const sortedPeople = useMemo(() => [...people].sort((a,b) => getDaysUntilBirthday(a.dob) - getDaysUntilBirthday(b.dob)), [people]);

  const filteredPeople = useMemo(() => {
    let result = [...people];
    if (searchQuery) result = result.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.relationship?.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filter === "today") result = result.filter(p => getDaysUntilBirthday(p.dob) === 0);
    else if (filter === "week") result = result.filter(p => getDaysUntilBirthday(p.dob) <= 7);
    else if (filter === "month") result = result.filter(p => getDaysUntilBirthday(p.dob) <= 30);
    else if (filter === "favorites") result = result.filter(p => p.isFavorite);
    if (proximityFilter !== "all") result = result.filter(p => p.relationship === proximityFilter);
    return result.sort((a,b) => getDaysUntilBirthday(a.dob) - getDaysUntilBirthday(b.dob));
  }, [people, searchQuery, filter, proximityFilter]);

  const monthBdays = useMemo(() => people.filter(p => getBirthdayMonth(p.dob) === monthFilter), [people, monthFilter]);
  const monthListBdays = monthBdays;

  const handleParseImport = () => {
    if (!importText.trim()) { showToast("Please paste some contact data first", "error"); return; }
    const lines = importText.split("\n").filter(l => l.trim());
    let parsed: Person[] = [];
    if (importMode === "csv") {
      parsed = lines.slice(1).map(line => {
        const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
        if (cols.length < 2) return null;
        const [name, dob, phone, relationship] = cols;
        if (!name || !dob) return null;
        return { id: "", name, dob, phone: phone || "", relationship: relationship || "Friend", avatar: name.slice(0,2).toUpperCase(), group: activeGroup?.name || "", createdAt: "", createdBy: "" } as Person;
      }).filter(Boolean) as Person[];
    } else if (importMode === "whatsapp") {
      parsed = lines.map(line => {
        const nameMatch = line.match(/^([^:]+):/);
        const dobMatch = line.match(/(\d{4}-\d{2}-\d{2})/);
        const telMatch = line.match(/(?:Tel|Phone|Mobile):\s*([+\d\s\-()]+)/i);
        if (!nameMatch || !dobMatch) return null;
        return { id: "", name: nameMatch[1].trim(), dob: dobMatch[1], phone: telMatch?.[1]?.trim() || "", relationship: "Friend", avatar: nameMatch[1].slice(0,2).toUpperCase(), group: activeGroup?.name || "", createdAt: "", createdBy: "" } as Person;
      }).filter(Boolean) as Person[];
    }
    if (parsed.length === 0) { showToast("No valid contacts found", "error"); return; }
    setImportPreview(parsed);
    setImportStep(2);
    showToast(`Found ${parsed.length} contacts. Review below.`);
  };

  const startVoiceRecognition = (person: Person) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) { showToast("Speech recognition not supported", "error"); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = 'en-US'; recognition.interimResults = false; recognition.maxAlternatives = 1;
    recognition.onstart = () => { setIsRecording(true); showToast("Listening... Speak your wish!"); };
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsRecording(false); setIsAiLoading(true);
      try { const polished = await polishWish(transcript, person.name, person.relationship); setCustomWish(polished); showToast("Wish polished by AI! ✨"); }
      catch { setCustomWish(transcript); showToast("Couldn't polish wish, using transcript."); }
      finally { setIsAiLoading(false); }
    };
    recognition.onerror = (event: any) => { setIsRecording(false); showToast(`Speech recognition error: ${event.error}`, "error"); };
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  const handleImport = handleParseImport;

  const handleWhatsApp = (person: Person, message?: string) => {
    const msg = message || `Happy Birthday ${person.name}! Wishing you a year full of joy, health, and success. Have a great one! 🎂✨`;
    window.open(`https://wa.me/${person.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, "_blank");
    setShowWish(null);
  };

  const handleShareWeeklySummary = () => {
    const upcoming = people.filter(p => getDaysUntilBirthday(p.dob) <= 7).sort((a,b) => getDaysUntilBirthday(a.dob) - getDaysUntilBirthday(b.dob));
    if (!upcoming.length) { showToast("No birthdays this week!", "error"); return; }
    const msg = `🎂 Birthday Reminders This Week:\n\n${upcoming.map(p => `• ${p.name} - ${getDaysUntilBirthday(p.dob) === 0 ? "Today! 🎉" : `In ${getDaysUntilBirthday(p.dob)} days (${MONTHS[getBirthdayMonth(p.dob)]} ${getBirthdayDay(p.dob)})`}`).join("\n")}\n\nSent via BirthDay Premium 🎁`;
    navigator.clipboard.writeText(msg).then(() => showToast("Weekly summary copied! 📋"));
  };

  const handleGroupBroadcast = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    const upcoming = people.filter(p => p.group === group.name && getDaysUntilBirthday(p.dob) <= 7);
    if (!upcoming.length) { showToast("No upcoming birthdays in this group", "error"); return; }
    const msg = `🎂 Upcoming Birthdays in ${group.name}:\n\n${upcoming.map(p => `• ${p.name} (${MONTHS[getBirthdayMonth(p.dob)]} ${getBirthdayDay(p.dob)})`).join("\n")}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };
  return (
    <div className={`min-h-screen bg-[#0D0C1D] text-[#F0EEE9] font-sans selection:bg-indigo-500/30 ${theme}`}>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-sm font-bold z-[10000] shadow-2xl ${toast.type === "error" ? "bg-red-500" : "bg-gradient-to-r from-[#11998E] to-[#38EF7D]"} text-white whitespace-nowrap`}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0D0C1D]/80 backdrop-blur-xl border-b border-white/5 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Cake size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-display font-extrabold tracking-tight leading-none">BirthDay</h1>
            <span className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold">Premium</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 mr-4">
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center overflow-hidden border border-white/10">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={16} className="text-white/40" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white/60 hidden sm:block">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User"}</span>
              {activeGroup && (
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider hidden sm:block">
                  {userRole === 'admin' ? 'Admin' : 'Viewer'}
                </span>
              )}
            </div>
          </div>
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button 
            onClick={handleSignOut}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all"
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>
          {todayBdays.length > 0 && (
            <div className="bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] px-3 py-1 rounded-full text-[11px] font-bold animate-pulse-custom">
              🎉 {todayBdays.length} Today!
            </div>
          )}
          {userRole === 'admin' && (
            <button 
              onClick={() => setShowAdd(true)}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
            >
              <Plus size={16} /> Add
            </button>
          )}
        </div>
      </header>

      <main className="relative z-10 max-w-2xl mx-auto px-5 pt-6">
        {/* Group Selector */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
            {groups.map(g => (
              <button
                key={g.id}
                onClick={() => setActiveGroupId(g.id)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${activeGroupId === g.id ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
              >
                {g.name}
              </button>
            ))}
            <button 
              onClick={handleCreateGroup}
              className="p-2 rounded-xl bg-white/5 border border-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all"
              title="Create New Group"
            >
              <Plus size={18} />
            </button>
          </div>
          {activeGroup && userRole === 'admin' && (
            <button 
              onClick={() => setShowManageMembers(true)}
              className="p-2 rounded-xl bg-white/5 border border-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all flex items-center gap-2 text-xs font-bold"
            >
              <Users size={16} /> Manage
            </button>
          )}
        </div>

        {/* Search & Filters */}
        <div className="space-y-4 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
            <input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white/10 transition-all"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: "all", label: "All Time" },
              { id: "today", label: "Today" },
              { id: "week", label: "Next 7 Days" },
              { id: "month", label: "Next 30 Days" },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setProximityFilter(f.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${proximityFilter === f.id ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex gap-2 overflow-x-auto pb-6 scrollbar-hide no-scrollbar">
          {[
            { id: "dashboard", label: "Overview", icon: <LayoutDashboard size={16} /> },
            { id: "calendar", label: "Calendar", icon: <CalendarDays size={16} /> },
            { id: "upcoming", label: "Upcoming", icon: <Clock size={16} /> },
            { id: "months", label: "Monthly", icon: <Calendar size={16} /> },
            { id: "groups", label: "Groups", icon: <Users size={16} /> },
            { id: "import", label: "Import", icon: <Download size={16} /> },
            { id: "profile", label: "Profile", icon: <UserIcon size={16} /> },
          ].map(t => (
            <button 
              key={t.id} 
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${tab === t.id ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-transparent shadow-lg shadow-indigo-500/20' : 'bg-white/5 text-white/60 border-white/5 hover:bg-white/10 hover:text-white'}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </nav>

        <div className="animate-slide-up">
          {/* ── CALENDAR ── */}
          {tab === "calendar" && (
            <CalendarView 
              people={people} 
              calendarDate={calendarDate} 
              setCalendarDate={setCalendarDate}
              selectedCalendarDay={selectedCalendarDay}
              setSelectedCalendarDay={setSelectedCalendarDay}
              onWish={handleWish}
              onDelete={handleDeletePerson}
              userRole={userRole}
              onGroupWish={handleGroupWish}
              onShowDetail={setShowPersonDetail}
            />
          )}

          {/* ── DASHBOARD ── */}
          {tab === "dashboard" && (
            <div className="space-y-6">
              {/* Weekly Digest / Insights */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/20 rounded-3xl p-6 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Sparkles size={120} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-indigo-500 rounded-xl">
                      <Sparkles size={16} className="text-white" />
                    </div>
                    <h2 className="text-lg font-black text-text-main">Weekly Insights</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                      <div className="text-[10px] font-bold text-text-main/40 uppercase tracking-widest mb-1">Coming Up</div>
                      <div className="text-sm font-bold text-text-main">
                        {weekBdays.length > 0 
                          ? `${weekBdays.length} birthdays in the next 7 days` 
                          : "No birthdays this week. Relax!"}
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                      <div className="text-[10px] font-bold text-text-main/40 uppercase tracking-widest mb-1">Next Big One</div>
                      <div className="text-sm font-bold text-text-main">
                        {people.length > 0 
                          ? (() => {
                              const next = [...people].sort((a, b) => getDaysUntilBirthday(a.dob) - getDaysUntilBirthday(b.dob))[0];
                              return `${next.name} (${getDaysUntilBirthday(next.dob)}d)`;
                            })()
                          : "Add some contacts!"}
                      </div>
                    </div>
                  </div>
                  {todayBdays.length > 0 && (
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        confetti({
                          particleCount: 150,
                          spread: 70,
                          origin: { y: 0.6 },
                          colors: ['#6366f1', '#a855f7', '#ec4899']
                        });
                      }}
                      className="mt-4 w-full bg-white text-indigo-600 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl"
                    >
                      🎉 Celebrate Today's Birthdays
                    </motion.button>
                  )}
                  {weekBdays.length > 0 && (
                    <button 
                      onClick={handleShareWeeklySummary}
                      className="mt-2 w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                    >
                      <Share2 size={14} /> Copy Weekly Summary
                    </button>
                  )}
                </div>
              </motion.div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total", value: people.length, icon: <Users size={20} />, color: "text-indigo-400" },
                  { label: "This Month", value: people.filter(p => getBirthdayMonth(p.dob) === new Date().getMonth()).length, icon: <Calendar size={20} />, color: "text-emerald-400" },
                  { label: "Today", value: todayBdays.length, icon: <Cake size={20} />, color: "text-red-400" },
                ].map(s => (
                  <div key={s.label} className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center">
                    <div className={`flex justify-center mb-2 ${s.color}`}>{s.icon}</div>
                    <div className="text-2xl font-black">{s.value}</div>
                    <div className="text-[10px] text-white/30 uppercase font-bold tracking-wider">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Today Section */}
              {todayBdays.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> Birthdays Today
                  </h2>
                  <div className="space-y-2">
                    {todayBdays.map(p => <BirthdayCard key={p.id} person={p} onWish={handleWish} onDelete={handleDeletePerson} userRole={userRole} onGroupWish={handleGroupWish} onShowDetail={setShowPersonDetail} />)}
                  </div>
                </section>
              )}

              {/* Tomorrow */}
              {tomorrowBdays.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" /> Tomorrow
                  </h2>
                  <div className="space-y-2">
                    {tomorrowBdays.map(p => <BirthdayCard key={p.id} person={p} onWish={handleWish} onDelete={handleDeletePerson} compact userRole={userRole} onGroupWish={handleGroupWish} onShowDetail={setShowPersonDetail} />)}
                  </div>
                </section>
              )}

              {/* This Week */}
              {weekBdays.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> This Week
                  </h2>
                  <div className="space-y-2">
                    {weekBdays.map(p => <BirthdayCard key={p.id} person={p} onWish={handleWish} onDelete={handleDeletePerson} compact userRole={userRole} onGroupWish={handleGroupWish} onShowDetail={setShowPersonDetail} />)}
                  </div>
                </section>
              )}

              {/* This Month */}
              {monthBdays.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> This Month
                  </h2>
                  <div className="space-y-2">
                    {monthBdays.map(p => <BirthdayCard key={p.id} person={p} onWish={handleWish} onDelete={handleDeletePerson} compact userRole={userRole} onGroupWish={handleGroupWish} onShowDetail={setShowPersonDetail} />)}
                  </div>
                </section>
              )}

              {todayBdays.length === 0 && tomorrowBdays.length === 0 && weekBdays.length === 0 && monthBdays.length === 0 && (
                <div className="text-center py-16 px-10 bg-white/5 rounded-3xl border border-dashed border-white/10">
                  <div className="text-5xl mb-4">🎈</div>
                  <h3 className="text-lg font-bold">Quiet month ahead</h3>
                  <p className="text-sm text-white/40 mt-2">Add more friends and family to keep the celebrations going!</p>
                </div>
              )}
            </div>
          )}

          {/* ── UPCOMING ── */}
          {tab === "upcoming" && (
            <div className="space-y-6">
              <div className="space-y-2">
                {sortedPeople.map(p => <BirthdayCard key={p.id} person={p} onWish={handleWish} onDelete={handleDeletePerson} userRole={userRole} onGroupWish={handleGroupWish} onShowDetail={setShowPersonDetail} />)}
              </div>
              {sortedPeople.length === 0 && (
                <div className="text-center py-16">
                  <Search className="mx-auto text-white/10 mb-4" size={48} />
                  <p className="text-white/40">No results found for your search</p>
                </div>
              )}
            </div>
          )}

          {/* ── MONTHLY ── */}
          {tab === "months" && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {MONTHS.map((m, i) => {
                  const count = people.filter(p => getBirthdayMonth(p.dob) === i).length;
                  return (
                    <button 
                      key={m} 
                      onClick={() => setMonthFilter(i)}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${monthFilter === i ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10'}`}
                    >
                      <span className="text-xs font-bold">{m}</span>
                      {count > 0 && <span className={`text-[10px] mt-1 font-black ${monthFilter === i ? 'text-white' : 'text-orange-400'}`}>{count}</span>}
                    </button>
                  );
                })}
              </div>

              <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  🎂 {FULL_MONTHS[monthFilter]}
                  <span className="text-xs font-normal text-white/40 ml-auto">{monthListBdays.length} birthday{monthListBdays.length !== 1 ? "s" : ""}</span>
                </h2>

                {monthListBdays.length > 0 ? (
                  <div className="space-y-2">
                    {[...monthListBdays]
                      .sort((a, b) => getBirthdayDay(a.dob) - getBirthdayDay(b.dob))
                      .map(p => <BirthdayCard key={p.id} person={p} onWish={handleWish} onDelete={handleDeletePerson} userRole={userRole} onGroupWish={handleGroupWish} onShowDetail={setShowPersonDetail} />)}
                  </div>
                ) : (
                  <div className="text-center py-10 text-white/30">
                    <p>No birthdays in {FULL_MONTHS[monthFilter]}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── GROUPS ── */}
          {tab === "groups" && (
            <div className="space-y-6">
              <div className="space-y-4">
                <p className="text-sm text-white/40 leading-relaxed">
                  Shared groups allow you to track birthdays with family, work, or friends. Admins can manage members and birthdays.
                </p>
                
                {/* Gift Planner Section (Collaborative) */}
                {groups.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white/5 border border-white/10 rounded-3xl p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Gift size={18} className="text-pink-400" />
                        <h3 className="font-bold text-white">Group Gift Planner</h3>
                      </div>
                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Collaborative</span>
                    </div>
                    
                    <div className="space-y-3">
                      {groups[0].giftPlanner?.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              item.status === 'delivered' ? 'bg-green-500' : 
                              item.status === 'bought' ? 'bg-blue-500' : 'bg-yellow-500'
                            }`} />
                            <div>
                              <div className="text-sm font-bold text-white">{item.item}</div>
                              <div className="text-[10px] text-white/30">${item.cost} · Pledged by {item.pledgedBy || 'Anyone'}</div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {item.status !== 'delivered' && (
                              <button 
                                onClick={() => handleUpdateGiftStatus(groups[0].id, item.id, item.status === 'suggested' ? 'bought' : 'delivered')}
                                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300"
                              >
                                {item.status === 'suggested' ? 'Mark Bought' : 'Mark Delivered'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      <button 
                        onClick={() => handleAddGiftItem(groups[0].id)}
                        className="w-full py-3 rounded-xl border border-dashed border-white/10 text-[10px] font-bold text-white/40 hover:text-white/60 hover:bg-white/5 transition-all"
                      >
                        + Add Gift Idea to Group
                      </button>
                    </div>
                  </motion.div>
                )}

                <div className="grid gap-4">
                  {groups.map(g => (
                    <div key={g.id} onClick={() => setActiveGroupId(g.id)} className="cursor-pointer">
                      <GroupCard
                        name={g.name}
                        count={people.filter(p => p.group === g.name).length}
                        link={groupInvites[g.id] ? `${window.location.origin}/join/${groupInvites[g.id]}` : "No link generated"}
                        onCopy={handleCopyLink}
                        onDelete={() => {}} 
                        onBroadcast={() => handleGroupBroadcast(g)}
                      />
                    </div>
                  ))}
                  <button 
                    onClick={() => setShowCreateGroup(true)}
                    className="w-full py-8 rounded-2xl border-2 border-dashed border-white/10 bg-white/2 hover:bg-white/5 hover:border-white/20 transition-all flex flex-col items-center justify-center gap-2 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-all">
                      <Plus size={24} />
                    </div>
                    <span className="text-sm font-bold text-white/40 group-hover:text-white/60 transition-all">Create New Shared Group</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── IMPORT ── */}
          {tab === "import" && (
            <div className="space-y-6">
              {/* Wizard Header */}
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-xl font-black">Import Wizard</h2>
                  <p className="text-xs text-white/40">Step {importStep + 1} of 4</p>
                </div>
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map(s => (
                    <div 
                      key={s} 
                      className={`h-1.5 rounded-full transition-all ${importStep >= s ? 'w-6 bg-indigo-500' : 'w-2 bg-white/10'}`}
                    />
                  ))}
                </div>
              </div>

              {/* Step 0: Select Source */}
              {importStep === 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: "whatsapp", icon: <MessageCircle size={24} />, label: "WhatsApp", sub: "Scan messages", color: "text-green-400" },
                      { id: "facebook", icon: <Facebook size={24} />, label: "Facebook", sub: "Import events", color: "text-blue-400" },
                      { id: "contacts", icon: <Users size={24} />, label: "Contacts", sub: "Sync phone", color: "text-red-400" },
                      { id: "csv", icon: <FileText size={24} />, label: "CSV Import", sub: "Bulk upload", color: "text-orange-400" },
                    ].map(c => (
                      <div 
                        key={c.id} 
                        onClick={() => {
                          setImportMode(c.id as any);
                          setImportStep(1);
                        }}
                        className={`bg-white/5 border border-white/5 rounded-2xl p-5 hover:bg-white/10 transition-all cursor-pointer group hover:border-indigo-500/30`}
                      >
                        <div className={`mb-3 ${c.color} group-hover:scale-110 transition-transform`}>{c.icon}</div>
                        <div className="text-sm font-bold">{c.label}</div>
                        <div className="text-[10px] text-white/30 font-bold uppercase tracking-wider">{c.sub}</div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border border-indigo-500/20 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-indigo-400 mb-2 flex items-center gap-2">
                      <ExternalLink size={16} /> WhatsApp Collection Link
                    </h3>
                    <p className="text-xs text-white/50 mb-4 leading-relaxed">
                      Share a link with your group. Members fill in their own details and they're automatically added to your list.
                    </p>
                    <button 
                      onClick={handleCopyLink.bind(null, `${window.location.origin}/collect/${activeGroupId}`)}
                      className="w-full bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-green-500/10 transition-all"
                    >
                      Generate Collection Link
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 1: Paste Data */}
              {importStep === 1 && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                      <Copy size={16} className="text-indigo-400" /> Paste {importMode.toUpperCase()} Data
                    </h3>
                    <textarea
                      value={importText}
                      onChange={e => setImportText(e.target.value)}
                      placeholder={
                        importMode === "csv" ? "John Doe, 1990-06-15, Family, +1234567890" :
                        importMode === "whatsapp" ? "06/15/90, 10:00 - John Doe: Happy Birthday!" :
                        importMode === "facebook" ? "BEGIN:VEVENT\nSUMMARY:John Doe's Birthday\nDTSTART;VALUE=DATE:19900615\nEND:VEVENT" :
                        "BEGIN:VCARD\nFN:John Doe\nBDAY:19900615\nEND:VCARD"
                      }
                      className="w-full h-48 bg-black/30 border border-white/10 rounded-xl p-4 text-xs font-mono text-white/70 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                    />
                    <div className="flex gap-3 mt-4">
                      <button 
                        onClick={() => setImportStep(0)}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl text-sm font-bold transition-all"
                      >
                        Back
                      </button>
                      <button 
                        onClick={handleImport} 
                        disabled={!importText.trim()}
                        className="flex-[2] bg-gradient-to-r from-indigo-500 to-purple-600 disabled:from-white/5 disabled:to-white/5 disabled:text-white/20 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/10 transition-all"
                      >
                        Parse & Preview
                      </button>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                    <p className="text-[10px] text-indigo-300/60 leading-relaxed">
                      <span className="font-bold">Tip:</span> {
                        importMode === "whatsapp" ? "Export your WhatsApp chat without media and paste the text content here." :
                        importMode === "facebook" ? "Download your birthday calendar from Facebook as an .ics file and paste its content." :
                        importMode === "contacts" ? "Export your phone contacts as a .vcf file and paste its content." :
                        "Ensure your CSV follows the format: Name, Date (YYYY-MM-DD), Group, Phone."
                      }
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Preview & Validate */}
              {importStep === 2 && (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div className="bg-white/5 border border-indigo-500/30 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-sm font-bold flex items-center gap-2">
                          <CheckCircle size={16} className="text-emerald-400" /> Review Contacts
                        </h3>
                        <p className="text-[10px] text-white/40 mt-1">Found {importPreview.length} potential birthdays</p>
                      </div>
                      <button 
                        onClick={() => {
                          setImportPreview([]);
                          setImportStep(1);
                        }} 
                        className="text-[10px] text-white/40 hover:text-white font-bold uppercase tracking-widest"
                      >
                        Reset
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar mb-8">
                      {importPreview.map((p, idx) => {
                        const isInvalidDate = isNaN(new Date(p.dob).getTime());
                        return (
                          <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl bg-white/2 border ${isInvalidDate ? 'border-red-500/30 bg-red-500/5' : 'border-white/5'}`}>
                            <div className="flex items-center gap-3">
                              <Avatar initials={p.avatar} color={p.group} size={40} />
                              <div>
                                <div className="text-xs font-bold">{p.name}</div>
                                <div className={`text-[10px] ${isInvalidDate ? 'text-red-400' : 'text-white/40'}`}>
                                  {isInvalidDate ? 'Invalid Date Format' : p.dob}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isInvalidDate && <AlertCircle size={14} className="text-red-400" />}
                              <button 
                                onClick={() => setImportPreview(prev => prev.filter((_, i) => i !== idx))} 
                                className="p-2 rounded-lg bg-white/5 text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => setImportStep(1)}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl font-bold transition-all"
                      >
                        Back
                      </button>
                      <button 
                        onClick={handleConfirmImport}
                        disabled={importPreview.length === 0 || importPreview.some(p => isNaN(new Date(p.dob).getTime()))}
                        className="flex-[2] bg-gradient-to-r from-emerald-500 to-teal-600 disabled:opacity-50 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-500/20 transition-all"
                      >
                        Confirm Import
                      </button>
                    </div>
                    {importPreview.some(p => isNaN(new Date(p.dob).getTime())) && (
                      <p className="text-[10px] text-red-400 text-center mt-4">Please remove contacts with invalid dates before importing.</p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 3: Success */}
              {importStep === 3 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white/5 border border-emerald-500/30 rounded-[32px] p-10 text-center"
                >
                  <div className="w-20 h-20 bg-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="text-emerald-400" size={40} />
                  </div>
                  <h2 className="text-2xl font-black mb-2">Import Complete!</h2>
                  <p className="text-sm text-white/40 mb-8 leading-relaxed">
                    Your contacts have been successfully added to <span className="text-white font-bold">{activeGroup?.name}</span>.
                  </p>
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => setTab("dashboard")}
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-4 rounded-2xl font-bold transition-all"
                    >
                      Go to Dashboard
                    </button>
                    <button 
                      onClick={() => {
                        setImportStep(0);
                        setImportText("");
                      }}
                      className="w-full bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl font-bold transition-all"
                    >
                      Import More
                    </button>
                  </div>
                </motion.div>
              )}

              <div className="pt-8 border-t border-white/5">
                <button 
                  onClick={handleClearAll}
                  className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 py-3 rounded-xl text-xs font-bold transition-all border border-red-500/20"
                >
                  Clear All Data & Reset
                </button>
              </div>
            </div>
          )}

          {/* ── PROFILE ── */}
          {tab === "profile" && (
            <SettingsPanel 
              user={user} 
              userPrefs={userPrefs} 
              setUserPrefs={setUserPrefs} 
              showToast={showToast}
              wishTemplates={wishTemplates}
              setShowManageTemplates={setShowManageTemplates}
            />
          )}

          {/* ── CREATE GROUP MODAL ── */}
        </div>
      </main>

      {/* ── CREATE GROUP MODAL ── */}
      <AnimatePresence>
        {showCreateGroup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateGroup(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-card-bg border border-card-border rounded-[32px] p-8 shadow-2xl overflow-hidden"
            >
              <button 
                onClick={() => setShowCreateGroup(false)}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/5 text-white/40 hover:text-white transition-all"
              >
                <X size={20} />
              </button>

              <div className="mb-8">
                <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-4">
                  <Users className="text-indigo-400" size={32} />
                </div>
                <h2 className="text-2xl font-black">Create Group</h2>
                <p className="text-sm text-white/40 mt-1">Start a new shared birthday circle.</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest ml-1">Group Name</label>
                  <input 
                    type="text" 
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    placeholder="e.g. Family, Work Friends"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    autoFocus
                  />
                </div>

                <button 
                  onClick={handleCreateGroup}
                  disabled={!newGroupName.trim()}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  Create Group
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MANAGE MEMBERS MODAL ── */}
      <AnimatePresence>
        {showManageMembers && activeGroup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowManageMembers(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-card-bg border border-card-border rounded-[32px] p-8 shadow-2xl overflow-hidden"
            >
              <button 
                onClick={() => setShowManageMembers(false)}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/5 text-white/40 hover:text-white transition-all"
              >
                <X size={20} />
              </button>

              <h2 className="text-2xl font-display font-extrabold mb-2">Manage Members</h2>
              <p className="text-sm text-white/40 mb-6">{activeGroup.name}</p>

              <div className="space-y-6">
                {/* Add Member */}
                <div className="space-y-3">
                  <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest">Invite Link</label>
                  <p className="text-[10px] text-white/40 leading-relaxed">
                    Share this link with friends and family. Anyone with the link can join the group.
                  </p>
                  {activeGroupInvite ? (
                    <div className="flex gap-2">
                      <div className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs font-mono text-white/60 truncate">
                        {window.location.origin}/join/{activeGroupInvite}
                      </div>
                      <button 
                        onClick={() => handleCopyLink(`${window.location.origin}/join/${activeGroupInvite}`)}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 rounded-xl font-bold transition-all"
                      >
                        Copy
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={handleGenerateInvite}
                      className="w-full py-3 bg-indigo-500/10 border border-dashed border-indigo-500/30 text-indigo-400 rounded-xl font-bold text-sm hover:bg-indigo-500/20 transition-all"
                    >
                      Generate Invite Link
                    </button>
                  )}
                </div>

                {/* Member List */}
                <div className="space-y-3">
                  <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest">Current Members ({members.length})</label>
                  <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                    {members.map(m => (
                      <div key={m.uid} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs">
                            {m.name?.[0] || m.email?.[0]}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold truncate">{m.name || m.email}</div>
                            <div className="text-[10px] text-white/40 uppercase tracking-wider">{m.role}</div>
                          </div>
                        </div>
                        {m.uid !== user?.uid && (
                          <div className="flex items-center gap-1">
                            <select 
                              value={m.role}
                              onChange={(e) => handleUpdateMemberRole(m.uid, e.target.value as any)}
                              className="bg-transparent text-[10px] font-bold text-indigo-400 border-none focus:ring-0 cursor-pointer"
                            >
                              <option value="viewer">Viewer</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button 
                              onClick={() => handleRemoveMember(m.uid)}
                              className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MANAGE TEMPLATES MODAL ── */}
      {showManageTemplates && (
        <ManageTemplatesModal 
          templates={wishTemplates}
          onAdd={handleAddTemplate}
          onDelete={handleDeleteTemplate}
          onClose={() => setShowManageTemplates(false)}
        />
      )}

      {/* ── ADD PERSON MODAL ── */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAdd(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-lg bg-card-bg border-t border-card-border rounded-t-[32px] p-8 pb-10 shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8" />
              <h2 className="text-2xl font-display font-extrabold mb-6">Add Birthday 🎂</h2>

              <div className="space-y-5">
                {[
                  { label: "Full Name *", key: "name", type: "text", placeholder: "e.g. Priya Sharma" },
                  { label: "Birthday *", key: "dob", type: "date", placeholder: "" },
                  { label: "Phone / WhatsApp", key: "phone", type: "tel", placeholder: "+91 98765 43210" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-[10px] font-bold text-text-main/30 uppercase tracking-widest mb-2">{f.label}</label>
                    <input
                      type={f.type} 
                      value={(addForm as any)[f.key]} 
                      placeholder={f.placeholder}
                      onChange={e => setAddForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-full bg-white/5 border border-card-border rounded-xl py-3 px-4 text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-indigo-500/50 color-scheme-dark"
                    />
                  </div>
                ))}

                <div>
                  <label className="block text-[10px] font-bold text-text-main/30 uppercase tracking-widest mb-2">Relationship Persona</label>
                  <div className="flex flex-wrap gap-2">
                    {RELATIONSHIPS.map(r => {
                      if (r === "Other") return null;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setAddForm(prev => ({ ...prev, relationship: r }))}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${addForm.relationship === r ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-white/5 border-card-border text-text-main/40 hover:bg-white/10'}`}
                        >
                          {r}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        const other = prompt("Enter relationship:");
                        if (other) setAddForm(prev => ({ ...prev, relationship: other }));
                      }}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${!RELATIONSHIPS.includes(addForm.relationship) ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-white/5 border-card-border text-text-main/40 hover:bg-white/10'}`}
                    >
                      {RELATIONSHIPS.includes(addForm.relationship) ? "Other..." : addForm.relationship}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Group</label>
                  <div className="flex flex-col gap-2">
                    <select 
                      value={isCustomGroup ? "custom" : addForm.group} 
                      onChange={e => {
                        if (e.target.value === "custom") {
                          setIsCustomGroup(true);
                        } else {
                          setIsCustomGroup(false);
                          setAddForm(prev => ({ ...prev, group: e.target.value }));
                        }
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none"
                    >
                      {groups.map(g => <option key={g.id} value={g.id} className="bg-[#141329]">{g.name}</option>)}
                      <option value="custom" className="bg-[#141329]">+ New Group...</option>
                    </select>
                    {isCustomGroup && (
                      <input
                        type="text"
                        placeholder="Group Name"
                        value={customGroupName}
                        onChange={e => setCustomGroupName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 animate-slide-up"
                      />
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setShowAdd(false)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddPerson}
                    className="flex-[2] bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-500/20 transition-all"
                  >
                    Save Birthday 🎂
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── PERSON DETAIL MODAL ── */}
      <AnimatePresence>
        {showPersonDetail && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPersonDetail(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-card-bg border border-card-border rounded-[32px] p-8 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <Avatar initials={showPersonDetail.avatar} color={showPersonDetail.group} size={64} />
                  <div>
                    <h2 className="text-xl font-black text-text-main">{showPersonDetail.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-text-main/40">{showPersonDetail.dob} · {getZodiacSign(showPersonDetail.dob).sign}</p>
                      <span className="w-1 h-1 bg-text-main/20 rounded-full" />
                      <button 
                        onClick={async () => {
                          const rel = prompt("Update relationship (e.g. Mentor, Sibling):", showPersonDetail.relationship || "Friend");
                          if (rel) {
                            await supabase.from("birthdays").update({ relationship: rel }).eq("id", showPersonDetail.id);
                            setShowPersonDetail({ ...showPersonDetail, relationship: rel });
                          }
                        }}
                        className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest"
                      >
                        {showPersonDetail.relationship || "Add Persona"}
                      </button>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={async () => {
                    await supabase.from("birthdays").update({ is_favorite: !showPersonDetail.isFavorite }).eq("id", showPersonDetail.id);
                    setShowPersonDetail({ ...showPersonDetail, isFavorite: !showPersonDetail.isFavorite });
                  }}
                  className={`p-2 rounded-xl border ${showPersonDetail.isFavorite ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500' : 'bg-white/5 border-card-border text-text-main/20'}`}
                >
                  <Star size={18} className={showPersonDetail.isFavorite ? "fill-current" : ""} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Interests */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-bold text-text-main/30 uppercase tracking-widest">Interests & Hobbies</div>
                    <button 
                      onClick={async () => {
                        const interest = prompt("Enter an interest (e.g. Photography, Pizza, Hiking):");
                        if (interest) {
                          const newInterests = [...(showPersonDetail.interests || []), interest];
                          await supabase.from("birthdays").update({ interests: newInterests }).eq("id", showPersonDetail.id);
                          setShowPersonDetail({ ...showPersonDetail, interests: newInterests });
                        }
                      }}
                      className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      + Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {showPersonDetail.interests?.map((interest, i) => (
                      <span key={i} className="group/tag px-3 py-1 bg-white/5 border border-card-border rounded-full text-[10px] font-bold text-text-main/60 flex items-center gap-2">
                        {interest}
                        <button 
                          onClick={async () => {
                            const newInterests = showPersonDetail.interests?.filter((_, idx) => idx !== i) || [];
                            await supabase.from("birthdays").update({ interests: newInterests }).eq("id", showPersonDetail.id);
                            setShowPersonDetail({ ...showPersonDetail, interests: newInterests });
                          }}
                          className="opacity-0 group-hover/tag:opacity-100 text-text-main/20 hover:text-red-400 transition-all"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    )) || <span className="text-[10px] text-text-main/20 italic">No interests added yet</span>}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-3">
                  <div className="text-[10px] font-bold text-text-main/30 uppercase tracking-widest">Personal Notes</div>
                  <textarea 
                    defaultValue={showPersonDetail.notes}
                    onBlur={async (e) => {
                      await supabase.from("birthdays").update({ notes: e.target.value }).eq("id", showPersonDetail.id);
                    }}
                    placeholder="Add notes about gift preferences, favorite cake, etc..."
                    className="w-full h-24 bg-black/30 border border-card-border rounded-2xl px-4 py-3 text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => {
                      setShowWish(showPersonDetail);
                      setShowPersonDetail(null);
                    }}
                    className="bg-indigo-500 hover:bg-indigo-600 py-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 text-white"
                  >
                    <Sparkles size={16} /> Send Wish
                  </button>
                  <button 
                    onClick={() => handleCall(showPersonDetail)}
                    className="bg-white/5 hover:bg-white/10 py-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all text-text-main"
                  >
                    <Phone size={16} /> Call
                  </button>
                </div>
              </div>

              <button 
                onClick={() => setShowPersonDetail(null)}
                className="mt-8 w-full text-xs font-bold text-text-main/20 hover:text-text-main/40 transition-colors uppercase tracking-widest"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── WISH MODAL ── */}
      <AnimatePresence>
        {showWish && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWish(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-card-bg border border-card-border rounded-[32px] p-8 text-center shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex justify-center mb-6">
                <Avatar initials={showWish.avatar} color={showWish.group} size={84} />
              </div>
              <h2 className="text-2xl font-display font-extrabold mb-2 text-text-main">
                {getDaysUntilBirthday(showWish.dob) === 0 ? "🎉 Happy Birthday!" : `Wish ${showWish.name}`}
              </h2>
              <p className="text-sm text-text-main/40 mb-6">
                {showWish.name} · {getDaysUntilBirthday(showWish.dob) === 0 ? "Today is their special day! 🎂" : `Birthday in ${getDaysUntilBirthday(showWish.dob)} days`}
              </p>

              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-bold text-text-main/30 uppercase tracking-widest">Message Templates</div>
                    <div className="flex gap-2">
                      <button
                        disabled={isAiLoading || isRecording}
                        onClick={() => startVoiceRecognition(showWish)}
                        className={`p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-indigo-400 hover:bg-indigo-400/10 transition-all ${isRecording ? 'bg-red-500/20 text-red-400 animate-pulse' : ''} ${(isAiLoading || isRecording) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title="Voice-to-Wish (AI Polished)"
                      >
                        <Mic size={14} />
                      </button>
                      {["funny", "heartfelt", "professional"].map((v) => (
                        <button
                          key={v}
                          disabled={isAiLoading}
                          onClick={() => handleGenerateSmartWish(showWish, v)}
                          className={`p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-indigo-400 hover:bg-indigo-400/10 transition-all ${isAiLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={`Generate ${v} wish`}
                        >
                          {isAiLoading ? <Loader2 size={14} className="animate-spin" /> : (
                            <>
                              {v === "funny" && <Laugh size={14} />}
                              {v === "heartfelt" && <Heart size={14} />}
                              {v === "professional" && <Briefcase size={14} />}
                            </>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                    <button 
                      onClick={() => {
                        setSelectedTemplateId(null);
                        setCustomWish("");
                      }}
                      className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border ${!selectedTemplateId ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-white/5 border-white/10 text-white/40'}`}
                    >
                      Default
                    </button>
                    {wishTemplates.map(t => (
                      <button 
                        key={t.id}
                        onClick={() => {
                          setSelectedTemplateId(t.id);
                          setCustomWish(t.content.replace(/{name}/g, showWish.name));
                        }}
                        className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border ${selectedTemplateId === t.id ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-white/5 border-white/10 text-white/40'}`}
                      >
                        {t.title}
                      </button>
                    ))}
                  </div>

                  <textarea 
                    value={customWish}
                    onChange={e => {
                      setCustomWish(e.target.value);
                      setSelectedTemplateId(null);
                    }}
                    placeholder="Write a custom wish message..."
                    className="w-full h-24 bg-black/30 border border-card-border rounded-2xl px-4 py-3 text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none"
                  />
                </div>

                {/* AI Gift Concierge */}
                <div className="bg-white/5 rounded-2xl p-4 border border-card-border text-left">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Gift size={14} className="text-pink-400" />
                      <span className="text-[10px] font-bold text-text-main/60 uppercase tracking-widest">Gift Concierge</span>
                    </div>
                    <button 
                      disabled={isAiLoading}
                      onClick={() => handleGenerateGiftIdeas(showWish)}
                      className={`text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 ${isAiLoading ? 'opacity-50' : ''}`}
                    >
                      {isAiLoading ? <Loader2 size={10} className="animate-spin" /> : "Get Ideas"}
                    </button>
                  </div>
                  
                  {aiGiftIdeas.length > 0 ? (
                    <div className="space-y-2">
                      {aiGiftIdeas.map((idea, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 p-2 bg-black/20 rounded-lg border border-card-border">
                          <span className="text-[10px] text-text-main/70 truncate flex-1">{idea}</span>
                          <button 
                            onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(idea)}`, "_blank")}
                            className="p-1 text-text-main/20 hover:text-indigo-400 transition-colors"
                          >
                            <ExternalLink size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-text-main/30 leading-relaxed">
                      Personalize their gift based on their interests. Try searching for something related to their hobbies!
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => handleWhatsApp(showWish, customWish)}
                    className="bg-gradient-to-r from-[#25D366] to-[#128C7E] py-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all text-white"
                  >
                    <MessageCircle size={16} /> WhatsApp
                  </button>
                  <button 
                    onClick={() => handleCopyWish(showWish, customWish)}
                    className="bg-white/5 hover:bg-white/10 py-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all text-text-main"
                  >
                    <Copy size={16} /> Copy
                  </button>
                </div>

                <button 
                  onClick={() => handleCall(showWish)}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 py-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all text-white"
                >
                  <Phone size={16} /> Call Now
                </button>
              </div>

              <button 
                onClick={() => setShowWish(null)}
                className="mt-6 text-xs font-bold text-white/20 hover:text-white/40 transition-colors uppercase tracking-widest"
              >
                Dismiss
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
