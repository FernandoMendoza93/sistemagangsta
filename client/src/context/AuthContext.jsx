import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { authService, clienteAuthService } from '../services/api';
import Swal from 'sweetalert2';

const AuthContext = createContext(null);

// Tiempos de inactividad (en minutos)
const INACTIVITY_TIMEOUT = {
    staff: 15,    // Admin, Encargado, Barbero
    cliente: 30   // Portal del cliente
};
const WARNING_BEFORE_LOGOUT = 1; // Minutos antes de cerrar para avisar

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const inactivityTimer = useRef(null);
    const warningTimer = useRef(null);
    const warningShown = useRef(false);

    // Cerrar sesión por inactividad
    const logoutByInactivity = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        Swal.fire({
            icon: 'info',
            title: 'Sesión cerrada',
            text: 'Tu sesión se cerró por inactividad',
            confirmButtonColor: '#c9a227'
        });
    }, []);

    // Mostrar advertencia antes de cerrar
    const showWarning = useCallback(() => {
        if (warningShown.current) return;
        warningShown.current = true;
        Swal.fire({
            icon: 'warning',
            title: 'Sigues ahí? 👀',
            text: 'Tu sesión se cerrará en 1 minuto por inactividad',
            confirmButtonText: 'Sí, sigo aquí',
            confirmButtonColor: '#c9a227',
            timer: 60000,
            timerProgressBar: true
        }).then((result) => {
            warningShown.current = false;
            if (result.isConfirmed) {
                resetInactivityTimer();
            }
        });
    }, []);

    // Reiniciar el timer de inactividad
    const resetInactivityTimer = useCallback(() => {
        if (!user) return;

        // Limpiar timers anteriores
        if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
        if (warningTimer.current) clearTimeout(warningTimer.current);

        const timeoutMin = user.rol === 'Cliente'
            ? INACTIVITY_TIMEOUT.cliente
            : INACTIVITY_TIMEOUT.staff;

        const warningTime = (timeoutMin - WARNING_BEFORE_LOGOUT) * 60 * 1000;
        const logoutTime = timeoutMin * 60 * 1000;

        // Timer para advertencia
        warningTimer.current = setTimeout(showWarning, warningTime);
        // Timer para logout
        inactivityTimer.current = setTimeout(logoutByInactivity, logoutTime);
    }, [user, showWarning, logoutByInactivity]);

    // Escuchar actividad del usuario
    useEffect(() => {
        if (!user) return;

        const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];

        const handleActivity = () => {
            warningShown.current = false;
            resetInactivityTimer();
        };

        events.forEach(event => window.addEventListener(event, handleActivity, { passive: true }));
        resetInactivityTimer();

        return () => {
            events.forEach(event => window.removeEventListener(event, handleActivity));
            if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
            if (warningTimer.current) clearTimeout(warningTimer.current);
        };
    }, [user, resetInactivityTimer]);

    // Cargar sesión guardada al iniciar
    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        if (token && savedUser) {
            const parsed = JSON.parse(savedUser);
            setUser(parsed);

            if (parsed.rol !== 'Cliente') {
                authService.me()
                    .then(res => {
                        setUser(res.data);
                        localStorage.setItem('user', JSON.stringify(res.data));
                    })
                    .catch(() => {
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        setUser(null);
                    })
                    .finally(() => setLoading(false));
            } else {
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        const res = await authService.login(email, password);
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setUser(res.data.user);
        return res.data;
    };

    const loginCliente = async (telefono, nombre, password) => {
        const res = await clienteAuthService.login(telefono, nombre, password);
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setUser(res.data.user);
        return res.data;
    };

    const logout = () => {
        if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
        if (warningTimer.current) clearTimeout(warningTimer.current);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    const hasRole = (...roles) => {
        return user && roles.includes(user.rol);
    };

    const isAdmin = () => hasRole('Admin');
    const isEncargado = () => hasRole('Admin', 'Encargado');
    const isBarbero = () => hasRole('Barbero');
    const isCliente = () => hasRole('Cliente');

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            loginCliente,
            logout,
            hasRole,
            isAdmin,
            isEncargado,
            isBarbero,
            isCliente
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe usarse dentro de AuthProvider');
    }
    return context;
}
