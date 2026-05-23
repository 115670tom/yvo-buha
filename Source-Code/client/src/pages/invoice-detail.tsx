import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice, InvoiceItem, Customer, Settings } from "@shared/schema";
import { INVOICE_STATUS_LABELS, VAT_RATES } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Trash2, Printer, Send, CheckCircle, XCircle } from "lucide-react";

function statusColor(status: string) {
  switch (status) {
    case "entwurf": return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    case "gesendet": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "teilweise_bezahlt": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "bezahlt": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "storniert": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    default: return "";
  }
}

export default function InvoiceDetailPage({ id }: { id: string }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const printRef = useRef<HTMLDivElement>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    description: "",
    quantity: "1",
    unitPrice: "",
    vatRate: "8.1",
  });

  const { data: invoice, isLoading: loadingInvoice } = useQuery<Invoice>({
    queryKey: ["/api/invoices", id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/invoices/${id}`);
      return res.json();
    },
  });

  const { data: items, isLoading: loadingItems } = useQuery<InvoiceItem[]>({
    queryKey: ["/api/invoice-items", id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/invoice-items?invoiceId=${id}`);
      return res.json();
    },
  });

  const { data: customers } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });
  const { data: settings } = useQuery<Settings>({ queryKey: ["/api/settings"] });

  const customer = customers?.find((c) => c.id === invoice?.customerId);

  // Add item
  const addItemMutation = useMutation({
    mutationFn: async (item: typeof newItem) => {
      const qty = parseFloat(item.quantity);
      const price = parseFloat(item.unitPrice);
      const total = (qty * price).toFixed(2);
      const position = (items?.length ?? 0) + 1;
      const res = await apiRequest("POST", "/api/invoice-items", {
        invoiceId: id,
        position,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatRate: item.vatRate,
        total,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoice-items", id] });
      setNewItem({ description: "", quantity: "1", unitPrice: "", vatRate: "8.1" });
      recalcTotals();
    },
  });

  // Delete item
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiRequest("DELETE", `/api/invoice-items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoice-items", id] });
      setTimeout(recalcTotals, 300);
    },
  });

  // Update invoice status
  const updateStatusMutation = useMutation({
    mutationFn: async (action: "send" | "pay" | "cancel") => {
      if (action === "cancel") {
        const res = await apiRequest("POST", `/api/invoices/${id}/cancel`);
        return res.json();
      }
      if (action === "pay") {
        const res = await apiRequest("POST", `/api/invoices/${id}/mark-paid`);
        // Also create a booking
        if (invoice) {
          await apiRequest("POST", "/api/bookings", {
            bookingDate: new Date().toISOString().split("T")[0],
            amount: invoice.total,
            type: "einnahme",
            category: "umsatz",
            vatRate: "",
            vatAmount: "",
            counterAccount: "bank",
            invoiceId: id,
            description: `Zahlung ${invoice.invoiceNumber}`,
          });
        }
        return res.json();
      }
      // send
      const res = await apiRequest("PUT", `/api/invoices/${id}`, { status: "gesendet" });
      return res.json();
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setCancelDialogOpen(false);
      const msg = { send: "Als gesendet markiert", pay: "Als bezahlt markiert", cancel: "Rechnung storniert" };
      toast({ title: msg[action] });
    },
  });

  async function recalcTotals() {
    // Wait for items to refresh, then recalculate
    const res = await apiRequest("GET", `/api/invoice-items?invoiceId=${id}`);
    const currentItems: InvoiceItem[] = await res.json();

    let subtotal = 0;
    let vatTotal = 0;
    for (const item of currentItems) {
      const t = parseFloat(item.total);
      const vr = parseFloat(item.vatRate);
      subtotal += t;
      if (vr > 0) {
        vatTotal += t * vr / (100 + vr);
      }
    }
    const total = subtotal;

    await apiRequest("PUT", `/api/invoices/${id}`, {
      subtotal: subtotal.toFixed(2),
      vatTotal: vatTotal.toFixed(2),
      total: total.toFixed(2),
    });
    queryClient.invalidateQueries({ queryKey: ["/api/invoices", id] });
  }

  function handlePrint() {
    const printContent = printRef.current;
    if (!printContent) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html><head><title>${invoice?.invoiceNumber ?? "Rechnung"}</title>
      <style>
        body { font-family: Inter, sans-serif; padding: 40px; color: #1a1a2e; }
        h1 { font-size: 24px; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; font-size: 13px; }
        th { font-weight: 600; background: #f5f5f5; }
        .text-right { text-align: right; }
        .total-row { font-weight: 700; }
        .header { display: flex; justify-content: space-between; margin-bottom: 32px; }
        .address { font-size: 13px; line-height: 1.6; }
        .meta { font-size: 13px; margin-bottom: 20px; }
      </style></head><body>
      ${printContent.innerHTML}
      </body></html>
    `);
    win.document.close();
    win.print();
  }

  if (loadingInvoice || loadingItems) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (!invoice) {
    return <p className="text-muted-foreground">Rechnung nicht gefunden.</p>;
  }

  const status = invoice.status ?? "entwurf";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/rechnungen")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold" data-testid="page-title">{invoice.invoiceNumber}</h1>
        <Badge variant="secondary" className={`text-xs ${statusColor(status)}`}>
          {INVOICE_STATUS_LABELS[status]}
        </Badge>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2" data-testid="invoice-actions">
        {status === "entwurf" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateStatusMutation.mutate("send")}
            disabled={updateStatusMutation.isPending}
            data-testid="button-mark-sent"
          >
            <Send className="h-3.5 w-3.5 mr-1.5" /> Als gesendet markieren
          </Button>
        )}
        {(status === "gesendet" || status === "teilweise_bezahlt") && (
          <Button
            size="sm"
            onClick={() => updateStatusMutation.mutate("pay")}
            disabled={updateStatusMutation.isPending}
            data-testid="button-mark-paid"
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Als bezahlt markieren
          </Button>
        )}
        {status !== "storniert" && status !== "bezahlt" && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setCancelDialogOpen(true)}
            data-testid="button-cancel-invoice"
          >
            <XCircle className="h-3.5 w-3.5 mr-1.5" /> Stornieren
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={handlePrint} data-testid="button-print">
          <Printer className="h-3.5 w-3.5 mr-1.5" /> PDF Vorschau
        </Button>
      </div>

      {/* Invoice Preview (for print) */}
      <div ref={printRef} className="hidden">
        <div className="header">
          <div className="address">
            <strong>{settings?.companyName}</strong><br />
            {settings?.companyAddress}<br />
            {settings?.companyZip} {settings?.companyCity}<br />
            {settings?.companyEmail}<br />
            {settings?.companyPhone}
          </div>
          <div className="address">
            <strong>{customer?.name}</strong><br />
            {customer?.company && <>{customer.company}<br /></>}
            {customer?.address}<br />
            {customer?.zip} {customer?.city}
          </div>
        </div>
        <h1>Rechnung {invoice.invoiceNumber}</h1>
        <div className="meta">
          Rechnungsdatum: {formatDate(invoice.invoiceDate)} | Fällig bis: {formatDate(invoice.dueDate)}
        </div>
        <table>
          <thead>
            <tr>
              <th>Pos</th>
              <th>Beschreibung</th>
              <th className="text-right">Menge</th>
              <th className="text-right">Einzelpreis</th>
              <th className="text-right">MWST</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items?.map((item) => (
              <tr key={item.id}>
                <td>{item.position}</td>
                <td>{item.description}</td>
                <td className="text-right">{item.quantity}</td>
                <td className="text-right">{formatCurrency(item.unitPrice)}</td>
                <td className="text-right">{item.vatRate}%</td>
                <td className="text-right">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table>
          <tbody>
            <tr><td>Zwischensumme</td><td className="text-right">{formatCurrency(invoice.subtotal)}</td></tr>
            <tr><td>MWST</td><td className="text-right">{formatCurrency(invoice.vatTotal)}</td></tr>
            <tr className="total-row"><td><strong>Total</strong></td><td className="text-right"><strong>{formatCurrency(invoice.total)}</strong></td></tr>
          </tbody>
        </table>
        {settings?.companyIban && (
          <p style={{ marginTop: "24px", fontSize: "13px" }}>
            Zahlbar auf IBAN: {settings.companyIban}
          </p>
        )}
      </div>

      {/* Visible invoice detail */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Rechnungsdetails</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Rechnungsdatum:</span> {formatDate(invoice.invoiceDate)}</p>
            <p><span className="text-muted-foreground">Fällig bis:</span> {formatDate(invoice.dueDate)}</p>
            <p><span className="text-muted-foreground">Zahlungsfrist:</span> {invoice.paymentTermDays} Tage</p>
            {invoice.notes && <p><span className="text-muted-foreground">Notizen:</span> {invoice.notes}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Kunde</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            {customer ? (
              <>
                <p className="font-medium">{customer.name}</p>
                {customer.company && <p>{customer.company}</p>}
                <p>{customer.address}</p>
                <p>{customer.zip} {customer.city}</p>
                {customer.email && <p>{customer.email}</p>}
              </>
            ) : (
              <p className="text-muted-foreground">Kunde nicht gefunden</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card data-testid="invoice-items-section">
        <CardHeader>
          <CardTitle className="text-sm">Positionen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-12">Pos</TableHead>
                  <TableHead className="text-xs">Beschreibung</TableHead>
                  <TableHead className="text-xs text-right w-20">Menge</TableHead>
                  <TableHead className="text-xs text-right w-28">Einzelpreis</TableHead>
                  <TableHead className="text-xs text-right w-20">MWST</TableHead>
                  <TableHead className="text-xs text-right w-28">Total</TableHead>
                  <TableHead className="text-xs w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items?.map((item) => (
                  <TableRow key={item.id} data-testid={`item-row-${item.id}`}>
                    <TableCell className="text-sm">{item.position}</TableCell>
                    <TableCell className="text-sm">{item.description}</TableCell>
                    <TableCell className="text-sm text-right">{item.quantity}</TableCell>
                    <TableCell className="text-sm text-right">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-sm text-right">{item.vatRate}%</TableCell>
                    <TableCell className="text-sm text-right font-medium">{formatCurrency(item.total)}</TableCell>
                    <TableCell>
                      {status === "entwurf" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => deleteItemMutation.mutate(item.id)}
                          data-testid={`button-delete-item-${item.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(items?.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-sm">
                      Noch keine Positionen.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Add item form */}
          {status === "entwurf" && (
            <div className="mt-3 flex flex-wrap gap-2 items-end" data-testid="add-item-form">
              <div className="flex-1 min-w-48 space-y-1">
                <Label className="text-xs">Beschreibung</Label>
                <Input
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Leistung / Produkt"
                  data-testid="input-item-description"
                />
              </div>
              <div className="w-20 space-y-1">
                <Label className="text-xs">Menge</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                  data-testid="input-item-quantity"
                />
              </div>
              <div className="w-28 space-y-1">
                <Label className="text-xs">Einzelpreis</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newItem.unitPrice}
                  onChange={(e) => setNewItem({ ...newItem, unitPrice: e.target.value })}
                  data-testid="input-item-price"
                />
              </div>
              <div className="w-32 space-y-1">
                <Label className="text-xs">MWST-Satz</Label>
                <Select value={newItem.vatRate} onValueChange={(v) => setNewItem({ ...newItem, vatRate: v })}>
                  <SelectTrigger data-testid="select-item-vat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VAT_RATES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  if (newItem.description && newItem.unitPrice) {
                    addItemMutation.mutate(newItem);
                  }
                }}
                disabled={addItemMutation.isPending || !newItem.description || !newItem.unitPrice}
                data-testid="button-add-item"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Hinzufügen
              </Button>
            </div>
          )}

          {/* Totals */}
          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Zwischensumme</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">MWST</span>
                <span>{formatCurrency(invoice.vatTotal)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-1">
                <span>Total</span>
                <span data-testid="invoice-total">{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cancel confirmation */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechnung stornieren?</AlertDialogTitle>
            <AlertDialogDescription>
              Die Rechnung wird als storniert markiert. Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-dialog-abort">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => updateStatusMutation.mutate("cancel")}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-cancel-dialog-confirm"
            >
              Stornieren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
