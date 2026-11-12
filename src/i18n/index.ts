import { create } from 'zustand';
import { Language } from '../types';
import { vi, TranslationSchema } from './vi';
import { en } from './en';

interface I18nState {
  lang: Language;
  t: TranslationSchema;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

const getInitialLang = (): Language => {
  try {
    const saved = localStorage.getItem('memoria_lang');
    if (saved === 'en' || saved === 'vi') return saved;
  } catch {
    // ignore
  }
  return 'vi'; // Default Vietnamese per specification
};

const initialLang = getInitialLang();

export const useI18n = create<I18nState>((set, get) => ({
  lang: initialLang,
  t: initialLang === 'vi' ? vi : en,
  setLanguage: (lang: Language) => {
    try {
      localStorage.setItem('memoria_lang', lang);
    } catch {
      // ignore
    }
    set({ lang, t: lang === 'vi' ? vi : en });
  },
  toggleLanguage: () => {
    const next: Language = get().lang === 'vi' ? 'en' : 'vi';
    get().setLanguage(next);
  },
}));
