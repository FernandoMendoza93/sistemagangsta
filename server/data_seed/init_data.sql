-- ==========================================
-- Auto-generado SQL Dump para Railway Seed
-- Fecha: 2026-02-26T05:47:31.897Z
-- ==========================================

-- Tabla: roles (3 registros)
INSERT OR IGNORE INTO roles (id, nombre_rol) VALUES (1, 'Admin');
INSERT OR IGNORE INTO roles (id, nombre_rol) VALUES (2, 'Encargado');
INSERT OR IGNORE INTO roles (id, nombre_rol) VALUES (3, 'Barbero');

-- Tabla: usuarios (4 registros)
INSERT OR IGNORE INTO usuarios (id, nombre, email, password_hash, id_rol, fecha_creacion, activo) VALUES (1, 'Administrador', 'admin@barberia.com', '$2a$10$LSqZn7RarDawowdFon0BKOv2klo6Y13HCwU8Wf8INmVFFwSDdaSJi', 1, '2026-02-05 04:02:57', 1);
INSERT OR IGNORE INTO usuarios (id, nombre, email, password_hash, id_rol, fecha_creacion, activo) VALUES (2, 'Fernando Mendoza|', 'angfer2001@gmail.com', '$2a$10$fUo83tZx7X/JTxwrmBYUY.DZG61EVWt6YpnbslHRDp0ZaIKjPb6Qi', 3, '2026-02-05 14:29:50', 1);
INSERT OR IGNORE INTO usuarios (id, nombre, email, password_hash, id_rol, fecha_creacion, activo) VALUES (3, 'Eliza Acevedo', 'elizabarber@gmail.com', '$2a$10$nsQc1sIeypGNMkwbv0pzveb2yUYuTYGGbl0.dSsxkt34j8Vu1zX6i', 3, '2026-02-05 15:03:16', 1);
INSERT OR IGNORE INTO usuarios (id, nombre, email, password_hash, id_rol, fecha_creacion, activo) VALUES (4, 'Alejandro Lopez ', 'alejandro.lopez@gmail.com', '$2a$10$2iSma5hK.glYPKseoI5bCea6UV31oJCi945zVggXNqEMzmAHe/TvG', 1, '2026-02-18 15:49:29', 1);

-- Tabla: barberos (2 registros)
INSERT OR IGNORE INTO barberos (id, id_usuario, porcentaje_comision, estado, turno) VALUES (1, 2, 0.5, 'Activo', 'Completo');
INSERT OR IGNORE INTO barberos (id, id_usuario, porcentaje_comision, estado, turno) VALUES (2, 3, 0.5, 'Activo', 'Completo');

-- Tabla: categorias (3 registros)
INSERT OR IGNORE INTO categorias (id, nombre, descripcion) VALUES (1, 'Venta', 'Productos para venta al cliente');
INSERT OR IGNORE INTO categorias (id, nombre, descripcion) VALUES (2, 'Insumo Limpieza', 'Productos de limpieza y desinfección');
INSERT OR IGNORE INTO categorias (id, nombre, descripcion) VALUES (3, 'Herramientas', 'Instrumentos de trabajo');

-- Tabla: productos (6 registros)
INSERT OR IGNORE INTO productos (id, nombre, descripcion, stock_actual, stock_minimo, precio_costo, precio_venta, id_categoria, activo) VALUES (1, 'Cera para Cabello', 'Cera de fijación fuerte', 12, 5, 40, 80, 1, 1);
INSERT OR IGNORE INTO productos (id, nombre, descripcion, stock_actual, stock_minimo, precio_costo, precio_venta, id_categoria, activo) VALUES (2, 'Minoxidil', 'Tratamiento para crecimiento de barba', 8, 3, 80, 150, 1, 1);
INSERT OR IGNORE INTO productos (id, nombre, descripcion, stock_actual, stock_minimo, precio_costo, precio_venta, id_categoria, activo) VALUES (3, 'Aceite para Barba', 'Aceite hidratante', 1, 5, 50, 100, 1, 1);
INSERT OR IGNORE INTO productos (id, nombre, descripcion, stock_actual, stock_minimo, precio_costo, precio_venta, id_categoria, activo) VALUES (4, 'Alcohol Gel', 'Desinfectante de manos', 10, 3, 25, 0, 2, 1);
INSERT OR IGNORE INTO productos (id, nombre, descripcion, stock_actual, stock_minimo, precio_costo, precio_venta, id_categoria, activo) VALUES (5, 'Toallas Desechables', 'Paquete de 100 toallas', 5, 2, 60, 0, 2, 1);
INSERT OR IGNORE INTO productos (id, nombre, descripcion, stock_actual, stock_minimo, precio_costo, precio_venta, id_categoria, activo) VALUES (6, 'Desinfectante Barbacide', 'Para herramientas', 8, 2, 120, 0, 2, 1);

-- Tabla: servicios (6 registros)
INSERT OR IGNORE INTO servicios (id, nombre_servicio, precio, duracion_aprox, activo) VALUES (1, 'Corte ', 200, 30, 1);
INSERT OR IGNORE INTO servicios (id, nombre_servicio, precio, duracion_aprox, activo) VALUES (2, 'Barba', 200, 60, 1);
INSERT OR IGNORE INTO servicios (id, nombre_servicio, precio, duracion_aprox, activo) VALUES (3, 'Corte + Barba', 300, 90, 1);
INSERT OR IGNORE INTO servicios (id, nombre_servicio, precio, duracion_aprox, activo) VALUES (4, 'Tinte', 120, 60, 1);
INSERT OR IGNORE INTO servicios (id, nombre_servicio, precio, duracion_aprox, activo) VALUES (5, 'Diseño de Cejas', 50, 20, 1);
INSERT OR IGNORE INTO servicios (id, nombre_servicio, precio, duracion_aprox, activo) VALUES (6, 'Corte Escolar', 150, 30, 1);

-- Tabla: clientes (3 registros)
INSERT OR IGNORE INTO clientes (id, nombre, telefono, puntos_lealtad, ultima_visita, fecha_registro, notas, activo, password_hash) VALUES (1, 'Fernando', '5512345678', 0, NULL, '2026-02-25 20:54:54', NULL, 1, NULL);
INSERT OR IGNORE INTO clientes (id, nombre, telefono, puntos_lealtad, ultima_visita, fecha_registro, notas, activo, password_hash) VALUES (2, 'Carlos', '5598765432', 0, NULL, '2026-02-25 21:06:20', NULL, 1, '$2a$10$omvoHGYKXpcpliwy/CSaseFfkOhDV/qYfAf/bJvBxtstcVV9vOU5u');
INSERT OR IGNORE INTO clientes (id, nombre, telefono, puntos_lealtad, ultima_visita, fecha_registro, notas, activo, password_hash) VALUES (3, 'Fernando Mendoza', '9511955349', 0, NULL, '2026-02-25 22:55:50', NULL, 1, NULL);

-- Tabla: citas (1 registros)
INSERT OR IGNORE INTO citas (id, id_cliente, id_servicio, id_barbero, fecha, hora, estado, notas, fecha_creacion) VALUES (1, 1, 1, 1, '2026-03-03', '13:00', 'Pendiente', NULL, '2026-02-25 20:56:03');

-- Tabla: ventas_cabecera (9 registros)
INSERT OR IGNORE INTO ventas_cabecera (id, fecha, id_cliente, id_barbero, total_venta, metodo_pago, estado_corte_caja, notas, estado) VALUES (1, '2026-02-05 15:05:54', NULL, 1, 750, 'Transferencia', 1, '', 'completada');
INSERT OR IGNORE INTO ventas_cabecera (id, fecha, id_cliente, id_barbero, total_venta, metodo_pago, estado_corte_caja, notas, estado) VALUES (2, '2026-02-05 21:36:54', NULL, NULL, 240, 'Efectivo', 1, '', 'completada');
INSERT OR IGNORE INTO ventas_cabecera (id, fecha, id_cliente, id_barbero, total_venta, metodo_pago, estado_corte_caja, notas, estado) VALUES (3, '2026-02-05 21:37:32', NULL, 1, 330, 'Efectivo', 1, '', 'completada');
INSERT OR IGNORE INTO ventas_cabecera (id, fecha, id_cliente, id_barbero, total_venta, metodo_pago, estado_corte_caja, notas, estado) VALUES (4, '2026-02-05 21:37:46', NULL, 1, 1200, 'Efectivo', 1, '', 'completada');
INSERT OR IGNORE INTO ventas_cabecera (id, fecha, id_cliente, id_barbero, total_venta, metodo_pago, estado_corte_caja, notas, estado) VALUES (5, '2026-02-05 23:06:42', NULL, 2, 200, 'Efectivo', 1, '', 'completada');
INSERT OR IGNORE INTO ventas_cabecera (id, fecha, id_cliente, id_barbero, total_venta, metodo_pago, estado_corte_caja, notas, estado) VALUES (6, '2026-02-05 23:41:07', NULL, 1, 320, 'Efectivo', 0, '', 'completada');
INSERT OR IGNORE INTO ventas_cabecera (id, fecha, id_cliente, id_barbero, total_venta, metodo_pago, estado_corte_caja, notas, estado) VALUES (7, '2026-02-25 21:33:22', NULL, 2, 200, 'Efectivo', 0, '', 'completada');
INSERT OR IGNORE INTO ventas_cabecera (id, fecha, id_cliente, id_barbero, total_venta, metodo_pago, estado_corte_caja, notas, estado) VALUES (8, '2026-02-25 22:38:56', NULL, 1, 200, 'Efectivo', 0, '', 'cancelada');
INSERT OR IGNORE INTO ventas_cabecera (id, fecha, id_cliente, id_barbero, total_venta, metodo_pago, estado_corte_caja, notas, estado) VALUES (9, '2026-02-25 22:40:12', NULL, 1, 200, 'Efectivo', 0, '', 'cancelada');

-- Tabla: ventas_detalle (14 registros)
INSERT OR IGNORE INTO ventas_detalle (id, id_venta_cabecera, id_servicio, id_producto, cantidad, precio_unitario, subtotal) VALUES (1, 1, 2, NULL, 1, 200, 200);
INSERT OR IGNORE INTO ventas_detalle (id, id_venta_cabecera, id_servicio, id_producto, cantidad, precio_unitario, subtotal) VALUES (2, 1, 3, NULL, 1, 300, 300);
INSERT OR IGNORE INTO ventas_detalle (id, id_venta_cabecera, id_servicio, id_producto, cantidad, precio_unitario, subtotal) VALUES (3, 1, NULL, 2, 1, 150, 150);
INSERT OR IGNORE INTO ventas_detalle (id, id_venta_cabecera, id_servicio, id_producto, cantidad, precio_unitario, subtotal) VALUES (4, 1, NULL, 3, 1, 100, 100);
INSERT OR IGNORE INTO ventas_detalle (id, id_venta_cabecera, id_servicio, id_producto, cantidad, precio_unitario, subtotal) VALUES (5, 2, NULL, 1, 3, 80, 240);
INSERT OR IGNORE INTO ventas_detalle (id, id_venta_cabecera, id_servicio, id_producto, cantidad, precio_unitario, subtotal) VALUES (6, 3, NULL, 1, 1, 80, 80);
INSERT OR IGNORE INTO ventas_detalle (id, id_venta_cabecera, id_servicio, id_producto, cantidad, precio_unitario, subtotal) VALUES (7, 3, NULL, 2, 1, 150, 150);
INSERT OR IGNORE INTO ventas_detalle (id, id_venta_cabecera, id_servicio, id_producto, cantidad, precio_unitario, subtotal) VALUES (8, 3, NULL, 3, 1, 100, 100);
INSERT OR IGNORE INTO ventas_detalle (id, id_venta_cabecera, id_servicio, id_producto, cantidad, precio_unitario, subtotal) VALUES (9, 4, NULL, 3, 12, 100, 1200);
INSERT OR IGNORE INTO ventas_detalle (id, id_venta_cabecera, id_servicio, id_producto, cantidad, precio_unitario, subtotal) VALUES (10, 5, 1, NULL, 1, 200, 200);
INSERT OR IGNORE INTO ventas_detalle (id, id_venta_cabecera, id_servicio, id_producto, cantidad, precio_unitario, subtotal) VALUES (11, 6, NULL, 1, 4, 80, 320);
INSERT OR IGNORE INTO ventas_detalle (id, id_venta_cabecera, id_servicio, id_producto, cantidad, precio_unitario, subtotal) VALUES (12, 7, 1, NULL, 1, 200, 200);
INSERT OR IGNORE INTO ventas_detalle (id, id_venta_cabecera, id_servicio, id_producto, cantidad, precio_unitario, subtotal) VALUES (13, 8, 1, NULL, 1, 200, 200);
INSERT OR IGNORE INTO ventas_detalle (id, id_venta_cabecera, id_servicio, id_producto, cantidad, precio_unitario, subtotal) VALUES (14, 9, 1, NULL, 1, 200, 200);

-- Tabla: cortes_caja (4 registros)
INSERT OR IGNORE INTO cortes_caja (id, fecha_apertura, hora_apertura, fecha_cierre, hora_cierre, monto_inicial, ingresos_calculados, monto_real_fisico, diferencia, id_encargado, notas, modo_cierre, total_ventas, total_ganancias, abonos_efectivo, devoluciones_efectivo, entradas_efectivo_total) VALUES (1, '2026-02-05 14:30:03', '14:30:03', '2026-02-05 23:37:25', '23:37:25', 500, 1970, 2570, 0, 1, '', 'transparente', 2720, 1700, 0, 0, 600);
INSERT OR IGNORE INTO cortes_caja (id, fecha_apertura, hora_apertura, fecha_cierre, hora_cierre, monto_inicial, ingresos_calculados, monto_real_fisico, diferencia, id_encargado, notas, modo_cierre, total_ventas, total_ganancias, abonos_efectivo, devoluciones_efectivo, entradas_efectivo_total) VALUES (2, '2026-02-18 15:29:51', '15:29:51', '2026-02-18 22:52:53', '22:52:53', 100, 0, 100, 0, 1, '', 'transparente', 0, 0, 0, 0, 0);
INSERT OR IGNORE INTO cortes_caja (id, fecha_apertura, hora_apertura, fecha_cierre, hora_cierre, monto_inicial, ingresos_calculados, monto_real_fisico, diferencia, id_encargado, notas, modo_cierre, total_ventas, total_ganancias, abonos_efectivo, devoluciones_efectivo, entradas_efectivo_total) VALUES (3, '2026-02-19 11:12:16', '11:12:16', '2026-02-19 11:39:31', '11:39:31', 200, 0, 200, 0, 1, '', 'transparente', 0, 0, 0, 0, 0);
INSERT OR IGNORE INTO cortes_caja (id, fecha_apertura, hora_apertura, fecha_cierre, hora_cierre, monto_inicial, ingresos_calculados, monto_real_fisico, diferencia, id_encargado, notas, modo_cierre, total_ventas, total_ganancias, abonos_efectivo, devoluciones_efectivo, entradas_efectivo_total) VALUES (4, '2026-02-19 11:46:37', '11:46:37', NULL, NULL, 200, 0, NULL, NULL, 1, NULL, 'transparente', 0, 0, 0, 0, 0);

-- Tabla: entradas_efectivo (1 registros)
INSERT OR IGNORE INTO entradas_efectivo (id, monto, descripcion, fecha, id_usuario, id_corte) VALUES (1, 600, 'deuda', '2026-02-05 15:06:49', 1, 1);

-- Tabla: gastos (1 registros)
INSERT OR IGNORE INTO gastos (id, monto, descripcion, fecha, id_usuario) VALUES (1, 500, 'pago tijeras', '2026-02-05 15:07:02', 1);

-- Tabla: comisiones_pendientes (4 registros)
INSERT OR IGNORE INTO comisiones_pendientes (id, id_barbero, id_venta_detalle, monto, fecha, pagado) VALUES (1, 1, 1, 100, '2026-02-05 15:05:54', 1);
INSERT OR IGNORE INTO comisiones_pendientes (id, id_barbero, id_venta_detalle, monto, fecha, pagado) VALUES (2, 1, 2, 150, '2026-02-05 15:05:54', 1);
INSERT OR IGNORE INTO comisiones_pendientes (id, id_barbero, id_venta_detalle, monto, fecha, pagado) VALUES (3, 2, 10, 100, '2026-02-05 23:06:42', 1);
INSERT OR IGNORE INTO comisiones_pendientes (id, id_barbero, id_venta_detalle, monto, fecha, pagado) VALUES (4, 2, 12, 100, '2026-02-25 21:33:22', 0);

-- Tabla: comisiones_pagadas (2 registros)
INSERT OR IGNORE INTO comisiones_pagadas (id, id_barbero, monto, fecha_pago, id_usuario_admin, notas) VALUES (1, 2, 100, '2026-02-18 15:49:58', 1, 'Pago de comisiones');
INSERT OR IGNORE INTO comisiones_pagadas (id, id_barbero, monto, fecha_pago, id_usuario_admin, notas) VALUES (2, 1, 250, '2026-02-18 15:50:06', 1, 'Pago de comisiones');

