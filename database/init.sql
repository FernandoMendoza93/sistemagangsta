-- ============================================
-- SCHEMA DE BASE DE DATOS - SISTEMA DE BARBERÍA
-- ============================================

-- Crear base de datos si no existe
CREATE DATABASE IF NOT EXISTS barberia CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE barberia;

-- ============================================
-- TABLAS
-- ============================================

-- Tabla de Roles
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    id_rol INT NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_rol) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de Barberos
CREATE TABLE IF NOT EXISTS barberos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    turno VARCHAR(50),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de Servicios
CREATE TABLE IF NOT EXISTS servicios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_servicio VARCHAR(100) NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    duracion_aprox INT,
    activo BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de Categorías
CREATE TABLE IF NOT EXISTS categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_categoria VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de Productos
CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_producto VARCHAR(100) NOT NULL,
    id_categoria INT,
    precio_venta DECIMAL(10,2) NOT NULL,
    precio_compra DECIMAL(10,2),
    stock_actual INT DEFAULT 0,
    stock_minimo INT DEFAULT 5,
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_categoria) REFERENCES categorias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de Ventas
CREATE TABLE IF NOT EXISTS ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_barbero INT,
    metodo_pago VARCHAR(50) NOT NULL,
    total_venta DECIMAL(10,2) NOT NULL,
    id_usuario INT,
    FOREIGN KEY (id_barbero) REFERENCES barberos(id),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de Detalle de Ventas
CREATE TABLE IF NOT EXISTS detalle_ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_venta INT NOT NULL,
    id_servicio INT,
    id_producto INT,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (id_venta) REFERENCES ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (id_servicio) REFERENCES servicios(id),
    FOREIGN KEY (id_producto) REFERENCES productos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de Cortes de Caja
CREATE TABLE IF NOT EXISTS cortes_caja (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_encargado INT NOT NULL,
    fecha_apertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_cierre TIMESTAMP NULL,
    monto_inicial DECIMAL(10,2) NOT NULL,
    monto_final DECIMAL(10,2),
    estado VARCHAR(20) DEFAULT 'abierto',
    FOREIGN KEY (id_encargado) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de Movimientos de Efectivo
CREATE TABLE IF NOT EXISTS movimientos_efectivo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_corte_caja INT NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    concepto VARCHAR(255) NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_corte_caja) REFERENCES cortes_caja(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de Movimientos de Stock
CREATE TABLE IF NOT EXISTS movimientos_stock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_producto INT NOT NULL,
    tipo_movimiento VARCHAR(20) NOT NULL,
    cantidad INT NOT NULL,
    motivo VARCHAR(255),
    id_usuario INT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_producto) REFERENCES productos(id),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de Comisiones
CREATE TABLE IF NOT EXISTS comisiones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_barbero INT NOT NULL,
    periodo VARCHAR(50) NOT NULL,
    total_ventas DECIMAL(10,2) NOT NULL,
    total_comision DECIMAL(10,2) NOT NULL,
    pagado BOOLEAN DEFAULT FALSE,
    fecha_calculo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_barbero) REFERENCES barberos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- ÍNDICES
-- ============================================

CREATE INDEX idx_ventas_fecha ON ventas(fecha);
CREATE INDEX idx_ventas_barbero ON ventas(id_barbero);
CREATE INDEX idx_detalle_ventas_venta ON detalle_ventas(id_venta);
CREATE INDEX idx_movimientos_stock_producto ON movimientos_stock(id_producto);
CREATE INDEX idx_cortes_caja_encargado ON cortes_caja(id_encargado);

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Roles
INSERT INTO roles (nombre_rol) VALUES 
('Admin'),
('Encargado'),
('Barbero');

-- Usuarios (Password: admin123 - hash bcrypt)
INSERT INTO usuarios (nombre, email, password, id_rol, activo) VALUES 
('Administrador', 'admin@barberia.com', '$2a$10$kFtAPSsJe5Y14MZh5qHEmObm0Dfd0Efm76Dx2XDNnmtJg9VHF11hC', 1, TRUE),
('Carlos García', 'carlos@barberia.com', '$2a$10$kFtAPSsJe5Y14MZh5qHEmObm0Dfd0Efm76Dx2XDNnmtJg9VHF11hC', 2, TRUE),
('Juan Pérez', 'juan@barberia.com', '$2a$10$kFtAPSsJe5Y14MZh5qHEmObm0Dfd0Efm76Dx2XDNnmtJg9VHF11hC', 3, TRUE),
('Miguel Torres', 'miguel@barberia.com', '$2a$10$kFtAPSsJe5Y14MZh5qHEmObm0Dfd0Efm76Dx2XDNnmtJg9VHF11hC', 3, TRUE);

-- Barberos
INSERT INTO barberos (id_usuario, turno) VALUES 
(3, 'Mañana'),
(4, 'Tarde');

-- Servicios
INSERT INTO servicios (nombre_servicio, precio, duracion_aprox, activo) VALUES 
('Corte Clásico', 150.00, 30, TRUE),
('Corte + Barba', 250.00, 45, TRUE),
('Degradado Moderno', 200.00, 40, TRUE),
('Rasura Tradicional', 100.00, 25, TRUE),
('Diseño de Barba', 180.00, 35, TRUE),
('Tinte de Cabello', 300.00, 60, TRUE);

-- Categorías
INSERT INTO categorias (nombre_categoria) VALUES 
('Cuidado del Cabello'),
('Cuidado de la Barba'),
('Estilizado'),
('Accesorios');

-- Productos
INSERT INTO productos (nombre_producto, id_categoria, precio_venta, precio_compra, stock_actual, stock_minimo, activo) VALUES 
('Shampoo Premium', 1, 120.00, 60.00, 25, 10, TRUE),
('Cera para Cabello', 3, 90.00, 45.00, 30, 8, TRUE),
('Aceite de Barba', 2, 150.00, 75.00, 15, 5, TRUE),
('Navaja Profesional', 4, 450.00, 220.00, 8, 3, TRUE),
('Gel Extra Fuerte', 3, 85.00, 40.00, 35, 10, TRUE),
('Bálsamo para Barba', 2, 130.00, 65.00, 20, 5, TRUE),
('Pomada Mate', 3, 95.00, 48.00, 3, 8, TRUE),
('Espuma de Afeitar', 2, 70.00, 35.00, 40, 12, TRUE);

-- Corte de caja inicial
INSERT INTO cortes_caja (id_encargado, monto_inicial, estado) VALUES 
(2, 500.00, 'abierto');

-- ============================================
-- INFORMACIÓN
-- ============================================

SELECT 'Base de datos inicializada correctamente' AS status;
SELECT 'Credenciales: admin@barberia.com / admin123' AS credentials;
