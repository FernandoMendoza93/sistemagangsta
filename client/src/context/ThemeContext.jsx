import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children, initialTheme }) => {
    const [theme, setTheme] = useState(initialTheme || null);

    const hexToRgb = (hex) => {
        if (!hex) return null;
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
    };

    const resetTheme = () => {
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
        };

        Object.entries(flowTheme).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });

        console.log('🛡️ Identidad Flow (Naranja Coral) restaurada.');
        setTheme(null);
    };

    const applyTheme = (themeData, barberiaId) => {
        if (!themeData) return;
        
        const root = document.documentElement;
        
        // Mapeo de variables dinámicas
        const vars = {
            '--bg-main': themeData.bg_main,
            '--bg-surface': themeData.bg_surface,
            '--accent-primary': themeData.accent_primary,
            '--accent-primary-rgb': hexToRgb(themeData.accent_primary),
            '--accent-secondary': themeData.accent_secondary,
            '--text-main': themeData.text_main,
            '--text-muted': themeData.text_muted,
            '--glass-bg': themeData.bg_surface + '66',
        };

        Object.entries(vars).forEach(([key, value]) => {
            if (value) root.style.setProperty(key, value);
        });

        // Persistencia aislada (Engram 002)
        if (barberiaId) {
            localStorage.setItem(`tema_flow_${barberiaId}`, JSON.stringify(themeData));
        }

        console.log(`🎨 Tema "${themeData.nombre || 'Personalizado'}" aplicado al DOM.`);
        setTheme(themeData);
    };

    return (
        <ThemeContext.Provider value={{ theme, applyTheme, resetTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
