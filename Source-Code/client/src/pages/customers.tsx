import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Customer, Invoice } from "@shared/schema";
import { INVOICE_STATUS_LABELS } from "@shared/schema";
import { formatCurrency, formatDate } from "@/lib/utils";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";

const EMPTY_FORM = {
  name: "",
  company: "",
  address: "",
  zip: "",
  city: "",
  country: "CH",
  email: "",
  phone: "",
  uid: "",
  notes: "",
};

export default function CustomersPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: invoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest("POST", "/api/customers", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setDialogOpen(false);
      setForm({ ...EMPTY_FORM });
      toast({ title: "Kunde erstellt" });
    },
    onError: (e: Error) => {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof form }) => {
      const res = await apiRequest("PUT", `/api/customers/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setDialogOpen(false);
      setDetailCustomer(null);
      setEditing(false);
      setForm({ ...EMPTY_FORM });
      toast({ title: "Kunde aktualisiert" });
    },
  });

  function openNew() {
    setEditing(false);
    setDetailCustomer(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  }

  function openEdit(c: Customer) {
    setEditing(true);
    setDetailCustomer(c);
    setForm({
      name: c.name,
      company: c.company ?? "",
      address: c.address ?? "",
      zip: c.zip ?? "",
      city: c.city ?? "",
      country: c.country ?? "CH",
      email: c.email ?? "",
      phone: c.phone ?? "",
      uid: c.uid ?? "",
      notes: c.notes ?? "",
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editing && detailCustomer) {
      updateMutation.mutate({ id: detailCustomer.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const customerInvoices = detailCustomer
    ? (invoices ?? []).filter((i) => i.customerId === detailCustomer.id)
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold" data-testid="page-title">Kunden</h1>
        <Button onClick={openNew} data-testid="button-new-customer">
          <Plus className="h-4 w-4 mr-1.5" /> Neuer Kunde
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 rounded-lg" />
      ) : (
        <div className="border rounded-lg overflow-auto">
          <Table data-testid="customers-table">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Firma</TableHead>
                <TableHead className="text-xs">Ort</TableHead>
                <TableHead className="text-xs">E-Mail</TableHead>
                <TableHead className="text-xs">Telefon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(customers?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                    Noch keine Kunden vorhanden.
                  </TableCell>
                </TableRow>
              ) : (
                customers?.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => openEdit(c)}
                    data-testid={`customer-row-${c.id}`}
                  >
                    <TableCell className="text-sm font-medium">{c.name}</TableCell>
                    <TableCell className="text-sm">{c.company ?? "–"}</TableCell>
                    <TableCell className="text-sm">{c.zip} {c.city}</TableCell>
                    <TableCell className="text-sm">{c.email ?? "–"}</TableCell>
                    <TableCell className="text-sm">{c.phone ?? "–"}</TableCell>
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
            <DialogTitle>{editing ? "Kunde bearbeiten" : "Neuer Kunde"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3" data-testid="customer-form">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  data-testid="input-customer-name"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Firma</Label>
                <Input
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  data-testid="input-customer-company"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Adresse</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                data-testid="input-customer-address"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">PLZ</Label>
                <Input
                  value={form.zip}
                  onChange={(e) => setForm({ ...form, zip: e.target.value })}
                  data-testid="input-customer-zip"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ort</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  data-testid="input-customer-city"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Land</Label>
                <Input
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  data-testid="input-customer-country"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">E-Mail</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  data-testid="input-customer-email"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Telefon</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  data-testid="input-customer-phone"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">MWST-Nr. (UID)</Label>
              <Input
                value={form.uid}
                onChange={(e) => setForm({ ...form, uid: e.target.value })}
                placeholder="CHE-000.000.000 MWST"
                data-testid="input-customer-uid"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Notizen</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                data-testid="input-customer-notes"
              />
            </div>

            {/* Show linked invoices for existing customer */}
            {editing && customerInvoices.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Verknüpfte Rechnungen ({customerInvoices.length})
                </p>
                <div className="space-y-1">
                  {customerInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between text-xs"
                      data-testid={`linked-invoice-${inv.id}`}
                    >
                      <span>{inv.invoiceNumber} – {formatDate(inv.invoiceDate)}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {INVOICE_STATUS_LABELS[inv.status ?? "entwurf"]}
                        </Badge>
                        <span className="font-medium">{formatCurrency(inv.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-customer"
              >
                {createMutation.isPending || updateMutation.isPending ? "Speichern..." : "Speichern"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
