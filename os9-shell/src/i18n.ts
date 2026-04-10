import { create } from 'zustand';

export type Lang = 'en' | 'es' | 'ja';

const TRANSLATIONS: Record<Lang, Record<string, string>> = {
  en: {
    'menu.about': 'About nova64 OS',
    'menu.appearance': 'Appearance\u2026',
    'menu.profiler': 'System Profiler\u2026',
    'menu.restart': 'Restart\u2026',
    'menu.shutdown': 'Shut Down\u2026',
    'menu.apps': 'Applications',
    'menu.games': 'Games',
    'boot.welcome': 'Welcome to nova64 OS',
    'boot.loading': 'Loading System Extensions\u2026',
    'boot.ext.graphics': 'Graphics Accelerator',
    'boot.ext.sound': 'Sound Manager',
    'boot.ext.network': 'Network Extension',
    'boot.ext.memory': 'Memory Manager',
    'boot.ext.files': 'File System',
    'boot.ext.display': 'Display Manager',
    'lang.label': 'Language',
  },
  es: {
    'menu.about': 'Acerca de nova64 OS',
    'menu.appearance': 'Apariencia\u2026',
    'menu.profiler': 'Perfilador del Sistema\u2026',
    'menu.restart': 'Reiniciar\u2026',
    'menu.shutdown': 'Apagar\u2026',
    'menu.apps': 'Aplicaciones',
    'menu.games': 'Juegos',
    'boot.welcome': 'Bienvenido a nova64 OS',
    'boot.loading': 'Cargando Extensiones del Sistema\u2026',
    'boot.ext.graphics': 'Acelerador Gr\u00e1fico',
    'boot.ext.sound': 'Gestor de Sonido',
    'boot.ext.network': 'Extensi\u00f3n de Red',
    'boot.ext.memory': 'Gestor de Memoria',
    'boot.ext.files': 'Sistema de Archivos',
    'boot.ext.display': 'Gestor de Pantalla',
    'lang.label': 'Idioma',
  },
  ja: {
    'menu.about': 'nova64 OS\u306b\u3064\u3044\u3066',
    'menu.appearance': '\u5916\u89b3\u2026',
    'menu.profiler': '\u30b7\u30b9\u30c6\u30e0\u30d7\u30ed\u30d5\u30a1\u30a4\u30e9\u30fc\u2026',
    'menu.restart': '\u518d\u8d77\u52d5\u2026',
    'menu.shutdown': '\u30b7\u30e3\u30c3\u30c8\u30c0\u30a6\u30f3\u2026',
    'menu.apps': '\u30a2\u30d7\u30ea\u30b1\u30fc\u30b7\u30e7\u30f3',
    'menu.games': '\u30b2\u30fc\u30e0',
    'boot.welcome': 'nova64 OS\u3078\u3088\u3046\u3053\u305d',
    'boot.loading': '\u30b7\u30b9\u30c6\u30e0\u62e1\u5f35\u3092\u8aad\u307f\u8fbc\u3093\u3067\u3044\u307e\u3059\u2026',
    'boot.ext.graphics': '\u30b0\u30e9\u30d5\u30a3\u30c3\u30af\u30a2\u30af\u30bb\u30e9\u30ec\u30fc\u30bf',
    'boot.ext.sound': '\u30b5\u30a6\u30f3\u30c9\u30de\u30cd\u30fc\u30b8\u30e3\u30fc',
    'boot.ext.network': '\u30cd\u30c3\u30c8\u30ef\u30fc\u30af\u62e1\u5f35',
    'boot.ext.memory': '\u30e1\u30e2\u30ea\u30de\u30cd\u30fc\u30b8\u30e3\u30fc',
    'boot.ext.files': '\u30d5\u30a1\u30a4\u30eb\u30b7\u30b9\u30c6\u30e0',
    'boot.ext.display': '\u30c7\u30a3\u30b9\u30d7\u30ec\u30a4\u30de\u30cd\u30fc\u30b8\u30e3\u30fc',
    'lang.label': '\u8a00\u8a9e',
  },
};

const STORAGE_KEY = 'nova64-lang';

interface LangStore {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const useLangStore = create<LangStore>((set) => ({
  lang: (localStorage.getItem(STORAGE_KEY) as Lang | null) ?? 'en',
  setLang: (lang: Lang) => {
    localStorage.setItem(STORAGE_KEY, lang);
    set({ lang });
  },
}));

export function useI18n() {
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);

  function t(key: string): string {
    return TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en[key] ?? key;
  }

  return { lang, setLang, t };
}
