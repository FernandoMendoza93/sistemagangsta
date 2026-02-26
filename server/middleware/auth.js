import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'barberia-secret-key-2024';

// Middleware para verificar token JWT
export const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token inválido o expirado' });
    }
};

// Middleware para verificar roles específicos
export const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        const userRole = req.user.rol;

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                error: 'No tienes permiso para realizar esta acción',
                requiredRoles: allowedRoles,
                yourRole: userRole
            });
        }

        next();
    };
};

// Roles disponibles
export const ROLES = {
    ADMIN: 'Admin',
    ENCARGADO: 'Encargado',
    BARBERO: 'Barbero',
    CLIENTE: 'Cliente'
};

// Permisos por rol
export const PERMISSIONS = {
    [ROLES.ADMIN]: ['ver_caja', 'gestionar_personal', 'registrar_ventas', 'ver_reportes', 'editar_servicios', 'gestionar_inventario', 'pagar_comisiones', 'gestionar_citas'],
    [ROLES.ENCARGADO]: ['ver_caja', 'registrar_ventas', 'ver_reportes', 'gestionar_inventario', 'gestionar_citas'],
    [ROLES.BARBERO]: ['registrar_ventas_propias', 'ver_comisiones_propias'],
    [ROLES.CLIENTE]: ['ver_perfil_propio', 'crear_cita']
};

// Middleware para verificar permisos específicos
export const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        const userRole = req.user.rol;
        const userPermissions = PERMISSIONS[userRole] || [];

        if (!userPermissions.includes(permission)) {
            return res.status(403).json({
                error: `No tienes el permiso: ${permission}`,
                yourRole: userRole
            });
        }

        next();
    };
};

export { JWT_SECRET };
