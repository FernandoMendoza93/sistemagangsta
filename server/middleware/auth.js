import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'barberia-secret-key-2024';

// Middleware para verificar token JWT
export const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;

    if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        // Inject barberia_id for tenant isolation
        req.barberia_id = decoded.barberia_id || null;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token invalido o expirado' });
    }
};

// Middleware para verificar roles especificos
export const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        const userRole = req.user.rol;

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                error: 'No tienes permiso para realizar esta accion',
                requiredRoles: allowedRoles,
                yourRole: userRole
            });
        }

        next();
    };
};

// Middleware: Solo SuperAdmin
export const requireSuperAdmin = (req, res, next) => {
    if (!req.user || req.user.rol !== ROLES.SUPERADMIN) {
        return res.status(403).json({ error: 'Acceso exclusivo SuperAdmin' });
    }
    next();
};

// Middleware: Asegurar que el usuario tiene barberia_id (tenant isolation)
export const requireTenant = (req, res, next) => {
    if (!req.barberia_id) {
        // SuperAdmin puede acceder sin tenant
        if (req.user && req.user.rol === ROLES.SUPERADMIN) {
            return next();
        }
        return res.status(403).json({ error: 'Sin acceso a barberia' });
    }
    next();
};

// Roles disponibles
export const ROLES = {
    SUPERADMIN: 'SuperAdmin',
    ADMIN: 'Admin',
    ENCARGADO: 'Encargado',
    BARBERO: 'Barbero',
    CLIENTE: 'Cliente'
};

// Permisos por rol
export const PERMISSIONS = {
    [ROLES.SUPERADMIN]: ['*'],
    [ROLES.ADMIN]: ['ver_caja', 'gestionar_personal', 'registrar_ventas', 'ver_reportes', 'editar_servicios', 'gestionar_inventario', 'pagar_comisiones', 'gestionar_citas'],
    [ROLES.ENCARGADO]: ['ver_caja', 'registrar_ventas', 'ver_reportes', 'gestionar_inventario', 'gestionar_citas'],
    [ROLES.BARBERO]: ['registrar_ventas_propias', 'ver_comisiones_propias'],
    [ROLES.CLIENTE]: ['ver_perfil_propio', 'crear_cita']
};

// Middleware para verificar permisos especificos
export const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        const userRole = req.user.rol;
        const userPermissions = PERMISSIONS[userRole] || [];

        if (userPermissions.includes('*') || userPermissions.includes(permission)) {
            return next();
        }

        return res.status(403).json({
            error: `No tienes el permiso: ${permission}`,
            yourRole: userRole
        });
    };
};

export { JWT_SECRET };
