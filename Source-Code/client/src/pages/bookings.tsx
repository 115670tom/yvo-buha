import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, todayISO, calcVatAmount } from "@/lib/utils";
import type { Booking, Receipt } from "@shared/schema";
import { CATEGORIES, CATEGORY_LABELS, VAT_RATES } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Plus, Download, X } from "lucide-react";

const EMPTY_FORM = {
  bookingDate: todayISO(),
  amount: "",
  type: "ausgabe",
  category: "sonstiges",
  vatRate: "8.1",
  vatAmount: "",
  counterAccount: "bank",
  receiptId: "",
  description: "",
  notes: "",
};

export default function BookingsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState("");

  const queryParams = new URLSearchParams();
  if (dateFrom) queryParams.set("dateFrom", dateFrom);
  if (dateTo) queryParams.set("dateTo", dateTo);
  if (filterCategory && filterCategory !== "all") queryParams.set("category", filterCategory);
  if (filterType && filterType !== "all") queryParams.set("type", filterType);
  const qs = queryParams.toString();

  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings", qs],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/bookings${qs ? `?${qs}` : ""}`);
      return res.json();
    },
  });

  const { data: receipts } = useQuery<Receipt[]>({ queryKey: ["/api/receipts"] });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest("POST", "/api/bookings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setDialogOpen(false);
      setForm({ ...EMPTY_FORM });
      toast({ title: "Buchung erstellt" });
    },
    onError: (e: Error) => {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/bookings/${id}/cancel`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setCancelId(null);
      toast({ title: "Buchung storniert" });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate(form);
  }

  function handleAmountOrVatChange(field: "amount" | "vatRate", value: string) {
    const newForm = { ...form, [field]: value };
    if (newForm.amount && newForm.vatRate) {
      newForm.vatAmount = calcVatAmount(newForm.amount, newForm.vatRate);
    }
    setForm(newForm);
  }

  function exportCSV() {
    if (!bookings || bookings.length === 0) return;
    const headers = ["Datum", "Beschreibung", "Kategorie", "Typ", "Betrag", "MWST", "Gegenkonto", "Status"];
    const rows = bookings.map((b) => [
      formatDate(b.bookingDate),
      b.description,
      CATEGORY_LABELS[b.category] ?? b.category,
      b.type === "einnahme" ? "Einnahme" : "Ausgabe",
      b.amount,
      b.vatAmount ?? "0",
      b.counterAccount ?? "",
      b.status === "aktiv" ? "Aktiv" : "Storniert",
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `buchungen_export_${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Running totals
  const activeBookings = (bookings ?? []).filter((b) => b.status === "aktiv");
  const totalIncome = activeBookings.filter((b) => b.type === "einnahme").reduce((s, b) => s + parseFloat(b.amount), 0);
  const totalExpenses = activeBookings.filter((b) => b.type === "ausgabe").reduce((s, b) => s + parseFloat(b.amount), 0);
  const balance = totalIncome - totalExpenses;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold" data-testid="page-title">Buchungen</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} data-testid="button-export-csv">
            <Download className="h-4 w-4 mr-1.5" /> CSV Export
          </Button>
          <Button onClick={() => { setForm({ ...EMPTY_FORM }); setDialogOpen(true); }} data-testid="button-new-booking">
            <Plus className="h-4 w-4 mr-1.5" /> Neue Buchung
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end" data-testid="booking-filters">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Datum von</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36 h-8 text-sm" data-testid="filter-date-from" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Datum bis</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36 h-8 text-sm" data-testid="filter-date-to" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Kategorie</Label>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-36 h-8 text-sm" data-testid="filter-category">
              <SelectValue placeholder="Alle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Typ</Label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-32 h-8 text-sm" data-testid="filter-type">
              <SelectValue placeholder="Alle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle</SelectItem>
              <SelectItem value="einnahme">Einnahme</SelectItem>
              <SelectItem value="ausgabe">Ausgabe</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(dateFrom || dateTo || filterCategory || filterType) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setDateFrom(""); setDateTo(""); setFilterCategory(""); setFilterType(""); }}
            data-testid="button-clear-filters"
          >
            <X className="h-3.5 w-3.5 mr-1" /> Zurücksetzen
          </Button>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-64 rounded-lg" />
      ) : (
        <div className="border rounded-lg overflow-auto">
          <Table data-testid="bookings-table">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Datum</TableHead>
                <TableHead className="text-xs">Beschreibung</TableHead>
                <TableHead className="text-xs">Kategorie</TableHead>
                <TableHead className="text-xs text-right">Einnahme</TableHead>
                <TableHead className="text-xs text-right">Ausgabe</TableHead>
                <TableHead className="text-xs text-right">MWST</TableHead>
                <TableHead className="text-xs">Gegenkonto</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(bookings?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-sm">
                    Noch keine Buchungen vorhanden.
                  </TableCell>
                </TableRow>
              ) : (
                bookings?.map((b) => (
                  <TableRow key={b.id} data-testid={`booking-row-${b.id}`}>
                    <TableCell className="text-sm">{formatDate(b.bookingDate)}</TableCell>
                    <TableCell className="text-sm">{b.description}</TableCell>
                    <TableCell className="text-sm">{CATEGORY_LABELS[b.category] ?? b.category}</TableCell>
                    <TableCell className="text-sm text-right text-emerald-600 font-medium">
                      {b.type === "einnahme" ? formatCurrency(b.amount) : ""}
                    </TableCell>
                    <TableCell className="text-sm text-right text-red-500 font-medium">
                      {b.type === "ausgabe" ? formatCurrency(b.amount) : ""}
                    </TableCell>
                    <TableCell className="text-sm text-right">
                      {b.vatAmount ? formatCurrency(b.vatAmount) : "–"}
                    </TableCell>
                    <TableCell className="text-sm capitalize">{b.counterAccount ?? "–"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          b.status === "storniert"
                            ? "text-red-500 border-red-300"
                            : "text-emerald-600 border-emerald-300"
                        }`}
                      >
                        {b.status === "storniert" ? "Storniert" : "Aktiv"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {b.status === "aktiv" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-destructive"
                          onClick={() => setCancelId(b.id)}
                          data-testid={`button-cancel-booking-${b.id}`}
                        >
                          Storno
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Running totals */}
      <div className="flex flex-wrap gap-6 text-sm font-medium" data-testid="booking-totals">
        <div>
          <span className="text-muted-foreground mr-2">Summe Einnahmen:</span>
          <span className="text-emerald-600">{formatCurrency(totalIncome)}</span>
        </div>
        <div>
          <span className="text-muted-foreground mr-2">Summe Ausgaben:</span>
          <span className="text-red-500">{formatCurrency(totalExpenses)}</span>
        </div>
        <div>
          <span className="text-muted-foreground mr-2">Saldo:</span>
          <span className={balance >= 0 ? "text-emerald-600" : "text-red-500"}>{formatCurrency(balance)}</span>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Neue Buchung</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3" data-testid="booking-form">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Datum *</Label>
                <Input
                  type="date"
                  value={form.bookingDate}
                  onChange={(e) => setForm({ ...form, bookingDate: e.target.value })}
                  required
                  data-testid="input-booking-date"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Betrag *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => handleAmountOrVatChange("amount", e.target.value)}
                  required
                  data-testid="input-booking-amount"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Beschreibung *</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
                data-testid="input-booking-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Typ *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger data-testid="select-booking-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="einnahme">Einnahme</SelectItem>
                    <SelectItem value="ausgabe">Ausgabe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Kategorie *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger data-testid="select-booking-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">MWST-Satz</Label>
                <Select value={form.vatRate} onValueChange={(v) => handleAmountOrVatChange("vatRate", v)}>
                  <SelectTrigger data-testid="select-booking-vat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VAT_RATES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">MWST-Betrag</Label>
                <Input value={form.vatAmount} readOnly className="bg-muted" data-testid="display-booking-vat" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Gegenkonto</Label>
                <Select value={form.counterAccount} onValueChange={(v) => setForm({ ...form, counterAccount: v })}>
                  <SelectTrigger data-testid="select-counter-account">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="kasse">Kasse</SelectItem>
                    <SelectItem value="privat">Privat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Beleg-Referenz</Label>
              <Select value={form.receiptId} onValueChange={(v) => setForm({ ...form, receiptId: v })}>
                <SelectTrigger data-testid="select-receipt-ref">
                  <SelectValue placeholder="Kein Beleg" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Kein Beleg</SelectItem>
                  {(receipts ?? []).filter(r => r.status === "aktiv").map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.receiptNumber} – {r.supplierCustomer}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Notiz</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                data-testid="input-booking-notes"
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-booking">
                {createMutation.isPending ? "Speichern..." : "Speichern"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Buchung stornieren?</AlertDialogTitle>
            <AlertDialogDescription>
              Die Buchung wird als storniert markiert. Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-booking-abort">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelId && cancelMutation.mutate(cancelId)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-cancel-booking-confirm"
            >
              Stornieren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
