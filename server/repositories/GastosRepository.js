export class GastosRepository {
    constructor(dbQuery, barberiaId) {
        this.dbQuery = dbQuery;
        this.barberiaId = barberiaId;
    }

    async create(monto, descripcion, idUsuario) {
        return await this.dbQuery.run(`
            INSERT INTO gastos (monto, descripcion, id_usuario, barberia_id) 
            VALUES (?, ?, ?, ?)
        `, [monto, descripcion, idUsuario, this.barberiaId]);
    }

    async getByDateRange(startDate, endDate) {
        return await this.dbQuery.all(`
            SELECT * FROM gastos 
            WHERE fecha BETWEEN ? AND ? AND barberia_id = ?
            ORDER BY fecha DESC
        `, [startDate, endDate, this.barberiaId]);
    }

    async getTotalSince(date) {
        const result = await this.dbQuery.get(`
            SELECT COALESCE(SUM(monto), 0) as total 
            FROM gastos 
            WHERE fecha >= ? AND barberia_id = ?
        `, [date, this.barberiaId]);
        return result?.total || 0;
    }
}
