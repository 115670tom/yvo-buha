import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, todayISO, calcVatAmount } from "@/lib/utils";
import type { Receipt } from "@shared/schema";
import { CATEGORIES, CATEGORY_LABELS, ENTRY_TYPES, PAYMENT_METHODS, PAYMENT_METHOD_LABELS, VAT_RATES } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Search, X } from "lucide-react";

const EMPTY_FORM = {
  receiptDate: todayISO(),
  bookingDate: "",
  amount: "",
  currency: "CHF",
  vatRate: "8.1",
  vatAmount: "",
  supplierCustomer: "",
  category: "umsatz",
  type: "ausgabe",
  paymentMethod: "bank",
  project: "",
  notes: "",
  isPrivate: 0,
  fileName: "",
  fileData: "",
};

export default function ReceiptsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState("");
  const [search, setSearch] = useState("");

  const queryParams = new URLSearchParams();
  if (dateFrom) queryParams.set("dateFrom", dateFrom);
  if (dateTo) queryParams.set("dateTo", dateTo);
  if (filterCategory) queryParams.set("category", filterCategory);
  if (filterType) queryParams.set("type", filterType);
  if (search) queryParams.set("search", search);
  const queryString = queryParams.toString();

  const { data: receipts, isLoading } = useQuery<Receipt[]>({
    queryKey: ["/api/receipts", queryString],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/receipts${queryString ? `?${queryString}` : ""}`);
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest("POST", "/api/receipts", {
        ...data,
        isPrivate: data.isPrivate ? 1 : 0,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/receipts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setDialogOpen(false);
      setForm({ ...EMPTY_FORM });
      toast({ title: "Beleg erstellt" });
    },
    onError: (e: Error) => {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof form }) => {
      const res = await apiRequest("PUT", `/api/receipts/${id}`, {
        ...data,
        isPrivate: data.isPrivate ? 1 : 0,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/receipts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setDialogOpen(false);
      setEditingReceipt(null);
      setForm({ ...EMPTY_FORM });
      toast({ title: "Beleg aktualisiert" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/receipts/${id}/cancel`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/receipts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setCancelId(null);
      toast({ title: "Beleg storniert" });
    },
  });

  function openNew() {
    setEditingReceipt(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  }

  function openEdit(r: Receipt) {
    setEditingReceipt(r);
    setForm({
      receiptDate: r.receiptDate,
      bookingDate: r.bookingDate ?? "",
      amount: r.amount,
      currency: r.currency ?? "CHF",
      vatRate: r.vatRate ?? "8.1",
      vatAmount: r.vatAmount ?? "",
      supplierCustomer: r.supplierCustomer,
      category: r.category,
      type: r.type,
      paymentMethod: r.paymentMethod ?? "bank",
      project: r.project ?? "",
      notes: r.notes ?? "",
      isPrivate: r.isPrivate ?? 0,
      fileName: r.fileName ?? "",
      fileData: r.fileData ?? "",
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingReceipt) {
      updateMutation.mutate({ id: editingReceipt.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  function handleAmountOrVatChange(field: "amount" | "vatRate", value: string) {
    const newForm = { ...form, [field]: value };
    if (newForm.amount && newForm.vatRate) {
      newForm.vatAmount = calcVatAmount(newForm.amount, newForm.vatRate);
    }
    setForm(newForm);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        fileName: file.name,
        fileData: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold" data-testid="page-title">Belege</h1>
        <Button onClick={openNew} data-testid="button-new-receipt">
          <Plus className="h-4 w-4 mr-1.5" /> Neuer Beleg
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end" data-testid="receipt-filters">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Datum von</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-36 h-8 text-sm"
            data-testid="filter-date-from"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Datum bis</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-36 h-8 text-sm"
            data-testid="filter-date-to"
          />
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
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Suche</Label>
          <div className="relative">
            <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suchen..."
              className="pl-7 w-44 h-8 text-sm"
              data-testid="filter-search"
            />
          </div>
        </div>
        {(dateFrom || dateTo || filterCategory || filterType || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              setFilterCategory("");
              setFilterType("");
              setSearch("");
            }}
            data-testid="button-clear-filters"
          >
            <X className="h-3.5 w-3.5 mr-1" /> Zurücksetzen
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <Skeleton className="h-64 rounded-lg" />
      ) : (
        <div className="border rounded-lg overflow-auto">
          <Table data-testid="receipts-table">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Beleg-Nr</TableHead>
                <TableHead className="text-xs">Datum</TableHead>
                <TableHead className="text-xs">Lieferant/Kunde</TableHead>
                <TableHead className="text-xs">Kategorie</TableHead>
                <TableHead className="text-xs text-right">Betrag</TableHead>
                <TableHead className="text-xs text-right">MWST</TableHead>
                <TableHead className="text-xs">Typ</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(receipts?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                    Noch keine Belege vorhanden.
                  </TableCell>
                </TableRow>
              ) : (
                receipts?.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => r.status !== "storniert" && openEdit(r)}
                    data-testid={`receipt-row-${r.id}`}
                  >
                    <TableCell className="text-sm font-medium">{r.receiptNumber}</TableCell>
                    <TableCell className="text-sm">{formatDate(r.receiptDate)}</TableCell>
                    <TableCell className="text-sm">{r.supplierCustomer}</TableCell>
                    <TableCell className="text-sm">{CATEGORY_LABELS[r.category] ?? r.category}</TableCell>
                    <TableCell className="text-sm text-right font-medium">
                      {formatCurrency(r.amount)}
                    </TableCell>
                    <TableCell className="text-sm text-right">
                      {r.vatAmount ? formatCurrency(r.vatAmount) : "–"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={r.type === "einnahme" ? "default" : "secondary"}
                        className={`text-xs ${
                          r.type === "einnahme"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {r.type === "einnahme" ? "Einnahme" : "Ausgabe"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          r.status === "storniert"
                            ? "text-red-500 border-red-300"
                            : "text-emerald-600 border-emerald-300"
                        }`}
                      >
                        {r.status === "storniert" ? "Storniert" : "Aktiv"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingReceipt ? "Beleg bearbeiten" : "Neuer Beleg"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3" data-testid="receipt-form">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Belegdatum *</Label>
                <Input
                  type="date"
                  value={form.receiptDate}
                  onChange={(e) => setForm({ ...form, receiptDate: e.target.value })}
                  required
                  data-testid="input-receipt-date"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Buchungsdatum</Label>
                <Input
                  type="date"
                  value={form.bookingDate}
                  onChange={(e) => setForm({ ...form, bookingDate: e.target.value })}
                  data-testid="input-booking-date"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Lieferant/Kunde *</Label>
              <Input
                value={form.supplierCustomer}
                onChange={(e) => setForm({ ...form, supplierCustomer: e.target.value })}
                required
                data-testid="input-supplier"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Betrag *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => handleAmountOrVatChange("amount", e.target.value)}
                  required
                  data-testid="input-amount"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">MWST-Satz</Label>
                <Select
                  value={form.vatRate}
                  onValueChange={(v) => handleAmountOrVatChange("vatRate", v)}
                >
                  <SelectTrigger data-testid="select-vat-rate">
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
                <Input
                  value={form.vatAmount}
                  readOnly
                  className="bg-muted"
                  data-testid="input-vat-amount"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Kategorie *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Typ *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger data-testid="select-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="einnahme">Einnahme</SelectItem>
                    <SelectItem value="ausgabe">Ausgabe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Zahlungsart</Label>
                <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v })}>
                  <SelectTrigger data-testid="select-payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Projekt</Label>
                <Input
                  value={form.project}
                  onChange={(e) => setForm({ ...form, project: e.target.value })}
                  data-testid="input-project"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Notiz</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                data-testid="input-notes"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Datei hochladen</Label>
              <Input type="file" onChange={handleFileUpload} data-testid="input-file" />
              {form.fileName && (
                <p className="text-xs text-muted-foreground">{form.fileName}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={!!form.isPrivate}
                onCheckedChange={(checked) => setForm({ ...form, isPrivate: checked ? 1 : 0 })}
                data-testid="switch-private"
              />
              <Label className="text-xs">Privat</Label>
            </div>

            <DialogFooter className="flex gap-2">
              {editingReceipt && editingReceipt.status !== "storniert" && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setDialogOpen(false);
                    setCancelId(editingReceipt.id);
                  }}
                  data-testid="button-cancel-receipt"
                >
                  Stornieren
                </Button>
              )}
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-receipt"
              >
                {createMutation.isPending || updateMutation.isPending ? "Speichern..." : "Speichern"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Beleg stornieren?</AlertDialogTitle>
            <AlertDialogDescription>
              Der Beleg wird als storniert markiert und kann nicht mehr bearbeitet werden.
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-abort">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelId && cancelMutation.mutate(cancelId)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-cancel-confirm"
            >
              Stornieren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
