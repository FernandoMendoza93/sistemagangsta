export class EntradasEfectivoRepository {
    constructor(dbQuery, barberiaId) {
        this.dbQuery = dbQuery;
        this.barberiaId = barberiaId;
    }

    async create(monto, descripcion, idUsuario, idCorte = null) {
        return await this.dbQuery.run(`
            INSERT INTO entradas_efectivo (monto, descripcion, id_usuario, id_corte, barberia_id) 
            VALUES (?, ?, ?, ?, ?)
        `, [monto, descripcion, idUsuario, idCorte, this.barberiaId]);
    }

    async getByDateRange(startDate, endDate) {
        return await this.dbQuery.all(`
            SELECT e.*, u.nombre as usuario_nombre 
            FROM entradas_efectivo e
            LEFT JOIN usuarios u ON e.id_usuario = u.id
            WHERE e.fecha BETWEEN ? AND ? AND e.barberia_id = ?
            ORDER BY e.fecha DESC
        `, [startDate, endDate, this.barberiaId]);
    }

    async getTotalSince(date) {
        const result = await this.dbQuery.get(`
            SELECT COALESCE(SUM(monto), 0) as total 
            FROM entradas_efectivo 
            WHERE fecha >= ? AND barberia_id = ?
        `, [date, this.barberiaId]);
        return result?.total || 0;
    }

    async getByCorte(idCorte) {
        return await this.dbQuery.all(`
            SELECT e.*, u.nombre as usuario_nombre
            FROM entradas_efectivo e
            LEFT JOIN usuarios u ON e.id_usuario = u.id
            WHERE e.id_corte = ? AND e.barberia_id = ?
            ORDER BY e.fecha ASC
        `, [idCorte, this.barberiaId]);
    }

    async asociarACorte(fechaApertura, idCorte) {
        return await this.dbQuery.run(`
            UPDATE entradas_efectivo 
            SET id_corte = ? 
            WHERE fecha >= ? AND id_corte IS NULL AND barberia_id = ?
        `, [idCorte, fechaApertura, this.barberiaId]);
    }
}
