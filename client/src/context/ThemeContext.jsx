import React, { createContext, useContext, useState, useCallback } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

const hexToRgb = (hex) => {
    if (!hex) return null;
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
};

const hexToHsl = (hex) => {
    if (!hex) return [0, 0, 0];
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return [0, 0, 0];
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
};

const hslToHex = (h, s, l) => {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => { const k = (n + h / 30) % 12; const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1); return Math.round(255 * color).toString(16).padStart(2, '0'); };
    return `#${f(0)}${f(8)}${f(4)}`;
};

const isColorDark = (hex) => {
    if (!hex) return false;
    const [, , l] = hexToHsl(hex);
    return l < 50;
};

const lighten = (hex, amount) => {
    const [h, s, l] = hexToHsl(hex);
    return hslToHex(h, s, Math.min(100, l + amount));
};

const darken = (hex, amount) => {
    const [h, s, l] = hexToHsl(hex);
    return hslToHex(h, s, Math.max(0, l - amount));
};

export const ThemeProvider = ({ children, initialTheme }) => {
    const [theme, setTheme] = useState(initialTheme || null);

    const resetTheme = useCallback(() => {
        const root = document.documentElement;
        const flowTheme = {
            '--bg-main': '#FAF9F6',
            '--bg-surface': '#FFFFFF',
            '--accent-primary': '#FF5F40',
            '--accent-primary-rgb': '255, 95, 64',
            '--accent-secondary': '#FF7F50',
            '--text-main': '#111827',
            '--text-muted': '#9CA3AF',
            '--glass-bg': 'rgba(255, 255, 255, 0.7)',
            '--bg-hover': '#F3F4F6',
            '--bg-input': '#F9FAFB',
            '--border-color': 'rgba(0,0,0,0.08)',
            '--border-subtle': 'rgba(0,0,0,0.06)',
            '--text-inverse': '#FFFFFF',
            '--shadow-color': 'rgba(0,0,0,0.04)',
            '--overlay-bg': 'rgba(0,0,0,0.4)',
        };

        Object.entries(flowTheme).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });

        root.setAttribute('data-theme-mode', 'light');
        setTheme(null);
    }, []);

    const applyTheme = useCallback((themeData, barberiaId) => {
        if (!themeData) return;

        const root = document.documentElement;
        const isDark = isColorDark(themeData.bg_main);

        const vars = {
            '--bg-main': themeData.bg_main,
            '--bg-surface': themeData.bg_surface,
            '--accent-primary': themeData.accent_primary,
            '--accent-primary-rgb': hexToRgb(themeData.accent_primary),
            '--accent-secondary': themeData.accent_secondary,
            '--text-main': themeData.text_main,
            '--text-muted': themeData.text_muted,
            '--glass-bg': themeData.bg_surface + '66',
            // Variables derivadas para cobertura completa
            '--bg-hover': isDark ? lighten(themeData.bg_surface, 8) : darken(themeData.bg_surface, 3),
            '--bg-input': isDark ? lighten(themeData.bg_main, 5) : darken(themeData.bg_main, 2),
            '--border-color': isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)',
            '--border-subtle': isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            '--text-inverse': isDark ? '#111827' : '#FFFFFF',
            '--shadow-color': isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.04)',
            '--overlay-bg': isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)',
        };

        Object.entries(vars).forEach(([key, value]) => {
            if (value) root.style.setProperty(key, value);
        });

        root.setAttribute('data-theme-mode', isDark ? 'dark' : 'light');

        if (barberiaId) {
            localStorage.setItem(`tema_flow_${barberiaId}`, JSON.stringify(themeData));
        }

        setTheme(themeData);
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, applyTheme, resetTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
