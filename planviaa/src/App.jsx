import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Home, ListTodo, Timer as TimerIcon, StickyNote, CalendarDays, Settings,
  Plus, X, Trash2, Flag, Sun, Moon, Play, Pause, RotateCcw,
  PiggyBank, Target, ChevronLeft, ChevronRight, Star,
  Bell, Sparkles, Edit3, CheckCircle2, Circle, Clock,
  ArrowUpRight, ArrowDownRight, Award, BarChart3, Check,
  User, Palette, Vibrate, Volume2, Globe, Download, HelpCircle,
  Info, ShieldCheck, RefreshCw, Flame, ChevronDown, Droplet, Search,
  Upload, Copy, Layers, Sliders, Brain, Smile, Meh, Frown, MessageCircle, Send, Code2
} from "lucide-react";

/* ========================================================================
   بازخورد لمسی و صوتی — یک‌بار در سطح ماژول تعریف می‌شود تا بدون
   نیاز به پاس دادن prop در همه‌جا در دسترس باشد
   ======================================================================== */

const prefsRef = { hapticOn: true, soundOn: true };

function haptic(pattern = 10) {
  try {
    if (prefsRef.hapticOn && typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch {}
}

let _audioCtx = null;
function playTone(freq = 720, duration = 0.09, delay = 0) {
  if (!prefsRef.soundOn) return;
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const t0 = ctx.currentTime + delay;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.14, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + duration + 0.02);
  } catch {}
}
function playSuccessSound() { playTone(660, 0.09, 0); playTone(880, 0.11, 0.09); }
function playTickSound() { playTone(520, 0.06, 0); }

/* ========================================================================
   کمکی‌ها
   ======================================================================== */

const PERSIAN_WEEK = ["ش","ی","د","س","چ","پ","ج"];

function pad2(n){ return n.toString().padStart(2,"0"); }
function todayKey(){ const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function dateKey(d){ return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function toPersianDigits(str){
  const en = "0123456789", fa = "۰۱۲۳۴۵۶۷۸۹";
  return String(str).replace(/[0-9]/g, d => fa[en.indexOf(d)]);
}
function fmtMoney(n){ return toPersianDigits(Math.round(n).toLocaleString("en-US")) + " تومان"; }
function uid(){ return Math.random().toString(36).slice(2,10) + Date.now().toString(36); }
function hexToRgb(hex){
  const num = parseInt(hex.replace('#',''),16);
  return `${(num>>16)&255},${(num>>8)&255},${num&255}`;
}

/* ========================================================================
   ذخیره‌سازی محلی — همه‌ی اطلاعات اپ (کارها، یادداشت‌ها، تنظیمات و ...)
   در localStorage مرورگر نگه‌داری می‌شن تا بعد از بستن یا رفرش صفحه
   از بین نروند. هر state با یک کلید یکتا خوانده/نوشته می‌شود.
   ======================================================================== */

const STORAGE_PREFIX = "planvia:";

function readStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // فضای ذخیره پر است یا در دسترس نیست — بی‌صدا نادیده گرفته می‌شود
  }
}

function useStickyState(key, defaultValue) {
  const [value, setValue] = useState(() => readStorage(key, defaultValue));
  useEffect(() => { writeStorage(key, value); }, [key, value]);
  return [value, setValue];
}

/* مناسبت‌های سال (سینک‌شده با تقویم شمسی ۱۴۰۵ / میلادی ۲۰۲۶ — برخی مناسبت‌های قمری هرسال جابه‌جا می‌شوند) */
const OCCASIONS = {
  "01-01": "روز جهانی صلح 🌍",
  "02-11": "دهه‌ی فجر — پیروزی انقلاب 🇮🇷",
  "02-14": "ولنتاین ❤️",
  "03-08": "روز جهانی زن 💐",
  "03-20": "شب عید — ملی شدن صنعت نفت 🛢️",
  "03-21": "عید نوروز 🌸",
  "03-22": "روز دوم نوروز 🌷",
  "04-01": "روز طبیعت (سیزده‌به‌در) 🌿",
  "04-22": "روز زمین 🌎",
  "05-01": "روز جهانی کارگر 🛠️",
  "06-04": "رحلت امام خمینی (ره) 🕊️",
  "06-05": "قیام ۱۵ خرداد",
  "07-09": "روز صنعت چاپ",
  "09-23": "بازگشایی مدارس 🎒",
  "10-04": "روز جهانی حیوانات 🐾",
  "10-31": "هالووین 🎃",
  "11-07": "روز دانشجو 🎓",
  "12-21": "شب یلدا 🍉🍇",
  "12-25": "کریسمس 🎄",
};
function getOccasion(d){
  const key = `${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  return OCCASIONS[key] || null;
}

/* جملات انگیزشی — با کلیک روی ویجت عوض می‌شوند */
const QUOTES = [
  "امروز فقط یک قدم کوچیک بردار، همین کافیه.",
  "پیشرفت، نه کمال، هدف امروزته.",
  "بهترین زمان برای شروع، همین لحظه‌ست.",
  "هر روز یک فرصت تازه برای ساختن نسخه‌ی بهتریِ خودته.",
  "نظم کوچیک امروز، نتیجه‌ی بزرگ فرداست.",
  "به‌جای نگرانی از مسیر، روی قدم بعدی تمرکز کن.",
  "استراحت هم بخشی از تلاش کردنه، نه توقف.",
  "تو بیشتر از دیروزت پیشرفت کردی، حتی اگه حسش نکنی.",
  "کارهای بزرگ از تصمیم‌های کوچیک روزانه شروع می‌شن.",
  "امروز رو با یک لبخند شروع کن؛ بقیه‌ش رو خودش می‌سازه.",
  "هیچ تلاشی هدر نمی‌ره، حتی اگه نتیجه‌ش دیر برسه.",
  "تمرکز روی یک کار، بهتر از پراکندگی روی همه‌چیزه.",
];

// اولویت‌ها: فقط یک نقطه‌ی رنگی کوچک، بدون پرکردن رنگی سطح‌ها (سبک iOS)
const PRIORITIES = {
  high: { label:"فوری",    dot:"#FF6B6B" },
  med:  { label:"متوسط",   dot:"#FFC24B" },
  low:  { label:"کم‌اهمیت", dot:"#4CD97B" },
};

const POMO_MODES = {
  focus: { label:"تمرکز",          minutes:25 },
  short: { label:"استراحت کوتاه",  minutes:5 },
  long:  { label:"استراحت بلند",   minutes:15 },
};

// پالت رنگ تِم — قابل انتخاب در تنظیمات
const ACCENTS = [
  { key:"violet", hex:"#9F7BFF" },
  { key:"blue",   hex:"#5CC9FF" },
  { key:"green",  hex:"#3ECF8E" },
  { key:"orange", hex:"#FFA654" },
  { key:"pink",   hex:"#FF7BAC" },
];

// رنگ‌های اختصاصی برای کارت‌های میان‌بر و ویجت‌های صفحه‌ی اصلی — مستقل از رنگ تِم
const WIDGET_COLORS = {
  tasks:    "#9F7BFF",
  pomodoro: "#FFA654",
  notes:    "#5CC9FF",
  calendar: "#3ECF8E",
  savings:  "#FF7BAC",
};

/* ویجت‌های قابل مدیریت در صفحه‌ی اصلی — کاربر می‌تونه اونا رو اضافه/حذف کنه */
const WIDGET_DEFS = [
  { id:"todayOccasion", label:"مناسبت امروز",        icon:Sparkles,   locked:true },
  { id:"shortcuts",     label:"میان‌برهای سریع",      icon:Star,       locked:true },
  { id:"advisor",       label:"مشاور هوشمند",         icon:MessageCircle, locked:true },
  { id:"brainMood",     label:"حال مغزت",              icon:Brain,      locked:true },
  { id:"quote",         label:"جمله‌ی انگیزشی",        icon:Sparkles },
  { id:"moodPhoto",     label:"عکس حال امروز",        icon:Palette },
  { id:"quickAdd",      label:"افزودن سریع کار",       icon:Plus },
  { id:"calendarNote",  label:"پیش‌نمایش تقویم و یادداشت", icon:CalendarDays },
  { id:"tasksList",     label:"کارهای باقی‌مانده",     icon:ListTodo },
  { id:"weeklyChart",   label:"نمودار هفتگی تمرکز",   icon:BarChart3 },
  { id:"habit",         label:"ردیاب آب روزانه",       icon:Droplet },
  { id:"upcoming",      label:"کار بعدی",              icon:Clock },
  { id:"streakDots",    label:"نظم هفتگی",             icon:Flame },
  { id:"stats",         label:"آمار کلی",              icon:Award },
];
const DEFAULT_WIDGET_SETTINGS = Object.fromEntries(WIDGET_DEFS.map(w => [w.id, true]));

const AVATAR_PRESETS = [
  { key:"violet", emoji:"🦊", bg:"#9F7BFF" },
  { key:"blue",   emoji:"🐼", bg:"#5CC9FF" },
  { key:"green",  emoji:"🐸", bg:"#3ECF8E" },
  { key:"orange", emoji:"🦁", bg:"#FFA654" },
  { key:"pink",   emoji:"🐰", bg:"#FF7BAC" },
  { key:"yellow", emoji:"🐤", bg:"#FFD166" },
];
const MOOD_STICKERS = ["😄","🙂","😌","😴","😅","😔","😤","🤩","🥲","😎"];
const NOTE_COLORS = [
  { key:"none",   hex:null },
  { key:"violet", hex:"#9F7BFF" },
  { key:"blue",   hex:"#5CC9FF" },
  { key:"green",  hex:"#3ECF8E" },
  { key:"orange", hex:"#FFA654" },
  { key:"pink",   hex:"#FF7BAC" },
];

/* ========================================================================
   استایل سراسری — iOS دارک/لایت، مینیمال، تک‌رنگِ بنفش
   ======================================================================== */

function GlobalStyle({ dark, accent="#9F7BFF" }) {
  const rgb = hexToRgb(accent);
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@500;600;700&display=swap');

      * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
      html, body { margin:0; padding:0; height:100%; overflow:hidden; overscroll-behavior:none; }
      #root, #app { height:100%; }

      .pv-root {
        height:100vh;
        max-height:100vh;
        overflow-y:auto;
        overflow-x:hidden;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior-y: contain;
        scroll-behavior: smooth;
        --bg: ${dark ? "#040406" : "#EEEEF5"};
        --glow-a: rgba(${rgb}, ${dark ? 0.20 : 0.16});
        --glow-b: rgba(92,201,255, ${dark ? 0.10 : 0.10});
        --glow-c: rgba(255,166,84, ${dark ? 0.07 : 0.07});
        --grouped: ${dark ? "#17171B" : "#FFFFFF"};
        --surface: ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.035)"};
        --surface-strong: ${dark ? "#1F1F24" : "#FFFFFF"};
        --border: ${dark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.06)"};
        --text: ${dark ? "#F5F5F7" : "#1C1C1E"};
        --text-dim: ${dark ? "#93939C" : "#8A8A8E"};
        --primary: ${accent};
        --primary-strong: ${accent};
        --primary-rgb: ${rgb};
        --primary-soft: rgba(${rgb}, ${dark ? 0.18 : 0.12});
        --success: #34D399;
        --danger: #FF6B6B;
        --shadow: ${dark ? "0 2px 18px rgba(0,0,0,0.5)" : "0 2px 14px rgba(0,0,0,0.06)"};
        --blur: blur(26px) saturate(180%);
        font-family: 'Vazirmatn', sans-serif;
        background:
          radial-gradient(640px 380px at 12% -6%, var(--glow-a), transparent 60%),
          radial-gradient(560px 340px at 105% 8%, var(--glow-b), transparent 55%),
          radial-gradient(520px 420px at 50% 115%, var(--glow-c), transparent 60%),
          var(--bg);
        background-attachment: fixed;
        color: var(--text);
        min-height: 100vh;
        direction: rtl;
        transition: background .35s ease, color .35s ease;
        letter-spacing: -0.01em;
        -webkit-font-smoothing: antialiased;
      }

      .pv-num { font-family: 'Space Grotesk','Vazirmatn',sans-serif; font-variant-numeric: tabular-nums; }

      ::-webkit-scrollbar { width:0; height:0; }

      .pv-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 26px;
        transition: transform .18s cubic-bezier(.3,1,.4,1), background .2s ease;
      }
      .pv-card:active { transform: scale(0.98); background: ${dark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.05)"}; }

      .pv-btn {
        border:none; cursor:pointer; font-family:inherit; font-weight:600;
        transition: transform .12s cubic-bezier(.3,1,.4,1), opacity .15s ease, background .2s ease;
      }
      .pv-btn:active { transform: scale(0.92); }

      .pv-btn-primary {
        background: var(--primary);
        color:#fff;
        box-shadow: 0 6px 16px rgba(var(--primary-rgb),0.35);
      }

      .pv-pill {
        display:inline-flex; align-items:center; gap:6px;
        padding:4px 11px; border-radius:999px; font-size:11.5px; font-weight:600;
        background: var(--surface); color: var(--text-dim); border:1px solid var(--border);
      }

      .pv-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }

      .pv-input {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 18px;
        color: var(--text);
        padding: 12px 15px;
        font-family: inherit;
        font-size: 14.5px;
        outline: none;
        transition: border-color .2s ease, background .2s ease;
        width: 100%;
      }
      .pv-input::placeholder { color: var(--text-dim); }
      .pv-input:focus { border-color: var(--primary); background: var(--surface-strong); }
      textarea.pv-input { resize:none; min-height:110px; line-height:1.7; }

      .pv-fade { animation: pvFade .4s cubic-bezier(.2,.8,.2,1) both; }
      @keyframes pvFade { from{opacity:0; transform:translateY(8px)} to{opacity:1; transform:none} }

      .pv-stagger > * { animation: pvFade .35s cubic-bezier(.2,.8,.2,1) both; }
      .pv-stagger > *:nth-child(n) { animation-delay: calc(var(--i,0) * 0s); }
      .pv-stagger > *:nth-child(1){animation-delay:.00s} .pv-stagger > *:nth-child(2){animation-delay:.03s}
      .pv-stagger > *:nth-child(3){animation-delay:.06s} .pv-stagger > *:nth-child(4){animation-delay:.09s}
      .pv-stagger > *:nth-child(5){animation-delay:.12s} .pv-stagger > *:nth-child(6){animation-delay:.15s}
      .pv-stagger > *:nth-child(7){animation-delay:.18s} .pv-stagger > *:nth-child(8){animation-delay:.21s}

      @keyframes pvCheckPop {
        0% { transform:scale(1); } 45% { transform:scale(1.3) rotate(-8deg); } 100% { transform:scale(1) rotate(0); }
      }
      .pv-check-pop { animation: pvCheckPop .38s cubic-bezier(.3,1.6,.4,1); }

      @keyframes pvBreathe {
        0%,100% { box-shadow: 0 0 0 0 rgba(var(--primary-rgb),0.35); }
        50% { box-shadow: 0 0 0 9px rgba(var(--primary-rgb),0); }
      }
      .pv-breathe { animation: pvBreathe 2.6s ease-in-out infinite; }

      .pv-strike { position:relative; }
      .pv-strike::after {
        content:''; position:absolute; right:0; left:0; top:50%; height:1.5px;
        background: var(--text-dim); transform: scaleX(var(--sx,0)); transform-origin: right;
        transition: transform .3s cubic-bezier(.3,1,.4,1);
      }

      .pv-progress-bg { background: var(--border); border-radius:999px; overflow:hidden; }
      .pv-progress-fill { height:100%; border-radius:999px; background: var(--primary); transition: width .5s cubic-bezier(.2,.8,.2,1); }

      .pv-scrollx { display:flex; overflow-x:auto; gap:10px; padding-bottom:2px; scroll-snap-type:x proximity; }
      .pv-scrollx::-webkit-scrollbar { display:none; }

      .pv-modal-backdrop {
        position:fixed; inset:0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
        display:flex; align-items:flex-end; justify-content:center; z-index:60;
        animation: pvFade .2s ease both;
      }
      @media (min-width: 720px) { .pv-modal-backdrop { align-items:center; } }
      .pv-modal {
        background: var(--grouped); border:1px solid var(--border);
        border-radius: 30px 30px 0 0; width:100%; max-width:520px; max-height:88vh; overflow-y:auto;
        padding: 18px 20px 22px; box-shadow: 0 -10px 40px rgba(0,0,0,0.4);
        animation: pvSlideUp .32s cubic-bezier(.2,.9,.25,1) both;
      }
      @media (min-width: 720px) { .pv-modal { border-radius: 30px; } }
      @keyframes pvSlideUp { from{ transform: translateY(50px); opacity:0 } to { transform:none; opacity:1 } }
      .pv-modal::before {
        content:''; display:block; width:36px; height:4px; border-radius:3px; background: var(--border);
        margin:0 auto 16px;
      }

      .pv-toast-wrap { position:fixed; top:14px; left:0; right:0; display:flex; justifyContent:center; z-index:80; pointer-events:none; }
      @keyframes pvToastIn {
        0% { opacity:0; transform: translateY(-16px) scale(.9); }
        12% { opacity:1; transform: translateY(0) scale(1); }
        88% { opacity:1; transform: translateY(0) scale(1); }
        100% { opacity:0; transform: translateY(-10px) scale(.95); }
      }
      .pv-toast {
        animation: pvToastIn 2.1s cubic-bezier(.2,.8,.2,1) both;
        background: var(--grouped); border:1px solid var(--border); color:var(--text);
        padding:10px 18px; border-radius:999px; font-size:12.5px; font-weight:700;
        display:flex; align-items:center; gap:8px; box-shadow: var(--shadow);
        backdrop-filter: var(--blur); -webkit-backdrop-filter: var(--blur);
      }

      @keyframes pvMiniIn {
        0% { opacity:0; transform: translateY(-30px) scale(.6); }
        100% { opacity:1; transform: translateY(0) scale(1); }
      }
      .pv-mini-timer { animation: pvMiniIn .45s cubic-bezier(.3,1.3,.3,1) both; }

      @keyframes pvSpinRing { from{ transform:rotate(0) } to{ transform:rotate(360deg) } }

      /* --- گروه‌های تنظیمات سبک iOS --- */
      .pv-ios-group {
        background: var(--grouped);
        border: 1px solid var(--border);
        border-radius: 18px;
        overflow: hidden;
        margin-bottom: 18px;
        box-shadow: var(--shadow);
      }
      .pv-ios-label {
        font-size: 11.5px; font-weight:700; color: var(--text-dim);
        margin: 0 6px 8px; text-transform: uppercase; letter-spacing: 0.03em;
      }
      .pv-ios-row {
        display:flex; align-items:center; gap:11px; padding:12px 14px;
        border-bottom: 1px solid var(--border);
        background: var(--grouped);
      }
      .pv-ios-row:last-child { border-bottom: none; }
      .pv-ios-row:active { background: var(--surface); }
      .pv-ios-icon {
        width:29px; height:29px; border-radius:8px; flex-shrink:0;
        display:grid; place-items:center; color:#fff;
      }

      /* --- ویجت‌های افقی کوچک صفحه‌ی اصلی --- */
      .pv-mini-row {
        display:flex; align-items:center; gap:11px; padding:13px 14px;
      }
      .pv-mini-row:active { transform: scale(0.98); }

      /* --- انیمیشن آیکون فعال نوار پایین --- */
      @keyframes pvNavIconPop {
        0% { transform: scale(0.6) translateY(3px); }
        55% { transform: scale(1.22) translateY(-2px); }
        100% { transform: scale(1) translateY(0); }
      }
      .pv-nav-icon-pop { animation: pvNavIconPop .42s cubic-bezier(.3,1.6,.4,1) both; }

      /* --- نمونه‌رنگ‌های تِم --- */
      .pv-swatch {
        width:30px; height:30px; border-radius:10px; flex-shrink:0;
        display:grid; place-items:center; border:2.5px solid transparent;
        cursor:pointer; transition: transform .15s cubic-bezier(.3,1,.4,1), border-color .15s ease;
      }
      .pv-swatch:active { transform: scale(0.88); }

      /* --- انیمیشن‌های تعاملی جدید --- */
      @keyframes pvPulseSoft {
        0%,100% { transform: scale(1); } 50% { transform: scale(1.035); }
      }
      @keyframes pvShimmer {
        0% { background-position: -200px 0; } 100% { background-position: 200px 0; }
      }
      @keyframes pvFloatIn {
        0% { opacity:0; transform: translateY(14px) scale(.96); }
        100% { opacity:1; transform: none; }
      }
      @keyframes pvPop {
        0% { transform: scale(.85); opacity:0; } 60% { transform: scale(1.06); opacity:1; } 100% { transform: scale(1); }
      }
      @keyframes pvWiggle {
        0%,100% { transform: rotate(0deg); } 25% { transform: rotate(-4deg); } 75% { transform: rotate(4deg); }
      }
      @keyframes pvConfettiFall {
        0% { transform: translateY(-10px) rotate(0deg); opacity:1; }
        100% { transform: translateY(120px) rotate(360deg); opacity:0; }
      }
      .pv-hover-lift { transition: transform .22s cubic-bezier(.3,1,.4,1), box-shadow .22s ease; }
      .pv-hover-lift:hover { transform: translateY(-3px); }
      .pv-hover-lift:active { transform: translateY(0) scale(.97); }

      .pv-quote-card {
        cursor:pointer; position:relative; overflow:hidden;
        background: linear-gradient(120deg, rgba(var(--primary-rgb),0.16), rgba(92,201,255,0.10), rgba(var(--primary-rgb),0.16));
        background-size: 200% 100%;
      }
      .pv-quote-card:hover { animation: pvShimmer 2.4s linear infinite; }
      .pv-quote-card:active .pv-quote-text { animation: pvWiggle .35s ease; }

      .pv-mood-photo-btn {
        position:relative; width:100%; border-radius:22px; overflow:hidden; cursor:pointer;
        border:1.5px dashed var(--border); background:var(--surface);
        display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px;
        transition: border-color .2s ease, background .2s ease;
      }
      .pv-mood-photo-btn:hover { border-color: var(--primary); }

      .pv-widget-enter { animation: pvFloatIn .4s cubic-bezier(.2,.9,.25,1) both; }
      .pv-badge-pop { animation: pvPop .4s cubic-bezier(.3,1.4,.4,1) both; }

      .pv-manage-fab {
        width:32px; height:32px; border-radius:11px; display:grid; place-items:center;
        background:var(--surface); border:1px solid var(--border); color:var(--text-dim);
        transition: transform .15s ease, color .15s ease, background .15s ease;
      }
      .pv-manage-fab:hover { color:var(--primary); background:var(--primary-soft); transform: rotate(20deg); }

      .pv-emoji-pick { font-size:20px; line-height:1; cursor:pointer; border-radius:12px; padding:6px 9px;
        background:var(--surface); border:1.5px solid transparent; transition: all .15s cubic-bezier(.3,1,.4,1); }
      .pv-emoji-pick:hover { transform: scale(1.15) rotate(-6deg); }
      .pv-emoji-pick.active { border-color: var(--primary); background: var(--primary-soft); }

      .pv-avatar-pick { border-radius:50%; cursor:pointer; display:grid; place-items:center; font-size:19px;
        border:2.5px solid transparent; transition: transform .15s cubic-bezier(.3,1,.4,1), border-color .15s ease; }
      .pv-avatar-pick:hover { transform: scale(1.08); }
      .pv-avatar-pick.active { border-color: var(--text); }
    `}</style>
  );
}

/* ========================================================================
   بازخورد لمسی: نظام Toast
   ======================================================================== */

function useToasts(){
  const [toasts, setToasts] = useState([]);
  const push = (text, icon) => {
    const id = uid();
    setToasts(t => [...t, { id, text, icon }]);
    setTimeout(() => setToasts(t => t.filter(x=>x.id!==id)), 2100);
  };
  return [toasts, push];
}

function ToastHost({ toasts }) {
  return (
    <div className="pv-toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className="pv-toast">
          {t.icon}{t.text}
        </div>
      ))}
    </div>
  );
}

/* ========================================================================
   عمومی
   ======================================================================== */

function TopBar({ title, subtitle, icon: Icon }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:22, paddingLeft:96 }}>
      {Icon && (
        <div style={{ width:38, height:38, borderRadius:13, display:"grid", placeItems:"center", background:"var(--primary)", color:"#fff", flexShrink:0 }}>
          <Icon size={18}/>
        </div>
      )}
      <div>
        <h1 style={{ fontSize:20, fontWeight:800, margin:0 }}>{title}</h1>
        {subtitle && <p style={{ margin:"2px 0 0", fontSize:12, color:"var(--text-dim)" }}>{subtitle}</p>}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, text, sub }) {
  return (
    <div className="pv-fade" style={{ textAlign:"center", padding:"40px 20px", color:"var(--text-dim)" }}>
      <div style={{ width:60, height:60, borderRadius:20, background:"var(--surface)", display:"grid", placeItems:"center", margin:"0 auto 14px" }}>
        <Icon size={26}/>
      </div>
      <p style={{ fontWeight:700, color:"var(--text)", margin:0, fontSize:14 }}>{text}</p>
      {sub && <p style={{ fontSize:12, marginTop:6 }}>{sub}</p>}
    </div>
  );
}

function SegButton({ active, onClick, children }) {
  return (
    <button onClick={onClick} className="pv-btn" style={{
      flex:1, padding:"9px 4px", borderRadius:14, fontSize:12.5,
      background: active ? "var(--primary)" : "var(--surface)",
      color: active ? "#fff" : "var(--text-dim)"
    }}>{children}</button>
  );
}

/* ========================================================================
   داشبورد
   ======================================================================== */

function StatCard({ icon: Icon, label, value, color, sub, onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} className={onClick ? "pv-btn pv-card pv-hover-lift" : "pv-card pv-hover-lift"} style={{ padding:16, textAlign:"right", width:"100%" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
        <div style={{ width:26, height:26, borderRadius:9, display:"grid", placeItems:"center", background:`${color}22`, color }}>
          <Icon size={13}/>
        </div>
        <p style={{ fontSize:11.5, color:"var(--text-dim)", margin:0, fontWeight:600 }}>{label}</p>
      </div>
      <p className="pv-num" style={{ fontSize:22, fontWeight:800, margin:0, color }}>{value}</p>
      {sub}
    </Tag>
  );
}

function AboutDeveloperModal({ onClose, toast }) {
  const telegramUrl = "https://t.me/ERYSH";
  const copyId = () => {
    try {
      navigator.clipboard.writeText("@ERYSH");
      toast && toast("آیدی تلگرام کپی شد", <Check size={13}/>);
    } catch {}
  };
  return (
    <div className="pv-modal-backdrop" onClick={onClose}>
      <div className="pv-modal" onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h3 style={{ margin:0, fontSize:16.5, fontWeight:800 }}>درباره‌ی سازنده</h3>
          <button onClick={onClose} className="pv-btn" style={{ background:"var(--surface)", width:32, height:32, borderRadius:11, display:"grid", placeItems:"center" }}><X size={15}/></button>
        </div>

        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", marginBottom:22 }}>
          <div style={{
            width:78, height:78, borderRadius:24, display:"grid", placeItems:"center", marginBottom:14,
            background:"linear-gradient(135deg, var(--primary), rgba(92,201,255,0.85))", color:"#fff",
            boxShadow:"0 12px 26px rgba(var(--primary-rgb),0.3)"
          }}>
            <Code2 size={34}/>
          </div>
          <p style={{ margin:0, fontSize:17, fontWeight:800 }}>محمدعلی عباسی</p>
          <p style={{ margin:"4px 0 0", fontSize:12.5, color:"var(--text-dim)" }}>طراح و توسعه‌دهنده‌ی Planvia</p>
        </div>

        <a href={telegramUrl} target="_blank" rel="noreferrer" className="pv-btn pv-card pv-hover-lift pv-mini-row" style={{ width:"100%", textAlign:"right", padding:"13px 15px", marginBottom:10, textDecoration:"none", color:"var(--text)" }}>
          <div style={{ width:36, height:36, borderRadius:12, display:"grid", placeItems:"center", background:"rgba(92,201,255,0.16)", color:"#5CC9FF", flexShrink:0 }}>
            <Send size={16}/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ margin:0, fontSize:11.5, fontWeight:700, color:"var(--text-dim)" }}>آیدی تلگرام</p>
            <p style={{ margin:"2px 0 0", fontSize:13.5, fontWeight:700 }} className="pv-num">@ERYSH</p>
          </div>
          <ChevronLeft size={16} color="var(--text-dim)"/>
        </a>

        <button onClick={copyId} className="pv-btn" style={{ width:"100%", padding:"12px 0", borderRadius:14, background:"var(--surface)", color:"var(--text-dim)", fontSize:12.5, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
          <Copy size={13}/> کپی آیدی
        </button>

        <p style={{ margin:"18px 0 0", fontSize:11.5, color:"var(--text-dim)", textAlign:"center", lineHeight:1.9 }}>
          برای پیشنهاد، گزارش باگ یا هر همکاری‌ای، از طریق تلگرام در ارتباط باش 🌿
        </p>
      </div>
    </div>
  );
}

function ManageWidgetsModal({ widgetSettings, setWidgetSettings, onClose }) {
  return (
    <div className="pv-modal-backdrop" onClick={onClose}>
      <div className="pv-modal" onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <h3 style={{ margin:0, fontSize:16.5, fontWeight:800 }}>مدیریت ویجت‌ها</h3>
          <button onClick={onClose} className="pv-btn" style={{ background:"var(--surface)", width:32, height:32, borderRadius:11, display:"grid", placeItems:"center" }}><X size={15}/></button>
        </div>
        <p style={{ fontSize:12, color:"var(--text-dim)", margin:"0 0 14px" }}>ویجت‌های صفحه‌ی اصلی رو روشن یا خاموش کن. چیدمان با ذخیره‌ی خودکار همراهه.</p>
        <div className="pv-ios-group">
          {WIDGET_DEFS.map(w => (
            <div key={w.id} className="pv-ios-row">
              <div className="pv-ios-icon" style={{ background:"var(--primary)" }}><w.icon size={15}/></div>
              <p style={{ margin:0, fontWeight:600, fontSize:13.5, flex:1 }}>{w.label}{w.locked && <span style={{ fontSize:10.5, color:"var(--text-dim)", fontWeight:500 }}> · ثابت</span>}</p>
              {w.locked ? (
                <span style={{ fontSize:11, color:"var(--text-dim)" }}>همیشه فعال</span>
              ) : (
                <IosSwitch value={widgetSettings[w.id]} onChange={()=>setWidgetSettings(s=>({ ...s, [w.id]: !s[w.id] }))}/>
              )}
            </div>
          ))}
        </div>
        <button onClick={()=>setWidgetSettings(DEFAULT_WIDGET_SETTINGS)} className="pv-btn" style={{ width:"100%", padding:"12px 0", borderRadius:14, background:"var(--surface)", color:"var(--text-dim)", fontSize:13 }}>بازگرداندن پیش‌فرض</button>
      </div>
    </div>
  );
}

function QuoteWidget({ quoteIdx, setQuoteIdx }) {
  const next = () => setQuoteIdx(i => {
    let n = i;
    while (n === i) n = Math.floor(Math.random()*QUOTES.length);
    return n;
  });
  return (
    <div onClick={next} className="pv-card pv-quote-card pv-hover-lift pv-widget-enter" style={{ padding:18, marginBottom:12 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
        <Sparkles size={15} color="var(--primary)"/>
        <span style={{ fontSize:11.5, fontWeight:700, color:"var(--primary)" }}>جمله‌ی انگیزشی امروز</span>
      </div>
      <p className="pv-quote-text" style={{ margin:0, fontSize:14, fontWeight:600, lineHeight:1.8 }}>{QUOTES[quoteIdx]}</p>
      <p style={{ margin:"8px 0 0", fontSize:10.5, color:"var(--text-dim)" }}>برای دیدن جمله‌ی بعدی لمس کن ✨</p>
    </div>
  );
}

function MoodPhotoWidget({ photo, onPick, onRemove }) {
  const inputRef = useRef(null);
  return (
    <div className="pv-widget-enter" style={{ marginBottom:12 }}>
      {!photo ? (
        <button onClick={()=>inputRef.current?.click()} className="pv-btn pv-mood-photo-btn" style={{ padding:"22px 12px" }}>
          <Palette size={20} color="var(--primary)"/>
          <span style={{ fontSize:12.5, fontWeight:700 }}>حال امروزت چطوره؟</span>
          <span style={{ fontSize:10.5, color:"var(--text-dim)", opacity:0.75 }}>هر روز یه عکس از حالت بگیر و اینجا نگه‌دار (اختیاری)</span>
        </button>
      ) : (
        <div className="pv-card pv-badge-pop" style={{ padding:10, display:"flex", alignItems:"center", gap:12 }}>
          <img src={photo} alt="حال امروز" style={{ width:56, height:56, borderRadius:16, objectFit:"cover", flexShrink:0 }}/>
          <div style={{ flex:1 }}>
            <p style={{ margin:0, fontSize:12.5, fontWeight:700 }}>حال امروزت ثبت شد</p>
            <p style={{ margin:"2px 0 0", fontSize:10.5, color:"var(--text-dim)" }}>{todayKey()}</p>
          </div>
          <button onClick={()=>inputRef.current?.click()} className="pv-btn" style={{ background:"var(--surface)", width:32, height:32, borderRadius:11, display:"grid", placeItems:"center", color:"var(--primary)" }}><Edit3 size={13}/></button>
          <button onClick={onRemove} className="pv-btn" style={{ background:"var(--surface)", width:32, height:32, borderRadius:11, display:"grid", placeItems:"center", color:"var(--danger)" }}><Trash2 size={13}/></button>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = () => onPick(reader.result);
        reader.readAsDataURL(file);
        e.target.value = "";
      }}/>
    </div>
  );
}

function QuickAddWidget({ onAdd }) {
  const [val, setVal] = useState("");
  const submit = () => { if (!val.trim()) return; onAdd(val.trim()); setVal(""); };
  return (
    <div className="pv-card pv-widget-enter" style={{ padding:12, marginBottom:12, display:"flex", gap:8 }}>
      <input className="pv-input" placeholder="افزودن سریع کار برای امروز..." value={val}
        onChange={e=>setVal(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") submit(); }}
        style={{ padding:"10px 13px" }}/>
      <button onClick={submit} className="pv-btn pv-btn-primary" disabled={!val.trim()} style={{
        width:42, borderRadius:14, display:"grid", placeItems:"center", flexShrink:0, opacity: val.trim()?1:0.5
      }}><Plus size={18}/></button>
    </div>
  );
}

function WeeklyChartWidget({ tasks, pomodoroStats, onOpen }) {
  const data = useMemo(() => {
    const arr = [];
    const cursor = new Date();
    for (let i=6;i>=0;i--) {
      const d = new Date(cursor); d.setDate(cursor.getDate()-i);
      const key = dateKey(d);
      const done = tasks.filter(t=>t.date===key && t.done).length;
      arr.push({ label: d.toLocaleDateString("fa-IR",{ weekday:"short" }), done });
    }
    return arr;
  }, [tasks]);
  const max = Math.max(1, ...data.map(d=>d.done));
  return (
    <button onClick={onOpen} className="pv-btn pv-card pv-widget-enter pv-hover-lift" style={{ width:"100%", textAlign:"right", padding:16, marginBottom:12, display:"block" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <p style={{ margin:0, fontSize:12.5, fontWeight:700 }}>نمودار هفتگی کارهای انجام‌شده</p>
        <ChevronLeft size={15} color="var(--text-dim)"/>
      </div>
      <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:80 }}>
        {data.map((d,i) => (
          <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
            <div style={{
              width:"100%", maxWidth:22, height: `${(d.done/max)*56 + 4}px`, borderRadius:8,
              background: "var(--primary)", transition:"height .5s cubic-bezier(.2,.8,.2,1)"
            }}/>
            <span style={{ fontSize:10, color:"var(--text-dim)" }}>{d.label}</span>
          </div>
        ))}
      </div>
    </button>
  );
}

function WeeklyDetailModal({ tasks, pomodoroStats, onClose }) {
  const days = useMemo(() => {
    const arr = [];
    const cursor = new Date();
    for (let i=13;i>=0;i--) {
      const d = new Date(cursor); d.setDate(cursor.getDate()-i);
      const key = dateKey(d);
      const dayTasks = tasks.filter(t=>t.date===key);
      const done = dayTasks.filter(t=>t.done).length;
      arr.push({
        key, done, total: dayTasks.length, isToday: key===todayKey(),
        label: d.toLocaleDateString("fa-IR", { weekday:"short", day:"numeric", month:"short" })
      });
    }
    return arr;
  }, [tasks]);
  const max = Math.max(1, ...days.map(d=>d.done));
  const totalDone = days.reduce((s,d)=>s+d.done,0);
  const bestDay = days.reduce((a,b)=> b.done>a.done ? b : a, days[0]);

  return (
    <div className="pv-modal-backdrop" onClick={onClose}>
      <div className="pv-modal" onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <h3 style={{ margin:0, fontSize:16.5, fontWeight:800 }}>نمودار ۱۴ روز اخیر</h3>
          <button onClick={onClose} className="pv-btn" style={{ background:"var(--surface)", width:32, height:32, borderRadius:11, display:"grid", placeItems:"center" }}><X size={15}/></button>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
          <StatCard icon={CheckCircle2} label="جمع کارهای انجام‌شده" value={toPersianDigits(totalDone)} color="var(--primary)"/>
          <StatCard icon={Award} label="بهترین روز" value={`${toPersianDigits(bestDay.done)} کار`} color="#3ECF8E"/>
        </div>

        <div className="pv-card" style={{ padding:16, marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:110 }}>
            {days.map((d,i) => (
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                <div style={{
                  width:"100%", maxWidth:16, height: `${(d.done/max)*78 + 3}px`, borderRadius:6,
                  background: d.isToday ? "var(--primary)" : "var(--primary-soft)",
                  border: d.isToday ? "none" : "1px solid var(--primary)"
                }}/>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:7, marginBottom:6 }}>
          {days.slice().reverse().map((d,i) => (
            <div key={i} className="pv-card pv-mini-row" style={{ padding:"10px 13px" }}>
              <span style={{ fontSize:12.5, fontWeight:700, flex:1 }}>{d.label}{d.isToday && " · امروز"}</span>
              <span style={{ fontSize:11.5, color:"var(--text-dim)" }} className="pv-num">
                {toPersianDigits(d.done)} از {toPersianDigits(d.total)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HabitWaterWidget({ count, onChange }) {
  const target = 8;
  return (
    <div className="pv-card pv-widget-enter" style={{ padding:16, marginBottom:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <p style={{ margin:0, fontSize:12.5, fontWeight:700, display:"flex", alignItems:"center", gap:6 }}>
          <Droplet size={14} color="#5CC9FF" fill="#5CC9FF" fillOpacity={0.25}/> آب امروز
        </p>
        <span style={{ fontSize:11.5, color:"var(--text-dim)" }} className="pv-num">{toPersianDigits(count)}/{toPersianDigits(target)} لیوان</span>
      </div>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        {Array.from({length:target}).map((_,i) => (
          <button key={i} onClick={()=>{ haptic(8); onChange(i < count ? i : i+1); }} className="pv-btn" style={{
            width:28, height:28, borderRadius:9, display:"grid", placeItems:"center",
            background: i < count ? "var(--primary)" : "var(--surface)",
            color: i < count ? "#fff" : "var(--text-dim)", border:"1px solid var(--border)"
          }}><Droplet size={14} fill={i < count ? "#fff" : "none"}/></button>
        ))}
      </div>
    </div>
  );
}

function UpcomingTaskWidget({ tasks, setTab }) {
  const next = useMemo(() => {
    const list = tasks.filter(t => !t.done && t.date >= todayKey());
    list.sort((a,b) => (a.date+ (a.time||"99:99")).localeCompare(b.date+(b.time||"99:99")));
    return list[0] || null;
  }, [tasks]);

  return (
    <button onClick={()=>setTab("tasks")} className="pv-btn pv-card pv-hover-lift pv-widget-enter" style={{
      width:"100%", textAlign:"right", padding:16, marginBottom:12, display:"flex", alignItems:"center", gap:12
    }}>
      <div style={{ width:38, height:38, borderRadius:13, display:"grid", placeItems:"center", background:"rgba(255,166,84,0.16)", color:"#FFA654", flexShrink:0 }}>
        <Clock size={17}/>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ margin:0, fontSize:11.5, fontWeight:700, color:"var(--text-dim)" }}>کار بعدی</p>
        {next ? (
          <p style={{ margin:"3px 0 0", fontSize:13.5, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {next.title}{next.time ? ` · ${toPersianDigits(next.time)}` : ""}{next.date !== todayKey() ? ` · ${next.date}` : ""}
          </p>
        ) : (
          <p style={{ margin:"3px 0 0", fontSize:13, color:"var(--text-dim)" }}>هیچ کار برنامه‌ریزی‌نشده‌ای نداری 🎉</p>
        )}
      </div>
      <ChevronLeft size={16} color="var(--text-dim)"/>
    </button>
  );
}

function StreakDotsWidget({ tasks, onOpen }) {
  const days = useMemo(() => {
    const arr = [];
    const cursor = new Date();
    for (let i=6;i>=0;i--) {
      const d = new Date(cursor); d.setDate(cursor.getDate()-i);
      const key = dateKey(d);
      const total = tasks.filter(t=>t.date===key).length;
      const done = tasks.filter(t=>t.date===key && t.done).length;
      arr.push({ label: d.toLocaleDateString("fa-IR",{ weekday:"short" }), active: total>0 && done===total, partial: done>0 && done<total, isToday: key===todayKey() });
    }
    return arr;
  }, [tasks]);
  return (
    <button onClick={onOpen} className="pv-btn pv-card pv-widget-enter pv-hover-lift" style={{ width:"100%", textAlign:"right", padding:16, marginBottom:12, display:"block" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <p style={{ margin:0, fontSize:12.5, fontWeight:700, display:"flex", alignItems:"center", gap:6 }}>
          <Flame size={14} color="#FF6B6B"/> نظم هفتگی
        </p>
        <ChevronLeft size={15} color="var(--text-dim)"/>
      </div>
      <div style={{ display:"flex", justifyContent:"space-between" }}>
        {days.map((d,i) => (
          <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
            <div style={{
              width:24, height:24, borderRadius:"50%",
              background: d.active ? "var(--primary)" : d.partial ? "var(--primary-soft)" : "var(--surface)",
              border: d.isToday ? "1.5px solid var(--primary)" : "1px solid var(--border)"
            }}/>
            <span style={{ fontSize:9.5, color:"var(--text-dim)" }}>{d.label}</span>
          </div>
        ))}
      </div>
    </button>
  );
}

function StreakDetailModal({ tasks, onClose }) {
  const N = 28;
  const days = useMemo(() => {
    const arr = [];
    const cursor = new Date();
    for (let i=N-1;i>=0;i--) {
      const d = new Date(cursor); d.setDate(cursor.getDate()-i);
      const key = dateKey(d);
      const total = tasks.filter(t=>t.date===key).length;
      const done = tasks.filter(t=>t.date===key && t.done).length;
      arr.push({ key, day: d.getDate(), active: total>0 && done===total, partial: done>0 && done<total, isToday: key===todayKey() });
    }
    return arr;
  }, [tasks]);

  const currentStreak = useMemo(() => {
    const doneDates = new Set(tasks.filter(t=>t.done).map(t=>t.date));
    let count = 0; const cursor = new Date();
    while (doneDates.has(dateKey(cursor))) { count++; cursor.setDate(cursor.getDate()-1); }
    return count;
  }, [tasks]);

  const bestStreak = useMemo(() => {
    let best = 0, cur = 0;
    days.forEach(d => { if (d.active) { cur++; best = Math.max(best, cur); } else cur = 0; });
    return Math.max(best, currentStreak);
  }, [days, currentStreak]);

  const fullDays = days.filter(d=>d.active).length;

  return (
    <div className="pv-modal-backdrop" onClick={onClose}>
      <div className="pv-modal" onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <h3 style={{ margin:0, fontSize:16.5, fontWeight:800 }}>نظم ۲۸ روز اخیر</h3>
          <button onClick={onClose} className="pv-btn" style={{ background:"var(--surface)", width:32, height:32, borderRadius:11, display:"grid", placeItems:"center" }}><X size={15}/></button>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
          <StatCard icon={Flame} label="نظم متوالی فعلی" value={`${toPersianDigits(currentStreak)} روز`} color="#FF6B6B"/>
          <StatCard icon={Award} label="بهترین رکورد" value={`${toPersianDigits(bestStreak)} روز`} color="#FFC24B"/>
        </div>

        <div className="pv-card" style={{ padding:16, marginBottom:16 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:8 }}>
            {days.map((d,i) => (
              <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <div style={{
                  width:"100%", aspectRatio:"1", maxWidth:32, borderRadius:9, display:"grid", placeItems:"center",
                  background: d.active ? "var(--primary)" : d.partial ? "var(--primary-soft)" : "var(--surface)",
                  border: d.isToday ? "1.5px solid var(--primary)" : "1px solid var(--border)"
                }}>
                  <span className="pv-num" style={{ fontSize:9.5, fontWeight:700, color: d.active ? "#fff" : "var(--text-dim)" }}>{toPersianDigits(d.day)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display:"flex", gap:14, alignItems:"center", fontSize:11.5, color:"var(--text-dim)", flexWrap:"wrap" }}>
          <span style={{ display:"flex", alignItems:"center", gap:6 }}><span style={{ width:12, height:12, borderRadius:4, background:"var(--primary)", display:"inline-block" }}/> همه‌ی کارها انجام شد</span>
          <span style={{ display:"flex", alignItems:"center", gap:6 }}><span style={{ width:12, height:12, borderRadius:4, background:"var(--primary-soft)", border:"1px solid var(--primary)", display:"inline-block" }}/> بخشی انجام شد</span>
          <span style={{ display:"flex", alignItems:"center", gap:6 }}><span style={{ width:12, height:12, borderRadius:4, background:"var(--surface)", border:"1px solid var(--border)", display:"inline-block" }}/> بدون فعالیت</span>
        </div>
        <p style={{ margin:"14px 0 0", fontSize:12, color:"var(--text-dim)", textAlign:"center" }}>{toPersianDigits(fullDays)} روز کامل از {toPersianDigits(N)} روز اخیر 🎯</p>
      </div>
    </div>
  );
}

/* ========================================================================
   مشاور هوشمند — پیام‌های مرحله‌ای بر اساس وضعیت پومودورو
   ======================================================================== */

function getAdvisorMessage(pomo) {
  const count = pomo?.stats?.todayCount || 0;
  const running = pomo?.running;
  const mode = pomo?.mode;

  if (running && mode === "focus") {
    return { icon: "⚡", text: "در حال تمرکزی، عالی پیش می‌ری. تا آخر همینطوری ادامه بده!" };
  }
  if (running) {
    return { icon: "🌿", text: "الان وقت استراحته، به خودت استراحت واقعی بده تا برگردی قوی‌تر." };
  }
  if (count === 0) {
    return { icon: "✨", text: "هنوز پومودورو رو شروع نکردی. همین الان بهترین زمان برای شروعشه!" };
  }
  if (count === 1) {
    return { icon: "🔥", text: "یک جلسه‌ی تمرکز عالی داشتی. تو می‌تونی ادامه بدی، در قدرت ادامه بده!" };
  }
  if (count === 2) {
    return { icon: "💪", text: "دو جلسه پشت سر گذاشتی. یکی دیگه بزن تا به یه استراحت حسابی برسی." };
  }
  if (count % 3 === 0) {
    return { icon: "🌙", text: "سه جلسه‌ی متوالی تمومه! یه استراحت ۱۵ دقیقه‌ای نیاز داری، به خودت برس." };
  }
  return { icon: "🚀", text: "عملکرد امروزت فوق‌العاده‌ست. همینطور با همین ریتم پیش برو!" };
}

function AdvisorWidget({ pomo, setTab }) {
  const msg = useMemo(() => getAdvisorMessage(pomo), [pomo?.stats?.todayCount, pomo?.running, pomo?.mode]);
  return (
    <button
      onClick={() => setTab && setTab("pomodoro")}
      className="pv-btn pv-card pv-hover-lift pv-badge-pop"
      style={{
        width:"100%", textAlign:"right", padding:"13px 15px", marginBottom:12,
        display:"flex", alignItems:"center", gap:11,
        background:"var(--primary-soft)", border:"1px solid var(--primary)"
      }}
    >
      <div style={{
        width:36, height:36, borderRadius:12, display:"grid", placeItems:"center",
        background:"var(--primary)", color:"#fff", flexShrink:0, fontSize:16
      }}>
        {msg.icon}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ margin:0, fontSize:11, fontWeight:700, color:"var(--primary)" }}>مشاور هوشمند</p>
        <p style={{ margin:"3px 0 0", fontSize:12.5, fontWeight:600, lineHeight:1.6 }}>{msg.text}</p>
      </div>
    </button>
  );
}

/* ========================================================================
   نماد مغز — حال‌وهوای امروز بر اساس میزان فعالیت (کارها، یادداشت‌ها، پومودورو)
   ======================================================================== */

function getBrainMood(score) {
  if (score >= 4) return { key:"happy",  label:"مغزت امروز حالش خیلی خوبه",  sub:"همینطور پرانرژی ادامه بده 🎉", color:"#3ECF8E", Face:Smile,  emoji:"🧠" };
  if (score >= 1) return { key:"normal", label:"مغزت امروز حالش نرماله",     sub:"یه کار دیگه تمومش کن، حال بهتر می‌شه 🙂", color:"#FFC24B", Face:Meh, emoji:"🧠" };
  return { key:"sad", label:"مغزت امروز بی‌حوصله‌ست", sub:"یه کار کوچیک یا یه پومودورو شروع کن 💭", color:"#FF6B6B", Face:Frown, emoji:"🧠" };
}

function BrainMoodWidget({ score }) {
  const mood = useMemo(() => getBrainMood(score), [score]);
  return (
    <div className="pv-card pv-widget-enter" style={{ padding:16, marginBottom:12, display:"flex", alignItems:"center", gap:14 }}>
      <div style={{ position:"relative", width:52, height:52, flexShrink:0 }}>
        <div style={{
          width:52, height:52, borderRadius:16, display:"grid", placeItems:"center",
          background:`${mood.color}22`, color:mood.color
        }}>
          <Brain size={26}/>
        </div>
        <div style={{
          position:"absolute", bottom:-4, left:-4, width:22, height:22, borderRadius:"50%",
          background:mood.color, display:"grid", placeItems:"center", border:"2px solid var(--surface-strong)"
        }}>
          <mood.Face size={12} color="#fff"/>
        </div>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ margin:0, fontSize:13, fontWeight:700 }}>{mood.label}</p>
        <p style={{ margin:"3px 0 0", fontSize:11.5, color:"var(--text-dim)" }}>{mood.sub}</p>
      </div>
    </div>
  );
}

function TodayOccasionWidget({ occasion }) {
  if (!occasion) return null;
  return (
    <div className="pv-card pv-badge-pop" style={{
      padding:"12px 15px", marginBottom:12, display:"flex", alignItems:"center", gap:10,
      background:"var(--primary-soft)", border:"1px solid var(--primary)"
    }}>
      <Sparkles size={16} color="var(--primary)"/>
      <span style={{ fontSize:12.5, fontWeight:700, color:"var(--primary)" }}>امروز: {occasion}</span>
    </div>
  );
}

function Dashboard({ tasks, notes, goal, pomodoroStats, pomo, setTab, greetingName, widgetSettings, quoteIdx, setQuoteIdx, moodPhotos, setMoodPhoto, habitCount, setHabitCount, addQuickTask, toast }) {
  const [detail, setDetail] = useState(null); // "weekly" | "streak" | null
  const todayTasks = tasks.filter(t => t.date === todayKey() && !t.done);
  const doneToday = tasks.filter(t => t.date === todayKey() && t.done).length;
  const totalToday = tasks.filter(t => t.date === todayKey()).length;
  const pct = totalToday ? Math.round((doneToday/totalToday)*100) : 0;
  const hour = new Date().getHours();
  const greet = hour < 5 ? "شب بخیر" : hour < 12 ? "صبح بخیر" : hour < 18 ? "ظهر بخیر" : "عصر بخیر";
  const goalPct = goal.target > 0 ? Math.min(100, Math.round((goal.saved/goal.target)*100)) : 0;

  const streak = useMemo(() => {
    const doneDates = new Set(tasks.filter(t=>t.done).map(t=>t.date));
    let count = 0;
    const cursor = new Date();
    while (doneDates.has(dateKey(cursor))) { count++; cursor.setDate(cursor.getDate()-1); }
    return count;
  }, [tasks]);

  const focusMinutesToday = pomodoroStats.totalMinutes;
  const notesToday = useMemo(() => notes.filter(n => dateKey(new Date(n.updatedAt)) === todayKey()).length, [notes]);
  const activityScore = doneToday + notesToday + pomodoroStats.todayCount;
  const recentNote = useMemo(() => [...notes].sort((a,b)=>(b.pinned-a.pinned)||(b.updatedAt-a.updatedAt))[0], [notes]);
  const todayDateLabel = new Date().toLocaleDateString("fa-IR", { weekday:"long", day:"numeric", month:"long" });
  const todayOccasion = useMemo(() => getOccasion(new Date()), []);
  const w = widgetSettings;

  return (
    <div className="pv-fade">
      <div style={{ marginBottom:20, paddingLeft:96 }}>
        <p style={{ color:"var(--text-dim)", fontSize:13, margin:0 }}>{greet}</p>
        <h1 style={{ fontSize:25, fontWeight:800, margin:"4px 0 0" }}>{greetingName || "برنامه‌ی امروزت"}</h1>
      </div>

      {w.todayOccasion && <TodayOccasionWidget occasion={todayOccasion}/>}
      {w.advisor && <AdvisorWidget pomo={pomo} setTab={setTab}/>}
      {w.brainMood && <BrainMoodWidget score={activityScore}/>}

      <div style={{
        padding:24, marginBottom:14, borderRadius:28, color:"#fff", position:"relative", overflow:"hidden",
        background:`linear-gradient(135deg, var(--primary), rgba(${hexToRgb("#5CC9FF")},0.85))`,
        display:"flex", justifyContent:"space-between", alignItems:"center",
        boxShadow:"0 16px 32px rgba(var(--primary-rgb),0.28)"
      }}>
        <div style={{ position:"absolute", width:150, height:150, borderRadius:"50%", background:"rgba(255,255,255,0.10)", top:-60, left:-40 }}/>
        <div style={{ position:"relative" }}>
          <p style={{ margin:0, fontSize:12.5, opacity:0.88 }}>پیشرفت امروز</p>
          <p className="pv-num" style={{ margin:"6px 0 0", fontSize:34, fontWeight:800 }}>{toPersianDigits(pct)}٪</p>
          <p style={{ margin:"2px 0 0", fontSize:11.5, opacity:0.85 }}>{toPersianDigits(doneToday)} از {toPersianDigits(totalToday)} کار انجام شد</p>
        </div>
        <div style={{ position:"relative", width:58, height:58, borderRadius:"50%", background:`conic-gradient(#fff ${pct*3.6}deg, rgba(255,255,255,0.25) 0deg)`, display:"grid", placeItems:"center" }}>
          <div style={{ width:44, height:44, borderRadius:"50%", background:"rgba(0,0,0,0.20)", display:"grid", placeItems:"center" }}>
            <CheckCircle2 size={19}/>
          </div>
        </div>
      </div>

      <div className="pv-scrollx" style={{ marginBottom:12 }}>
        {[
          { icon: ListTodo, label:"کارها", tab:"tasks", color:WIDGET_COLORS.tasks },
          { icon: TimerIcon, label:"تمرکز", tab:"pomodoro", color:WIDGET_COLORS.pomodoro },
          { icon: StickyNote, label:"یادداشت", tab:"notes", color:WIDGET_COLORS.notes },
          { icon: CalendarDays, label:"تقویم", tab:"calendar", color:WIDGET_COLORS.calendar },
          { icon: PiggyBank, label:"پس‌انداز", tab:"savings", color:WIDGET_COLORS.savings },
        ].map((it,i) => (
          <button key={i} onClick={() => setTab(it.tab)} className="pv-btn pv-card" style={{
            minWidth:82, padding:"15px 8px", display:"flex", flexDirection:"column", alignItems:"center",
            gap:8, scrollSnapAlign:"start", flexShrink:0
          }}>
            <div style={{ width:36, height:36, borderRadius:12, display:"grid", placeItems:"center", background:`${it.color}22`, color:it.color }}>
              <it.icon size={17}/>
            </div>
            <span style={{ fontSize:11, fontWeight:600 }}>{it.label}</span>
          </button>
        ))}
      </div>

      {w.quote && <QuoteWidget quoteIdx={quoteIdx} setQuoteIdx={setQuoteIdx}/>}
      {w.quickAdd && <QuickAddWidget onAdd={addQuickTask}/>}
      {w.moodPhoto && <MoodPhotoWidget photo={moodPhotos[todayKey()]} onPick={(data)=>setMoodPhoto(todayKey(), data)} onRemove={()=>setMoodPhoto(todayKey(), null)}/>}

      {/* دو باکس افقی کوتاه: پیش‌نمایش یادداشت و تقویم امروز */}
      {w.calendarNote && (
      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
        <button onClick={()=>setTab("calendar")} className="pv-btn pv-card pv-mini-row pv-hover-lift" style={{ width:"100%", textAlign:"right" }}>
          <div style={{ width:34, height:34, borderRadius:11, display:"grid", placeItems:"center", background:`${WIDGET_COLORS.calendar}22`, color:WIDGET_COLORS.calendar, flexShrink:0 }}>
            <CalendarDays size={16}/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ margin:0, fontSize:12.5, fontWeight:700 }}>{todayDateLabel}</p>
            <p style={{ margin:"2px 0 0", fontSize:11, color:"var(--text-dim)" }}>{totalToday>0 ? `${toPersianDigits(totalToday)} برنامه برای امروز` : "برنامه‌ای برای امروز ثبت نشده"}</p>
          </div>
          <ChevronLeft size={16} color="var(--text-dim)"/>
        </button>

        <button onClick={()=>setTab("notes")} className="pv-btn pv-card pv-mini-row pv-hover-lift" style={{ width:"100%", textAlign:"right" }}>
          <div style={{ width:34, height:34, borderRadius:11, display:"grid", placeItems:"center", background:`${WIDGET_COLORS.notes}22`, color:WIDGET_COLORS.notes, flexShrink:0 }}>
            <StickyNote size={16}/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ margin:0, fontSize:12.5, fontWeight:700 }}>{recentNote ? recentNote.title : "یادداشتی نداری"}</p>
            <p style={{ margin:"2px 0 0", fontSize:11, color:"var(--text-dim)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{recentNote ? (recentNote.body || "بدون متن") : "یک ایده‌ی جدید ثبت کن"}</p>
          </div>
          <ChevronLeft size={16} color="var(--text-dim)"/>
        </button>
      </div>
      )}

      {w.tasksList && (
      <>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <h3 style={{ fontSize:14.5, fontWeight:700, margin:0 }}>کارهای باقی‌مانده</h3>
          <button onClick={()=>setTab("tasks")} className="pv-btn" style={{ background:"none", color:"var(--primary)", fontSize:12, display:"flex", alignItems:"center", gap:2 }}>
            همه <ChevronLeft size={13}/>
          </button>
        </div>
        <div className="pv-stagger" style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
          {todayTasks.length === 0 && (
            <div className="pv-card" style={{ padding:18, textAlign:"center", color:"var(--text-dim)", fontSize:12.5 }}>
              هیچ کار باقی‌مانده‌ای برای امروز نداری 🎉
            </div>
          )}
          {todayTasks.slice(0,4).map(t => (
            <div key={t.id} className="pv-card pv-hover-lift" style={{ padding:"13px 15px", display:"flex", alignItems:"center", gap:11 }}>
              <span className="pv-dot" style={{ background: PRIORITIES[t.priority].dot }}/>
              <span style={{ fontSize:13.5, fontWeight:600, flex:1 }}>{t.title}</span>
              {t.time && <span style={{ fontSize:11.5, color:"var(--text-dim)" }}>{toPersianDigits(t.time)}</span>}
            </div>
          ))}
        </div>
      </>
      )}

      {w.weeklyChart && <WeeklyChartWidget tasks={tasks} pomodoroStats={pomodoroStats} onOpen={()=>setDetail("weekly")}/>}
      {w.upcoming && <UpcomingTaskWidget tasks={tasks} setTab={setTab}/>}
      {w.habit && <HabitWaterWidget count={habitCount} onChange={setHabitCount}/>}
      {w.streakDots && <StreakDotsWidget tasks={tasks} onOpen={()=>setDetail("streak")}/>}

      {w.stats && (
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:90 }}>
        <StatCard icon={Flame} label="نظم متوالی" value={`${toPersianDigits(streak)} روز`} color="#FF6B6B" onClick={()=>setDetail("streak")}/>
        <StatCard icon={Clock} label="تمرکز امروز" value={`${toPersianDigits(focusMinutesToday)} دقیقه`} color="#5CC9FF" onClick={()=>setTab("pomodoro")}/>
        <StatCard icon={Award} label="پومودورو امروز" value={toPersianDigits(pomodoroStats.todayCount)} color="#3ECF8E" onClick={()=>setTab("pomodoro")}/>
        <StatCard
          icon={PiggyBank} label="هدف پس‌انداز" value={`${toPersianDigits(goalPct)}٪`} color="#FF7BAC"
          sub={<div className="pv-progress-bg" style={{ height:5, marginTop:9 }}><div className="pv-progress-fill" style={{ width:`${goalPct}%`, background:"#FF7BAC" }}/></div>}
          onClick={()=>setTab("savings")}
        />
      </div>
      )}
      {!w.stats && <div style={{ marginBottom:90 }}/>}

      {detail === "weekly" && <WeeklyDetailModal tasks={tasks} pomodoroStats={pomodoroStats} onClose={()=>setDetail(null)}/>}
      {detail === "streak" && <StreakDetailModal tasks={tasks} onClose={()=>setDetail(null)}/>}
    </div>
  );
}

/* ========================================================================
   تسک‌ها
   ======================================================================== */

function TaskModal({ initial, onClose, onSave }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [desc, setDesc] = useState(initial?.desc || "");
  const [priority, setPriority] = useState(initial?.priority || "med");
  const [date, setDate] = useState(initial?.date || todayKey());
  const [time, setTime] = useState(initial?.time || "");

  return (
    <div className="pv-modal-backdrop" onClick={onClose}>
      <div className="pv-modal" onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <h3 style={{ margin:0, fontSize:16.5, fontWeight:800 }}>{initial ? "ویرایش کار" : "کار جدید"}</h3>
          <button onClick={onClose} className="pv-btn" style={{ background:"var(--surface)", width:32, height:32, borderRadius:11, display:"grid", placeItems:"center" }}><X size={15}/></button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
          <input className="pv-input" placeholder="عنوان کار..." value={title} onChange={e=>setTitle(e.target.value)} autoFocus/>
          <textarea className="pv-input" style={{ minHeight:70 }} placeholder="توضیحات (اختیاری)" value={desc} onChange={e=>setDesc(e.target.value)}/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <input type="date" className="pv-input" value={date} onChange={e=>setDate(e.target.value)}/>
            <input type="time" className="pv-input" value={time} onChange={e=>setTime(e.target.value)}/>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {Object.entries(PRIORITIES).map(([key,p]) => (
              <button key={key} onClick={()=>{ haptic(6); setPriority(key); }} className="pv-btn" style={{
                flex:1, padding:"10px 0", borderRadius:14, fontSize:12.5, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                background: priority===key ? p.dot : "var(--surface)",
                border: `1.5px solid ${priority===key ? p.dot : "var(--border)"}`,
                color: priority===key ? "#fff" : "var(--text-dim)",
                boxShadow: priority===key ? `0 6px 14px ${p.dot}55` : "none"
              }}>{p.label}</button>
            ))}
          </div>
          <button
            disabled={!title.trim()}
            onClick={() => { onSave({ id: initial?.id || uid(), title:title.trim(), desc, priority, date, time, done: initial?.done || false }); onClose(); }}
            className="pv-btn pv-btn-primary" style={{ padding:"14px 0", borderRadius:16, fontSize:14, marginTop:4, opacity:title.trim()?1:0.5 }}
          >{initial ? "ذخیره تغییرات" : "افزودن کار"}</button>
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task, onToggle, onEdit, onDelete, onDuplicate }) {
  return (
    <div className="pv-card pv-hover-lift" style={{ padding:"14px 15px", display:"flex", alignItems:"center", gap:11 }}>
      <button onClick={()=>onToggle(task.id)} className="pv-btn" style={{ background:"none", color: task.done ? "var(--success)" : "var(--text-dim)" }}>
        {task.done ? <CheckCircle2 size={22} className="pv-check-pop"/> : <Circle size={22}/>}
      </button>
      <div style={{ flex:1, minWidth:0 }} onClick={()=>onEdit(task)}>
        <p className="pv-strike" style={{ "--sx": task.done ? 1 : 0, margin:0, fontSize:14, fontWeight:600, opacity: task.done?0.45:1, cursor:"pointer" }}>
          {task.title}
        </p>
        <div style={{ display:"flex", gap:9, marginTop:5, alignItems:"center", flexWrap:"wrap" }}>
          <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"var(--text-dim)" }}>
            <span className="pv-dot" style={{ background:PRIORITIES[task.priority].dot }}/>{PRIORITIES[task.priority].label}
          </span>
          {task.time && <span style={{ fontSize:11, color:"var(--text-dim)", display:"flex", alignItems:"center", gap:3 }}><Clock size={11}/>{toPersianDigits(task.time)}</span>}
        </div>
      </div>
      {onDuplicate && (
        <button onClick={()=>onDuplicate(task)} className="pv-btn" style={{ background:"none", color:"var(--text-dim)" }}>
          <Copy size={15}/>
        </button>
      )}
      <button onClick={()=>onDelete(task.id)} className="pv-btn" style={{ background:"none", color:"var(--text-dim)" }}>
        <Trash2 size={16}/>
      </button>
    </div>
  );
}

function TasksView({ tasks, setTasks, filterDate, clearFilterDate, toast }) {
  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState("all");
  const [sortByPriority, setSortByPriority] = useState(false);

  const list = useMemo(() => {
    let arr = [...tasks];
    if (filterDate) arr = arr.filter(t => t.date === filterDate);
    if (filter === "active") arr = arr.filter(t => !t.done);
    if (filter === "done") arr = arr.filter(t => t.done);
    if (sortByPriority) {
      const order = { high:0, med:1, low:2 };
      arr.sort((a,b) => order[a.priority]-order[b.priority]);
    } else {
      arr.sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time));
    }
    return arr;
  }, [tasks, filter, sortByPriority, filterDate]);

  const [q, setQ] = useState("");
  const searched = useMemo(() => q.trim() ? list.filter(t => (t.title+" "+t.desc).toLowerCase().includes(q.toLowerCase())) : list, [list, q]);

  const toggle = (id) => setTasks(ts => {
    const t = ts.find(x=>x.id===id);
    if (t && !t.done) { toast("کار انجام شد ✓", <Check size={13}/>); haptic([12,30,12]); playSuccessSound(); }
    else { haptic(8); }
    return ts.map(t => t.id===id ? {...t, done:!t.done} : t);
  });
  const del = (id) => { setTasks(ts => ts.filter(t => t.id!==id)); haptic(15); toast("کار حذف شد", <Trash2 size={13}/>); };
  const duplicate = (task) => {
    setTasks(ts => [{ ...task, id: uid(), title: `${task.title} (کپی)`, done:false }, ...ts]);
    haptic(10);
    toast("کار کپی شد", <Copy size={13}/>);
  };
  const save = (task) => {
    setTasks(ts => ts.some(t=>t.id===task.id) ? ts.map(t=>t.id===task.id?task:t) : [task, ...ts]);
    haptic(10);
    toast("ذخیره شد", <Check size={13}/>);
  };

  return (
    <div className="pv-fade">
      <TopBar title="کارها و اهداف" subtitle={filterDate ? `فیلتر: ${filterDate}` : "برنامه‌ریزی روزانه‌ات"} icon={ListTodo} />
      {filterDate && (
        <button onClick={clearFilterDate} className="pv-btn pv-pill" style={{ marginBottom:14, color:"var(--primary)" }}>حذف فیلتر تاریخ ✕</button>
      )}
      <div style={{ position:"relative", marginBottom:14 }}>
        <Search size={15} color="var(--text-dim)" style={{ position:"absolute", top:"50%", right:14, transform:"translateY(-50%)" }}/>
        <input className="pv-input" style={{ paddingRight:38 }} placeholder="جستجو در کارها..." value={q} onChange={e=>setQ(e.target.value)}/>
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        <SegButton active={filter==="all"} onClick={()=>setFilter("all")}>همه</SegButton>
        <SegButton active={filter==="active"} onClick={()=>setFilter("active")}>فعال</SegButton>
        <SegButton active={filter==="done"} onClick={()=>setFilter("done")}>انجام‌شده</SegButton>
        <button onClick={()=>setSortByPriority(s=>!s)} className="pv-btn" style={{
          padding:"9px 13px", borderRadius:14, background: sortByPriority?"var(--primary)":"var(--surface)",
          color: sortByPriority?"#fff":"var(--text-dim)"
        }}><Flag size={14}/></button>
      </div>

      <div className="pv-stagger" style={{ display:"flex", flexDirection:"column", gap:9, marginBottom:90 }}>
        {searched.length === 0 && <EmptyState icon={ListTodo} text={q ? "چیزی پیدا نشد" : "کاری ثبت نشده"} sub={q ? "عبارت دیگه‌ای رو امتحان کن" : "با دکمه‌ی + یک کار جدید اضافه کن"}/>}
        {searched.map(t => <TaskRow key={t.id} task={t} onToggle={toggle} onEdit={setModal} onDelete={del} onDuplicate={duplicate}/>)}
      </div>

      <button onClick={()=>setModal({})} className="pv-btn pv-btn-primary pv-breathe" style={{
        position:"fixed", bottom:100, left:20, width:56, height:56, borderRadius:20, display:"grid", placeItems:"center", zIndex:20
      }}><Plus size={26}/></button>

      {modal !== null && <TaskModal initial={modal.id ? modal : null} onClose={()=>setModal(null)} onSave={save}/>}
    </div>
  );
}

/* ========================================================================
   پومودورو (وضعیت گلوبال — بالاتر در App نگه‌داری می‌شود)
   ======================================================================== */

function PomodoroView({ pomo, tasks, toast }) {
  const { mode, secondsLeft, running, setMode, setSecondsLeft, setRunning, stats, customMinutes, setCustomMinutes } = pomo;
  const [linkedTask, setLinkedTask] = useState("");
  const [minutesInput, setMinutesInput] = useState(String(customMinutes[mode]));
  const total = customMinutes[mode]*60;
  const pct = total ? Math.round(((total-secondsLeft)/total)*100) : 0;
  const mm = pad2(Math.floor(secondsLeft/60));
  const ss = pad2(secondsLeft%60);
  const circumference = 2*Math.PI*90;
  const activeTasks = tasks.filter(t => !t.done);

  useEffect(()=>{ setMinutesInput(String(customMinutes[mode])); }, [mode]);

  const switchMode = (m) => { haptic(8); setRunning(false); setMode(m); setSecondsLeft(customMinutes[m]*60); };
  const reset = () => { haptic(10); setRunning(false); setSecondsLeft(total); };
  const toggleRun = () => {
    haptic(12);
    setRunning(r => {
      if (!r) toast(mode==="focus" ? "تمرکز شروع شد" : "استراحت شروع شد", <Play size={12}/>);
      return !r;
    });
  };
  const applyMinutes = () => {
    let n = parseInt(minutesInput, 10);
    if (!n || n < 1) n = 1;
    if (n > 180) n = 180;
    setMinutesInput(String(n));
    setCustomMinutes(c => ({ ...c, [mode]: n }));
    setRunning(false);
    setSecondsLeft(n*60);
  };

  return (
    <div className="pv-fade">
      <TopBar title="پومودورو" subtitle="یک قدم کوچیک، یه تمرکز عمیق" icon={TimerIcon}/>

      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        {Object.entries(POMO_MODES).map(([k,m]) => <SegButton key={k} active={mode===k} onClick={()=>switchMode(k)}>{m.label}</SegButton>)}
      </div>

      <div className="pv-card pv-hover-lift" style={{ padding:14, marginBottom:18, display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ fontSize:12, color:"var(--text-dim)", fontWeight:600, flexShrink:0 }}>مدت زمان (دقیقه):</span>
        <input
          type="number" min={1} max={180} disabled={running}
          className="pv-input pv-num" style={{ padding:"9px 12px", textAlign:"center", opacity: running?0.5:1 }}
          value={minutesInput}
          onChange={e=>setMinutesInput(e.target.value.replace(/[^0-9]/g,""))}
          onBlur={applyMinutes}
          onKeyDown={e=>{ if (e.key==="Enter") applyMinutes(); }}
        />
        <button onClick={applyMinutes} disabled={running} className="pv-btn pv-btn-primary" style={{ padding:"9px 16px", borderRadius:14, fontSize:12.5, flexShrink:0, opacity: running?0.5:1 }}>ثبت</button>
      </div>

      <div style={{ display:"flex", justifyContent:"center", marginBottom:24 }}>
        <div style={{ position:"relative", width:220, height:220 }}>
          <svg width="220" height="220" style={{ transform:"rotate(-90deg)" }}>
            <circle cx="110" cy="110" r="90" stroke="var(--border)" strokeWidth="12" fill="none"/>
            <circle
              cx="110" cy="110" r="90" stroke="var(--primary)" strokeWidth="12" fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (pct/100)*circumference}
              style={{ transition:"stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
            <span className="pv-num" style={{ fontSize:46, fontWeight:800, letterSpacing:1 }}>{toPersianDigits(mm)}:{toPersianDigits(ss)}</span>
            <span style={{ fontSize:12, color:"var(--text-dim)", marginTop:4 }}>{POMO_MODES[mode].label}</span>
          </div>
        </div>
      </div>

      <div style={{ display:"flex", gap:12, justifyContent:"center", marginBottom:24 }}>
        <button onClick={reset} className="pv-btn" style={{ width:52, height:52, borderRadius:18, background:"var(--surface)", display:"grid", placeItems:"center", color:"var(--text-dim)" }}><RotateCcw size={19}/></button>
        <button onClick={toggleRun} className={`pv-btn ${running ? "" : "pv-breathe"}`} style={{
          width:78, height:78, borderRadius:26, background:"var(--primary)",
          display:"grid", placeItems:"center", color:"#fff", boxShadow:"0 10px 26px rgba(var(--primary-rgb),0.4)"
        }}>{running ? <Pause size={28}/> : <Play size={28} style={{ marginRight:-3 }}/>}</button>
        <div style={{ width:52 }}/>
      </div>

      <div className="pv-card" style={{ padding:16, marginBottom:14 }}>
        <p style={{ fontSize:12, color:"var(--text-dim)", margin:"0 0 8px", fontWeight:600 }}>وصل کردن به یک کار (اختیاری)</p>
        <select value={linkedTask} onChange={e=>setLinkedTask(e.target.value)} className="pv-input" style={{ appearance:"none" }}>
          <option value="">— بدون کار مشخص —</option>
          {activeTasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:90 }}>
        <div className="pv-card" style={{ padding:17, textAlign:"center" }}>
          <Award size={17} color="#FFA654" style={{ marginBottom:6 }}/>
          <p className="pv-num" style={{ fontSize:22, fontWeight:800, margin:0, color:"#FFA654" }}>{toPersianDigits(stats.todayCount)}</p>
          <p style={{ fontSize:11, color:"var(--text-dim)", margin:"2px 0 0" }}>جلسه امروز</p>
        </div>
        <div className="pv-card" style={{ padding:17, textAlign:"center" }}>
          <BarChart3 size={17} color="#3ECF8E" style={{ marginBottom:6 }}/>
          <p className="pv-num" style={{ fontSize:22, fontWeight:800, margin:0, color:"#3ECF8E" }}>{toPersianDigits(stats.totalMinutes)}</p>
          <p style={{ fontSize:11, color:"var(--text-dim)", margin:"2px 0 0" }}>دقیقه‌ی تمرکز کل</p>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================
   تایمر شناور بالای صفحه (وقتی هر جای اپ هستی، تایمر همراهته)
   ======================================================================== */

function MiniTimer({ pomo, setTab, currentTab }) {
  const { mode, secondsLeft, running } = pomo;
  if (!running || currentTab === "pomodoro") return null;
  const mm = pad2(Math.floor(secondsLeft/60));
  const ss = pad2(secondsLeft%60);
  return (
    <button onClick={()=>setTab("pomodoro")} className="pv-btn pv-mini-timer" style={{
      position:"fixed", top:14, right:16, zIndex:70,
      display:"flex", alignItems:"center", gap:8,
      background:"var(--primary)", color:"#fff", padding:"8px 14px 8px 10px", borderRadius:999,
      boxShadow:"0 8px 22px rgba(var(--primary-rgb),0.45)"
    }}>
      <span style={{ width:20, height:20, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.5)", borderTopColor:"#fff", display:"inline-block", animation:"pvSpinRing 1s linear infinite" }}/>
      <span className="pv-num" style={{ fontSize:13, fontWeight:700 }}>{toPersianDigits(mm)}:{toPersianDigits(ss)}</span>
      <span style={{ fontSize:10.5, opacity:0.85 }}>{POMO_MODES[mode].label}</span>
    </button>
  );
}

/* ========================================================================
   یادداشت‌ها
   ======================================================================== */

function NoteModal({ initial, onClose, onSave }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [body, setBody] = useState(initial?.body || "");
  const [pinned, setPinned] = useState(initial?.pinned || false);
  const [color, setColor] = useState(initial?.color || null);

  return (
    <div className="pv-modal-backdrop" onClick={onClose}>
      <div className="pv-modal" onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <h3 style={{ margin:0, fontSize:16.5, fontWeight:800 }}>{initial ? "ویرایش یادداشت" : "یادداشت جدید"}</h3>
          <button onClick={onClose} className="pv-btn" style={{ background:"var(--surface)", width:32, height:32, borderRadius:11, display:"grid", placeItems:"center" }}><X size={15}/></button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
          <input className="pv-input" placeholder="عنوان..." value={title} onChange={e=>setTitle(e.target.value)} autoFocus/>
          <textarea className="pv-input" style={{ minHeight:140 }} placeholder="متن یادداشت..." value={body} onChange={e=>setBody(e.target.value)}/>
          <p style={{ margin:0, fontSize:10.5, color:"var(--text-dim)", textAlign:"left" }} className="pv-num">{toPersianDigits(body.length)} نویسه</p>

          <div>
            <p style={{ margin:"0 0 8px", fontSize:11.5, color:"var(--text-dim)", fontWeight:600 }}>رنگ برچسب</p>
            <div style={{ display:"flex", gap:8 }}>
              {NOTE_COLORS.map(c => (
                <button key={c.key} onClick={()=>setColor(c.hex)} className="pv-btn" style={{
                  width:30, height:30, borderRadius:"50%",
                  background: c.hex || "var(--surface)",
                  border: color===c.hex ? "2.5px solid var(--text)" : "1px solid var(--border)",
                  display:"grid", placeItems:"center"
                }}>
                  {!c.hex && <X size={13} color="var(--text-dim)"/>}
                </button>
              ))}
            </div>
          </div>

          <button onClick={()=>setPinned(p=>!p)} className="pv-btn" style={{
            display:"flex", alignItems:"center", gap:6, alignSelf:"flex-start", padding:"8px 13px", borderRadius:12,
            background: pinned ? "var(--primary-soft)" : "var(--surface)", color: pinned?"var(--primary)":"var(--text-dim)"
          }}><Star size={14} fill={pinned ? "currentColor" : "none"}/> سنجاق کردن</button>
          <button
            disabled={!title.trim() && !body.trim()}
            onClick={()=>{ onSave({ id: initial?.id || uid(), title:title.trim()||"بدون عنوان", body, pinned, color, updatedAt: Date.now() }); onClose(); }}
            className="pv-btn pv-btn-primary" style={{ padding:"14px 0", borderRadius:16, fontSize:14, marginTop:4 }}
          >ذخیره</button>
        </div>
      </div>
    </div>
  );
}

function NoteDetailModal({ note, onClose, onEdit, onDelete, onTogglePin }) {
  const wordCount = (note.body||"").trim() ? note.body.trim().split(/\s+/).length : 0;
  const updatedLabel = new Date(note.updatedAt).toLocaleDateString("fa-IR", { day:"numeric", month:"long", year:"numeric" });
  return (
    <div className="pv-modal-backdrop" onClick={onClose}>
      <div className="pv-modal" onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14, gap:10 }}>
          <div style={{ flex:1, minWidth:0, display:"flex", alignItems:"center", gap:8 }}>
            {note.color && <span style={{ width:10, height:10, borderRadius:"50%", background:note.color, flexShrink:0 }}/>}
            <h3 style={{ margin:0, fontSize:17, fontWeight:800, overflowWrap:"break-word" }}>{note.title}</h3>
          </div>
          <button onClick={onClose} className="pv-btn" style={{ background:"var(--surface)", width:32, height:32, borderRadius:11, display:"grid", placeItems:"center", flexShrink:0 }}><X size={15}/></button>
        </div>
        <p style={{ margin:"0 0 18px", fontSize:11, color:"var(--text-dim)" }} className="pv-num">
          به‌روزرسانی: {updatedLabel} · {toPersianDigits(wordCount)} کلمه
        </p>
        <p style={{ margin:"0 0 22px", fontSize:14, lineHeight:2, whiteSpace:"pre-wrap", overflowWrap:"break-word" }}>
          {note.body || <span style={{ color:"var(--text-dim)" }}>این یادداشت متنی نداره.</span>}
        </p>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onTogglePin} className="pv-btn" style={{
            flex:1, padding:"12px 0", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", gap:6,
            background: note.pinned ? "var(--primary-soft)" : "var(--surface)", color: note.pinned ? "var(--primary)" : "var(--text-dim)"
          }}><Star size={14} fill={note.pinned ? "currentColor" : "none"}/> {note.pinned ? "برداشتن سنجاق" : "سنجاق کردن"}</button>
          <button onClick={onEdit} className="pv-btn pv-btn-primary" style={{ flex:1, padding:"12px 0", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            <Edit3 size={14}/> ویرایش
          </button>
          <button onClick={onDelete} className="pv-btn" style={{ width:46, borderRadius:14, display:"grid", placeItems:"center", background:"var(--surface)", color:"var(--danger)" }}>
            <Trash2 size={15}/>
          </button>
        </div>
      </div>
    </div>
  );
}

function NotesView({ notes, setNotes, toast }) {
  const [modal, setModal] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState("recent"); // recent | oldest | alpha
  const [colorFilter, setColorFilter] = useState(null);

  const usedColors = useMemo(() => [...new Set(notes.map(n=>n.color).filter(Boolean))], [notes]);

  const filtered = useMemo(() => {
    let arr = notes.filter(n => (n.title+n.body).toLowerCase().includes(q.toLowerCase()));
    if (colorFilter) arr = arr.filter(n => n.color === colorFilter);
    arr.sort((a,b) => {
      if (sortBy === "alpha") return a.title.localeCompare(b.title, "fa");
      if (sortBy === "oldest") return (b.pinned - a.pinned) || (a.updatedAt - b.updatedAt);
      return (b.pinned - a.pinned) || (b.updatedAt - a.updatedAt);
    });
    return arr;
  }, [notes, q, sortBy, colorFilter]);

  const save = (n) => { setNotes(ns => ns.some(x=>x.id===n.id) ? ns.map(x=>x.id===n.id?n:x) : [n, ...ns]); toast("یادداشت ذخیره شد", <Check size={13}/>); };
  const del = (id) => { setNotes(ns => ns.filter(n=>n.id!==id)); toast("یادداشت حذف شد", <Trash2 size={13}/>); setViewing(null); };
  const togglePin = (n) => { const next = { ...n, pinned: !n.pinned }; save(next); setViewing(next); };

  const SORTS = [
    { key:"recent", label:"جدیدترین" },
    { key:"oldest", label:"قدیمی‌ترین" },
    { key:"alpha",  label:"الفبا" },
  ];

  return (
    <div className="pv-fade">
      <TopBar title="یادداشت‌ها" subtitle={`${toPersianDigits(notes.length)} یادداشت ثبت شده`} icon={StickyNote}/>
      <input className="pv-input" placeholder="جستجو در یادداشت‌ها..." value={q} onChange={e=>setQ(e.target.value)} style={{ marginBottom:12 }}/>

      <div className="pv-scrollx" style={{ marginBottom:10 }}>
        {SORTS.map(s => (
          <button key={s.key} onClick={()=>setSortBy(s.key)} className="pv-btn" style={{
            padding:"7px 14px", borderRadius:12, fontSize:11.5, flexShrink:0, scrollSnapAlign:"start",
            background: sortBy===s.key ? "var(--primary)" : "var(--surface)",
            color: sortBy===s.key ? "#fff" : "var(--text-dim)"
          }}>{s.label}</button>
        ))}
        {usedColors.length > 0 && <div style={{ width:1, background:"var(--border)", margin:"4px 2px" }}/>}
        {usedColors.map(c => (
          <button key={c} onClick={()=>setColorFilter(f => f===c ? null : c)} className="pv-btn" style={{
            width:30, height:30, borderRadius:"50%", flexShrink:0, background:c,
            border: colorFilter===c ? "2.5px solid var(--text)" : "1px solid var(--border)"
          }}/>
        ))}
      </div>

      <div className="pv-stagger" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:90 }}>
        {filtered.length === 0 && <div style={{ gridColumn:"1/-1" }}><EmptyState icon={StickyNote} text="یادداشتی نداری" sub="یه ایده جدید ثبت کن"/></div>}
        {filtered.map(n => (
          <div key={n.id} onClick={()=>setViewing(n)} className="pv-card pv-hover-lift" style={{
            padding:15, cursor:"pointer", position:"relative",
            borderInlineStart: n.color ? `3px solid ${n.color}` : undefined
          }}>
            {n.pinned && <Star size={12} fill="var(--primary)" color="var(--primary)" style={{ position:"absolute", top:12, left:12 }}/>}
            <p style={{ margin:0, fontWeight:700, fontSize:13.5, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", paddingLeft: n.pinned ? 18 : 0 }}>{n.title}</p>
            <p style={{ margin:"6px 0 0", fontSize:12, color:"var(--text-dim)", overflow:"hidden", display:"-webkit-box", WebkitLineClamp:4, WebkitBoxOrient:"vertical" }}>{n.body}</p>
            <p style={{ margin:"8px 0 0", fontSize:10, color:"var(--text-dim)" }} className="pv-num">{new Date(n.updatedAt).toLocaleDateString("fa-IR", { day:"numeric", month:"short" })}</p>
          </div>
        ))}
      </div>

      <button onClick={()=>setModal({})} className="pv-btn pv-btn-primary pv-breathe" style={{
        position:"fixed", bottom:100, left:20, width:56, height:56, borderRadius:20, display:"grid", placeItems:"center", zIndex:20
      }}><Plus size={26}/></button>

      {modal !== null && <NoteModal initial={modal.id ? modal : null} onClose={()=>setModal(null)} onSave={save}/>}
      {viewing && (
        <NoteDetailModal
          note={viewing}
          onClose={()=>setViewing(null)}
          onEdit={()=>{ setModal(viewing); setViewing(null); }}
          onDelete={()=>del(viewing.id)}
          onTogglePin={()=>togglePin(viewing)}
        />
      )}
    </div>
  );
}

/* ========================================================================
   تقویم
   ======================================================================== */

function CalendarView({ tasks, goToTasksForDate }) {
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay()+1) % 7;
  const daysInMonth = new Date(year, month+1, 0).getDate();

  const cells = [];
  for (let i=0;i<startOffset;i++) cells.push(null);
  for (let d=1; d<=daysInMonth; d++) cells.push(d);

  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach(t => { (map[t.date] = map[t.date] || []).push(t); });
    return map;
  }, [tasks]);

  const changeMonth = (delta) => setCursor(new Date(year, month+delta, 1));
  const selectedTasks = selected ? (tasksByDate[selected] || []) : [];

  return (
    <div className="pv-fade">
      <TopBar title="تقویم" subtitle="روزهای برنامه‌دار هایلایت شدن" icon={CalendarDays}/>

      <div className="pv-card" style={{ padding:18, marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <button onClick={()=>changeMonth(-1)} className="pv-btn" style={{ background:"var(--surface)", width:32, height:32, borderRadius:11, display:"grid", placeItems:"center" }}><ChevronRight size={16}/></button>
          <div style={{ textAlign:"center" }}>
            <p style={{ margin:0, fontWeight:800, fontSize:14.5 }}>{cursor.toLocaleDateString("fa-IR",{month:"long", year:"numeric"})}</p>
            <p style={{ margin:0, fontSize:11, color:"var(--text-dim)" }}>{cursor.toLocaleDateString("en-US",{month:"long", year:"numeric"})}</p>
          </div>
          <button onClick={()=>changeMonth(1)} className="pv-btn" style={{ background:"var(--surface)", width:32, height:32, borderRadius:11, display:"grid", placeItems:"center" }}><ChevronLeft size={16}/></button>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4, marginBottom:6 }}>
          {PERSIAN_WEEK.map((d,i) => <div key={i} style={{ textAlign:"center", fontSize:11, color:"var(--text-dim)", fontWeight:700 }}>{d}</div>)}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:4 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i}/>;
            const dateObj = new Date(year, month, d);
            const key = dateKey(dateObj);
            const dayTasks = tasksByDate[key] || [];
            const isToday = key === todayKey();
            const isSelected = key === selected;
            const occasion = getOccasion(dateObj);
            return (
              <button key={i} onClick={()=>setSelected(key===selected?null:key)} className="pv-btn pv-hover-lift" title={occasion||undefined} style={{
                position:"relative", aspectRatio:"1", borderRadius:14, display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center", gap:2,
                background: isSelected ? "var(--primary)" : occasion ? "rgba(255,166,84,0.16)" : dayTasks.length ? "var(--primary-soft)" : "transparent",
                border: isToday && !isSelected ? "1.5px solid var(--primary)" : occasion && !isSelected ? "1.5px solid #FFA654" : "1px solid transparent",
                color: isSelected ? "#fff" : "var(--text)"
              }}>
                {occasion && <span style={{ position:"absolute", top:2, left:4, fontSize:8 }}>✨</span>}
                <span className="pv-num" style={{ fontSize:12.5, fontWeight: isToday?800:600 }}>{toPersianDigits(d)}</span>
                {dayTasks.length > 0 && (
                  <div style={{ display:"flex", gap:2 }}>
                    {dayTasks.slice(0,3).map((t,ix) => (
                      <div key={ix} style={{ width:4, height:4, borderRadius:"50%", background: isSelected ? "#fff" : "var(--primary)" }}/>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="pv-fade pv-card" style={{ padding:16, marginBottom:90 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <h4 style={{ margin:0, fontSize:13.5, fontWeight:800 }}>برنامه‌ی {selected}</h4>
            <button onClick={()=>goToTasksForDate(selected)} className="pv-btn pv-pill" style={{ color:"var(--primary)" }}>مشاهده در کارها</button>
          </div>
          {(() => { const [yy,mm2,dd] = selected.split("-").map(Number); const occ = getOccasion(new Date(yy, mm2-1, dd));
            return occ ? (
              <div className="pv-badge-pop" style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(255,166,84,0.14)", border:"1px solid #FFA654", borderRadius:14, padding:"9px 12px", marginBottom:12 }}>
                <Sparkles size={14} color="#FFA654"/><span style={{ fontSize:12.5, fontWeight:700, color:"#FFA654" }}>{occ}</span>
              </div>
            ) : null;
          })()}
          <div className="pv-stagger" style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {selectedTasks.length === 0 && <p style={{ fontSize:12, color:"var(--text-dim)" }}>هیچ برنامه‌ای برای این روز ثبت نشده.</p>}
            {selectedTasks.map(t => (
              <div key={t.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:"1px solid var(--border)" }}>
                <span className="pv-dot" style={{ background:PRIORITIES[t.priority].dot }}/>
                <span style={{ fontSize:13, fontWeight:600, flex:1, opacity: t.done?0.5:1 }}>{t.title}</span>
                {t.time && <span style={{ fontSize:11, color:"var(--text-dim)" }}>{toPersianDigits(t.time)}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ========================================================================
   بانک پس‌انداز هدفمند
   ======================================================================== */

function SavingsView({ goal, setGoal, toast }) {
  const [amount, setAmount] = useState("");
  const [editing, setEditing] = useState(false);
  const [tName, setTName] = useState(goal.name);
  const [tTarget, setTTarget] = useState(goal.target);

  const pct = goal.target>0 ? Math.min(100,(goal.saved/goal.target)*100) : 0;
  const remaining = Math.max(0, goal.target-goal.saved);

  const addFunds = (sign) => {
    const n = parseFloat(amount);
    if (!n || n<=0) return;
    setGoal(g => ({ ...g, saved: Math.max(0, g.saved + sign*n), history: [{ id:uid(), amount: sign*n, date: new Date().toLocaleDateString("fa-IR") }, ...g.history].slice(0,30) }));
    haptic(10); playTickSound();
    toast(sign>0 ? "واریز ثبت شد" : "برداشت ثبت شد", sign>0 ? <ArrowUpRight size={13}/> : <ArrowDownRight size={13}/>);
    setAmount("");
  };

  const removeTx = (h) => {
    setGoal(g => ({ ...g, saved: Math.max(0, g.saved - h.amount), history: g.history.filter(x=>x.id!==h.id) }));
    haptic(12);
    toast("تراکنش حذف شد", <Trash2 size={13}/>);
  };

  return (
    <div className="pv-fade">
      <TopBar title="بانک پس‌انداز" subtitle="برای هدف خودت پول کنار بذار" icon={PiggyBank}/>

      <div className="pv-card" style={{ padding:24, marginBottom:16, textAlign:"center" }}>
        {!editing ? (
          <>
            <p style={{ margin:0, fontSize:12.5, color:"var(--text-dim)" }}>هدف تو</p>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              <h2 style={{ fontSize:19, fontWeight:800, margin:"4px 0" }}>{goal.name}</h2>
              <button onClick={()=>setEditing(true)} className="pv-btn" style={{ background:"none", color:"var(--primary)" }}><Edit3 size={14}/></button>
            </div>
          </>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:10, textAlign:"right" }}>
            <input className="pv-input" value={tName} onChange={e=>setTName(e.target.value)} placeholder="نام هدف"/>
            <input className="pv-input" type="number" value={tTarget} onChange={e=>setTTarget(e.target.value)} placeholder="مبلغ هدف (تومان)"/>
            <button onClick={()=>{ setGoal(g=>({...g, name: tName||g.name, target: parseFloat(tTarget)||g.target})); setEditing(false); }} className="pv-btn pv-btn-primary" style={{ borderRadius:14, padding:"10px 0" }}>ذخیره هدف</button>
          </div>
        )}

        {!editing && (
          <>
            <div style={{ width:150, height:150, margin:"18px auto", position:"relative" }}>
              <svg width="150" height="150" style={{ transform:"rotate(-90deg)" }}>
                <circle cx="75" cy="75" r="62" stroke="var(--border)" strokeWidth="11" fill="none"/>
                <circle cx="75" cy="75" r="62" stroke="var(--primary)" strokeWidth="11" fill="none" strokeLinecap="round"
                  strokeDasharray={2*Math.PI*62} strokeDashoffset={2*Math.PI*62 - (pct/100)*2*Math.PI*62}
                  style={{ transition:"stroke-dashoffset .7s ease" }}/>
              </svg>
              <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                <span className="pv-num" style={{ fontSize:25, fontWeight:800 }}>{toPersianDigits(Math.round(pct))}٪</span>
                <Target size={13} color="var(--primary)"/>
              </div>
            </div>
            <p className="pv-num" style={{ fontSize:19, fontWeight:800, margin:0 }}>{fmtMoney(goal.saved)}</p>
            <p style={{ fontSize:12, color:"var(--text-dim)", margin:"4px 0 0" }}>از {fmtMoney(goal.target)} — {fmtMoney(remaining)} باقی‌مانده</p>
          </>
        )}
      </div>

      <div className="pv-card" style={{ padding:16, marginBottom:16 }}>
        <p style={{ fontSize:12, fontWeight:700, margin:"0 0 10px" }}>واریز / برداشت</p>
        <div style={{ display:"flex", gap:8 }}>
          <input type="number" className="pv-input" placeholder="مبلغ (تومان)" value={amount} onChange={e=>setAmount(e.target.value)}/>
          <button onClick={()=>addFunds(1)} className="pv-btn pv-btn-primary" style={{ borderRadius:14, padding:"0 16px", display:"flex", alignItems:"center" }}><ArrowUpRight size={16}/></button>
          <button onClick={()=>addFunds(-1)} className="pv-btn" style={{ borderRadius:14, padding:"0 16px", background:"var(--surface)", color:"var(--text-dim)" }}><ArrowDownRight size={16}/></button>
        </div>
      </div>

      <div className="pv-card" style={{ padding:16, marginBottom:90 }}>
        <p style={{ fontSize:12, fontWeight:700, margin:"0 0 10px" }}>تاریخچه‌ی تراکنش‌ها</p>
        <div className="pv-stagger" style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:220, overflowY:"auto" }}>
          {goal.history.length === 0 && <p style={{ fontSize:12, color:"var(--text-dim)" }}>هنوز تراکنشی ثبت نشده.</p>}
          {goal.history.map(h => (
            <div key={h.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:12.5, borderBottom:"1px solid var(--border)", paddingBottom:6, gap:8 }}>
              <span style={{ color:"var(--text-dim)" }}>{h.date}</span>
              <span style={{ fontWeight:700, color: h.amount>0 ? "var(--success)" : "var(--danger)", flex:1, textAlign:"left" }}>{h.amount>0 ? "+" : ""}{fmtMoney(h.amount)}</span>
              <button onClick={()=>removeTx(h)} className="pv-btn" style={{ background:"none", color:"var(--text-dim)", padding:0 }}><Trash2 size={13}/></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ========================================================================
   تنظیمات
   ======================================================================== */

/* اجزای ردیف‌های سبک تنظیمات iOS */

function IosSwitch({ value, onChange }) {
  return (
    <button onClick={()=>onChange(v=>!v)} className="pv-btn" style={{ width:46, height:27, borderRadius:999, background: value ? "var(--primary)" : "var(--border)", position:"relative", flexShrink:0 }}>
      <div style={{ position:"absolute", top:2.5, [value?"right":"left"]:2.5, width:22, height:22, borderRadius:"50%", background:"#fff", boxShadow:"0 2px 6px rgba(0,0,0,0.25)", transition:"all .25s cubic-bezier(.3,1,.4,1)" }}/>
    </button>
  );
}

function IosToggleRow({ icon: Icon, iconBg, title, sub, value, onChange }) {
  return (
    <div className="pv-ios-row">
      <div className="pv-ios-icon" style={{ background: iconBg }}><Icon size={15}/></div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ margin:0, fontWeight:600, fontSize:13.5 }}>{title}</p>
        {sub && <p style={{ margin:"1px 0 0", fontSize:11, color:"var(--text-dim)" }}>{sub}</p>}
      </div>
      <IosSwitch value={value} onChange={onChange}/>
    </div>
  );
}

function IosNavRow({ icon: Icon, iconBg, title, sub, value, onClick, danger }) {
  return (
    <div className="pv-ios-row" onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}>
      <div className="pv-ios-icon" style={{ background: iconBg }}><Icon size={15}/></div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ margin:0, fontWeight:600, fontSize:13.5, color: danger ? "var(--danger)" : "var(--text)" }}>{title}</p>
        {sub && <p style={{ margin:"1px 0 0", fontSize:11, color:"var(--text-dim)" }}>{sub}</p>}
      </div>
      {value && <span style={{ fontSize:12, color:"var(--text-dim)" }}>{value}</span>}
      {onClick && !danger && <ChevronLeft size={15} color="var(--text-dim)"/>}
    </div>
  );
}

function SettingsView({
  dark, setDark, name, setName, notifOn, setNotifOn,
  accent, setAccent, soundOn, setSoundOn, hapticOn, setHapticOn, weekendFirst, setWeekendFirst,
  bio, setBio, moodSticker, setMoodSticker, goalsText, setGoalsText, avatarPreset, setAvatarPreset,
  widgetSettings, setWidgetSettings,
  resetAll, exportPayload, importData, toast
}) {
  const [editingName, setEditingName] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const importInputRef = useRef(null);
  const currentAvatar = AVATAR_PRESETS.find(a=>a.key===avatarPreset) || AVATAR_PRESETS[0];

  const doExport = () => {
    try {
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type:"application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "planvia-backup.json";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast("فایل پشتیبان دانلود شد", <Download size={13}/>);
    } catch {
      toast("دانلود در این محیط پشتیبانی نشد", <Info size={13}/>);
    }
  };

  const doImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        importData(data);
        toast("داده‌ها بازیابی شد ✓", <Upload size={13}/>);
      } catch {
        toast("فایل پشتیبان معتبر نیست", <Info size={13}/>);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="pv-fade">
      <TopBar title="تنظیمات" subtitle="شخصی‌سازی تجربه‌ات" icon={Settings}/>

      {/* پروفایل */}
      <p className="pv-ios-label">پروفایل من</p>
      <div className="pv-ios-group" style={{ padding:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom: editingProfile ? 16 : 0 }}>
          <div className="pv-badge-pop" style={{
            width:56, height:56, borderRadius:"50%", flexShrink:0, display:"grid", placeItems:"center", position:"relative",
            background: `linear-gradient(135deg, ${currentAvatar.bg}, rgba(${hexToRgb(currentAvatar.bg)},0.6))`, color:"#fff", fontSize:24, fontWeight:800
          }}>
            {currentAvatar.emoji}
            {moodSticker && (
              <span style={{ position:"absolute", bottom:-4, left:-4, fontSize:15, background:"var(--grouped)", borderRadius:"50%", width:22, height:22, display:"grid", placeItems:"center", border:"1px solid var(--border)" }}>{moodSticker}</span>
            )}
          </div>
          {!editingName ? (
            <div style={{ flex:1, minWidth:0, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <p style={{ margin:0, fontWeight:700, fontSize:15 }}>{name || "نام نمایشی خودت رو وارد کن"}</p>
                <p style={{ margin:"2px 0 0", fontSize:11.5, color:"var(--text-dim)" }}>{bio ? bio.slice(0,40) : "ویرایش نام و پروفایل"}</p>
              </div>
              <button onClick={()=>setEditingName(true)} className="pv-btn" style={{ background:"var(--surface)", width:30, height:30, borderRadius:10, display:"grid", placeItems:"center", color:"var(--primary)" }}><Edit3 size={13}/></button>
            </div>
          ) : (
            <div style={{ flex:1, display:"flex", gap:8 }}>
              <input className="pv-input" autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="مثلاً: سارا"/>
              <button onClick={()=>setEditingName(false)} className="pv-btn pv-btn-primary" style={{ width:38, height:38, borderRadius:12, display:"grid", placeItems:"center", flexShrink:0 }}><Check size={16}/></button>
            </div>
          )}
        </div>

        <button onClick={()=>setEditingProfile(p=>!p)} className="pv-btn pv-pill" style={{ color:"var(--primary)", marginBottom: editingProfile?14:0 }}>
          {editingProfile ? "بستن ویرایش بیو و اهداف" : "ویرایش بیو، حال و اهداف ✎"}
        </button>

        {editingProfile && (
          <div className="pv-fade" style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div>
              <p style={{ fontSize:12, fontWeight:700, margin:"0 0 8px" }}>آواتار</p>
              <div style={{ display:"flex", gap:9, flexWrap:"wrap" }}>
                {AVATAR_PRESETS.map(a => (
                  <button key={a.key} onClick={()=>setAvatarPreset(a.key)} className={`pv-avatar-pick ${avatarPreset===a.key?"active":""}`}
                    style={{ width:40, height:40, background:`${a.bg}33` }}>{a.emoji}</button>
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontSize:12, fontWeight:700, margin:"0 0 8px" }}>حال امروزت چطوره؟ (اختیاری)</p>
              <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                <button onClick={()=>setMoodSticker("")} className={`pv-emoji-pick ${!moodSticker?"active":""}`} style={{ fontSize:12 }}>هیچ‌کدام</button>
                {MOOD_STICKERS.map(s => (
                  <button key={s} onClick={()=>setMoodSticker(s)} className={`pv-emoji-pick ${moodSticker===s?"active":""}`}>{s}</button>
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontSize:12, fontWeight:700, margin:"0 0 8px" }}>بیو</p>
              <textarea className="pv-input" style={{ minHeight:70 }} placeholder="چند خط درباره‌ی خودت بنویس..." value={bio} onChange={e=>setBio(e.target.value)}/>
            </div>

            <div>
              <p style={{ fontSize:12, fontWeight:700, margin:"0 0 8px" }}>اهداف من</p>
              <textarea className="pv-input" style={{ minHeight:70 }} placeholder="مثلاً: یادگیری زبان جدید، پس‌انداز برای سفر..." value={goalsText} onChange={e=>setGoalsText(e.target.value)}/>
            </div>
          </div>
        )}
      </div>

      {/* ظاهر */}
      <p className="pv-ios-label">ظاهر</p>
      <div className="pv-ios-group">
        <IosToggleRow icon={dark ? Moon : Sun} iconBg="#5C5CE0" title="حالت نمایش" sub="روشن یا تاریک" value={dark} onChange={setDark}/>
        <div className="pv-ios-row" style={{ flexDirection:"column", alignItems:"stretch", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:11 }}>
            <div className="pv-ios-icon" style={{ background:"#FF7BAC" }}><Palette size={15}/></div>
            <p style={{ margin:0, fontWeight:600, fontSize:13.5, flex:1 }}>رنگ تِم</p>
          </div>
          <div style={{ display:"flex", gap:10, paddingRight:40 }}>
            {ACCENTS.map(a => (
              <button key={a.key} onClick={()=>setAccent(a.hex)} className="pv-swatch" style={{
                background: a.hex, borderColor: accent===a.hex ? "var(--text)" : "transparent"
              }}>{accent===a.hex && <Check size={14} color="#fff"/>}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ویجت‌های صفحه‌ی اصلی */}
      <p className="pv-ios-label">صفحه‌ی اصلی</p>
      <div className="pv-ios-group">
        <IosNavRow icon={Sliders} iconBg="#9F7BFF" title="مدیریت ویجت‌ها" sub="روشن/خاموش کردن ویجت‌های داشبورد" onClick={()=>setManageOpen(true)}/>
      </div>

      {/* اعلان‌ها */}
      <p className="pv-ios-label">اعلان‌ها</p>
      <div className="pv-ios-group">
        <IosToggleRow icon={Bell} iconBg="#FF6B6B" title="یادآوری‌ها" sub="اعلان برای کارهای امروز" value={notifOn} onChange={setNotifOn}/>
        <IosToggleRow icon={Volume2} iconBg="#FFA654" title="صدا" sub="پخش صدا هنگام تکمیل کار" value={soundOn} onChange={setSoundOn}/>
        <IosToggleRow icon={Vibrate} iconBg="#3ECF8E" title="لرزش" sub="بازخورد لمسی هنگام تعامل" value={hapticOn} onChange={setHapticOn}/>
      </div>

      {/* ترجیحات */}
      <p className="pv-ios-label">ترجیحات</p>
      <div className="pv-ios-group">
        <IosToggleRow icon={CalendarDays} iconBg="#5CC9FF" title="شروع هفته از شنبه" sub="ترتیب روزها در تقویم" value={weekendFirst} onChange={setWeekendFirst}/>
        <IosNavRow icon={Globe} iconBg="#8A8A8E" title="زبان" value="فارسی"/>
      </div>

      {/* داده‌ها */}
      <p className="pv-ios-label">داده‌ها</p>
      <div className="pv-ios-group">
        <IosNavRow icon={Download} iconBg="#5C5CE0" title="خروجی گرفتن از داده‌ها" onClick={doExport}/>
        <IosNavRow icon={Upload} iconBg="#3ECF8E" title="بازیابی از فایل پشتیبان" onClick={()=>importInputRef.current?.click()}/>
        <IosNavRow icon={RefreshCw} iconBg="var(--danger)" title="پاک‌سازی کامل داده‌ها" onClick={resetAll} danger/>
      </div>
      <input ref={importInputRef} type="file" accept="application/json" style={{ display:"none" }} onChange={doImport}/>

      {/* درباره */}
      <p className="pv-ios-label">درباره</p>
      <div className="pv-ios-group">
        <IosNavRow icon={HelpCircle} iconBg="#5CC9FF" title="راهنما و پرسش‌های متداول" onClick={()=>toast("به‌زودی اضافه می‌شود", <Info size={13}/>)}/>
        <IosNavRow icon={Star} iconBg="#FFA654" title="امتیاز دادن به اپ" onClick={()=>toast("ممنون از حمایتت 🙌", <Star size={13}/>)}/>
        <IosNavRow icon={ShieldCheck} iconBg="#3ECF8E" title="حریم خصوصی" onClick={()=>toast("همه‌ی داده‌ها فقط روی دستگاه توئه", <ShieldCheck size={13}/>)}/>
        <IosNavRow icon={Code2} iconBg="#9F7BFF" title="درباره‌ی سازنده" onClick={()=>setAboutOpen(true)}/>
        <IosNavRow icon={Info} iconBg="#8A8A8E" title="نسخه" value="۱.۲.۰"/>
      </div>

      <p style={{ textAlign:"center", fontSize:11, color:"var(--text-dim)", marginBottom:90 }}>
        این اپ یک ابزار همه‌کاره برای برنامه‌ریزی روزانه‌ست: مدیریت کارها، تمرکز با پومودورو، یادداشت‌برداری و پس‌انداز هدفمند.
      </p>

      {manageOpen && <ManageWidgetsModal widgetSettings={widgetSettings} setWidgetSettings={setWidgetSettings} onClose={()=>setManageOpen(false)}/>}
      {aboutOpen && <AboutDeveloperModal onClose={()=>setAboutOpen(false)} toast={toast}/>}
    </div>
  );
}

/* ========================================================================
   ناوبری پایین
   ======================================================================== */

function BottomNav({ tab, setTab }) {
  const items = [
    { key:"home", label:"خانه", icon:Home },
    { key:"tasks", label:"کارها", icon:ListTodo },
    { key:"pomodoro", label:"تمرکز", icon:TimerIcon },
    { key:"notes", label:"یادداشت", icon:StickyNote },
    { key:"calendar", label:"تقویم", icon:CalendarDays },
    { key:"savings", label:"پس‌انداز", icon:PiggyBank },
  ];
  const wrapRef = useRef(null);
  const btnRefs = useRef({});
  const [indicator, setIndicator] = useState({ left:0, width:0, ready:false });
  const homeAdjacent = tab === "settings";
  const activeKey = tab === "settings" ? "home" : tab;

  useEffect(() => {
    const el = btnRefs.current[activeKey];
    const wrap = wrapRef.current;
    if (el && wrap) {
      const wrapBox = wrap.getBoundingClientRect();
      const elBox = el.getBoundingClientRect();
      setIndicator({ left: elBox.left - wrapBox.left, width: elBox.width, ready:true });
    }
  }, [activeKey]);

  return (
    <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:30, display:"flex", justifyContent:"center", padding:"0 12px calc(10px + env(safe-area-inset-bottom))" }}>
      <div ref={wrapRef} style={{
        position:"relative", display:"flex", alignItems:"center",
        width:"100%", maxWidth:460,
        background:"var(--grouped)", backdropFilter:"var(--blur)", WebkitBackdropFilter:"var(--blur)",
        border:"1px solid var(--border)", borderRadius:28, padding:"7px 6px",
        boxShadow:"0 10px 30px rgba(0,0,0,0.25)"
      }}>
        {indicator.ready && (
          <div style={{
            position:"absolute", top:7, bottom:7, left: indicator.left, width: indicator.width,
            background:"var(--primary)", borderRadius:18,
            transition:"left .38s cubic-bezier(.34,1.56,.4,1), width .38s cubic-bezier(.34,1.56,.4,1)",
            boxShadow:"0 6px 16px rgba(var(--primary-rgb),0.4)", zIndex:0
          }}/>
        )}
        {items.map(it => {
          const active = tab === it.key || (it.key==="home" && homeAdjacent);
          return (
            <button
              key={it.key}
              ref={el => { btnRefs.current[it.key] = el; }}
              onClick={()=>{ if (tab !== it.key) haptic(8); setTab(it.key); }}
              className="pv-btn"
              style={{
                position:"relative", zIndex:1, background:"transparent",
                display:"flex", flexDirection:"column", alignItems:"center", gap:2,
                color: active ? "#fff" : "var(--text-dim)", padding:"8px 10px", borderRadius:18, flex:1
              }}
            >
              <it.icon
                key={active ? `${it.key}-active` : `${it.key}-idle`}
                size={19}
                strokeWidth={active?2.3:1.8}
                className={active ? "pv-nav-icon-pop" : ""}
              />
              <span style={{ fontSize:9.5, fontWeight: active?700:500, transition:"font-weight .2s ease" }}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ========================================================================
   اپ اصلی
   ======================================================================== */

export default function App() {
  const [dark, setDark] = useStickyState("dark", true); // پیش‌فرض: دارک مود
  const [tab, setTab] = useState("home"); // تب فعلی نیازی به ماندگاری نداره
  const [name, setName] = useStickyState("name", "");
  const [notifOn, setNotifOn] = useStickyState("notifOn", true);
  const [accent, setAccent] = useStickyState("accent", ACCENTS[0].hex);
  const [soundOn, setSoundOn] = useStickyState("soundOn", true);
  const [hapticOn, setHapticOn] = useStickyState("hapticOn", true);
  const [weekendFirst, setWeekendFirst] = useStickyState("weekendFirst", true);
  const [filterDate, setFilterDate] = useState(null);
  const [toasts, toast] = useToasts();

  const [tasks, setTasks] = useStickyState("tasks", [
    { id: uid(), title:"جلسه با تیم طراحی", desc:"", priority:"high", date: todayKey(), time:"10:30", done:false },
    { id: uid(), title:"ورزش صبحگاهی", desc:"", priority:"med", date: todayKey(), time:"07:00", done:true },
    { id: uid(), title:"مطالعه‌ی کتاب", desc:"", priority:"low", date: todayKey(), time:"", done:false },
  ]);

  const [notes, setNotes] = useStickyState("notes", [
    { id: uid(), title:"ایده‌ی پروژه جدید", body:"یک اپ برای مدیریت زمان با تمرکز بر عادت‌سازی روزانه.", pinned:true, updatedAt: Date.now() },
    { id: uid(), title:"لیست خرید", body:"شیر، تخم‌مرغ، نان، میوه", pinned:false, updatedAt: Date.now()-10000 },
  ]);

  const [goal, setGoal] = useStickyState("goal", { name:"سفر به شمال", target:20000000, saved:6500000, history:[
    { id: uid(), amount: 2000000, date:"۱۴۰۳/۰۵/۰۱" },
    { id: uid(), amount: 4500000, date:"۱۴۰۳/۰۵/۱۰" },
  ] });

  // پومودورو در سطح اپ نگه‌داری می‌شود تا در همه‌ی صفحات همراه بماند
  const [pomoMode, setPomoMode] = useState("focus");
  const [pomoCustomMinutes, setPomoCustomMinutes] = useStickyState("pomoCustomMinutes", { focus:25, short:5, long:15 });
  const [pomoSeconds, setPomoSeconds] = useState(25*60);
  const [pomoRunning, setPomoRunning] = useState(false);
  const [pomoStats, setPomoStats] = useStickyState("pomoStats", { todayCount:0, totalMinutes:0, lastDate: todayKey() });
  const intervalRef = useRef(null);
  const focusSecAccRef = useRef(0);

  // اگر از روز قبل مانده باشد، آمار «امروز» پومودورو در شروع برنامه صفر می‌شود
  useEffect(() => {
    if (pomoStats.lastDate !== todayKey()) {
      setPomoStats({ todayCount:0, totalMinutes:0, lastDate: todayKey() });
    }
  }, []);

  // ویجت‌ها و پروفایل — با قابلیت افزودن/حذف/ویرایش
  const [widgetSettings, setWidgetSettings] = useStickyState("widgetSettings", DEFAULT_WIDGET_SETTINGS);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [moodPhotos, setMoodPhotos] = useStickyState("moodPhotos", {});
  const [habitState, setHabitState] = useStickyState("habit", { count:0, date: todayKey() });
  const habitCount = habitState.date === todayKey() ? habitState.count : 0;
  const setHabitCount = (updater) => setHabitState(s => {
    const currentCount = s.date === todayKey() ? s.count : 0;
    const nextCount = typeof updater === "function" ? updater(currentCount) : updater;
    return { count: nextCount, date: todayKey() };
  });
  const [bio, setBio] = useStickyState("bio", "");
  const [moodSticker, setMoodSticker] = useStickyState("moodSticker", "");
  const [goalsText, setGoalsText] = useStickyState("goalsText", "");
  const [avatarPreset, setAvatarPreset] = useStickyState("avatarPreset", AVATAR_PRESETS[0].key);
  const setMoodPhoto = (date, data) => setMoodPhotos(m => {
    const next = { ...m };
    if (data) next[date] = data; else delete next[date];
    return next;
  });
  const addQuickTask = (title) => {
    setTasks(ts => [{ id: uid(), title, desc:"", priority:"med", date: todayKey(), time:"", done:false }, ...ts]);
    haptic(10); playTickSound();
    toast("کار اضافه شد", <Check size={13}/>);
  };

  const importData = (data) => {
    if (Array.isArray(data.tasks)) setTasks(data.tasks);
    if (Array.isArray(data.notes)) setNotes(data.notes);
    if (data.goal && typeof data.goal === "object") setGoal(data.goal);
    if (data.pomoStats && typeof data.pomoStats === "object") setPomoStats(data.pomoStats);
  };

  // همگام‌سازی تنظیمات صدا/لرزش با ماژول سراسری haptic/playSound
  useEffect(() => { prefsRef.hapticOn = hapticOn; }, [hapticOn]);
  useEffect(() => { prefsRef.soundOn = soundOn; }, [soundOn]);

  useEffect(() => {
    if (pomoRunning) {
      intervalRef.current = setInterval(() => {
        // مدت تمرکز به‌صورت زنده: هر دقیقه‌ای که واقعاً در حالت «تمرکز» سپری می‌شود
        // بلافاصله به آمار اضافه می‌شود، نه فقط در پایان یک جلسه‌ی کامل
        if (pomoMode === "focus") {
          focusSecAccRef.current += 1;
          if (focusSecAccRef.current >= 60) {
            focusSecAccRef.current -= 60;
            setPomoStats(st => ({ ...st, totalMinutes: st.totalMinutes + 1 }));
          }
        }
        setPomoSeconds(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            setPomoRunning(false);
            haptic([30, 40, 30]);
            playSuccessSound();
            if (pomoMode === "focus") {
              setPomoStats(st => ({ ...st, todayCount: st.todayCount+1 }));
              toast("یک جلسه‌ی تمرکز کامل شد 🎉", <Award size={13}/>);
            }
            return 0;
          }
          return s-1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [pomoRunning, pomoMode, pomoCustomMinutes.focus]);

  const pomo = {
    mode: pomoMode, setMode: setPomoMode,
    secondsLeft: pomoSeconds, setSecondsLeft: setPomoSeconds,
    running: pomoRunning, setRunning: setPomoRunning,
    stats: pomoStats,
    customMinutes: pomoCustomMinutes, setCustomMinutes: setPomoCustomMinutes,
  };

  const goToTasksForDate = (date) => { setFilterDate(date); setTab("tasks"); };

  const exportPayload = { tasks, notes, goal, pomoStats, exportedAt: new Date().toISOString() };

  return (
    <div className="pv-root">
      <GlobalStyle dark={dark} accent={accent}/>
      <ToastHost toasts={toasts}/>
      <MiniTimer pomo={pomo} setTab={setTab} currentTab={tab}/>

      <div style={{ maxWidth:520, margin:"0 auto", padding:"20px 16px 0" }}>
        <div style={{ position:"absolute", top:16, left:16, zIndex:5, display:"flex", gap:8 }}>
          <button onClick={()=>{ haptic(8); setDark(d=>!d); }} className="pv-btn" style={{
            width:38, height:38, borderRadius:13, background:"var(--surface)", border:"1px solid var(--border)",
            display:"grid", placeItems:"center", color:"var(--text)"
          }}>{dark ? <Sun size={17}/> : <Moon size={17}/>}</button>
          <button onClick={()=>{ haptic(8); setTab("settings"); }} className="pv-btn" style={{
            width:38, height:38, borderRadius:13,
            background: tab==="settings" ? "var(--primary)" : "var(--surface)",
            border: tab==="settings" ? "1px solid var(--primary)" : "1px solid var(--border)",
            display:"grid", placeItems:"center", color: tab==="settings" ? "#fff" : "var(--text)"
          }}><Settings size={17}/></button>
        </div>

        {tab === "home" && (
          <Dashboard
            tasks={tasks} notes={notes} goal={goal} pomodoroStats={pomoStats} pomo={pomo} setTab={setTab} greetingName={name}
            widgetSettings={widgetSettings}
            quoteIdx={quoteIdx} setQuoteIdx={setQuoteIdx}
            moodPhotos={moodPhotos} setMoodPhoto={setMoodPhoto}
            habitCount={habitCount} setHabitCount={setHabitCount}
            addQuickTask={addQuickTask} toast={toast}
          />
        )}
        {tab === "tasks" && <TasksView tasks={tasks} setTasks={setTasks} filterDate={filterDate} clearFilterDate={()=>setFilterDate(null)} toast={toast}/>}
        {tab === "pomodoro" && <PomodoroView pomo={pomo} tasks={tasks} toast={toast}/>}
        {tab === "notes" && <NotesView notes={notes} setNotes={setNotes} toast={toast}/>}
        {tab === "calendar" && <CalendarView tasks={tasks} goToTasksForDate={goToTasksForDate}/>}
        {tab === "savings" && <SavingsView goal={goal} setGoal={setGoal} toast={toast}/>}
        {tab === "settings" && (
          <SettingsView
            dark={dark} setDark={setDark} name={name} setName={setName}
            notifOn={notifOn} setNotifOn={setNotifOn}
            accent={accent} setAccent={setAccent}
            soundOn={soundOn} setSoundOn={setSoundOn}
            hapticOn={hapticOn} setHapticOn={setHapticOn}
            weekendFirst={weekendFirst} setWeekendFirst={setWeekendFirst}
            bio={bio} setBio={setBio}
            moodSticker={moodSticker} setMoodSticker={setMoodSticker}
            goalsText={goalsText} setGoalsText={setGoalsText}
            avatarPreset={avatarPreset} setAvatarPreset={setAvatarPreset}
            widgetSettings={widgetSettings} setWidgetSettings={setWidgetSettings}
            exportPayload={exportPayload} importData={importData} toast={toast}
            resetAll={() => {
              setTasks([]); setNotes([]);
              setGoal({name:"هدف جدید", target:1000000, saved:0, history:[]});
              focusSecAccRef.current = 0;
              setPomoStats({todayCount:0, totalMinutes:0, lastDate: todayKey()});
              setHabitState({ count:0, date: todayKey() });
              toast("داده‌ها پاک شدند", <RefreshCw size={13}/>);
            }}
          />
        )}
      </div>
      <BottomNav tab={tab} setTab={setTab}/>
    </div>
  );
}
