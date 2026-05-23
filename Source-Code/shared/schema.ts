import { pgTable, text, varchar, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── Customers ──
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  company: text("company"),
  address: text("address"),
  zip: text("zip"),
  city: text("city"),
  country: text("country").default("CH"),
  email: text("email"),
  phone: text("phone"),
  uid: text("uid"),
  notes: text("notes"),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

// ── Receipts (Belege) ──
export const receipts = pgTable("receipts", {
  id: varchar("id").primaryKey(),
  receiptNumber: text("receipt_number").notNull(),
  receiptDate: text("receipt_date").notNull(),
  bookingDate: text("booking_date"),
  amount: text("amount").notNull(),
  currency: text("currency").default("CHF"),
  vatRate: text("vat_rate"),
  vatAmount: text("vat_amount"),
  supplierCustomer: text("supplier_customer").notNull(),
  category: text("category").notNull(),
  type: text("type").notNull(),
  paymentMethod: text("payment_method"),
  project: text("project"),
  notes: text("notes"),
  isPrivate: integer("is_private").default(0),
  fileName: text("file_name"),
  fileData: text("file_data"),
  status: text("status").default("aktiv"),
  createdAt: text("created_at").notNull(),
});

export const insertReceiptSchema = createInsertSchema(receipts).omit({
  id: true,
  receiptNumber: true,
  createdAt: true,
});
export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type Receipt = typeof receipts.$inferSelect;

// ── Invoices (Rechnungen) ──
export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull(),
  customerId: text("customer_id").notNull(),
  invoiceDate: text("invoice_date").notNull(),
  dueDate: text("due_date").notNull(),
  paymentTermDays: integer("payment_term_days").default(30),
  status: text("status").default("entwurf"),
  subtotal: text("subtotal").notNull(),
  vatTotal: text("vat_total").notNull(),
  total: text("total").notNull(),
  notes: text("notes"),
  paymentInfo: text("payment_info"),
  createdAt: text("created_at").notNull(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  invoiceNumber: true,
  createdAt: true,
});
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

// ── Invoice Items (Rechnungspositionen) ──
export const invoiceItems = pgTable("invoice_items", {
  id: varchar("id").primaryKey(),
  invoiceId: text("invoice_id").notNull(),
  position: integer("position").notNull(),
  description: text("description").notNull(),
  quantity: text("quantity").notNull(),
  unitPrice: text("unit_price").notNull(),
  vatRate: text("vat_rate").notNull(),
  total: text("total").notNull(),
});

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({ id: true });
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type InvoiceItem = typeof invoiceItems.$inferSelect;

// ── Bookings (Buchungen/Journal) ──
export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey(),
  bookingDate: text("booking_date").notNull(),
  amount: text("amount").notNull(),
  type: text("type").notNull(),
  category: text("category").notNull(),
  vatRate: text("vat_rate"),
  vatAmount: text("vat_amount"),
  counterAccount: text("counter_account"),
  receiptId: text("receipt_id"),
  invoiceId: text("invoice_id"),
  description: text("description").notNull(),
  notes: text("notes"),
  status: text("status").default("aktiv"),
  createdAt: text("created_at").notNull(),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
});
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

// ── Audit Log (Änderungsprotokoll) ──
export const auditLog = pgTable("audit_log", {
  id: varchar("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  changes: text("changes"),
  timestamp: text("timestamp").notNull(),
});

export const insertAuditLogSchema = createInsertSchema(auditLog).omit({ id: true });
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLog.$inferSelect;

// ── Settings ──
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey(),
  companyName: text("company_name"),
  companyAddress: text("company_address"),
  companyZip: text("company_zip"),
  companyCity: text("company_city"),
  companyIban: text("company_iban"),
  companyUid: text("company_uid"),
  companyEmail: text("company_email"),
  companyPhone: text("company_phone"),
  isVatRegistered: integer("is_vat_registered").default(0),
  currentInvoiceNumber: integer("current_invoice_number").default(1),
  currentReceiptNumber: integer("current_receipt_number").default(1),
  invoicePrefix: text("invoice_prefix").default("RE"),
  receiptPrefix: text("receipt_prefix").default("B"),
  fiscalYear: text("fiscal_year").default("2026"),
});

export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;

// Category and Type enums for validation
export const CATEGORIES = [
  "umsatz", "material", "fahrzeug", "spesen", "buero",
  "versicherungen", "privatentnahme", "privateinlage", "sonstiges"
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  umsatz: "Umsatz",
  material: "Material",
  fahrzeug: "Fahrzeug",
  spesen: "Spesen",
  buero: "Büro",
  versicherungen: "Versicherungen",
  privatentnahme: "Privatentnahme",
  privateinlage: "Privateinlage",
  sonstiges: "Sonstiges",
};

export const ENTRY_TYPES = ["einnahme", "ausgabe"] as const;

export const PAYMENT_METHODS = ["bar", "bank", "kreditkarte", "twint", "rechnung"] as const;

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bar: "Bar",
  bank: "Bank",
  kreditkarte: "Kreditkarte",
  twint: "TWINT",
  rechnung: "Rechnung",
};

export const INVOICE_STATUSES = [
  "entwurf", "gesendet", "teilweise_bezahlt", "bezahlt", "storniert"
] as const;

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  entwurf: "Entwurf",
  gesendet: "Gesendet",
  teilweise_bezahlt: "Teilw. bezahlt",
  bezahlt: "Bezahlt",
  storniert: "Storniert",
};

export const VAT_RATES = [
  { value: "8.1", label: "8.1% (Normal)" },
  { value: "2.6", label: "2.6% (Reduziert)" },
  { value: "3.8", label: "3.8% (Beherbergung)" },
  { value: "0", label: "0% (Befreit)" },
];
