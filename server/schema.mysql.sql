-- =============================================
-- FLOW — BARBER MANAGEMENT SYSTEM (SaaS)
-- Schema MySQL — Multi-Tenant
-- Reconstrucción completa con datos del JSON
-- =============================================

CREATE DATABASE IF NOT EXISTS barberia CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE barberia;

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- =============================================
-- 1. TABLA DE TEMAS (Paletas de colores)
-- =============================================
CREATE TABLE IF NOT EXISTS temas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    bg_main VARCHAR(20) NOT NULL,
    bg_surface VARCHAR(20) NOT NULL,
    accent_primary VARCHAR(20) NOT NULL,
    accent_secondary VARCHAR(20),
    text_main VARCHAR(20) NOT NULL,
    text_muted VARCHAR(20),
    clase_glass VARCHAR(100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO temas (nombre, bg_main, bg_surface, accent_primary, accent_secondary, text_main, text_muted, clase_glass) VALUES
('Obsidian Night', '#0a0a0f', '#12121a', '#6366F1', '#818CF8', '#f1f1f4', '#71717a', 'glass-dark'),
('Midnight Blue',  '#0b0f1a', '#111827', '#3B82F6', '#60A5FA', '#f0f4ff', '#6b7280', 'glass-dark'),
('Emerald Dark',   '#0a0f0d', '#0f1a16', '#10B981', '#34D399', '#ecfdf5', '#6b7280', 'glass-dark'),
('Rose Gold',      '#1a0a10', '#1f1018', '#F43F5E', '#FB7185', '#fff1f2', '#71717a', 'glass-dark'),
('Amber Flame',    '#1a1008', '#1f1610', '#F59E0B', '#FBBF24', '#fffbeb', '#71717a', 'glass-dark'),
('Purple Reign',   '#10081a', '#170f22', '#A855F7', '#C084FC', '#faf5ff', '#71717a', 'glass-dark'),
('Cyan Steel',     '#081014', '#0e171f', '#06B6D4', '#22D3EE', '#ecfeff', '#6b7280', 'glass-dark'),
('Classic Light',  '#f8f9fa', '#ffffff', '#6366F1', '#818CF8', '#111827', '#6b7280', 'glass-light'),
('Warm Light',     '#faf8f5', '#ffffff', '#EA580C', '#F97316', '#1c1917', '#78716c', 'glass-light'),
('Menta Limpia',   '#F0F9F6', '#FFFFFF', '#10B981', '#34D399', '#064E3B', '#6EE7B7', 'glass-light'),
('Oro Industrial', '#1A1A1A', '#2D2D2D', '#D4AF37', '#F1C40F', '#FFFFFF', '#A0A0A0', 'glass-dark'),
('Noche Urbana',   '#0F172A', '#1E293B', '#6366F1', '#818CF8', '#F8FAFC', '#94A3B8', 'glass-dark'),
('Cuero Natural',  '#FAFAF9', '#FFFFFF', '#9A3412', '#C2410C', '#1C1917', '#A8A29E', 'glass-light'),
('Classic Barber', '#FAFAF9', '#FFFFFF', '#DC2626', '#EF4444', '#1C1917', '#78716C', 'glass-light'),
('Flow Estándar', '#FAF9F6', '#FFFFFF', '#FF5F40', '#FF7F50', '#111827', '#9CA3AF', 'glass-light');

-- =============================================
-- 2. TABLA MAESTRA: BARBERÍAS (Tenants)
-- =============================================
CREATE TABLE IF NOT EXISTS barberias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    logo_url VARCHAR(500),
    color_acento VARCHAR(20) DEFAULT '#FF6B4A',
    telefono_whatsapp VARCHAR(20),
    email_contacto VARCHAR(255),
    direccion VARCHAR(500),
    plan ENUM('mensual', 'anual', 'trial') DEFAULT 'mensual',
    precio_plan DECIMAL(10,2) DEFAULT 299,
    fecha_suscripcion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento DATETIME,
    activo TINYINT(1) DEFAULT 1,
    theme TEXT DEFAULT NULL,
    loyalty_card_image_url VARCHAR(500),
    tema_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tema_id) REFERENCES temas(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO barberias (id, nombre, slug, logo_url, color_acento, telefono_whatsapp, email_contacto, direccion, plan, precio_plan, fecha_suscripcion, fecha_vencimiento, activo, created_at) VALUES 
(1, 'The Gangsta Barber Shop', 'the-gangsta', NULL, '#FF6B4A', '529511955349', 'admin@barberia.com', NULL, 'anual', 0.00, '2026-03-07 08:04:52', '2027-03-07 08:04:52', 1, '2026-03-07 08:04:52');

-- =============================================
-- 3. TABLAS DE SEGURIDAD (RBAC)
-- =============================================
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO roles (id, nombre_rol) VALUES 
(1, 'Admin'), 
(2, 'Encargado'), 
(3, 'Barbero'), 
(4, 'SuperAdmin');

CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    id_rol INT NOT NULL,
    barberia_id INT,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    activo TINYINT(1) DEFAULT 1,
    FOREIGN KEY (id_rol) REFERENCES roles(id),
    FOREIGN KEY (barberia_id) REFERENCES barberias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO usuarios (id, nombre, email, password_hash, id_rol, fecha_creacion, activo, barberia_id) VALUES 
(1, 'Administrador', 'admin@barberia.com', '$2a$10$aYkcv3AEpHxMuqiIN9PbCuMgEfpI0.bx0IFFiQgrltaGeicKFg05O', 1, '2026-02-05 04:02:57', 1, 1),
(2, 'Fernando Mendoza|', 'angfer2001@gmail.com', '$2a$10$Hy0dDhDJm2lsFkFTTGayieQ7vjnJFEJNFPSHN85opFXu/S6yqJ0Pe', 3, '2026-02-05 14:29:50', 1, 1),
(3, 'Eliza Acevedo', 'elizabarber@gmail.com', '$2a$10$nsQc1sIeypGNMkwbv0pzveb2yUYuTYGGbl0.dSsxkt34j8Vu1zX6i', 3, '2026-02-05 15:03:16', 1, 1),
(4, 'Alejandro Lopez ', 'alejandro.lopez@gmail.com', '$2a$10$2iSma5hK.glYPKseoI5bCea6UV31oJCi945zVggXNqEMzmAHe/TvG', 1, '2026-02-18 15:49:29', 1, 1),
(5, 'Fernando Mendoza', 'superadmin@flow.com', '$2a$10$LSqZn7RarDawowdFon0BKOv2klo6Y13HCwU8Wf8INmVFFwSDdaSJi', 4, '2026-03-07 08:04:52', 1, NULL);

-- =============================================
-- 4. TABLAS DE PERSONAL Y COMISIONES
-- =============================================
CREATE TABLE IF NOT EXISTS barberos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL UNIQUE,
    porcentaje_comision DECIMAL(5,2) DEFAULT 0.50,
    estado ENUM('Activo', 'Inactivo') DEFAULT 'Activo',
    turno VARCHAR(50) DEFAULT 'Completo',
    barberia_id INT,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
    FOREIGN KEY (barberia_id) REFERENCES barberias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO barberos (id, id_usuario, porcentaje_comision, estado, turno, barberia_id) VALUES 
(1, 2, 0.50, 'Activo', 'Completo', 1),
(2, 3, 0.50, 'Activo', 'Completo', 1);

CREATE TABLE IF NOT EXISTS comisiones_pendientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_barbero INT NOT NULL,
    id_venta_detalle INT NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    pagado TINYINT(1) DEFAULT 0,
    barberia_id INT,
    FOREIGN KEY (id_barbero) REFERENCES barberos(id),
    FOREIGN KEY (barberia_id) REFERENCES barberias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO comisiones_pendientes (id, id_barbero, id_venta_detalle, monto, fecha, pagado, barberia_id) VALUES 
(1, 1, 1, 100.00, '2026-02-05 15:05:54', 1, 1),
(2, 1, 2, 150.00, '2026-02-05 15:05:54', 1, 1),
(3, 2, 10, 100.00, '2026-02-05 23:06:42', 1, 1),
(5, 1, 13, 100.00, '2026-02-26 07:00:21', 0, 1),
(6, 1, 14, 100.00, '2026-02-26 07:04:58', 0, 1),
(7, 1, 15, 100.00, '2026-02-26 08:02:21', 0, 1),
(8, 1, 16, 100.00, '2026-02-26 08:59:39', 0, 1),
(9, 1, 17, 100.00, '2026-02-27 22:18:21', 0, 1),
(10, 1, 18, 150.00, '2026-02-28 00:38:47', 0, 1),
(11, 1, 19, 150.00, '2026-02-28 00:45:42', 0, 1),
(12, 1, 20, 100.00, '2026-02-28 18:50:05', 0, 1),
(14, 2, 23, 150.00, '2026-03-13 22:21:51', 0, 1),
(15, 1, 24, 150.00, '2026-03-13 22:23:19', 0, 1);

CREATE TABLE IF NOT EXISTS comisiones_pagadas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_barbero INT NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_usuario_admin INT NOT NULL,
    notas TEXT,
    barberia_id INT,
    FOREIGN KEY (id_barbero) REFERENCES barberos(id),
    FOREIGN KEY (id_usuario_admin) REFERENCES usuarios(id),
    FOREIGN KEY (barberia_id) REFERENCES barberias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO comisiones_pagadas (id, id_barbero, monto, fecha_pago, id_usuario_admin, notas, barberia_id) VALUES 
(1, 2, 100.00, '2026-02-18 15:49:58', 1, 'Pago de comisiones', 1),
(2, 1, 250.00, '2026-02-18 15:50:06', 1, 'Pago de comisiones', 1);

-- =============================================
-- 5. TABLAS DE SERVICIOS
-- =============================================
CREATE TABLE IF NOT EXISTS servicios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_servicio VARCHAR(255) NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    duracion_aprox INT DEFAULT 30,
    activo TINYINT(1) DEFAULT 1,
    barberia_id INT,
    FOREIGN KEY (barberia_id) REFERENCES barberias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO servicios (id, nombre_servicio, precio, duracion_aprox, activo, barberia_id) VALUES 
(1, 'Corte ', 200.00, 40, 1, 1),
(2, 'Barba', 200.00, 40, 1, 1),
(3, 'Corte + Barba', 300.00, 80, 1, 1),
(4, 'Tinte', 120.00, 60, 1, 1),
(5, 'Diseño de Cejas', 50.00, 20, 1, 1),
(6, 'Corte Escolar', 150.00, 30, 1, 1);

-- =============================================
-- 6. TABLAS DE CLIENTES
-- =============================================
CREATE TABLE IF NOT EXISTS clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    password_hash VARCHAR(255),
    puntos_lealtad INT DEFAULT 0,
    ultima_visita DATETIME,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    notas TEXT,
    activo TINYINT(1) DEFAULT 1,
    barberia_id INT,
    FOREIGN KEY (barberia_id) REFERENCES barberias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO clientes (id, nombre, telefono, password_hash, puntos_lealtad, ultima_visita, fecha_registro, notas, activo, barberia_id) VALUES 
(1, 'Pedro Fernando', '9511289141', '$2a$10$YmcomKbDJ9MupX0BYbAWb.ev2LIgg2GmoxkJUuVcYpxMvOj5ZUR5S', 3, '2026-03-07 02:41:00', '2026-02-26 06:00:01', NULL, 1, 1),
(2, 'Mel', '9531730113', '$2a$10$ggQ9E/gFp08WenvN6vUev.pFa7ezk5TVmZagiSEpBxNfgBVi2GpAC', 0, NULL, '2026-02-26 06:08:03', NULL, 1, 1),
(3, 'Luis carlos', '9513464013', '$2a$10$u0o9owRLPPJYdFAfBIJMzuVhT1zmFXaJfDSTOGGkLkckxfT5ykuPC', 0, NULL, '2026-02-26 06:08:44', NULL, 1, 1),
(4, 'Axel Cisneros', '9511861042', '$2a$10$aZuX6eVwpBm5S6foJPp1keRydCJdBOvvpV2rfTEdxvRaPKwr5QjX6', 0, NULL, '2026-02-26 06:13:22', NULL, 1, 1),
(5, 'ERICK', '9514151179', '$2a$10$xVxm/7bA8CGCnwufBfrhZuBkA9vL3567EKqQl3JIyHG48c7Qfciam', 0, NULL, '2026-02-26 06:14:39', NULL, 1, 1),
(6, 'Carolina del Olmo', '5591634203', '$2a$10$fWJTJx.3eUEMhmiMR.SrgOPHlvnFuH7tbeRRFdO2j96WEo.n3/.na', 0, NULL, '2026-02-26 08:12:28', NULL, 1, 1),
(7, 'Juan Lopez', '9545045419', '$2a$10$DEyYLUPwHiL7Awav5UV6keN.Cf5NPQ1QqXt/2Q1lzEAl0XhtMiCda', 0, NULL, '2026-02-26 12:25:37', NULL, 1, 1),
(8, 'Javier Mendez', '9512240091', '$2a$10$0lCR11xwZD5tDD0.5YxdP.CPrjQTk8rgfFYs8mmYliAb2OA/rDwXW', 0, NULL, '2026-02-26 12:55:28', NULL, 1, 1),
(9, 'Jhonatan bolaños', '9512982355', '$2a$10$iUAbYOqV7GyvxuZo2VEGj.Uklw.r.pLnJPgIq8VRQl58w6EyjkXv2', 0, NULL, '2026-02-26 14:41:13', NULL, 1, 1),
(10, 'Jose Minguer', '9511204760', '$2a$10$Tw811R0mU0GHScdeMZjWye8ptOjfLyyq/If6yJG6/J0yvF9sz2oiq', 0, NULL, '2026-02-26 15:11:08', NULL, 1, 1),
(11, 'Silver Perez', '9513081091', '$2a$10$nw920N2j82Bf9zADYa1yv.jG02xwR5jvi8XY8LM89lOhBw4MxaYR6', 0, NULL, '2026-02-26 15:56:26', NULL, 1, 1),
(12, 'Joshue cervantes', '5559661502', '$2a$10$O/G0gQvGMQSPfgA7m1hvgOrTtGOC.y2jqLSaPtdUTz/CFQA7n2uxG', 0, NULL, '2026-02-26 17:29:06', NULL, 1, 1),
(13, 'Irasema', '9515476599', '$2a$10$/gmYXcPOo9XWu00Vlesw.OkF.nWUPj282ealuvAys/aJDSTcCkbkm', 0, NULL, '2026-02-26 21:10:50', NULL, 1, 1),
(14, 'Josué Sosa', '9513160797', '$2a$10$zsedtJJLkqatwmk9S8je7.VT3L.FJd.i6tiVr09d5ChfkLfBTpCMu', 0, NULL, '2026-02-27 00:38:39', NULL, 1, 1),
(15, 'Javier Altamirano', '9512134959', '$2a$10$YtLUrzDfXQKaN6nEQnNTQOcVQVrOl4xxCiAllZn493cPwvEzjdJqi', 0, NULL, '2026-02-27 02:14:10', NULL, 1, 1),
(16, 'Francisco Alonso', '9513566444', '$2a$10$IZVKY7w6JHqj0TYOKQIw4edSOqZuvJRWalFOV7ZcGoVihb0vzorHa', 0, NULL, '2026-02-27 04:51:03', NULL, 1, 1),
(17, 'Levi', '9516151310', '$2a$10$zicULFwjklFtfEjlHdsmZ.zGTFN7J7VNbaUxUupkcIUEn5NiWsh8W', 0, NULL, '2026-02-27 15:57:54', NULL, 1, 1),
(18, 'Jose manuel', '9511020603', '$2a$10$ugPkFal3h5UnP8K.TVaTPub4xJm/3pUMb.bJdI20c9HmxX.f.qica', 0, NULL, '2026-02-27 20:56:36', NULL, 1, 1),
(19, 'Oscar Arriola', '9512083752', '$2a$10$7h0w4wpEB2ndkYA/iyoyv.dMVBMBzgb8nyMY8WoL201NbKEKR9vuS', 0, NULL, '2026-02-27 21:27:27', NULL, 1, 1),
(20, 'Zaira jarquin', '2871440189', '$2a$10$xUnO0aBQpPvJ39nIt.V8t.0FpK64g6hXdbPYUw3SPqBvWwC1eN/BK', 0, NULL, '2026-02-27 21:48:05', NULL, 1, 1),
(21, 'Carlos Vargas', '9512567841', '$2a$10$pn/63syVhTUvTc6F8LQYluvuJ3ptGzETjuDQ/dMdBwgRPZ5hs73ue', 1, '2026-02-28 18:50:24', '2026-02-28 12:58:22', NULL, 1, 1),
(22, 'Angel de jesus', '9511899405', '$2a$10$GPJCRPztOELmqtnlUUZfZOqd7NnxPS1iCJb37yKVTh2SaMJeu/v2u', 0, NULL, '2026-03-01 18:10:27', NULL, 1, 1),
(23, 'Adelfo García', '9511121082', '$2a$10$Rh1qR8A5FeCDIntNaqCdyOvZpoCqfLeYY4.eenCXV2aoGo7tsvOAy', 0, NULL, '2026-03-04 21:22:07', NULL, 1, 1),
(24, 'Oscar', '9941085715', '$2a$10$6uDzZtRSpBBuc9KdMI70m.imT1SeijbE.HOBZ.heKHcU4WPC0mpWq', 0, NULL, '2026-03-06 21:31:37', NULL, 1, 1),
(25, 'Rodrigo', '9517541001', '$2a$10$UmDFpzZbxEhLBgSZe0aHf.cuJS4AjUqOWJOhrqUTTCRqq2KWX9Uce', 0, NULL, '2026-03-06 21:35:03', NULL, 1, 1),
(26, 'Alberto santiago S', '9514582643', '$2a$10$PFcekiqZHzMJO9cw.qPVQegfPY9ACuZWp656SLo4DLzltevlGa9q.', 0, '2026-03-07 14:17:29', '2026-03-06 22:44:14', NULL, 1, 1),
(27, 'Jose luis rodriguez', '9512449352', '$2a$10$F9Ulfk0I6AJGWRwGGthw5O0D.fONMzq46dJriY88tdFbQcn0dYgeG', 0, NULL, '2026-03-07 00:05:35', NULL, 1, 1),
(28, 'Raul solis', '9513149081', '$2a$10$xELL4cIKMkH5Ih.b3Mh.JO5/IUcnt7txi95q7OFGuhwKcBOotXBfO', 0, NULL, '2026-03-07 15:02:28', NULL, 1, 1),
(29, 'Alejandro lopez', '9511299866', '$2a$10$cGYy5UbhXUORBetoe78sA.PQcl5WXEY795yM9dLBxEZF22Zhkx1tK', 0, '2026-03-13 16:11:02', '2026-03-13 22:10:52', NULL, 1, 1),
(30, 'Alejandro lopez', '9511299866', NULL, 0, NULL, '2026-03-13 22:23:40', NULL, 1, 1),
(31, 'Jesus Rendon', '9514116359', '$2a$10$3bgm5w.1c8kl5ZM1BsBp7.obpe8ute8LvT1TLie1oSvkhAxJfeicW', 0, NULL, '2026-03-14 22:35:14', NULL, 1, 1),
(32, 'Rafael Vargas', '9513337889', '$2a$10$MwaEd7tihvUtPAvLJI9w7.dlf5DQrFlzWMJiwMWkSDqOuKDbS/jMy', 0, NULL, '2026-03-16 19:30:47', NULL, 1, 1);

-- =============================================
-- 7. TABLAS DE CITAS
-- =============================================
CREATE TABLE IF NOT EXISTS citas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    id_servicio INT,
    id_barbero INT,
    fecha VARCHAR(10) NOT NULL,
    hora VARCHAR(5) NOT NULL,
    estado ENUM('Pendiente', 'Confirmada', 'Cancelada', 'Completada') DEFAULT 'Pendiente',
    notas TEXT,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    barberia_id INT,
    FOREIGN KEY (id_cliente) REFERENCES clientes(id),
    FOREIGN KEY (id_servicio) REFERENCES servicios(id),
    FOREIGN KEY (id_barbero) REFERENCES barberos(id),
    FOREIGN KEY (barberia_id) REFERENCES barberias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO citas (id, id_cliente, id_servicio, id_barbero, fecha, hora, estado, notas, fecha_creacion, barberia_id) VALUES 
(1, 2, 5, NULL, '2026-02-28', '15:00', 'Cancelada', 'No me dejes sin ceja porfa 🤨🤭🤣', '2026-02-26 06:10:07', 1),
(2, 4, 1, NULL, '2026-02-28', '18:00', 'Cancelada', 'Depilado de cejas', '2026-02-26 06:14:27', 1),
(3, 1, NULL, NULL, '2026-02-27', '10:00', 'Cancelada', NULL, '2026-02-26 06:52:01', 1),
(4, 1, 1, NULL, '2026-02-27', '09:00', 'Cancelada', NULL, '2026-02-26 07:02:56', 1),
(5, 1, NULL, 1, '2026-02-27', '10:00', 'Cancelada', NULL, '2026-02-26 07:41:31', 1),
(6, 1, 1, 1, '2026-02-27', '11:00', 'Cancelada', 'Taper fade ', '2026-02-26 07:45:18', 1),
(7, 1, 6, 1, '2026-02-27', '17:00', 'Cancelada', NULL, '2026-02-26 08:53:32', 1),
(8, 1, 3, 1, '2026-02-27', '17:45', 'Cancelada', NULL, '2026-02-26 08:54:19', 1),
(9, 1, 5, 1, '2026-02-27', '19:30', 'Cancelada', NULL, '2026-02-26 08:55:35', 1),
(10, 17, 2, 1, '2026-02-27', '17:00', 'Completada', NULL, '2026-02-27 15:59:11', 1),
(11, 21, 1, 1, '2026-02-28', '12:00', 'Completada', NULL, '2026-02-28 12:59:17', 1),
(12, 18, 1, 1, '2026-03-01', '12:30', 'Completada', NULL, '2026-03-01 17:23:56', 1),
(13, 22, 1, 1, '2026-03-06', '17:00', 'Completada', NULL, '2026-03-02 01:59:00', 1),
(14, 1, 1, 1, '2026-03-06', '18:00', 'Cancelada', NULL, '2026-03-03 00:05:13', 1),
(15, 1, 1, 1, '2026-03-03', '10:00', 'Pendiente', NULL, '2026-03-03 00:21:11', 1),
(16, 1, 5, 1, '2026-03-06', '19:00', 'Cancelada', NULL, '2026-03-03 01:52:57', 1),
(17, 23, 6, 1, '2026-03-06', '19:35', 'Cancelada', NULL, '2026-03-04 21:23:04', 1),
(18, 3, 1, 1, '2026-03-07', '12:15', 'Completada', 'Quiero un modern mullet', '2026-03-06 18:52:07', 1),
(19, 27, 1, 1, '2026-03-06', '18:40', 'Completada', NULL, '2026-03-07 00:07:50', 1),
(20, 26, 1, 1, '2026-03-07', '13:10', 'Completada', NULL, '2026-03-07 03:15:02', 1),
(21, 28, 1, 1, '2026-03-07', '10:45', 'Completada', NULL, '2026-03-07 15:05:47', 1),
(22, 1, 1, 1, '2026-03-15', '16:30', 'Cancelada', NULL, '2026-03-13 03:31:41', 1),
(23, 4, 1, 1, '2026-03-14', '18:15', 'Completada', 'Somos 2 ', '2026-03-14 21:46:11', 1),
(24, 31, 3, 1, '2026-03-14', '19:10', 'Completada', 'Desvanecido ', '2026-03-14 22:36:39', 1),
(25, 32, 1, 1, '2026-03-20', '18:30', 'Confirmada', NULL, '2026-03-16 19:34:22', 1),
(26, 29, 1, 1, '2026-03-20', '15:30', 'Cancelada', 'Fade', '2026-03-16 21:34:40', 1),
(27, 19, 1, 1, '2026-03-20', '14:00', 'Cancelada', NULL, '2026-03-20 15:47:53', 1),
(28, 21, 1, 1, '2026-03-21', '10:00', 'Pendiente', NULL, '2026-03-21 14:34:41', 1),
(29, 1, 1, 1, '2026-03-21', '12:25', 'Pendiente', 'Señor y hermano', '2026-03-21 15:28:35', 1);

-- =============================================
-- 8. TABLAS DE INVENTARIO
-- =============================================
CREATE TABLE IF NOT EXISTS categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    barberia_id INT,
    UNIQUE KEY uq_categoria_barberia (nombre, barberia_id),
    FOREIGN KEY (barberia_id) REFERENCES barberias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO categorias (id, nombre, descripcion, barberia_id) VALUES 
(1, 'Venta', 'Productos para venta al cliente', 1),
(2, 'Insumo Limpieza', 'Productos de limpieza y desinfección', 1),
(3, 'Herramientas', 'Instrumentos de trabajo', 1);

CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    stock_actual INT DEFAULT 0,
    stock_minimo INT DEFAULT 5,
    precio_costo DECIMAL(10,2) DEFAULT 0,
    precio_venta DECIMAL(10,2) NOT NULL,
    id_categoria INT,
    activo TINYINT(1) DEFAULT 1,
    barberia_id INT,
    FOREIGN KEY (id_categoria) REFERENCES categorias(id),
    FOREIGN KEY (barberia_id) REFERENCES barberias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO productos (id, nombre, descripcion, stock_actual, stock_minimo, precio_costo, precio_venta, id_categoria, activo, barberia_id) VALUES 
(1, 'Cera para Cabello', 'Cera de fijación fuerte', 11, 5, 40.00, 80.00, 1, 1, 1),
(2, 'Minoxidil', 'Tratamiento para crecimiento de barba', 8, 3, 80.00, 150.00, 1, 1, 1),
(3, 'Aceite para Barba', 'Aceite hidratante', 1, 5, 50.00, 100.00, 1, 1, 1),
(4, 'Alcohol Gel', 'Desinfectante de manos', 10, 3, 25.00, 0.00, 2, 1, 1),
(5, 'Toallas Desechables', 'Paquete de 100 toallas', 5, 2, 60.00, 0.00, 2, 1, 1),
(6, 'Desinfectante Barbacide', 'Para herramientas', 8, 2, 120.00, 0.00, 2, 1, 1);

-- =============================================
-- 9. TABLAS DE VENTAS
-- =============================================
CREATE TABLE IF NOT EXISTS ventas_cabecera (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_cliente INT,
    id_barbero INT,
    total_venta DECIMAL(10,2) NOT NULL,
    metodo_pago ENUM('Efectivo', 'Tarjeta', 'Transferencia') DEFAULT 'Efectivo',
    estado_corte_caja TINYINT(1) DEFAULT 0,
    estado ENUM('pendiente', 'completada', 'cancelada') DEFAULT 'completada',
    notas TEXT,
    barberia_id INT,
    FOREIGN KEY (id_barbero) REFERENCES barberos(id),
    FOREIGN KEY (barberia_id) REFERENCES barberias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO ventas_cabecera (id, fecha, id_cliente, id_barbero, total_venta, metodo_pago, estado_corte_caja, estado, notas, barberia_id) VALUES 
(1, '2026-02-05 15:05:54', NULL, 1, 750.00, 'Transferencia', 1, 'completada', '', 1),
(2, '2026-02-05 21:36:54', NULL, NULL, 240.00, 'Efectivo', 1, 'completada', '', 1),
(3, '2026-02-05 21:37:32', NULL, 1, 330.00, 'Efectivo', 1, 'completada', '', 1),
(4, '2026-02-05 21:37:46', NULL, 1, 1200.00, 'Efectivo', 1, 'completada', '', 1),
(5, '2026-02-05 23:06:42', NULL, 2, 200.00, 'Efectivo', 1, 'completada', '', 1),
(6, '2026-02-05 23:41:07', NULL, 1, 320.00, 'Efectivo', 0, 'completada', '', 1),
(7, '2026-02-26 05:57:36', NULL, 1, 200.00, 'Efectivo', 0, 'cancelada', '', 1),
(8, '2026-02-26 07:00:21', NULL, 1, 200.00, 'Efectivo', 0, 'completada', '', 1),
(9, '2026-02-26 07:04:58', NULL, 1, 200.00, 'Efectivo', 0, 'completada', '', 1),
(10, '2026-02-26 08:02:21', NULL, 1, 200.00, 'Efectivo', 0, 'completada', '', 1),
(11, '2026-02-26 08:59:39', NULL, 1, 200.00, 'Efectivo', 0, 'completada', '', 1),
(12, '2026-02-27 22:18:21', NULL, 1, 200.00, 'Efectivo', 0, 'completada', '', 1),
(13, '2026-02-28 00:38:47', NULL, 1, 300.00, 'Efectivo', 0, 'pendiente', '', 1),
(14, '2026-02-28 00:45:42', NULL, 1, 300.00, 'Transferencia', 0, 'completada', '', 1),
(15, '2026-02-28 18:50:05', NULL, 1, 200.00, 'Efectivo', 0, 'completada', '', 1),
(16, '2026-03-02 18:54:37', NULL, 1, 80.00, 'Efectivo', 0, 'completada', '', 1),
(17, '2026-03-06 16:27:33', NULL, 1, 150.00, 'Efectivo', 0, 'cancelada', '', 1),
(18, '2026-03-13 16:21:51', NULL, 2, 300.00, 'Efectivo', 0, 'completada', '', 1),
(19, '2026-03-13 16:23:19', NULL, 1, 300.00, 'Tarjeta', 0, 'completada', '', 1);

CREATE TABLE IF NOT EXISTS ventas_detalle (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_venta_cabecera INT NOT NULL,
    id_servicio INT,
    id_producto INT,
    cantidad INT DEFAULT 1,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    barberia_id INT,
    FOREIGN KEY (id_venta_cabecera) REFERENCES ventas_cabecera(id),
    FOREIGN KEY (id_servicio) REFERENCES servicios(id),
    FOREIGN KEY (id_producto) REFERENCES productos(id),
    FOREIGN KEY (barberia_id) REFERENCES barberias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO ventas_detalle (id, id_venta_cabecera, id_servicio, id_producto, cantidad, precio_unitario, subtotal, barberia_id) VALUES 
(1, 1, 2, NULL, 1, 200.00, 200.00, 1),
(2, 1, 3, NULL, 1, 300.00, 300.00, 1),
(3, 1, NULL, 2, 1, 150.00, 150.00, 1),
(4, 1, NULL, 3, 1, 100.00, 100.00, 1),
(5, 2, NULL, 1, 3, 80.00, 240.00, 1),
(6, 3, NULL, 1, 1, 80.00, 80.00, 1),
(7, 3, NULL, 2, 1, 150.00, 150.00, 1),
(8, 3, NULL, 3, 1, 100.00, 100.00, 1),
(9, 4, NULL, 3, 12, 100.00, 1200.00, 1),
(10, 5, 1, NULL, 1, 200.00, 200.00, 1),
(11, 6, NULL, 1, 4, 80.00, 320.00, 1),
(12, 7, 1, NULL, 1, 200.00, 200.00, 1),
(13, 8, 1, NULL, 1, 200.00, 200.00, 1),
(14, 9, 1, NULL, 1, 200.00, 200.00, 1),
(15, 10, 1, NULL, 1, 200.00, 200.00, 1),
(16, 11, 1, NULL, 1, 200.00, 200.00, 1),
(17, 12, 1, NULL, 1, 200.00, 200.00, 1),
(18, 13, 3, NULL, 1, 300.00, 300.00, 1),
(19, 14, 3, NULL, 1, 300.00, 300.00, 1),
(20, 15, 1, NULL, 1, 200.00, 200.00, 1),
(21, 16, NULL, 1, 1, 80.00, 80.00, 1),
(22, 17, 6, NULL, 1, 150.00, 150.00, 1),
(23, 18, 3, NULL, 1, 300.00, 300.00, 1),
(24, 19, 6, NULL, 2, 150.00, 300.00, 1);

CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_producto INT NOT NULL,
    tipo ENUM('Entrada', 'Salida', 'Ajuste') NOT NULL,
    cantidad INT NOT NULL,
    motivo TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_usuario INT,
    barberia_id INT,
    FOREIGN KEY (id_producto) REFERENCES productos(id),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
    FOREIGN KEY (barberia_id) REFERENCES barberias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO movimientos_inventario (id, id_producto, tipo, cantidad, motivo, fecha, id_usuario, barberia_id) VALUES 
(1, 2, 'Salida', 1, 'Venta #1', '2026-02-05 15:05:54', 1, 1),
(2, 3, 'Salida', 1, 'Venta #1', '2026-02-05 15:05:54', 1, 1),
(3, 1, 'Salida', 3, 'Venta #2', '2026-02-05 21:36:54', 1, 1),
(4, 1, 'Salida', 1, 'Venta #3', '2026-02-05 21:37:32', 1, 1),
(5, 2, 'Salida', 1, 'Venta #3', '2026-02-05 21:37:32', 1, 1),
(6, 3, 'Salida', 1, 'Venta #3', '2026-02-05 21:37:32', 1, 1),
(7, 3, 'Salida', 12, 'Venta #4', '2026-02-05 21:37:46', 1, 1),
(8, 1, 'Salida', 4, 'Venta #6', '2026-02-05 23:41:07', 1, 1),
(9, 1, 'Salida', 1, 'Venta #16', '2026-03-03 00:54:37', 1, 1);

-- =============================================
-- 10. TABLA DE AUDITORÍA - CORTES DE CAJA Y FINANZAS
-- =============================================
CREATE TABLE IF NOT EXISTS cortes_caja (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha_apertura DATETIME DEFAULT CURRENT_TIMESTAMP,
    hora_apertura VARCHAR(8),
    fecha_cierre DATETIME,
    hora_cierre VARCHAR(8),
    monto_inicial DECIMAL(10,2) DEFAULT 0,
    ingresos_calculados DECIMAL(10,2) DEFAULT 0,
    monto_real_fisico DECIMAL(10,2),
    diferencia DECIMAL(10,2),
    id_encargado INT NOT NULL,
    notas TEXT,
    modo_cierre VARCHAR(50) DEFAULT 'transparente',
    total_ventas DECIMAL(10,2) DEFAULT 0,
    total_ganancias DECIMAL(10,2) DEFAULT 0,
    abonos_efectivo DECIMAL(10,2) DEFAULT 0,
    devoluciones_efectivo DECIMAL(10,2) DEFAULT 0,
    entradas_efectivo_total DECIMAL(10,2) DEFAULT 0,
    barberia_id INT,
    FOREIGN KEY (id_encargado) REFERENCES usuarios(id),
    FOREIGN KEY (barberia_id) REFERENCES barberias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO cortes_caja (id, fecha_apertura, hora_apertura, fecha_cierre, hora_cierre, monto_inicial, ingresos_calculados, monto_real_fisico, diferencia, id_encargado, notas, modo_cierre, total_ventas, total_ganancias, abonos_efectivo, devoluciones_efectivo, entradas_efectivo_total, barberia_id) VALUES 
(1, '2026-02-05 14:30:03', '14:30:03', '2026-02-05 23:37:25', '23:37:25', 500.00, 1970.00, 2570.00, 0.00, 1, '', 'transparente', 2720.00, 1700.00, 0.00, 0.00, 600.00, 1),
(2, '2026-02-18 15:29:51', '15:29:51', '2026-02-18 22:52:53', '22:52:53', 100.00, 0.00, 100.00, 0.00, 1, '', 'transparente', 0.00, 0.00, 0.00, 0.00, 0.00, 1),
(3, '2026-02-19 11:12:16', '11:12:16', '2026-02-19 11:39:31', '11:39:31', 200.00, 0.00, 200.00, 0.00, 1, '', 'transparente', 0.00, 0.00, 0.00, 0.00, 0.00, 1),
(4, '2026-02-19 11:46:37', '11:46:37', NULL, NULL, 200.00, 0.00, NULL, NULL, 1, NULL, 'transparente', 0.00, 0.00, 0.00, 0.00, 0.00, 1);

CREATE TABLE IF NOT EXISTS gastos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    monto DECIMAL(10,2) NOT NULL,
    descripcion VARCHAR(500) NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_usuario INT NOT NULL,
    barberia_id INT,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
    FOREIGN KEY (barberia_id) REFERENCES barberias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO gastos (id, monto, descripcion, fecha, id_usuario, barberia_id) VALUES 
(1, 500.00, 'pago tijeras', '2026-02-05 15:07:02', 1, 1);

CREATE TABLE IF NOT EXISTS entradas_efectivo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    monto DECIMAL(10,2) NOT NULL,
    descripcion VARCHAR(500) NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_usuario INT NOT NULL,
    id_corte INT,
    barberia_id INT,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
    FOREIGN KEY (id_corte) REFERENCES cortes_caja(id),
    FOREIGN KEY (barberia_id) REFERENCES barberias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO entradas_efectivo (id, monto, descripcion, fecha, id_usuario, id_corte, barberia_id) VALUES 
(1, 600.00, 'deuda', '2026-02-05 15:06:49', 1, 1, 1);

-- =============================================
-- 11. TABLA DE LEALTAD
-- =============================================
CREATE TABLE IF NOT EXISTS visitas_lealtad (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    barberia_id INT NOT NULL,
    id_barbero INT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_cliente) REFERENCES clientes(id),
    FOREIGN KEY (barberia_id) REFERENCES barberias(id),
    FOREIGN KEY (id_barbero) REFERENCES barberos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO visitas_lealtad (id, id_cliente, barberia_id, id_barbero, fecha) VALUES 
(1, 1, 1, 1, '2026-03-07 02:41:00'),
(2, 26, 1, 1, '2026-03-07 14:17:29'),
(3, 29, 1, 1, '2026-03-13 16:11:02');

CREATE TABLE IF NOT EXISTS loyalty_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venta_id INT,
    id_cliente INT NOT NULL,
    usado TINYINT(1) DEFAULT 0,
    fecha_uso DATETIME,
    barberia_id INT,
    FOREIGN KEY (id_cliente) REFERENCES clientes(id),
    FOREIGN KEY (barberia_id) REFERENCES barberias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO loyalty_tokens (id, venta_id, id_cliente, usado, fecha_uso, barberia_id) VALUES 
(1, 9, 1, 1, '2026-02-26 07:05:06', 1),
(2, 10, 1, 1, '2026-02-26 08:02:25', 1),
(3, 11, 1, 1, '2026-02-26 08:59:44', 1),
(4, 15, 21, 1, '2026-02-28 18:50:24', 1);

-- =============================================
-- 12. TABLA DE HORARIOS POR BARBERO
-- =============================================
CREATE TABLE IF NOT EXISTS horarios_barberos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_barbero INT NOT NULL,
    dia_semana TINYINT NOT NULL CHECK(dia_semana BETWEEN 0 AND 6),
    hora_inicio VARCHAR(5) NOT NULL,
    hora_fin VARCHAR(5) NOT NULL,
    activo TINYINT(1) DEFAULT 1,
    barberia_id INT NOT NULL,
    FOREIGN KEY (id_barbero) REFERENCES barberos(id),
    FOREIGN KEY (barberia_id) REFERENCES barberias(id),
    UNIQUE KEY uq_horario_barbero (id_barbero, dia_semana, barberia_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- dia_semana: 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
INSERT INTO horarios_barberos (id_barbero, dia_semana, hora_inicio, hora_fin, activo, barberia_id) VALUES 
(1, 5, '14:00', '21:30', 1, 1),
(1, 6, '10:00', '21:30', 1, 1),
(1, 0, '10:30', '19:30', 1, 1),
(2, 5, '14:00', '21:30', 1, 1),
(2, 6, '10:00', '21:30', 1, 1),
(2, 0, '10:30', '19:30', 1, 1);

-- =============================================
-- 13. ÍNDICES PARA RENDIMIENTO MULTI-TENANT
-- =============================================
CREATE INDEX idx_usuarios_barberia ON usuarios(barberia_id);
CREATE INDEX idx_clientes_barberia ON clientes(barberia_id);
CREATE INDEX idx_citas_barberia ON citas(barberia_id);
CREATE INDEX idx_ventas_barberia ON ventas_cabecera(barberia_id);
CREATE INDEX idx_servicios_barberia ON servicios(barberia_id);
CREATE INDEX idx_productos_barberia ON productos(barberia_id);
CREATE INDEX idx_horarios_barbero ON horarios_barberos(id_barbero, dia_semana, barberia_id);