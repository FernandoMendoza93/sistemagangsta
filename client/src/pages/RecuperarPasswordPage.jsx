import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export default function RecuperarPasswordPage() {
    const { slug } = useParams();
    const isCliente = Boolean(slug);
    
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [enviado, setEnviado] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!email) {
            toast.error('Por favor ingresa tu correo');
            return;
        }

        setLoading(true);
        try {
            const url = '/api/auth/olvide-password';
            const payload = {
                email,
                tipo: isCliente ? 'cliente' : 'usuario',
                barberia_slug: slug
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
                // Siempre mostrar neutro
                toast.success(data.message || 'Si el correo existe, te enviamos un enlace.');
                setEnviado(true);
            }
        } catch (error) {
            console.error(error);
            toast.error('Error de red al conectar con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#F0F0F0] font-sans">
            <div className="w-full max-w-md bg-white border-4 border-black p-8 shadow-[8px_8px_0_0_rgba(0,0,0,1)] rounded-none">
                <h1 className="text-3xl font-black mb-2 uppercase text-black">Recuperar Contraseña</h1>
                <p className="text-gray-700 font-bold mb-6 border-b-2 border-black pb-4">
                    {isCliente ? 'Portal de Cliente' : 'Panel Administrativo'}
                </p>

                {enviado ? (
                    <div className="bg-green-100 border-2 border-green-600 p-4 font-bold text-green-800 mb-6">
                        Si el correo existe en nuestro sistema, en breve recibirás un enlace para restablecer tu contraseña.
                        <br/><br/>
                        <Link to={isCliente ? `/portal/${slug}/acceso` : '/login'} className="underline text-black font-black">
                            Volver al login
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-xl font-black mb-2 uppercase">Correo Electrónico</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full p-4 text-xl border-4 border-black focus:outline-none focus:ring-0 focus:border-[#FF5F40] focus:shadow-[4px_4px_0_0_#FF5F40] transition-all bg-white text-black font-bold placeholder-gray-400"
                                placeholder="tu@correo.com"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#FF5F40] text-white p-4 text-xl font-black uppercase border-4 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Procesando...' : 'Enviar Enlace'}
                        </button>
                        
                        <div className="text-center mt-6">
                            <Link to={isCliente ? `/portal/${slug}/acceso` : '/login'} className="font-bold underline text-black hover:text-[#FF5F40]">
                                Cancelar y volver al login
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
