import { db, query } from "../db/database";
import mysql from "mysql2/promise";
import { Invoice, ParentProfile, PaymentMethod, PaymentMethodAuditLog } from "../parentProfileBackend";

export class ProfileRepository {
  async createPaymentMethod(paymentMethod: PaymentMethod): Promise<PaymentMethod> {
    const sql = "INSERT INTO payment_methods (parent_id, method, is_active) VALUES (?, ?, ?)";
    const [result] = await db.execute<mysql.ResultSetHeader>(sql, [
      paymentMethod.parentId,
      paymentMethod.method,
      paymentMethod.isActive,
    ]);
    const insertId = result.insertId;
    return { ...paymentMethod, id: insertId, createdAt: new Date().toISOString() };
  }

  async retrievePaymentMethods(parentId: number): Promise<PaymentMethod[]> {
    const sql = "SELECT * FROM payment_methods WHERE parent_id = ?";
    const results = await query(sql, [parentId]);
    return results.map((r) => ({
      id: r.id,
      parentId: r.parent_id,
      method: r.method,
      isActive: r.is_active,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : new Date(r.created_at).toISOString(),
    }));
  }

  async retrieveInvoices(parentId: number): Promise<Invoice[]> {
    const sql = "SELECT * FROM invoices WHERE parent_id = ?";
    const results = await query(sql, [parentId]);
    return results.map((r) => ({
      id: r.id,
      parentId: r.parent_id,
      amount: r.amount,
      date: r.date.toLocaleString(),
    }));
  }

  async retrieveParentProfiles(parentId: number): Promise<ParentProfile[]> {
    const sql = "SELECT * FROM parents WHERE id = ?";
    const results = await query(sql, [parentId]);
    return results.map((r) => ({
      id: r.id,
      name: r.name,
      child: r.child,
    }));
  }

  async updatePaymentMethods(updatedPaymentMethods: PaymentMethod[]): Promise<number[]> {
    const updatePromises = updatedPaymentMethods.map((paymentMethod) => {
      const sql = "UPDATE payment_methods SET parent_id = ?, method = ?, is_active = ? WHERE id = ?";
      return db.execute<mysql.ResultSetHeader>(sql, [
        paymentMethod.parentId,
        paymentMethod.method,
        paymentMethod.isActive,
        paymentMethod.id,
      ]);
    });
    const results = await Promise.all(updatePromises);
    return results.map(([result]) => result.affectedRows);
  }

  async deletePaymentMethod(parentId: number, methodId: number): Promise<boolean> {
    const sql = "DELETE FROM payment_methods WHERE id = ? AND parent_id = ?";
    const [result] = await db.execute<mysql.ResultSetHeader>(sql, [methodId, parentId]);
    return result.affectedRows > 0;
  }

  async createAuditLog(log: Omit<PaymentMethodAuditLog, "id" | "changedAt">): Promise<void> {
    const sql = "INSERT INTO payment_method_audit_log (payment_method_id, parent_id, action, old_state, new_state, changed_by) VALUES (?, ?, ?, ?, ?, ?)";
    await db.execute(sql, [
      log.paymentMethodId,
      log.parentId,
      log.action,
      log.oldState ? JSON.stringify(log.oldState) : null,
      log.newState ? JSON.stringify(log.newState) : null,
      log.changedBy,
    ]);
  }

  async retrieveAuditLogs(parentId: number): Promise<PaymentMethodAuditLog[]> {
    const sql = "SELECT * FROM payment_method_audit_log WHERE parent_id = ? ORDER BY changed_at DESC";
    const results = await query(sql, [parentId]);
    return results.map((r) => ({
      id: r.id,
      paymentMethodId: r.payment_method_id,
      parentId: r.parent_id,
      action: r.action,
      oldState: typeof r.old_state === "string" ? JSON.parse(r.old_state) : r.old_state,
      newState: typeof r.new_state === "string" ? JSON.parse(r.new_state) : r.new_state,
      changedBy: r.changed_by,
      changedAt: r.changed_at instanceof Date ? r.changed_at.toISOString() : new Date(r.changed_at).toISOString(),
    }));
  }
}
