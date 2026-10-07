import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function RestablecerPasswordPage() {
    const { slug } = useParams();
    const isCliente = Boolean(slug);
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    
    const [passwordNueva, setPasswordNueva] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [exito, setExito] = useState(false);

    useEffect(() => {
        if (!token) {
            toast.error('Token inválido o no proporcionado.');
        }
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!token) {
            toast.error('Falta el token de seguridad');
            return;
        }

        if (passwordNueva !== passwordConfirm) {
            toast.error('Las contraseñas no coinciden');
            return;
        }

        if (passwordNueva.length < 8) {
            toast.error('La contraseña debe tener al menos 8 caracteres');
            return;
        }

        setLoading(true);
        try {
            const url = '/api/auth/restablecer-password';
            const payload = {
                token,
                passwordNueva
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                toast.error(data.error || 'Error procesando solicitud');
            } else {
                toast.success(data.message || 'Contraseña restablecida correctamente.');
                setExito(true);
                setTimeout(() => {
                    navigate(isCliente ? `/portal/${slug}/acceso` : '/login');
                }, 3000);
            }
        } catch (error) {
            console.error(error);
            toast.error('Error de red al conectar con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#F0F0F0] font-sans">
                <div className="w-full max-w-md bg-white border-4 border-black p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] rounded-none text-center">
                    <h1 className="text-3xl font-black mb-4 uppercase text-red-600">Enlace Inválido</h1>
                    <p className="font-bold mb-6">No se encontró el token de seguridad.</p>
                    <Link to={isCliente ? `/portal/${slug}/acceso` : '/login'} className="underline text-black font-black">
                        Volver al inicio
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#F0F0F0] font-sans">
            <div className="w-full max-w-md bg-white border-4 border-black p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] rounded-none">
                <h1 className="text-3xl font-black mb-2 uppercase text-black">Nueva Contraseña</h1>
                <p className="text-gray-700 font-bold mb-6 border-b-2 border-black pb-4">
                    Establece tu nueva contraseña segura.
                </p>

                {exito ? (
                    <div className="bg-green-100 border-2 border-green-600 p-4 font-bold text-green-800 mb-6 text-center">
                        ¡Listo! Tu contraseña ha sido cambiada con éxito.
                        <br/><br/>
                        Redirigiendo al login...
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-xl font-black mb-2 uppercase">Nueva Contraseña</label>
                            <input
                                type="password"
                                value={passwordNueva}
                                onChange={(e) => setPasswordNueva(e.target.value)}
                                className="w-full p-4 text-xl border-4 border-black focus:outline-none focus:ring-0 focus:border-[#FF5F40] focus:shadow-[4px_4px_0_0_#FF5F40] transition-all bg-white text-black font-bold placeholder-gray-400"
                                placeholder="Min. 8 caracteres"
                                required
                                minLength={8}
                            />
                        </div>

                        <div>
                            <label className="block text-xl font-black mb-2 uppercase">Confirmar Contraseña</label>
                            <input
                                type="password"
                                value={passwordConfirm}
                                onChange={(e) => setPasswordConfirm(e.target.value)}
                                className="w-full p-4 text-xl border-4 border-black focus:outline-none focus:ring-0 focus:border-[#FF5F40] focus:shadow-[4px_4px_0_0_#FF5F40] transition-all bg-white text-black font-bold placeholder-gray-400"
                                placeholder="Vuelve a escribirla"
                                required
                                minLength={8}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#FF5F40] text-white p-4 text-xl font-black uppercase border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Guardando...' : 'Restablecer Contraseña'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
