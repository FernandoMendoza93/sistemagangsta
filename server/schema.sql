-- =============================================
-- SISTEMA DE GESTIÓN PARA BARBERÍA
-- Base de Datos SQLite
-- =============================================

-- =============================================
-- TABLAS DE SEGURIDAD (RBAC)
-- =============================================

CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_rol TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    id_rol INTEGER NOT NULL,
    fecha_creacion TEXT DEFAULT (datetime('now', 'localtime')),
    activo INTEGER DEFAULT 1,
    FOREIGN KEY (id_rol) REFERENCES roles(id)
);

-- =============================================
-- TABLAS DE PERSONAL Y COMISIONES
-- =============================================

CREATE TABLE IF NOT EXISTS barberos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario INTEGER NOT NULL UNIQUE,
    porcentaje_comision REAL DEFAULT 0.50,
    estado TEXT DEFAULT 'Activo' CHECK(estado IN ('Activo', 'Inactivo')),
    turno TEXT DEFAULT 'Completo',
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS comisiones_pendientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_barbero INTEGER NOT NULL,
    id_venta_detalle INTEGER NOT NULL,
    monto REAL NOT NULL,
    fecha TEXT DEFAULT (datetime('now', 'localtime')),
    pagado INTEGER DEFAULT 0,
    FOREIGN KEY (id_barbero) REFERENCES barberos(id)
);

CREATE TABLE IF NOT EXISTS comisiones_pagadas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_barbero INTEGER NOT NULL,
    monto REAL NOT NULL,
    fecha_pago TEXT DEFAULT (datetime('now', 'localtime')),
    id_usuario_admin INTEGER NOT NULL,
    notas TEXT,
    FOREIGN KEY (id_barbero) REFERENCES barberos(id),
    FOREIGN KEY (id_usuario_admin) REFERENCES usuarios(id)
);

-- =============================================
-- TABLAS DE SERVICIOS
-- =============================================

CREATE TABLE IF NOT EXISTS servicios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_servicio TEXT NOT NULL,
    precio REAL NOT NULL,
    duracion_aprox INTEGER DEFAULT 30,
    activo INTEGER DEFAULT 1
);

-- =============================================
-- TABLAS DE VENTAS
-- =============================================

CREATE TABLE IF NOT EXISTS ventas_cabecera (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT DEFAULT (datetime('now', 'localtime')),
    id_cliente INTEGER,
    id_barbero INTEGER,
    total_venta REAL NOT NULL,
    metodo_pago TEXT DEFAULT 'Efectivo' CHECK(metodo_pago IN ('Efectivo', 'Tarjeta', 'Transferencia')),
    estado_corte_caja INTEGER DEFAULT 0,
    notas TEXT,
    FOREIGN KEY (id_barbero) REFERENCES barberos(id)
);

CREATE TABLE IF NOT EXISTS ventas_detalle (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_venta_cabecera INTEGER NOT NULL,
    id_servicio INTEGER,
    id_producto INTEGER,
    cantidad INTEGER DEFAULT 1,
    precio_unitario REAL NOT NULL,
    subtotal REAL NOT NULL,
    FOREIGN KEY (id_venta_cabecera) REFERENCES ventas_cabecera(id),
    FOREIGN KEY (id_servicio) REFERENCES servicios(id),
    FOREIGN KEY (id_producto) REFERENCES productos(id)
);

-- =============================================
-- TABLAS DE INVENTARIO
-- =============================================

CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT
);

CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    stock_actual INTEGER DEFAULT 0,
    stock_minimo INTEGER DEFAULT 5,
    precio_costo REAL DEFAULT 0,
    precio_venta REAL NOT NULL,
    id_categoria INTEGER,
    activo INTEGER DEFAULT 1,
    FOREIGN KEY (id_categoria) REFERENCES categorias(id)
);

CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_producto INTEGER NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('Entrada', 'Salida', 'Ajuste')),
    cantidad INTEGER NOT NULL,
    motivo TEXT,
    fecha TEXT DEFAULT (datetime('now', 'localtime')),
    id_usuario INTEGER,
    FOREIGN KEY (id_producto) REFERENCES productos(id),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
);

-- =============================================
-- TABLA DE AUDITORÍA - CORTES DE CAJA
-- =============================================

CREATE TABLE IF NOT EXISTS cortes_caja (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha_apertura TEXT DEFAULT (datetime('now', 'localtime')),
    hora_apertura TEXT,
    fecha_cierre TEXT,
    hora_cierre TEXT,
    monto_inicial REAL DEFAULT 0,
    ingresos_calculados REAL DEFAULT 0,
    monto_real_fisico REAL,
    diferencia REAL,
    id_encargado INTEGER NOT NULL,
    notas TEXT,
    modo_cierre TEXT DEFAULT 'transparente',
    total_ventas REAL DEFAULT 0,
    total_ganancias REAL DEFAULT 0,
    abonos_efectivo REAL DEFAULT 0,
    devoluciones_efectivo REAL DEFAULT 0,
    entradas_efectivo_total REAL DEFAULT 0,
    FOREIGN KEY (id_encargado) REFERENCES usuarios(id)
);

-- Tabla de gastos/salidas de efectivo
CREATE TABLE IF NOT EXISTS gastos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    monto REAL NOT NULL,
    descripcion TEXT NOT NULL,
    fecha TEXT DEFAULT (datetime('now', 'localtime')),
    id_usuario INTEGER NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
);

-- Tabla de entradas de efectivo
CREATE TABLE IF NOT EXISTS entradas_efectivo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    monto REAL NOT NULL,
    descripcion TEXT NOT NULL,
    fecha TEXT DEFAULT (datetime('now', 'localtime')),
    id_usuario INTEGER NOT NULL,
    id_corte INTEGER,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
    FOREIGN KEY (id_corte) REFERENCES cortes_caja(id)
);

-- =============================================
-- DATOS INICIALES
-- =============================================

-- Roles del sistema
INSERT OR IGNORE INTO roles (id, nombre_rol) VALUES (1, 'Admin');
INSERT OR IGNORE INTO roles (id, nombre_rol) VALUES (2, 'Encargado');
INSERT OR IGNORE INTO roles (id, nombre_rol) VALUES (3, 'Barbero');

-- Usuarios (password: admin123 para todos)
INSERT OR IGNORE INTO usuarios (id, nombre, email, password_hash, id_rol, activo)
VALUES (1, 'Administrador', 'admin@barberia.com', '$2a$10$LSqZn7RarDawowdFon0BKOv2klo6Y13HCwU8Wf8INmVFFwSDdaSJi', 1, 1);

INSERT OR IGNORE INTO usuarios (id, nombre, email, password_hash, id_rol, activo)
VALUES (2, 'Fernando Mendoza', 'fernando.mendoza@gmail.com', '$2a$10$1S38OljW9Bof4rKFKCIEjuT6P2Ynu6XwA2pOD9C6F4rGmLqCZzFXO', 3, 1);

INSERT OR IGNORE INTO usuarios (id, nombre, email, password_hash, id_rol, activo)
VALUES (3, 'Eliza Acevedo', 'elizabarber@gmail.com', '$2a$10$nsQc1sIeypGNMkwbv0pzveb2yUYuTYGGbl0.dSsxkt34j8Vu1zX6i', 3, 1);

INSERT OR IGNORE INTO usuarios (id, nombre, email, password_hash, id_rol, activo)
VALUES (4, 'Alejandro Lopez', 'alejandro.lopez@gmail.com', '$2a$10$2iSma5hK.glYPKseoI5bCea6UV31oJCi945zVggXNqEMzmAHe/TvG', 1, 1);

-- Barberos
INSERT OR IGNORE INTO barberos (id, id_usuario, porcentaje_comision, estado, turno)
VALUES (1, 2, 0.50, 'Activo', 'Completo');

INSERT OR IGNORE INTO barberos (id, id_usuario, porcentaje_comision, estado, turno)
VALUES (2, 3, 0.50, 'Activo', 'Completo');

-- Categorías de productos
INSERT OR IGNORE INTO categorias (id, nombre, descripcion) VALUES (1, 'Venta', 'Productos para venta al cliente');
INSERT OR IGNORE INTO categorias (id, nombre, descripcion) VALUES (2, 'Insumo Limpieza', 'Productos de limpieza y desinfección');
INSERT OR IGNORE INTO categorias (id, nombre, descripcion) VALUES (3, 'Herramientas', 'Instrumentos de trabajo');

-- Servicios
INSERT OR IGNORE INTO servicios (id, nombre_servicio, precio, duracion_aprox, activo) VALUES (1, 'Corte', 200.00, 30, 1);
INSERT OR IGNORE INTO servicios (id, nombre_servicio, precio, duracion_aprox, activo) VALUES (2, 'Barba', 200.00, 60, 1);
INSERT OR IGNORE INTO servicios (id, nombre_servicio, precio, duracion_aprox, activo) VALUES (3, 'Corte + Barba', 300.00, 90, 1);
INSERT OR IGNORE INTO servicios (id, nombre_servicio, precio, duracion_aprox, activo) VALUES (4, 'Tinte', 120.00, 60, 1);
INSERT OR IGNORE INTO servicios (id, nombre_servicio, precio, duracion_aprox, activo) VALUES (5, 'Diseño de Cejas', 50.00, 20, 1);
INSERT OR IGNORE INTO servicios (id, nombre_servicio, precio, duracion_aprox, activo) VALUES (6, 'Corte Escolar', 150.00, 30, 1);

-- Productos de venta
INSERT OR IGNORE INTO productos (id, nombre, descripcion, stock_actual, stock_minimo, precio_costo, precio_venta, id_categoria, activo)
VALUES (1, 'Cera para Cabello', 'Cera de fijación fuerte', 12, 5, 40.00, 80.00, 1, 1);

INSERT OR IGNORE INTO productos (id, nombre, descripcion, stock_actual, stock_minimo, precio_costo, precio_venta, id_categoria, activo)
VALUES (2, 'Minoxidil', 'Tratamiento para crecimiento de barba', 8, 3, 80.00, 150.00, 1, 1);

INSERT OR IGNORE INTO productos (id, nombre, descripcion, stock_actual, stock_minimo, precio_costo, precio_venta, id_categoria, activo)
VALUES (3, 'Aceite para Barba', 'Aceite hidratante', 1, 5, 50.00, 100.00, 1, 1);

-- Insumos de limpieza
INSERT OR IGNORE INTO productos (id, nombre, descripcion, stock_actual, stock_minimo, precio_costo, precio_venta, id_categoria, activo)
VALUES (4, 'Alcohol Gel', 'Desinfectante de manos', 10, 3, 25.00, 0, 2, 1);

INSERT OR IGNORE INTO productos (id, nombre, descripcion, stock_actual, stock_minimo, precio_costo, precio_venta, id_categoria, activo)
VALUES (5, 'Toallas Desechables', 'Paquete de 100 toallas', 5, 2, 60.00, 0, 2, 1);

INSERT OR IGNORE INTO productos (id, nombre, descripcion, stock_actual, stock_minimo, precio_costo, precio_venta, id_categoria, activo)
VALUES (6, 'Desinfectante Barbacide', 'Para herramientas', 8, 2, 120.00, 0, 2, 1);

-- =============================================
-- INFORMACIÓN DE ACCESO
-- =============================================
-- Credenciales: admin@barberia.com / admin123
-- Credenciales: alejandro.lopez@gmail.com / admin123
