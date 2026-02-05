const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ruta a la base de datos (en la raíz del proyecto para facilitar portabilidad)
const dbPath = path.join(__dirname, '../../barbershop.db');

// Crear la base de datos
const db = new Database(dbPath);

// Activar foreign keys
db.pragma('foreign_keys = ON');

// Función para inicializar la base de datos
function initializeDatabase() {
    console.log('🔧 Inicializando base de datos SQLite...');

    // Crear tablas
    db.exec(`
        -- Tabla de Roles
        CREATE TABLE IF NOT EXISTS roles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre_rol TEXT NOT NULL UNIQUE
        );

        -- Tabla de Usuarios
        CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            id_rol INTEGER NOT NULL,
            activo INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (id_rol) REFERENCES roles(id)
        );

        -- Tabla de Barberos
        CREATE TABLE IF NOT EXISTS barberos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_usuario INTEGER NOT NULL,
            turno TEXT,
            FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE
        );

        -- Tabla de Servicios
        CREATE TABLE IF NOT EXISTS servicios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre_servicio TEXT NOT NULL,
            precio REAL NOT NULL,
            duracion_aprox INTEGER,
            activo INTEGER DEFAULT 1
        );

        -- Tabla de Categorías
        CREATE TABLE IF NOT EXISTS categorias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre_categoria TEXT NOT NULL UNIQUE
        );

        -- Tabla de Productos
        CREATE TABLE IF NOT EXISTS productos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre_producto TEXT NOT NULL,
            id_categoria INTEGER,
            precio_venta REAL NOT NULL,
            precio_compra REAL,
            stock_actual INTEGER DEFAULT 0,
            stock_minimo INTEGER DEFAULT 5,
            activo INTEGER DEFAULT 1,
            FOREIGN KEY (id_categoria) REFERENCES categorias(id)
        );

        -- Tabla de Ventas
        CREATE TABLE IF NOT EXISTS ventas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha TEXT DEFAULT CURRENT_TIMESTAMP,
            id_barbero INTEGER,
            metodo_pago TEXT NOT NULL,
            total_venta REAL NOT NULL,
            id_usuario INTEGER,
            FOREIGN KEY (id_barbero) REFERENCES barberos(id),
            FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
        );

        -- Tabla de Detalle de Ventas
        CREATE TABLE IF NOT EXISTS detalle_ventas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_venta INTEGER NOT NULL,
            id_servicio INTEGER,
            id_producto INTEGER,
            cantidad INTEGER NOT NULL,
            precio_unitario REAL NOT NULL,
            subtotal REAL NOT NULL,
            FOREIGN KEY (id_venta) REFERENCES ventas(id) ON DELETE CASCADE,
            FOREIGN KEY (id_servicio) REFERENCES servicios(id),
            FOREIGN KEY (id_producto) REFERENCES productos(id)
        );

        -- Tabla de Cortes de Caja
        CREATE TABLE IF NOT EXISTS cortes_caja (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_encargado INTEGER NOT NULL,
            fecha_apertura TEXT DEFAULT CURRENT_TIMESTAMP,
            fecha_cierre TEXT,
            monto_inicial REAL NOT NULL,
            monto_final REAL,
            estado TEXT DEFAULT 'abierto',
            FOREIGN KEY (id_encargado) REFERENCES usuarios(id)
        );

        -- Tabla de Movimientos de Efectivo
        CREATE TABLE IF NOT EXISTS movimientos_efectivo (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_corte_caja INTEGER NOT NULL,
            tipo TEXT NOT NULL,
            concepto TEXT NOT NULL,
            monto REAL NOT NULL,
            fecha TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (id_corte_caja) REFERENCES cortes_caja(id) ON DELETE CASCADE
        );

        -- Tabla de Movimientos de Stock
        CREATE TABLE IF NOT EXISTS movimientos_stock (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_producto INTEGER NOT NULL,
            tipo_movimiento TEXT NOT NULL,
            cantidad INTEGER NOT NULL,
            motivo TEXT,
            id_usuario INTEGER,
            fecha TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (id_producto) REFERENCES productos(id),
            FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
        );

        -- Tabla de Comisiones
        CREATE TABLE IF NOT EXISTS comisiones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_barbero INTEGER NOT NULL,
            periodo TEXT NOT NULL,
            total_ventas REAL NOT NULL,
            total_comision REAL NOT NULL,
            pagado INTEGER DEFAULT 0,
            fecha_calculo TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (id_barbero) REFERENCES barberos(id)
        );

        -- Índices para mejorar performance
        CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha);
        CREATE INDEX IF NOT EXISTS idx_ventas_barbero ON ventas(id_barbero);
        CREATE INDEX IF NOT EXISTS idx_detalle_ventas_venta ON detalle_ventas(id_venta);
        CREATE INDEX IF NOT EXISTS idx_movimientos_stock_producto ON movimientos_stock(id_producto);
        CREATE INDEX IF NOT EXISTS idx_cortes_caja_encargado ON cortes_caja(id_encargado);
    `);

    console.log('✅ Schema de base de datos creado exitosamente');
}

// Función para verificar si la DB ya tiene datos
function hasData() {
    const result = db.prepare('SELECT COUNT(*) as count FROM usuarios').get();
    return result.count > 0;
}

module.exports = {
    db,
    initializeDatabase,
    hasData
};
