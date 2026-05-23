import {
  type Customer, type InsertCustomer,
  type Receipt, type InsertReceipt,
  type Invoice, type InsertInvoice,
  type InvoiceItem, type InsertInvoiceItem,
  type Booking, type InsertBooking,
  type AuditLog, type InsertAuditLog,
  type Settings, type InsertSettings,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Customers
  listCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(c: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, c: Partial<InsertCustomer>): Promise<Customer | undefined>;

  // Receipts
  listReceipts(filters?: {
    dateFrom?: string; dateTo?: string; category?: string; type?: string; status?: string; search?: string;
  }): Promise<Receipt[]>;
  getReceipt(id: string): Promise<Receipt | undefined>;
  createReceipt(r: InsertReceipt): Promise<Receipt>;
  updateReceipt(id: string, r: Partial<InsertReceipt>): Promise<Receipt | undefined>;
  cancelReceipt(id: string): Promise<Receipt | undefined>;

  // Invoices
  listInvoices(filters?: {
    status?: string; customerId?: string; dateFrom?: string; dateTo?: string;
  }): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(i: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, i: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  cancelInvoice(id: string): Promise<Invoice | undefined>;
  markInvoicePaid(id: string): Promise<Invoice | undefined>;

  // Invoice Items
  listInvoiceItems(invoiceId: string): Promise<InvoiceItem[]>;
  createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;
  updateInvoiceItem(id: string, item: Partial<InsertInvoiceItem>): Promise<InvoiceItem | undefined>;
  deleteInvoiceItem(id: string): Promise<boolean>;

  // Bookings
  listBookings(filters?: {
    dateFrom?: string; dateTo?: string; category?: string; type?: string;
  }): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | undefined>;
  createBooking(b: InsertBooking): Promise<Booking>;
  cancelBooking(id: string): Promise<Booking | undefined>;

  // Audit Log
  listAuditLogByEntity(entityType: string, entityId: string): Promise<AuditLog[]>;
  listAuditLog(): Promise<AuditLog[]>;
  createAuditLog(entry: InsertAuditLog): Promise<AuditLog>;

  // Settings
  getSettings(): Promise<Settings>;
  updateSettings(s: Partial<InsertSettings>): Promise<Settings>;

  // Export
  exportData(year: string): Promise<object>;

  // Dashboard
  getDashboard(): Promise<object>;
}

export class MemStorage implements IStorage {
  private customers: Map<string, Customer> = new Map();
  private receipts: Map<string, Receipt> = new Map();
  private invoices: Map<string, Invoice> = new Map();
  private invoiceItems: Map<string, InvoiceItem> = new Map();
  private bookings: Map<string, Booking> = new Map();
  private auditLogs: Map<string, AuditLog> = new Map();
  private settingsData: Settings;

  constructor() {
    this.settingsData = {
      id: randomUUID(),
      companyName: "Meine Einzelfirma",
      companyAddress: "Musterstrasse 1",
      companyZip: "8500",
      companyCity: "Frauenfeld",
      companyIban: "CH00 0000 0000 0000 0000 0",
      companyUid: "",
      companyEmail: "info@meinefirma.ch",
      companyPhone: "+41 71 000 00 00",
      isVatRegistered: 0,
      currentInvoiceNumber: 1,
      currentReceiptNumber: 1,
      invoicePrefix: "RE",
      receiptPrefix: "B",
      fiscalYear: "2026",
    };
  }

  // ── Customers ──
  async listCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async createCustomer(c: InsertCustomer): Promise<Customer> {
    const id = randomUUID();
    const customer: Customer = {
      id,
      name: c.name,
      company: c.company ?? null,
      address: c.address ?? null,
      zip: c.zip ?? null,
      city: c.city ?? null,
      country: c.country ?? "CH",
      email: c.email ?? null,
      phone: c.phone ?? null,
      uid: c.uid ?? null,
      notes: c.notes ?? null,
    };
    this.customers.set(id, customer);
    await this.createAuditLog({
      entityType: "customer",
      entityId: id,
      action: "erstellt",
      changes: JSON.stringify(c),
      timestamp: new Date().toISOString(),
    });
    return customer;
  }

  async updateCustomer(id: string, c: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const existing = this.customers.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...c };
    this.customers.set(id, updated);
    await this.createAuditLog({
      entityType: "customer",
      entityId: id,
      action: "geaendert",
      changes: JSON.stringify(c),
      timestamp: new Date().toISOString(),
    });
    return updated;
  }

  // ── Receipts ──
  private generateReceiptNumber(): string {
    const num = this.settingsData.currentReceiptNumber ?? 1;
    const prefix = this.settingsData.receiptPrefix ?? "B";
    const year = this.settingsData.fiscalYear ?? "2026";
    this.settingsData = { ...this.settingsData, currentReceiptNumber: num + 1 };
    return `${prefix}-${year}-${String(num).padStart(4, "0")}`;
  }

  async listReceipts(filters?: {
    dateFrom?: string; dateTo?: string; category?: string; type?: string; status?: string; search?: string;
  }): Promise<Receipt[]> {
    let results = Array.from(this.receipts.values());
    if (filters) {
      if (filters.dateFrom) results = results.filter(r => r.receiptDate >= filters.dateFrom!);
      if (filters.dateTo) results = results.filter(r => r.receiptDate <= filters.dateTo!);
      if (filters.category) results = results.filter(r => r.category === filters.category);
      if (filters.type) results = results.filter(r => r.type === filters.type);
      if (filters.status) results = results.filter(r => r.status === filters.status);
      if (filters.search) {
        const s = filters.search.toLowerCase();
        results = results.filter(r =>
          r.supplierCustomer.toLowerCase().includes(s) ||
          r.receiptNumber.toLowerCase().includes(s) ||
          (r.notes && r.notes.toLowerCase().includes(s))
        );
      }
    }
    return results.sort((a, b) => b.receiptDate.localeCompare(a.receiptDate));
  }

  async getReceipt(id: string): Promise<Receipt | undefined> {
    return this.receipts.get(id);
  }

  async createReceipt(r: InsertReceipt): Promise<Receipt> {
    const id = randomUUID();
    const receipt: Receipt = {
      id,
      receiptNumber: this.generateReceiptNumber(),
      receiptDate: r.receiptDate,
      bookingDate: r.bookingDate ?? null,
      amount: r.amount,
      currency: r.currency ?? "CHF",
      vatRate: r.vatRate ?? null,
      vatAmount: r.vatAmount ?? null,
      supplierCustomer: r.supplierCustomer,
      category: r.category,
      type: r.type,
      paymentMethod: r.paymentMethod ?? null,
      project: r.project ?? null,
      notes: r.notes ?? null,
      isPrivate: r.isPrivate ?? 0,
      fileName: r.fileName ?? null,
      fileData: r.fileData ?? null,
      status: r.status ?? "aktiv",
      createdAt: new Date().toISOString(),
    };
    this.receipts.set(id, receipt);
    await this.createAuditLog({
      entityType: "receipt",
      entityId: id,
      action: "erstellt",
      changes: JSON.stringify({ receiptNumber: receipt.receiptNumber }),
      timestamp: new Date().toISOString(),
    });
    return receipt;
  }

  async updateReceipt(id: string, r: Partial<InsertReceipt>): Promise<Receipt | undefined> {
    const existing = this.receipts.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...r };
    this.receipts.set(id, updated);
    await this.createAuditLog({
      entityType: "receipt",
      entityId: id,
      action: "geaendert",
      changes: JSON.stringify(r),
      timestamp: new Date().toISOString(),
    });
    return updated;
  }

  async cancelReceipt(id: string): Promise<Receipt | undefined> {
    const existing = this.receipts.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, status: "storniert" };
    this.receipts.set(id, updated);
    await this.createAuditLog({
      entityType: "receipt",
      entityId: id,
      action: "storniert",
      changes: JSON.stringify({ status: "storniert" }),
      timestamp: new Date().toISOString(),
    });
    return updated;
  }

  // ── Invoices ──
  private generateInvoiceNumber(): string {
    const num = this.settingsData.currentInvoiceNumber ?? 1;
    const prefix = this.settingsData.invoicePrefix ?? "RE";
    const year = this.settingsData.fiscalYear ?? "2026";
    this.settingsData = { ...this.settingsData, currentInvoiceNumber: num + 1 };
    return `${prefix}-${year}-${String(num).padStart(4, "0")}`;
  }

  async listInvoices(filters?: {
    status?: string; customerId?: string; dateFrom?: string; dateTo?: string;
  }): Promise<Invoice[]> {
    let results = Array.from(this.invoices.values());
    if (filters) {
      if (filters.status) results = results.filter(i => i.status === filters.status);
      if (filters.customerId) results = results.filter(i => i.customerId === filters.customerId);
      if (filters.dateFrom) results = results.filter(i => i.invoiceDate >= filters.dateFrom!);
      if (filters.dateTo) results = results.filter(i => i.invoiceDate <= filters.dateTo!);
    }
    return results.sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    return this.invoices.get(id);
  }

  async createInvoice(i: InsertInvoice): Promise<Invoice> {
    const id = randomUUID();
    const invoice: Invoice = {
      id,
      invoiceNumber: this.generateInvoiceNumber(),
      customerId: i.customerId,
      invoiceDate: i.invoiceDate,
      dueDate: i.dueDate,
      paymentTermDays: i.paymentTermDays ?? 30,
      status: i.status ?? "entwurf",
      subtotal: i.subtotal,
      vatTotal: i.vatTotal,
      total: i.total,
      notes: i.notes ?? null,
      paymentInfo: i.paymentInfo ?? null,
      createdAt: new Date().toISOString(),
    };
    this.invoices.set(id, invoice);
    await this.createAuditLog({
      entityType: "invoice",
      entityId: id,
      action: "erstellt",
      changes: JSON.stringify({ invoiceNumber: invoice.invoiceNumber }),
      timestamp: new Date().toISOString(),
    });
    return invoice;
  }

  async updateInvoice(id: string, i: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const existing = this.invoices.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...i };
    this.invoices.set(id, updated);
    await this.createAuditLog({
      entityType: "invoice",
      entityId: id,
      action: "geaendert",
      changes: JSON.stringify(i),
      timestamp: new Date().toISOString(),
    });
    return updated;
  }

  async cancelInvoice(id: string): Promise<Invoice | undefined> {
    const existing = this.invoices.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, status: "storniert" };
    this.invoices.set(id, updated);
    await this.createAuditLog({
      entityType: "invoice",
      entityId: id,
      action: "storniert",
      changes: JSON.stringify({ status: "storniert" }),
      timestamp: new Date().toISOString(),
    });
    return updated;
  }

  async markInvoicePaid(id: string): Promise<Invoice | undefined> {
    const existing = this.invoices.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, status: "bezahlt" };
    this.invoices.set(id, updated);
    await this.createAuditLog({
      entityType: "invoice",
      entityId: id,
      action: "geaendert",
      changes: JSON.stringify({ status: "bezahlt" }),
      timestamp: new Date().toISOString(),
    });
    return updated;
  }

  // ── Invoice Items ──
  async listInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
    return Array.from(this.invoiceItems.values())
      .filter(i => i.invoiceId === invoiceId)
      .sort((a, b) => a.position - b.position);
  }

  async createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem> {
    const id = randomUUID();
    const invoiceItem: InvoiceItem = {
      id,
      invoiceId: item.invoiceId,
      position: item.position,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      vatRate: item.vatRate,
      total: item.total,
    };
    this.invoiceItems.set(id, invoiceItem);
    return invoiceItem;
  }

  async updateInvoiceItem(id: string, item: Partial<InsertInvoiceItem>): Promise<InvoiceItem | undefined> {
    const existing = this.invoiceItems.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...item };
    this.invoiceItems.set(id, updated);
    return updated;
  }

  async deleteInvoiceItem(id: string): Promise<boolean> {
    return this.invoiceItems.delete(id);
  }

  // ── Bookings ──
  async listBookings(filters?: {
    dateFrom?: string; dateTo?: string; category?: string; type?: string;
  }): Promise<Booking[]> {
    let results = Array.from(this.bookings.values());
    if (filters) {
      if (filters.dateFrom) results = results.filter(b => b.bookingDate >= filters.dateFrom!);
      if (filters.dateTo) results = results.filter(b => b.bookingDate <= filters.dateTo!);
      if (filters.category) results = results.filter(b => b.category === filters.category);
      if (filters.type) results = results.filter(b => b.type === filters.type);
    }
    return results.sort((a, b) => b.bookingDate.localeCompare(a.bookingDate));
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async createBooking(b: InsertBooking): Promise<Booking> {
    const id = randomUUID();
    const booking: Booking = {
      id,
      bookingDate: b.bookingDate,
      amount: b.amount,
      type: b.type,
      category: b.category,
      vatRate: b.vatRate ?? null,
      vatAmount: b.vatAmount ?? null,
      counterAccount: b.counterAccount ?? null,
      receiptId: b.receiptId ?? null,
      invoiceId: b.invoiceId ?? null,
      description: b.description,
      notes: b.notes ?? null,
      status: b.status ?? "aktiv",
      createdAt: new Date().toISOString(),
    };
    this.bookings.set(id, booking);
    await this.createAuditLog({
      entityType: "booking",
      entityId: id,
      action: "erstellt",
      changes: JSON.stringify({ description: booking.description }),
      timestamp: new Date().toISOString(),
    });
    return booking;
  }

  async cancelBooking(id: string): Promise<Booking | undefined> {
    const existing = this.bookings.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, status: "storniert" };
    this.bookings.set(id, updated);
    await this.createAuditLog({
      entityType: "booking",
      entityId: id,
      action: "storniert",
      changes: JSON.stringify({ status: "storniert" }),
      timestamp: new Date().toISOString(),
    });
    return updated;
  }

  // ── Audit Log ──
  async listAuditLogByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    return Array.from(this.auditLogs.values())
      .filter(a => a.entityType === entityType && a.entityId === entityId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  async listAuditLog(): Promise<AuditLog[]> {
    return Array.from(this.auditLogs.values())
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  async createAuditLog(entry: InsertAuditLog): Promise<AuditLog> {
    const id = randomUUID();
    const log: AuditLog = {
      id,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      changes: entry.changes ?? null,
      timestamp: entry.timestamp,
    };
    this.auditLogs.set(id, log);
    return log;
  }

  // ── Settings ──
  async getSettings(): Promise<Settings> {
    return this.settingsData;
  }

  async updateSettings(s: Partial<InsertSettings>): Promise<Settings> {
    this.settingsData = { ...this.settingsData, ...s };
    return this.settingsData;
  }

  // ── Export ──
  async exportData(year: string): Promise<object> {
    const allReceipts = Array.from(this.receipts.values()).filter(r => r.receiptDate.startsWith(year));
    const allInvoices = Array.from(this.invoices.values()).filter(i => i.invoiceDate.startsWith(year));
    const allBookings = Array.from(this.bookings.values()).filter(b => b.bookingDate.startsWith(year));
    const allCustomers = Array.from(this.customers.values());
    const allAuditLogs = Array.from(this.auditLogs.values());
    return {
      year,
      exportDate: new Date().toISOString(),
      settings: this.settingsData,
      customers: allCustomers,
      receipts: allReceipts,
      invoices: allInvoices,
      bookings: allBookings,
      auditLog: allAuditLogs,
    };
  }

  // ── Dashboard ──
  async getDashboard(): Promise<object> {
    const activeBookings = Array.from(this.bookings.values()).filter(b => b.status === "aktiv");
    const year = this.settingsData.fiscalYear ?? "2026";
    const yearBookings = activeBookings.filter(b => b.bookingDate.startsWith(year));

    const totalIncome = yearBookings
      .filter(b => b.type === "einnahme")
      .reduce((sum, b) => sum + parseFloat(b.amount), 0);
    const totalExpenses = yearBookings
      .filter(b => b.type === "ausgabe")
      .reduce((sum, b) => sum + parseFloat(b.amount), 0);

    const openInvoices = Array.from(this.invoices.values()).filter(
      i => i.status === "gesendet" || i.status === "teilweise_bezahlt"
    );

    const openInvoicesAmount = openInvoices.reduce((sum, i) => sum + parseFloat(i.total), 0);

    // Monthly breakdown
    const months: { month: string; einnahmen: number; ausgaben: number }[] = [];
    for (let m = 1; m <= 12; m++) {
      const prefix = `${year}-${String(m).padStart(2, "0")}`;
      const monthBookings = yearBookings.filter(b => b.bookingDate.startsWith(prefix));
      months.push({
        month: prefix,
        einnahmen: monthBookings.filter(b => b.type === "einnahme").reduce((s, b) => s + parseFloat(b.amount), 0),
        ausgaben: monthBookings.filter(b => b.type === "ausgabe").reduce((s, b) => s + parseFloat(b.amount), 0),
      });
    }

    // Recent bookings (last 10)
    const recentBookings = Array.from(this.bookings.values())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 10);

    return {
      totalIncome,
      totalExpenses,
      profit: totalIncome - totalExpenses,
      openInvoicesCount: openInvoices.length,
      openInvoicesAmount,
      monthlyBreakdown: months,
      recentBookings,
      openInvoices,
    };
  }
}

export const storage = new MemStorage();
