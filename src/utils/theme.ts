import { AuraColor } from '../types';

export interface ThemeConfig {
  id: AuraColor;
  label: string;
  mood: string;
  swatchBg: string;
  hex: string;
  // Subtle surfaces & accents (60-30-10 neutral-first discipline)
  gradient: string;
  orbGradient: string;
  cardGradient: string;
  // Buttons
  primaryBtn: string;
  secondaryBtn: string;
  floatingBtn: string;
  // Borders
  borderAccent: string;
  borderFocus: string;
  // Text & Accents
  textAccent: string;
  textLight: string;
  bgLight: string;
  badge: string;
  shadowGlow: string;
  pingDot: string;
}

export const THEMES: Record<AuraColor, ThemeConfig> = {
  violet: {
    id: 'violet',
    label: 'Grafite & Índigo',
    mood: 'Neutro limpo com acento índigo discreto',
    swatchBg: 'bg-indigo-500',
    hex: '#6366f1',
    gradient: 'from-indigo-500 to-indigo-600',
    orbGradient: 'from-indigo-500 via-indigo-600 to-slate-700',
    cardGradient: 'from-[#1e1e21] to-[#1b1b1e]',
    primaryBtn: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    secondaryBtn: 'bg-white/[0.06] hover:bg-white/[0.1] text-indigo-300 border border-indigo-500/25',
    floatingBtn: 'bg-indigo-600 hover:bg-indigo-500 shadow-black/40',
    borderAccent: 'border-white/[0.09] hover:border-indigo-400/40',
    borderFocus: 'focus:border-indigo-400/60',
    textAccent: 'text-indigo-400',
    textLight: 'text-indigo-300',
    bgLight: 'bg-indigo-500/[0.08]',
    badge: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25',
    shadowGlow: 'shadow-black/30',
    pingDot: 'bg-indigo-400',
  },
  emerald: {
    id: 'emerald',
    label: 'Grafite & Esmeralda',
    mood: 'Clareza e foco operacional discreto',
    swatchBg: 'bg-emerald-500',
    hex: '#10b981',
    gradient: 'from-emerald-500 to-emerald-600',
    orbGradient: 'from-emerald-500 via-teal-600 to-slate-700',
    cardGradient: 'from-[#1e1e21] to-[#1b1b1e]',
    primaryBtn: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    secondaryBtn: 'bg-white/[0.06] hover:bg-white/[0.1] text-emerald-300 border border-emerald-500/25',
    floatingBtn: 'bg-emerald-600 hover:bg-emerald-500 shadow-black/40',
    borderAccent: 'border-white/[0.09] hover:border-emerald-400/40',
    borderFocus: 'focus:border-emerald-400/60',
    textAccent: 'text-emerald-400',
    textLight: 'text-emerald-300',
    bgLight: 'bg-emerald-500/[0.08]',
    badge: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25',
    shadowGlow: 'shadow-black/30',
    pingDot: 'bg-emerald-400',
  },
  amber: {
    id: 'amber',
    label: 'Grafite & Âmbar',
    mood: 'Atenção executiva com contraste quente sutil',
    swatchBg: 'bg-amber-500',
    hex: '#f59e0b',
    gradient: 'from-amber-500 to-amber-600',
    orbGradient: 'from-amber-500 via-orange-500 to-slate-700',
    cardGradient: 'from-[#1e1e21] to-[#1b1b1e]',
    primaryBtn: 'bg-amber-600 hover:bg-amber-500 text-white',
    secondaryBtn: 'bg-white/[0.06] hover:bg-white/[0.1] text-amber-300 border border-amber-500/25',
    floatingBtn: 'bg-amber-600 hover:bg-amber-500 shadow-black/40',
    borderAccent: 'border-white/[0.09] hover:border-amber-400/40',
    borderFocus: 'focus:border-amber-400/60',
    textAccent: 'text-amber-400',
    textLight: 'text-amber-300',
    bgLight: 'bg-amber-500/[0.08]',
    badge: 'bg-amber-500/15 text-amber-300 border border-amber-500/25',
    shadowGlow: 'shadow-black/30',
    pingDot: 'bg-amber-400',
  },
  blue: {
    id: 'blue',
    label: 'Grafite & Azul Toki',
    mood: 'Padrão Toki calmo com destaques em azul celeste',
    swatchBg: 'bg-sky-500',
    hex: '#38bdf8',
    gradient: 'from-sky-500 to-blue-600',
    orbGradient: 'from-sky-500 via-blue-600 to-slate-700',
    cardGradient: 'from-[#1e1e21] to-[#1b1b1e]',
    primaryBtn: 'bg-sky-600 hover:bg-sky-500 text-white',
    secondaryBtn: 'bg-white/[0.06] hover:bg-white/[0.1] text-sky-300 border border-sky-500/25',
    floatingBtn: 'bg-sky-600 hover:bg-sky-500 shadow-black/40',
    borderAccent: 'border-white/[0.09] hover:border-sky-400/40',
    borderFocus: 'focus:border-sky-400/60',
    textAccent: 'text-sky-400',
    textLight: 'text-sky-300',
    bgLight: 'bg-sky-500/[0.08]',
    badge: 'bg-sky-500/15 text-sky-300 border border-sky-500/25',
    shadowGlow: 'shadow-black/30',
    pingDot: 'bg-sky-400',
  },
  rose: {
    id: 'rose',
    label: 'Grafite & Coral',
    mood: 'Decisivo e limpo com acento coral sutil',
    swatchBg: 'bg-rose-500',
    hex: '#f43f5e',
    gradient: 'from-rose-500 to-rose-600',
    orbGradient: 'from-rose-500 via-rose-600 to-slate-700',
    cardGradient: 'from-[#1e1e21] to-[#1b1b1e]',
    primaryBtn: 'bg-rose-600 hover:bg-rose-500 text-white',
    secondaryBtn: 'bg-white/[0.06] hover:bg-white/[0.1] text-rose-300 border border-rose-500/25',
    floatingBtn: 'bg-rose-600 hover:bg-rose-500 shadow-black/40',
    borderAccent: 'border-white/[0.09] hover:border-rose-400/40',
    borderFocus: 'focus:border-rose-400/60',
    textAccent: 'text-rose-400',
    textLight: 'text-rose-300',
    bgLight: 'bg-rose-500/[0.08]',
    badge: 'bg-rose-500/15 text-rose-300 border border-rose-500/25',
    shadowGlow: 'shadow-black/30',
    pingDot: 'bg-rose-400',
  },
};

export function getTheme(color: AuraColor = 'blue'): ThemeConfig {
  return THEMES[color] || THEMES.blue;
}
