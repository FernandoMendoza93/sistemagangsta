import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' }
});

// Interceptor para agregar token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Interceptor para manejar errores
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth
export const authService = {
    login: (email, password) => api.post('/auth/login', { email, password }),
    register: (data) => api.post('/auth/register', data),
    me: () => api.get('/auth/me')
};

// Usuarios
export const usuariosService = {
    getAll: () => api.get('/usuarios'),
    getById: (id) => api.get(`/usuarios/${id}`),
    create: (data) => api.post('/auth/register', data),
    update: (id, data) => api.put(`/usuarios/${id}`, data),
    delete: (id) => api.delete(`/usuarios/${id}`),
    getRoles: () => api.get('/usuarios/roles/all')
};

// Barberos
export const barberosService = {
    getAll: () => api.get('/barberos'),
    getActivos: () => api.get('/barberos/activos'),
    getById: (id) => api.get(`/barberos/${id}`),
    update: (id, data) => api.put(`/barberos/${id}`, data),
    getComisiones: (id, desde, hasta) => api.get(`/barberos/${id}/comisiones`, { params: { desde, hasta } }),
    pagarComisiones: (id, notas) => api.post(`/barberos/${id}/pagar-comisiones`, { notas }),
    getHistorialPagos: (id) => api.get(`/barberos/${id}/historial-pagos`)
};

// Servicios
export const serviciosService = {
    getAll: () => api.get('/servicios'),
    getActivos: () => api.get('/servicios/activos'),
    create: (data) => api.post('/servicios', data),
    update: (id, data) => api.put(`/servicios/${id}`, data),
    delete: (id) => api.delete(`/servicios/${id}`)
};

// Productos
export const productosService = {
    getAll: () => api.get('/productos'),
    getVenta: () => api.get('/productos/venta'),
    getAlertas: () => api.get('/productos/alertas'),
    getCategorias: () => api.get('/productos/categorias'),
    create: (data) => api.post('/productos', data),
    update: (id, data) => api.put(`/productos/${id}`, data),
    registrarMovimiento: (id, data) => api.post(`/productos/${id}/movimiento`, data),
    getMovimientos: (id) => api.get(`/productos/${id}/movimientos`)
};

// Ventas
export const ventasService = {
    getAll: (params) => api.get('/ventas', { params }),
    getById: (id) => api.get(`/ventas/${id}`),
    create: (data) => api.post('/ventas', data),
    getResumenHoy: () => api.get('/ventas/resumen/hoy'),
    confirmar: (id) => api.post(`/ventas/${id}/confirmar`),
    cancelar: (id) => api.post(`/ventas/${id}/cancelar`)
};

// Corte de Caja
export const corteCajaService = {
    getActual: () => api.get('/corte-caja/actual'),
    getDesglose: () => api.get('/corte-caja/desglose'),
    abrir: (monto_inicial, modo_cierre) => api.post('/corte-caja/abrir', { monto_inicial, modo_cierre }),
    cerrar: (monto_real_fisico, notas) => api.post('/corte-caja/cerrar', { monto_real_fisico, notas }),
    getHistorial: (params) => api.get('/corte-caja/historial', { params }),
    registrarGasto: (monto, descripcion) => api.post('/corte-caja/gastos', { monto, descripcion }),
    registrarEntrada: (monto, descripcion) => api.post('/corte-caja/entradas', { monto, descripcion }),
    exportar: () => api.get('/corte-caja/exportar', { responseType: 'blob' })
};

// Reportes
export const reportesService = {
    getVentas: (desde, hasta) => api.get('/reportes/ventas', { params: { desde, hasta } }),
    getComisiones: (desde, hasta) => api.get('/reportes/comisiones', { params: { desde, hasta } }),
    getServicios: (desde, hasta) => api.get('/reportes/servicios', { params: { desde, hasta } }),
    exportarExcel: (desde, hasta) => api.get('/reportes/excel', {
        params: { desde, hasta },
        responseType: 'blob'
    })
};

// Clientes
export const clientesService = {
    getAll: (q) => api.get('/clientes', { params: { q } }),
    getInactivos: () => api.get('/clientes/inactivos'),
    getById: (id) => api.get(`/clientes/${id}`),
    create: (data) => api.post('/clientes', data),
    update: (id, data) => api.put(`/clientes/${id}`, data),
    delete: (id) => api.delete(`/clientes/${id}`)
};

// Auth del Cliente (por teléfono)
export const clienteAuthService = {
    login: (telefono, nombre, password) => api.post('/auth/cliente', { telefono, nombre, password })
};

// Citas
export const citasService = {
    getMisCitas: () => api.get('/citas/mis-citas'),
    getMiPerfil: () => api.get('/citas/perfil'),
    crear: (data) => api.post('/citas', data),
    getAll: (fecha, estado) => api.get('/citas', { params: { fecha, estado } }),
    cambiarEstado: (id, estado) => api.put(`/citas/${id}/estado`, { estado }),
    getServiciosActivos: () => api.get('/servicios/activos'),
    getBarberos: () => api.get('/barberos')
};

// Loyalty (QR)
export const loyaltyService = {
    claim: (token) => api.post('/loyalty/claim', { token })
};

export default api;
