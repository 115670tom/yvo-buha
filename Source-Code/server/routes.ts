import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ── Customers ──
  app.get("/api/customers", async (_req, res) => {
    const customers = await storage.listCustomers();
    res.json(customers);
  });

  app.get("/api/customers/:id", async (req, res) => {
    const customer = await storage.getCustomer(req.params.id);
    if (!customer) return res.status(404).json({ error: "Kunde nicht gefunden" });
    res.json(customer);
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const customer = await storage.createCustomer(req.body);
      res.status(201).json(customer);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put("/api/customers/:id", async (req, res) => {
    const customer = await storage.updateCustomer(req.params.id, req.body);
    if (!customer) return res.status(404).json({ error: "Kunde nicht gefunden" });
    res.json(customer);
  });

  // ── Receipts ──
  app.get("/api/receipts", async (req, res) => {
    const filters = {
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
      category: req.query.category as string | undefined,
      type: req.query.type as string | undefined,
      status: req.query.status as string | undefined,
      search: req.query.search as string | undefined,
    };
    const receipts = await storage.listReceipts(filters);
    res.json(receipts);
  });

  app.get("/api/receipts/:id", async (req, res) => {
    const receipt = await storage.getReceipt(req.params.id);
    if (!receipt) return res.status(404).json({ error: "Beleg nicht gefunden" });
    res.json(receipt);
  });

  app.post("/api/receipts", async (req, res) => {
    try {
      const receipt = await storage.createReceipt(req.body);
      res.status(201).json(receipt);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put("/api/receipts/:id", async (req, res) => {
    const receipt = await storage.updateReceipt(req.params.id, req.body);
    if (!receipt) return res.status(404).json({ error: "Beleg nicht gefunden" });
    res.json(receipt);
  });

  app.post("/api/receipts/:id/cancel", async (req, res) => {
    const receipt = await storage.cancelReceipt(req.params.id);
    if (!receipt) return res.status(404).json({ error: "Beleg nicht gefunden" });
    res.json(receipt);
  });

  // ── Invoices ──
  app.get("/api/invoices", async (req, res) => {
    const filters = {
      status: req.query.status as string | undefined,
      customerId: req.query.customerId as string | undefined,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
    };
    const invoices = await storage.listInvoices(filters);
    res.json(invoices);
  });

  app.get("/api/invoices/:id", async (req, res) => {
    const invoice = await storage.getInvoice(req.params.id);
    if (!invoice) return res.status(404).json({ error: "Rechnung nicht gefunden" });
    res.json(invoice);
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      const invoice = await storage.createInvoice(req.body);
      res.status(201).json(invoice);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put("/api/invoices/:id", async (req, res) => {
    const invoice = await storage.updateInvoice(req.params.id, req.body);
    if (!invoice) return res.status(404).json({ error: "Rechnung nicht gefunden" });
    res.json(invoice);
  });

  app.post("/api/invoices/:id/cancel", async (req, res) => {
    const invoice = await storage.cancelInvoice(req.params.id);
    if (!invoice) return res.status(404).json({ error: "Rechnung nicht gefunden" });
    res.json(invoice);
  });

  app.post("/api/invoices/:id/mark-paid", async (req, res) => {
    const invoice = await storage.markInvoicePaid(req.params.id);
    if (!invoice) return res.status(404).json({ error: "Rechnung nicht gefunden" });
    res.json(invoice);
  });

  // ── Invoice Items ──
  app.get("/api/invoice-items", async (req, res) => {
    const invoiceId = req.query.invoiceId as string;
    if (!invoiceId) return res.status(400).json({ error: "invoiceId required" });
    const items = await storage.listInvoiceItems(invoiceId);
    res.json(items);
  });

  app.post("/api/invoice-items", async (req, res) => {
    try {
      const item = await storage.createInvoiceItem(req.body);
      res.status(201).json(item);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put("/api/invoice-items/:id", async (req, res) => {
    const item = await storage.updateInvoiceItem(req.params.id, req.body);
    if (!item) return res.status(404).json({ error: "Position nicht gefunden" });
    res.json(item);
  });

  app.delete("/api/invoice-items/:id", async (req, res) => {
    const success = await storage.deleteInvoiceItem(req.params.id);
    if (!success) return res.status(404).json({ error: "Position nicht gefunden" });
    res.json({ success: true });
  });

  // ── Bookings ──
  app.get("/api/bookings", async (req, res) => {
    const filters = {
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
      category: req.query.category as string | undefined,
      type: req.query.type as string | undefined,
    };
    const bookings = await storage.listBookings(filters);
    res.json(bookings);
  });

  app.get("/api/bookings/:id", async (req, res) => {
    const booking = await storage.getBooking(req.params.id);
    if (!booking) return res.status(404).json({ error: "Buchung nicht gefunden" });
    res.json(booking);
  });

  app.post("/api/bookings", async (req, res) => {
    try {
      const booking = await storage.createBooking(req.body);
      res.status(201).json(booking);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/bookings/:id/cancel", async (req, res) => {
    const booking = await storage.cancelBooking(req.params.id);
    if (!booking) return res.status(404).json({ error: "Buchung nicht gefunden" });
    res.json(booking);
  });

  // ── Audit Log ──
  app.get("/api/audit-log", async (req, res) => {
    const entityType = req.query.entityType as string | undefined;
    const entityId = req.query.entityId as string | undefined;
    if (entityType && entityId) {
      const logs = await storage.listAuditLogByEntity(entityType, entityId);
      return res.json(logs);
    }
    const logs = await storage.listAuditLog();
    res.json(logs);
  });

  // ── Settings ──
  app.get("/api/settings", async (_req, res) => {
    const settings = await storage.getSettings();
    res.json(settings);
  });

  app.put("/api/settings", async (req, res) => {
    const settings = await storage.updateSettings(req.body);
    res.json(settings);
  });

  // ── Export ──
  app.get("/api/export", async (req, res) => {
    const year = (req.query.year as string) || "2026";
    const data = await storage.exportData(year);
    res.json(data);
  });

  // ── Dashboard ──
  app.get("/api/dashboard", async (_req, res) => {
    const data = await storage.getDashboard();
    res.json(data);
  });

  return httpServer;
}
