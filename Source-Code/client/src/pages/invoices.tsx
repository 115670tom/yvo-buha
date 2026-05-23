import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { formatCurrency, formatDate, todayISO } from "@/lib/utils";
import type { Invoice, Customer } from "@shared/schema";
import { INVOICE_STATUS_LABELS } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";

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

export default function InvoicesPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCustomer, setFilterCustomer] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const queryParams = new URLSearchParams();
  if (filterStatus && filterStatus !== "all") queryParams.set("status", filterStatus);
  if (filterCustomer && filterCustomer !== "all") queryParams.set("customerId", filterCustomer);
  if (dateFrom) queryParams.set("dateFrom", dateFrom);
  if (dateTo) queryParams.set("dateTo", dateTo);
  const qs = queryParams.toString();

  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices", qs],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/invoices${qs ? `?${qs}` : ""}`);
      return res.json();
    },
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  // New invoice form
  const [form, setForm] = useState({
    customerId: "",
    invoiceDate: todayISO(),
    dueDate: "",
    paymentTermDays: 30,
    notes: "",
    paymentInfo: "",
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest("POST", "/api/invoices", {
        ...data,
        subtotal: "0",
        vatTotal: "0",
        total: "0",
        status: "entwurf",
      });
      return res.json();
    },
    onSuccess: (invoice: Invoice) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setDialogOpen(false);
      navigate(`/rechnungen/${invoice.id}`);
      toast({ title: "Rechnung erstellt" });
    },
    onError: (e: Error) => {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    },
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    // Auto-calculate due date
    const d = new Date(form.invoiceDate);
    d.setDate(d.getDate() + form.paymentTermDays);
    const dueDate = d.toISOString().split("T")[0];
    createMutation.mutate({ ...form, dueDate });
  }

  const customerMap = new Map((customers ?? []).map((c) => [c.id, c]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold" data-testid="page-title">Rechnungen</h1>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-new-invoice">
          <Plus className="h-4 w-4 mr-1.5" /> Neue Rechnung
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end" data-testid="invoice-filters">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40 h-8 text-sm" data-testid="filter-status">
              <SelectValue placeholder="Alle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              <SelectItem value="entwurf">Entwurf</SelectItem>
              <SelectItem value="gesendet">Gesendet</SelectItem>
              <SelectItem value="teilweise_bezahlt">Teilw. bezahlt</SelectItem>
              <SelectItem value="bezahlt">Bezahlt</SelectItem>
              <SelectItem value="storniert">Storniert</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Kunde</Label>
          <Select value={filterCustomer} onValueChange={setFilterCustomer}>
            <SelectTrigger className="w-44 h-8 text-sm" data-testid="filter-customer">
              <SelectValue placeholder="Alle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              {(customers ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Datum von</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36 h-8 text-sm" data-testid="filter-date-from" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Datum bis</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36 h-8 text-sm" data-testid="filter-date-to" />
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 rounded-lg" />
      ) : (
        <div className="border rounded-lg overflow-auto">
          <Table data-testid="invoices-table">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Rechnungs-Nr</TableHead>
                <TableHead className="text-xs">Datum</TableHead>
                <TableHead className="text-xs">Kunde</TableHead>
                <TableHead className="text-xs text-right">Betrag</TableHead>
                <TableHead className="text-xs text-right">MWST</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(invoices?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                    Noch keine Rechnungen vorhanden.
                  </TableCell>
                </TableRow>
              ) : (
                invoices?.map((inv) => (
                  <TableRow
                    key={inv.id}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => navigate(`/rechnungen/${inv.id}`)}
                    data-testid={`invoice-row-${inv.id}`}
                  >
                    <TableCell className="text-sm font-medium">{inv.invoiceNumber}</TableCell>
                    <TableCell className="text-sm">{formatDate(inv.invoiceDate)}</TableCell>
                    <TableCell className="text-sm">
                      {customerMap.get(inv.customerId)?.name ?? inv.customerId}
                    </TableCell>
                    <TableCell className="text-sm text-right font-medium">
                      {formatCurrency(inv.total)}
                    </TableCell>
                    <TableCell className="text-sm text-right">
                      {formatCurrency(inv.vatTotal)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-xs ${statusColor(inv.status ?? "entwurf")}`}>
                        {INVOICE_STATUS_LABELS[inv.status ?? "entwurf"]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Invoice Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Neue Rechnung</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3" data-testid="invoice-form">
            <div className="space-y-1">
              <Label className="text-xs">Kunde *</Label>
              <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}>
                <SelectTrigger data-testid="select-customer">
                  <SelectValue placeholder="Kunde wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {(customers ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(customers?.length ?? 0) === 0 && (
                <p className="text-xs text-muted-foreground">Bitte zuerst einen Kunden anlegen.</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Rechnungsdatum *</Label>
                <Input
                  type="date"
                  value={form.invoiceDate}
                  onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })}
                  required
                  data-testid="input-invoice-date"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Zahlungsfrist (Tage)</Label>
                <Input
                  type="number"
                  value={form.paymentTermDays}
                  onChange={(e) => setForm({ ...form, paymentTermDays: parseInt(e.target.value) || 30 })}
                  data-testid="input-payment-term"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notizen</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                data-testid="input-invoice-notes"
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!form.customerId || createMutation.isPending} data-testid="button-create-invoice">
                {createMutation.isPending ? "Erstellen..." : "Erstellen & Positionen hinzufügen"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
