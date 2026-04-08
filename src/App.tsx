/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
/// <reference types="vite/client" />

import React, { useState, useEffect, useMemo, Key, createContext, useContext } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, 
  Search, 
  LayoutDashboard, 
  Clock, 
  Calendar, 
  Users, 
  Download, 
  X, 
  Copy, 
  Phone, 
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Cake,
  ExternalLink,
  Facebook,
  FileText,
  Trash2,
  LogOut,
  Mail,
  Lock,
  CheckCircle,
  AlertCircle,
  User as UserIcon,
  Bell,
  CalendarDays,
  Camera,
  Upload,
  Loader2,
  Sparkles,
  Gift,
  Star,
  Heart,
  Laugh,
  Briefcase,
  Music,
  Share2,
  CalendarPlus,
  ArrowRight,
  Mic,
  Sun,
  Moon
} from "lucide-react";
import confetti from "canvas-confetti";
import { generateSmartWish, generateGiftIdeas, polishWish } from "./services/aiService";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  getDocs,
  writeBatch,
  where,
  collectionGroup,
  getDoc,
  updateDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, googleProvider, getMessagingSafe, storage } from "./firebase";
import { getToken, onMessage } from "firebase/messaging";

// ─── Auth Context ─────────────────────────────────────────────────────────────
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, error: null });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      setError(null);

      if (user) {
        // Create or update user profile in Firestore
        const userRef = doc(db, "users", user.uid);
        setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          name: user.displayName || user.email?.split('@')[0] || "User",
          photoURL: user.photoURL,
          lastLogin: serverTimestamp()
        }, { merge: true });

        // Request FCM token
        const requestToken = async () => {
          try {
            const m = await getMessagingSafe();
            if (!m) return;

            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
              const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
              if (vapidKey) {
                const token = await getToken(m, { vapidKey });
                if (token) {
                  await updateDoc(userRef, { fcmToken: token });
                  console.log("FCM Token registered:", token);
                }
              } else {
                console.warn("VITE_FIREBASE_VAPID_KEY not found in environment.");
              }
            }
          } catch (err) {
            console.error("Error registering FCM token:", err);
          }
        };
        requestToken();
      }
    });
    return unsubscribe;
  }, []);

  // Handle foreground messages
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    const setupMessaging = async () => {
      const m = await getMessagingSafe();
      if (m) {
        unsubscribe = onMessage(m, (payload) => {
          console.log("Foreground message received:", payload);
          // You could show a custom toast here if you want
        });
      }
    };

    setupMessaging();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
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
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
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
  const milestones = [1, 5, 10, 13, 16, 18, 21, 25, 30, 40, 50, 60, 70, 75, 80, 90, 100];
  return milestones.includes(age);
}

function downloadICS(person: Person) {
  const date = new Date(person.dob);
  const year = new Date().getFullYear();
  const start = new Date(year, date.getMonth(), date.getDate());
  const end = new Date(year, date.getMonth(), date.getDate() + 1);

  const formatDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, "");
  
  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `SUMMARY:🎂 ${person.name}'s Birthday`,
    `DTSTART;VALUE=DATE:${formatDate(start).slice(0, 8)}`,
    `DTEND;VALUE=DATE:${formatDate(end).slice(0, 8)}`,
    "RRULE:FREQ=YEARLY",
    "DESCRIPTION:Birthday reminder from Birthday App",
    "END:VEVENT",
    "END:VCALENDAR"
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

function generateShareLink(groupName: string) {
  const encoded = btoa(groupName + "-" + Date.now());
  return `https://birthdayapp.link/join/${encoded.slice(0, 12)}`;
}

// ─── Components ───────────────────────────────────────────────────────────────

function Confetti({ active }: { active: boolean }) {
  if (!active) return null;
  const pieces = Array.from({ length: 40 }, (_, i) => i);
  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {pieces.map(i => (
        <div 
          key={i} 
          className="absolute animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            top: "-20px",
            width: `${6 + Math.random() * 8}px`,
            height: `${6 + Math.random() * 8}px`,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            background: ["#FF6B6B", "#FFB347", "#A8E6CF", "#88D8FF", "#B8A9FF", "#FFD700", "#FF69B4"][Math.floor(Math.random() * 7)],
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${1.5 + Math.random() * 2}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }} 
        />
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
    <div 
      className="flex items-center justify-center font-bold text-white shrink-0 shadow-lg"
      style={{
        width: size, 
        height: size, 
        borderRadius: "50%",
        background: colors[color] || colors.default,
        fontSize: size * 0.36,
        letterSpacing: "0.5px",
      }}
    >
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
    <motion.div 
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onShowDetail(person)}
      className={`group relative overflow-hidden flex items-center gap-4 p-4 rounded-2xl border border-card-border bg-card-bg cursor-pointer transition-colors hover:bg-white/10 hover:border-white/20 ${compact ? 'py-3' : 'py-4'}`}
    >
      {days === 0 && (
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent pointer-events-none" />
      )}
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
          {isMilestone && (
            <span className="bg-purple-500/20 text-purple-400 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter border border-purple-500/30">
              Milestone
            </span>
          )}
          <span 
            className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: bg, color }}
          >
            {label}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-white/40">
            {MONTHS[dob.getMonth()]} {dob.getDate()} · Turns {age}
          </span>
          <span className="text-[10px] text-white/20 flex items-center gap-1">
            <span className="text-indigo-400/50">{zodiac.icon}</span> {zodiac.sign}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            downloadICS(person);
          }}
          className="p-2 rounded-xl text-white/20 hover:text-white hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
          title="Export to Calendar"
        >
          <CalendarPlus size={16} />
        </button>
        {onGroupWish && days <= 7 && (
          <button 
            onClick={(e) => { e.stopPropagation(); onGroupWish(person); }}
            className="p-2 rounded-xl text-green-400 hover:bg-green-400/10 transition-all flex items-center gap-1"
            title="Send Group Wish"
          >
            <MessageCircle size={16} />
            <span className="text-[10px] font-bold hidden sm:inline">Group Wish</span>
          </button>
        )}
        {userRole === 'admin' && (
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(person.id); }}
            className="p-2 rounded-xl text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={16} />
          </button>
        )}
        <button 
          onClick={(e) => { e.stopPropagation(); onWish(person); }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all whitespace-nowrap ${days === 0 ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF8E53] shadow-lg shadow-red-500/20' : 'bg-white/10 hover:bg-white/20'}`}
        >
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
    <div 
      className="group p-5 rounded-2xl border transition-all relative overflow-hidden"
      style={{ background: c.bg, borderColor: c.border }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{c.icon}</span>
          <div>
            <div className="text-base font-bold text-[#F0EEE9]">{name}</div>
            <div className="text-xs text-white/50">{count} members</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs bg-white/10 px-2.5 py-1 rounded-full text-white/60">
            {count} 🎂
          </div>
          {count === 0 && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(name); }}
              className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
            >
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
        <button 
          onClick={(e) => { e.stopPropagation(); onCopy(link); }}
          className="flex-1 bg-white/10 border border-white/10 hover:bg-white/20 rounded-xl py-2 text-xs font-bold text-[#F0EEE9] transition-colors flex items-center justify-center gap-2"
        >
          <Copy size={14} /> Copy Link
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onBroadcast(); }}
          className="flex-1 bg-gradient-to-r from-[#25D366] to-[#128C7E] rounded-xl py-2 text-xs font-bold text-white shadow-lg shadow-green-500/10 flex items-center justify-center gap-2"
        >
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
  const { user, loading, error } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0C1D] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !user) {
    return <Login />;
  }

  const isJoin = window.location.pathname.startsWith("/join/");
  if (isJoin) return <JoinGroup />;

  return <BirthdayApp />;
}

function JoinGroup() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const token = window.location.pathname.split("/join/")[1];

  useEffect(() => {
    if (authLoading || !token) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const join = async () => {
      try {
        const inviteDoc = await getDoc(doc(db, "invites", token));
        if (!inviteDoc.exists()) {
          setError("Invalid or expired invite link.");
          setLoading(false);
          return;
        }

        const { groupId } = inviteDoc.data();
        
        // Add user to group
        await setDoc(doc(db, "groups", groupId, "members", user.uid), {
          uid: user.uid,
          email: user.email,
          name: user.displayName || user.email?.split('@')[0] || "User",
          role: 'viewer',
          joinedAt: new Date().toISOString()
        }, { merge: true });

        // Redirect to home
        localStorage.setItem("activeGroupId", groupId);
        window.location.href = "/";
      } catch (err) {
        console.error(err);
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
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold">Authenticating...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0D0C1D] flex flex-col items-center justify-center p-6 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold mb-2">Oops!</h2>
        <p className="text-white/40 mb-8">{error}</p>
        <button onClick={() => window.location.href = "/"} className="bg-indigo-500 px-8 py-3 rounded-xl font-bold">Go Home</button>
      </div>
    );
  }

  return null;
}

function CalendarView({ 
  people, 
  calendarDate, 
  setCalendarDate, 
  selectedCalendarDay, 
  setSelectedCalendarDay,
  onWish,
  onDelete,
  userRole,
  onGroupWish,
  onShowDetail
}: {
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
            <div className="text-4xl font-black text-indigo-400 font-mono">
              {(month + 1).toString().padStart(2, '0')}
            </div>
            <div>
              <h3 className="text-xl font-bold">{FULL_MONTHS[month]}</h3>
              <p className="text-xs text-white/30 uppercase tracking-widest font-bold">{year}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
              <ChevronLeft size={20} />
            </button>
            <button onClick={nextMonth} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-4">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-white/20 uppercase tracking-widest py-2">
              {d}
            </div>
          ))}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`pad-${i}`} className="aspect-square" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const hasBirthdays = !!birthdaysByDay[day];
            const isSelected = selectedCalendarDay === day;
            const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

            return (
              <button
                key={day}
                onClick={() => setSelectedCalendarDay(day)}
                className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative transition-all border ${
                  isSelected 
                    ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/20' 
                    : hasBirthdays 
                      ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' 
                      : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                }`}
              >
                <span className={`text-sm font-bold ${isToday && !isSelected ? 'text-red-400' : ''}`}>{day}</span>
                {hasBirthdays && !isSelected && (
                  <div className="absolute bottom-2 w-1 h-1 rounded-full bg-indigo-400" />
                )}
                {isToday && !isSelected && (
                  <div className="absolute top-2 right-2 w-1 h-1 rounded-full bg-red-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedCalendarDay && (
          <motion.div
            key={selectedCalendarDay}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest">
                Birthdays on {FULL_MONTHS[month]} {selectedCalendarDay}
              </h4>
              <button onClick={() => setSelectedCalendarDay(null)} className="text-[10px] text-white/20 hover:text-white uppercase font-bold tracking-widest">
                Clear
              </button>
            </div>
            
            {selectedBirthdays.length > 0 ? (
              <div className="space-y-2">
                {selectedBirthdays.map((p, idx) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.3 }}
                  >
                    <BirthdayCard 
                      person={p} 
                      onWish={onWish} 
                      onDelete={onDelete} 
                      userRole={userRole} 
                      onGroupWish={onGroupWish} 
                      onShowDetail={onShowDetail}
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                <p className="text-sm text-white/20 font-medium">No celebrations on this day</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfileView({ 
  user, 
  userPrefs, 
  setUserPrefs, 
  showToast,
  wishTemplates,
  setShowManageTemplates
}: { 
  user: User | null; 
  userPrefs: any; 
  setUserPrefs: any;
  showToast: (msg: string, type?: "success" | "error") => void;
  wishTemplates: WishTemplate[];
  setShowManageTemplates: (show: boolean) => void;
}) {
  const [name, setName] = useState(user?.displayName || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpdateName = async () => {
    if (!user || !name.trim()) return;
    setIsSaving(true);
    try {
      // Update Auth Profile
      await updateProfile(user, { displayName: name });
      
      // Update Firestore Profile
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { name });
      
      showToast("Profile name updated successfully!");
    } catch (error) {
      console.error("Error updating name:", error);
      showToast("Failed to update name", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePref = async (key: string) => {
    if (!user) return;
    const newVal = !userPrefs[key];
    
    // Optimistic update
    setUserPrefs((prev: any) => ({ ...prev, [key]: newVal }));

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { [key]: newVal });
    } catch (error) {
      console.error("Error updating preference:", error);
      showToast("Failed to update preference", "error");
      // Revert on error
      setUserPrefs((prev: any) => ({ ...prev, [key]: !newVal }));
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      showToast("Please upload an image file", "error");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast("Image size should be less than 2MB", "error");
      return;
    }

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `profiles/${user.uid}/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Update Auth Profile
      await updateProfile(user, { photoURL: downloadURL });

      // Update Firestore Profile
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { photoURL: downloadURL });

      showToast("Profile picture updated!");
    } catch (error) {
      console.error("Error uploading photo:", error);
      showToast("Failed to upload photo", "error");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-12"
    >
      {/* Profile Header */}
      <div className="relative bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/10 rounded-[32px] p-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] -mr-32 -mt-32 rounded-full" />
        
        <div className="relative flex flex-col items-center text-center">
          <div className="relative group mb-6">
            <div className="w-32 h-32 rounded-[40px] overflow-hidden border-4 border-white/10 shadow-2xl transition-transform group-hover:scale-105">
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || "User"} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-4xl font-black text-white">
                  {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                </div>
              )}
            </div>
            <label className="absolute bottom-0 right-0 w-10 h-10 bg-white text-indigo-600 rounded-2xl flex items-center justify-center shadow-xl cursor-pointer hover:scale-110 transition-all border-2 border-[#0f0e21]">
              <input type="file" className="hidden" onChange={handlePhotoUpload} accept="image/*" />
              {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
            </label>
          </div>
          
          <h2 className="text-2xl font-black mb-1">{user?.displayName || "User"}</h2>
          <p className="text-sm text-white/40 font-medium">{user?.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-8">
          {/* Edit Name */}
          <div className="bg-white/5 border border-white/10 rounded-[32px] p-8">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-6 flex items-center gap-2">
              <UserIcon size={16} className="text-indigo-400" /> Personal Information
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/60 ml-1">Display Name</label>
                <div className="flex gap-3">
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="flex-1 bg-black/30 border border-white/10 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  />
                  <button 
                    onClick={handleUpdateName}
                    disabled={isSaving || !name.trim() || name === user?.displayName}
                    className="px-6 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-indigo-500 text-white rounded-2xl font-bold text-sm transition-all flex items-center gap-2"
                  >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : "Save"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="bg-white/5 border border-white/10 rounded-[32px] p-8">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-6 flex items-center gap-2">
              <Bell size={16} className="text-purple-400" /> Notifications
            </h3>
            <div className="space-y-4">
              {[
                { id: "remindOnDay", label: "On the Day", sub: "Get notified when it's someone's birthday" },
                { id: "remind1DayBefore", label: "1 Day Before", sub: "Get a heads-up the day before" },
                { id: "remind3DaysBefore", label: "3 Days Before", sub: "Plenty of time to prepare a gift" },
              ].map((pref) => (
                <div 
                  key={pref.id}
                  onClick={() => handleTogglePref(pref.id)}
                  className="flex items-center justify-between p-5 rounded-2xl bg-black/20 border border-white/5 hover:border-white/10 transition-all cursor-pointer group"
                >
                  <div className="pr-4">
                    <div className="text-sm font-bold group-hover:text-white transition-colors">{pref.label}</div>
                    <div className="text-[10px] text-white/30 font-medium uppercase tracking-wider mt-0.5">{pref.sub}</div>
                  </div>
                  <div className={`w-12 h-6 rounded-full p-1 transition-all duration-300 flex-shrink-0 ${userPrefs[pref.id] ? 'bg-indigo-500' : 'bg-white/10'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full transition-all duration-300 transform ${userPrefs[pref.id] ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Wish Templates */}
          <div className="bg-white/5 border border-white/10 rounded-[32px] p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                <FileText size={16} className="text-orange-400" /> Wish Templates
              </h3>
              <button 
                onClick={() => setShowManageTemplates(true)}
                className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-colors"
              >
                Manage
              </button>
            </div>
            
            <div className="space-y-3">
              {wishTemplates.length === 0 ? (
                <p className="text-xs text-white/20 italic text-center py-4">No templates created yet.</p>
              ) : (
                wishTemplates.slice(0, 3).map(t => (
                  <div key={t.id} className="p-4 rounded-2xl bg-black/20 border border-white/5">
                    <div className="text-xs font-bold mb-1">{t.title}</div>
                    <div className="text-[10px] text-white/30 line-clamp-1">{t.content}</div>
                  </div>
                ))
              )}
              {wishTemplates.length > 3 && (
                <p className="text-[10px] text-white/20 text-center">+{wishTemplates.length - 3} more templates</p>
              )}
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-white/5 border border-white/10 rounded-[32px] p-8">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-6 flex items-center gap-2">
              <Lock size={16} className="text-emerald-400" /> Account Security
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 rounded-2xl bg-black/20 border border-white/5">
                <span className="text-xs text-white/40 font-bold uppercase tracking-wider">Email</span>
                <span className="text-sm font-bold">{user?.email}</span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-2xl bg-black/20 border border-white/5">
                <span className="text-xs text-white/40 font-bold uppercase tracking-wider">User ID</span>
                <span className="text-[10px] font-mono text-white/40">{user?.uid}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div className="pt-4">
        <button 
          onClick={() => signOut(auth)}
          className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 py-5 rounded-[24px] font-bold text-sm transition-all border border-red-500/20 flex items-center justify-center gap-3"
        >
          <LogOut size={18} /> Sign Out
        </button>
      </div>
    </motion.div>
  );
}

function ManageTemplatesModal({ 
  show, 
  onClose, 
  templates, 
  user, 
  showToast 
}: { 
  show: boolean; 
  onClose: () => void; 
  templates: WishTemplate[]; 
  user: User | null;
  showToast: (msg: string, type?: "success" | "error") => void;
}) {
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!user || !newTitle.trim() || !newContent.trim()) return;
    if (templates.length >= 10) {
      showToast("Maximum 10 templates allowed", "error");
      return;
    }

    setIsAdding(true);
    try {
      await addDoc(collection(db, "users", user.uid, "templates"), {
        title: newTitle,
        content: newContent,
        createdAt: serverTimestamp()
      });
      setNewTitle("");
      setNewContent("");
      showToast("Template added successfully!");
    } catch (error) {
      console.error("Error adding template:", error);
      showToast("Failed to add template", "error");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "templates", id));
      showToast("Template deleted");
    } catch (error) {
      console.error("Error deleting template:", error);
      showToast("Failed to delete template", "error");
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-2xl bg-card-bg border border-card-border rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/2">
              <div>
                <h2 className="text-2xl font-black">Wish Templates</h2>
                <p className="text-xs text-white/30 font-medium uppercase tracking-widest mt-1">
                  Manage your custom birthday messages ({templates.length}/10)
                </p>
              </div>
              <button 
                onClick={onClose}
                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
              {/* Add New Template */}
              {templates.length < 10 && (
                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-[32px] p-6 space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-indigo-400">
                    <Plus size={16} /> Create New Template
                  </h3>
                  <div className="space-y-4">
                    <input 
                      type="text" 
                      placeholder="Template Title (e.g. Professional, Funny)"
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                    <textarea 
                      placeholder="Message content... Use {name} for the person's name."
                      value={newContent}
                      onChange={e => setNewContent(e.target.value)}
                      className="w-full h-24 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                    />
                    <button 
                      onClick={handleAdd}
                      disabled={isAdding || !newTitle.trim() || !newContent.trim()}
                      className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                    >
                      {isAdding ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                      Add Template
                    </button>
                  </div>
                </div>
              )}

              {/* Existing Templates */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/20 ml-2">Your Templates</h3>
                {templates.length === 0 ? (
                  <div className="text-center py-12 bg-white/2 border border-dashed border-white/10 rounded-[32px]">
                    <p className="text-sm text-white/20 italic">No templates yet. Create your first one above!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {templates.map(t => (
                      <div key={t.id} className="group bg-white/5 border border-white/10 rounded-[24px] p-6 hover:border-indigo-500/30 transition-all">
                        <div className="flex items-start justify-between mb-3">
                          <div className="font-bold text-indigo-400">{t.title}</div>
                          <button 
                            onClick={() => handleDelete(t.id)}
                            className="p-2 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <p className="text-sm text-white/60 leading-relaxed italic">"{t.content}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

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
  const [isRecording, setIsRecording] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'dark';
  });
  const [aiGiftIdeas, setAiGiftIdeas] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [filter, setFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth());
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [addForm, setAddForm] = useState({ name: "", dob: "", phone: "", relationship: "Friend" });
  const [importText, setImportText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [customGroupName, setCustomGroupName] = useState("");
  const [isCustomGroup, setIsCustomGroup] = useState(false);
  const [activeGroupInvite, setActiveGroupInvite] = useState<string | null>(null);
  const [groupInvites, setGroupInvites] = useState<Record<string, string>>({});
  const [importMode, setImportMode] = useState<"csv" | "whatsapp" | "facebook" | "contacts">("csv");
  const [importStep, setImportStep] = useState(0);
  const [importPreview, setImportPreview] = useState<Person[]>([]);
  const [proximityFilter, setProximityFilter] = useState("all");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [wishTemplates, setWishTemplates] = useState<WishTemplate[]>([]);
  const [showManageTemplates, setShowManageTemplates] = useState(false);
  const [templateForm, setTemplateForm] = useState({ title: "", content: "" });
  const [customWish, setCustomWish] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [userPrefs, setUserPrefs] = useState({
    remindOnDay: true,
    remind1DayBefore: false,
    remind3DaysBefore: false
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const startVoiceRecognition = (person: Person) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      showToast("Speech recognition not supported in this browser", "error");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
      showToast("Listening... Speak your wish!");
    };

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsRecording(false);
      setIsAiLoading(true);
      try {
        const polished = await polishWish(transcript, person.name, person.relationship);
        setCustomWish(polished);
        showToast("Wish polished by AI! ✨");
      } catch (err) {
        setCustomWish(transcript);
        showToast("Couldn't polish wish, using transcript.");
      } finally {
        setIsAiLoading(false);
      }
    };

    recognition.onerror = (event: any) => {
      setIsRecording(false);
      showToast(`Speech recognition error: ${event.error}`, "error");
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  // 0. Fetch User Profile and Preferences
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setUserPrefs({
          remindOnDay: data.remindOnDay ?? true,
          remind1DayBefore: data.remind1DayBefore ?? false,
          remind3DaysBefore: data.remind3DaysBefore ?? false
        });
      }
    });
    return () => unsubscribe();
  }, [user]);

  // 1. Fetch Groups the user is a member of
  useEffect(() => {
    if (!user) return;
    
    // We'll use a collectionGroup query to find all 'members' documents where uid matches
    // Note: This requires a composite index in Firestore. 
    // If index is not ready, we'll fallback to a simpler approach or wait for user to create/join.
    const q = query(collectionGroup(db, "members"), where("uid", "==", user.uid));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const groupIds = snapshot.docs.map(doc => doc.ref.parent.parent?.id).filter(Boolean) as string[];
      
      if (groupIds.length === 0) {
        setGroups([]);
        return;
      }

      // Fetch group details for each ID
      const groupData: Group[] = [];
      for (const id of groupIds) {
        const gDoc = await getDoc(doc(db, "groups", id));
        if (gDoc.exists()) {
          groupData.push({ id: gDoc.id, ...gDoc.data() } as Group);
        }
      }
      setGroups(groupData);
      
      // Auto-select first group if none active
      if (!activeGroupId && groupData.length > 0) {
        setActiveGroupId(groupData[0].id);
      }
    }, (error) => {
      console.error("Error fetching groups:", error);
      // Fallback: If collectionGroup fails (index missing), we might need to handle it
    });

    return unsubscribe;
  }, [user, activeGroupId]);

  // 2. Fetch Birthdays and Members for the active group
  useEffect(() => {
    if (!user || !activeGroupId) return;

    // Sync Birthdays
    const bQ = query(collection(db, "groups", activeGroupId, "birthdays"), orderBy("createdAt", "desc"));
    const unsubBirthdays = onSnapshot(bQ, (snapshot) => {
      setPeople(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Person)));
    });

    // Sync Members
    const mQ = collection(db, "groups", activeGroupId, "members");
    const unsubMembers = onSnapshot(mQ, (snapshot) => {
      const mList = snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as Member));
      setMembers(mList);
      
      // Set current user's role
      const me = mList.find(m => m.uid === user.uid);
      if (user.email === "narenaiims@gmail.com") {
        setUserRole('admin');
      } else if (me) {
        setUserRole(me.role);
      }
    });

    return () => {
      unsubBirthdays();
      unsubMembers();
    };
  }, [user, activeGroupId]);

  // 3. Fetch Invites for all groups
  useEffect(() => {
    if (groups.length === 0) return;
    
    const q = query(collection(db, "invites"), where("groupId", "in", groups.map(g => g.id)));
    const unsub = onSnapshot(q, (snap) => {
      const invites: Record<string, string> = {};
      snap.docs.forEach(doc => {
        invites[doc.data().groupId] = doc.id;
      });
      setGroupInvites(invites);
      
      if (activeGroupId) {
        setActiveGroupInvite(invites[activeGroupId] || null);
      }
    });
    return unsub;
  }, [groups, activeGroupId]);

  // 4. Fetch User Preferences
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setUserPrefs({
          remindOnDay: data.remindOnDay ?? true,
          remind1DayBefore: data.remind1DayBefore ?? false,
          remind3DaysBefore: data.remind3DaysBefore ?? false
        });
      }
    });
    return unsub;
  }, [user]);

  // Fetch Wish Templates
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "templates"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setWishTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WishTemplate)));
    });
    return unsub;
  }, [user]);

  const activeGroup = useMemo(() => groups.find(g => g.id === activeGroupId), [groups, activeGroupId]);

  useEffect(() => {
    if (activeGroupId) {
      localStorage.setItem("activeGroupId", activeGroupId);
    }
  }, [activeGroupId]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  const sortedPeople = useMemo(() => {
    return [...people]
      .filter(p => {
        const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const days = getDaysUntilBirthday(p.dob);
        let matchesProximity = true;
        if (proximityFilter === "today") matchesProximity = days === 0;
        else if (proximityFilter === "week") matchesProximity = days <= 7;
        else if (proximityFilter === "month") matchesProximity = days <= 30;
        
        return matchesSearch && matchesProximity;
      })
      .sort((a, b) => getDaysUntilBirthday(a.dob) - getDaysUntilBirthday(b.dob));
  }, [people, searchQuery, proximityFilter]);

  const todayBdays = useMemo(() => people.filter(p => getDaysUntilBirthday(p.dob) === 0), [people]);
  const tomorrowBdays = useMemo(() => people.filter(p => getDaysUntilBirthday(p.dob) === 1), [people]);
  const weekBdays = useMemo(() => people.filter(p => { const d = getDaysUntilBirthday(p.dob); return d > 1 && d <= 7; }), [people]);
  const monthBdays = useMemo(() => people.filter(p => { const d = getDaysUntilBirthday(p.dob); return d > 7 && d <= 30; }), [people]);
  const monthListBdays = useMemo(() => people.filter(p => getBirthdayMonth(p.dob) === monthFilter), [people, monthFilter]);

  const handleAddPerson = async () => {
    if (!user || !activeGroupId || userRole !== 'admin') {
      showToast("Only admins can add birthdays", "error");
      return;
    }
    if (!addForm.name || !addForm.dob) {
      showToast("Please fill in name and birthday", "error");
      return;
    }
    const initials = addForm.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
    
    try {
      const personData = {
        ...addForm,
        avatar: initials,
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
        group: activeGroup?.name || "General"
      };
      await addDoc(collection(db, "groups", activeGroupId, "birthdays"), personData);
      
      setAddForm({ name: "", dob: "", phone: "", relationship: "Friend" });
      setShowAdd(false);
      showToast(`🎂 ${addForm.name} added successfully!`);
    } catch (error) {
      handleFirestoreError(error, "write" as any, `groups/${activeGroupId}/birthdays`);
    }
  };

  const handleDeletePerson = async (id: string) => {
    if (!user || !activeGroupId || userRole !== 'admin') {
      showToast("Only admins can delete birthdays", "error");
      return;
    }
    try {
      await deleteDoc(doc(db, "groups", activeGroupId, "birthdays", id));
      showToast("Contact deleted");
    } catch (error) {
      handleFirestoreError(error, "delete" as any, `groups/${activeGroupId}/birthdays/${id}`);
    }
  };

  const handleCreateGroup = async () => {
    if (!user || !newGroupName.trim()) return;

    try {
      // 1. Create the group
      const groupRef = await addDoc(collection(db, "groups"), {
        name: newGroupName.trim(),
        ownerId: user.uid,
        createdAt: new Date().toISOString()
      });

      // 2. Add the creator as an admin member
      await setDoc(doc(db, "groups", groupRef.id, "members", user.uid), {
        uid: user.uid,
        email: user.email,
        name: user.displayName || user.email?.split('@')[0] || "User",
        role: 'admin',
        joinedAt: new Date().toISOString()
      });

      setActiveGroupId(groupRef.id);
      setNewGroupName("");
      setShowCreateGroup(false);
      showToast(`Group "${newGroupName}" created!`);
    } catch (error) {
      handleFirestoreError(error, "write" as any, "groups");
    }
  };

  const handleUpdateMemberRole = async (memberUid: string, newRole: 'admin' | 'viewer') => {
    if (!user || !activeGroupId || userRole !== 'admin') return;
    try {
      await updateDoc(doc(db, "groups", activeGroupId, "members", memberUid), {
        role: newRole
      });
      showToast("Role updated");
    } catch (error) {
      showToast("Failed to update role", "error");
    }
  };

  const handleRemoveMember = async (memberUid: string) => {
    if (!user || !activeGroupId || userRole !== 'admin') return;
    if (memberUid === user.uid) {
      showToast("You cannot remove yourself", "error");
      return;
    }
    try {
      await deleteDoc(doc(db, "groups", activeGroupId, "members", memberUid));
      showToast("Member removed");
    } catch (error) {
      showToast("Failed to remove member", "error");
    }
  };

  const handleGenerateInvite = async () => {
    if (!user || !activeGroupId || userRole !== 'admin') return;
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    try {
      await setDoc(doc(db, "invites", token), {
        groupId: activeGroupId,
        createdAt: new Date().toISOString(),
        createdBy: user.uid
      });
      const link = `${window.location.origin}/join/${token}`;
      handleCopyLink(link);
    } catch (error) {
      handleFirestoreError(error, "write" as any, "invites");
    }
  };

  const handleSignOut = () => {
    signOut(auth);
  };

  const handleWish = (person: Person) => {
    setShowWish(person);
    setCustomWish("");
    setSelectedTemplateId(null);
    if (getDaysUntilBirthday(person.dob) === 0) {
      setConfetti(true);
      setTimeout(() => setConfetti(false), 3000);
    }
  };

  const handleWhatsApp = (person: Person, message?: string) => {
    const defaultMsg = `Happy Birthday ${person.name}! Hope you have a fantastic day! 🎂🎉`;
    const finalMsg = message || defaultMsg;
    const phone = person.phone.replace(/\D/g, "");
    if (!phone) {
      showToast("No phone number provided", "error");
      return;
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(finalMsg)}`, "_blank");
    setShowWish(null);
  };

  const handleCall = (person: Person) => {
    if (!person.phone) {
      showToast("No phone number provided", "error");
      return;
    }
    window.location.href = `tel:${person.phone}`;
    setShowWish(null);
  };

  const handleCopyWish = (person: Person, message?: string) => {
    const defaultMsg = `Happy Birthday ${person.name}! Wishing you a year full of joy, health, and success. Have a great one! 🎂✨`;
    const finalMsg = message || defaultMsg;
    navigator.clipboard.writeText(finalMsg).then(() => {
      showToast("Wish message copied! 📋");
      setShowWish(null);
    }).catch(() => {
      showToast("Failed to copy wish", "error");
    });
  };

  const handleAddTemplate = async () => {
    if (!user || !templateForm.title.trim() || !templateForm.content.trim()) return;
    try {
      await addDoc(collection(db, "users", user.uid, "templates"), {
        title: templateForm.title.trim(),
        content: templateForm.content.trim(),
        createdAt: new Date().toISOString()
      });
      setTemplateForm({ title: "", content: "" });
      showToast("Template added");
    } catch (error) {
      showToast("Failed to add template", "error");
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "templates", id));
      showToast("Template deleted");
    } catch (error) {
      showToast("Failed to delete template", "error");
    }
  };

  const handleGroupWish = (person: Person) => {
    const groupName = activeGroup?.name || "the group";
    const days = getDaysUntilBirthday(person.dob);
    const when = days === 0 ? "today" : `on ${MONTHS[getBirthdayMonth(person.dob)]} ${getBirthdayDay(person.dob)}`;
    const message = `Hey ${groupName}! It's ${person.name}'s birthday ${when}! Don't forget to wish them! 🎂✨`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleGroupBroadcast = (group: Group) => {
    // Filter birthdays for this group
    // Note: This might need a separate fetch if not already in 'people'
    // But for now we assume 'people' contains birthdays for the active group
    const upcoming = people
      .filter(p => getDaysUntilBirthday(p.dob) <= 30)
      .sort((a, b) => getDaysUntilBirthday(a.dob) - getDaysUntilBirthday(b.dob));
    
    if (upcoming.length === 0) {
      showToast("No upcoming birthdays to broadcast", "error");
      return;
    }

    let message = `📅 Upcoming birthdays in ${group.name}:\n\n`;
    upcoming.forEach(p => {
      const days = getDaysUntilBirthday(p.dob);
      const dateStr = `${MONTHS[getBirthdayMonth(p.dob)]} ${getBirthdayDay(p.dob)}`;
      message += `• ${p.name}: ${dateStr} (${days === 0 ? "Today!" : days === 1 ? "Tomorrow" : `in ${days} days`})\n`;
    });
    
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleShareWeeklySummary = () => {
    if (weekBdays.length === 0) {
      showToast("No birthdays this week to share", "error");
      return;
    }

    let message = `🎂 *Birthdays This Week* 🎂\n\n`;
    weekBdays.forEach(p => {
      const days = getDaysUntilBirthday(p.dob);
      const dateStr = `${MONTHS[getBirthdayMonth(p.dob)]} ${getBirthdayDay(p.dob)}`;
      message += `• *${p.name}*: ${dateStr} (${days === 0 ? "Today!" : days === 1 ? "Tomorrow" : `in ${days} days`})\n`;
    });
    message += `\nSent via Birthday App ✨`;

    navigator.clipboard.writeText(message).then(() => {
      showToast("Weekly summary copied! 📋");
    });
  };

  const handleAddGiftItem = async (groupId: string) => {
    const item = prompt("What's the gift idea?");
    const cost = prompt("Estimated cost?");
    if (!item || !cost) return;

    const groupRef = doc(db, "groups", groupId);
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const newItem: GiftItem = {
      id: Math.random().toString(36).substr(2, 9),
      item,
      cost: parseFloat(cost) || 0,
      status: 'suggested',
      pledgedBy: user?.displayName || user?.email || "Anonymous"
    };

    const updatedPlanner = [...(group.giftPlanner || []), newItem];
    await updateDoc(groupRef, { giftPlanner: updatedPlanner });
    showToast("Gift idea added! 🎁");
  };

  const handleUpdateGiftStatus = async (groupId: string, itemId: string, status: 'suggested' | 'bought' | 'delivered') => {
    const groupRef = doc(db, "groups", groupId);
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const updatedPlanner = group.giftPlanner?.map(item => 
      item.id === itemId ? { ...item, status } : item
    );

    await updateDoc(groupRef, { giftPlanner: updatedPlanner });
    showToast(`Status updated to ${status}`);
  };

  const handleGenerateSmartWish = async (person: Person, vibe: any) => {
    setIsAiLoading(true);
    try {
      const msg = await generateSmartWish({ 
        name: person.name, 
        vibe,
        interests: person.interests,
        relationship: person.relationship
      });
      setCustomWish(msg);
      setSelectedTemplateId(null);
    } catch (err) {
      showToast("AI generation failed", "error");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleGenerateGiftIdeas = async (person: Person) => {
    setIsAiLoading(true);
    try {
      const ideas = await generateGiftIdeas(person.name, person.interests || [], person.relationship);
      setAiGiftIdeas(ideas);
    } catch (err) {
      showToast("Failed to get gift ideas", "error");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleImport = () => {
    if (!user || !activeGroupId || userRole !== 'admin') return;
    const text = importText.trim();
    if (!text) return;

    let parsed: Person[] = [];
    const groupName = activeGroup?.name || "General";

    if (importMode === "csv") {
      const lines = text.split("\n").filter(l => l.trim());
      parsed = lines.map(line => {
        const parts = line.split(",").map(s => s.trim());
        if (parts.length >= 2) {
          const name = parts[0];
          const dob = parts[1];
          return {
            id: Math.random().toString(36).substr(2, 9),
            name,
            dob,
            avatar: name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase(),
            phone: parts[3] || "",
            group: groupName
          } as Person;
        }
        return null;
      }).filter(Boolean) as Person[];
    } else if (importMode === "whatsapp") {
      // Format: MM/DD/YY, HH:MM - Name: message
      // We look for messages like "Happy Birthday" or "Birthday" or just extract names from participants
      const lines = text.split("\n");
      const contacts = new Map<string, string>(); // Name -> Last Seen Date (as potential DOB)
      
      lines.forEach(line => {
        const match = line.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s\d{1,2}:\d{2}\s-\s([^:]+):/);
        if (match) {
          const date = match[1];
          const name = match[2].trim();
          // This is a heuristic: if a message contains "birthday", we might guess the date
          if (line.toLowerCase().includes("birthday")) {
            contacts.set(name, date);
          }
        }
      });

      parsed = Array.from(contacts.entries()).map(([name, date]) => {
        // Try to normalize date to YYYY-MM-DD
        let dob = "1990-01-01";
        try {
          const d = new Date(date);
          if (!isNaN(d.getTime())) {
            dob = d.toISOString().split('T')[0];
          }
        } catch(e) {}

        return {
          id: Math.random().toString(36).substr(2, 9),
          name,
          dob,
          avatar: name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase(),
          phone: "",
          group: groupName
        } as Person;
      });
    } else if (importMode === "facebook") {
      // ICS format
      const events = text.split("BEGIN:VEVENT");
      events.shift(); // remove header
      parsed = events.map(event => {
        const summaryMatch = event.match(/SUMMARY:(.*)'s [Bb]irthday/);
        const dateMatch = event.match(/DTSTART;VALUE=DATE:(\d{8})/);
        if (summaryMatch && dateMatch) {
          const name = summaryMatch[1].trim();
          const rawDate = dateMatch[1]; // YYYYMMDD
          const dob = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
          return {
            id: Math.random().toString(36).substr(2, 9),
            name,
            dob,
            avatar: name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase(),
            phone: "",
            group: groupName
          } as Person;
        }
        return null;
      }).filter(Boolean) as Person[];
    } else if (importMode === "contacts") {
      // VCF format
      const cards = text.split("BEGIN:VCARD");
      cards.shift();
      parsed = cards.map(card => {
        const fnMatch = card.match(/FN:(.*)/);
        const bdayMatch = card.match(/BDAY:(\d{4}-?\d{2}-?\d{2})/);
        const telMatch = card.match(/TEL;[^:]*:(.*)/);
        
        if (fnMatch && bdayMatch) {
          const name = fnMatch[1].trim();
          let dob = bdayMatch[1].replace(/-/g, "");
          if (dob.length === 8) {
            dob = `${dob.slice(0, 4)}-${dob.slice(4, 6)}-${dob.slice(6, 8)}`;
          }
          return {
            id: Math.random().toString(36).substr(2, 9),
            name,
            dob,
            avatar: name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase(),
            phone: telMatch ? telMatch[1].trim() : "",
            group: groupName
          } as Person;
        }
        return null;
      }).filter(Boolean) as Person[];
    }

    if (parsed.length === 0) {
      showToast("No valid contacts found in the provided text", "error");
    } else {
      setImportPreview(parsed);
      setImportStep(2);
      showToast(`Found ${parsed.length} contacts. Review below.`);
    }
  };

  const handleConfirmImport = async () => {
    if (!user || !activeGroupId || userRole !== 'admin' || importPreview.length === 0) return;
    
    const batch = writeBatch(db);
    importPreview.forEach(p => {
      const personRef = doc(collection(db, "groups", activeGroupId, "birthdays"));
      batch.set(personRef, {
        name: p.name,
        dob: p.dob,
        avatar: p.avatar,
        phone: p.phone || "",
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
        group: activeGroup?.name || "General"
      });
    });

    try {
      await batch.commit();
      setImportText("");
      setImportPreview([]);
      setImportStep(3);
      showToast(`✅ Successfully imported ${importPreview.length} contacts!`);
    } catch (error) {
      handleFirestoreError(error, "write" as any, `groups/${activeGroupId}/birthdays`);
    }
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard?.writeText(link).then(() => {
      showToast("🔗 Link copied to clipboard!");
    }).catch(() => {
      showToast("Failed to copy link", "error");
    });
  };

  const handleClearAll = async () => {
    if (!user || !activeGroupId || userRole !== 'admin') return;
    if (window.confirm("Are you sure you want to clear all data in this group? This cannot be undone.")) {
      try {
        const birthdaysSnap = await getDocs(collection(db, "groups", activeGroupId, "birthdays"));
        const batch = writeBatch(db);
        birthdaysSnap.forEach(d => batch.delete(d.ref));
        await batch.commit();
        showToast("Group data cleared");
      } catch (error) {
        handleFirestoreError(error, "delete" as any, `groups/${activeGroupId}/birthdays`);
      }
    }
  };

  function handleFirestoreError(error: any, operationType: string, path: string) {
    const errInfo = {
      error: error.message,
      operationType,
      path,
      authInfo: {
        userId: user?.uid,
        email: user?.email
      }
    };
    console.error("Firestore Error:", JSON.stringify(errInfo));
    showToast("Database error occurred", "error");
  }

  return (
    <div className="min-h-screen bg-[#0D0C1D] text-[#F0EEE9] font-sans pb-24 selection:bg-indigo-500/30">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-500/5 blur-[120px] rounded-full" />
      </div>

      <Confetti active={confetti} />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
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
              <span className="text-xs font-bold text-white/60 hidden sm:block">{user?.displayName || user?.email?.split('@')[0] || "User"}</span>
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
            <ProfileView 
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
      <ManageTemplatesModal 
        show={showManageTemplates}
        onClose={() => setShowManageTemplates(false)}
        templates={wishTemplates}
        user={user}
        showToast={showToast}
      />

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
                            const personRef = doc(db, "groups", groups.find(g => g.name === showPersonDetail.group)?.id || "", "birthdays", showPersonDetail.id);
                            await updateDoc(personRef, { relationship: rel });
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
                    const personRef = doc(db, "groups", groups.find(g => g.name === showPersonDetail.group)?.id || "", "birthdays", showPersonDetail.id);
                    await updateDoc(personRef, { isFavorite: !showPersonDetail.isFavorite });
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
                          const personRef = doc(db, "groups", groups.find(g => g.name === showPersonDetail.group)?.id || "", "birthdays", showPersonDetail.id);
                          await updateDoc(personRef, { interests: newInterests });
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
                            const personRef = doc(db, "groups", groups.find(g => g.name === showPersonDetail.group)?.id || "", "birthdays", showPersonDetail.id);
                            await updateDoc(personRef, { interests: newInterests });
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
                      const personRef = doc(db, "groups", groups.find(g => g.name === showPersonDetail.group)?.id || "", "birthdays", showPersonDetail.id);
                      await updateDoc(personRef, { notes: e.target.value });
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
