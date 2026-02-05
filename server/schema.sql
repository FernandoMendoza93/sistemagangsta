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

-- Categorías de productos
INSERT OR IGNORE INTO categorias (id, nombre, descripcion) VALUES (1, 'Venta', 'Productos para venta al cliente');
INSERT OR IGNORE INTO categorias (id, nombre, descripcion) VALUES (2, 'Insumo Limpieza', 'Productos de limpieza y desinfección');
INSERT OR IGNORE INTO categorias (id, nombre, descripcion) VALUES (3, 'Herramientas', 'Instrumentos de trabajo');

-- Servicios iniciales
INSERT OR IGNORE INTO servicios (id, nombre_servicio, precio, duracion_aprox) VALUES (1, 'Corte Clásico', 100.00, 30);
INSERT OR IGNORE INTO servicios (id, nombre_servicio, precio, duracion_aprox) VALUES (2, 'Barba', 50.00, 20);
INSERT OR IGNORE INTO servicios (id, nombre_servicio, precio, duracion_aprox) VALUES (3, 'Corte + Barba', 140.00, 45);
INSERT OR IGNORE INTO servicios (id, nombre_servicio, precio, duracion_aprox) VALUES (4, 'Tinte', 200.00, 60);
INSERT OR IGNORE INTO servicios (id, nombre_servicio, precio, duracion_aprox) VALUES (5, 'Diseño de Cejas', 30.00, 10);

-- Productos de venta
INSERT OR IGNORE INTO productos (id, nombre, descripcion, stock_actual, stock_minimo, precio_costo, precio_venta, id_categoria) 
VALUES (1, 'Cera para Cabello', 'Cera de fijación fuerte', 20, 5, 40.00, 80.00, 1);
INSERT OR IGNORE INTO productos (id, nombre, descripcion, stock_actual, stock_minimo, precio_costo, precio_venta, id_categoria) 
VALUES (2, 'Minoxidil', 'Tratamiento para crecimiento de barba', 10, 3, 80.00, 150.00, 1);
INSERT OR IGNORE INTO productos (id, nombre, descripcion, stock_actual, stock_minimo, precio_costo, precio_venta, id_categoria) 
VALUES (3, 'Aceite para Barba', 'Aceite hidratante', 15, 5, 50.00, 100.00, 1);

-- Insumos de limpieza
INSERT OR IGNORE INTO productos (id, nombre, descripcion, stock_actual, stock_minimo, precio_costo, precio_venta, id_categoria) 
VALUES (4, 'Alcohol Gel', 'Desinfectante de manos', 10, 3, 25.00, 0, 2);
INSERT OR IGNORE INTO productos (id, nombre, descripcion, stock_actual, stock_minimo, precio_costo, precio_venta, id_categoria) 
VALUES (5, 'Toallas Desechables', 'Paquete de 100 toallas', 5, 2, 60.00, 0, 2);
INSERT OR IGNORE INTO productos (id, nombre, descripcion, stock_actual, stock_minimo, precio_costo, precio_venta, id_categoria) 
VALUES (6, 'Desinfectante Barbacide', 'Para herramientas', 8, 2, 120.00, 0, 2);

-- Usuario Admin (password: admin123)
-- Hash generado con bcryptjs
INSERT OR IGNORE INTO usuarios (id, nombre, email, password_hash, id_rol) 
VALUES (1, 'Administrador', 'admin@barberia.com', '$2a$10$LSqZn7RarDawowdFon0BKOv2klo6Y13HCwU8Wf8INmVFFwSDdaSJi', 1);
