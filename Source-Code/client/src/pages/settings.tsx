import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { todayISO } from "@/lib/utils";
import type { Settings } from "@shared/schema";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Save } from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const [form, setForm] = useState<Partial<Settings>>({});

  useEffect(() => {
    if (settings) {
      setForm(settings);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Settings>) => {
      const res = await apiRequest("PUT", "/api/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Einstellungen gespeichert" });
    },
    onError: (e: Error) => {
      toast({ title: "Fehler", description: e.message, variant: "destructive" });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateMutation.mutate(form);
  }

  async function handleExport() {
    try {
      const res = await apiRequest("GET", `/api/export?year=${form.fiscalYear ?? "2026"}`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `buchhaltung_export_${form.fiscalYear}_${todayISO()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export heruntergeladen" });
    } catch (e: any) {
      toast({ title: "Fehler beim Export", description: e.message, variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold" data-testid="page-title">Einstellungen</h1>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold" data-testid="page-title">Einstellungen</h1>

      <form onSubmit={handleSubmit} className="space-y-4" data-testid="settings-form">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Firmeninformationen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Firmenname</Label>
                <Input
                  value={form.companyName ?? ""}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  data-testid="input-company-name"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">MWST-Nr. (UID)</Label>
                <Input
                  value={form.companyUid ?? ""}
                  onChange={(e) => setForm({ ...form, companyUid: e.target.value })}
                  placeholder="CHE-000.000.000 MWST"
                  data-testid="input-company-uid"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Adresse</Label>
              <Input
                value={form.companyAddress ?? ""}
                onChange={(e) => setForm({ ...form, companyAddress: e.target.value })}
                data-testid="input-company-address"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">PLZ</Label>
                <Input
                  value={form.companyZip ?? ""}
                  onChange={(e) => setForm({ ...form, companyZip: e.target.value })}
                  data-testid="input-company-zip"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ort</Label>
                <Input
                  value={form.companyCity ?? ""}
                  onChange={(e) => setForm({ ...form, companyCity: e.target.value })}
                  data-testid="input-company-city"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">E-Mail</Label>
                <Input
                  type="email"
                  value={form.companyEmail ?? ""}
                  onChange={(e) => setForm({ ...form, companyEmail: e.target.value })}
                  data-testid="input-company-email"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Telefon</Label>
                <Input
                  value={form.companyPhone ?? ""}
                  onChange={(e) => setForm({ ...form, companyPhone: e.target.value })}
                  data-testid="input-company-phone"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">IBAN</Label>
              <Input
                value={form.companyIban ?? ""}
                onChange={(e) => setForm({ ...form, companyIban: e.target.value })}
                placeholder="CH00 0000 0000 0000 0000 0"
                data-testid="input-company-iban"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">MWST & Buchhaltung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Switch
                checked={!!form.isVatRegistered}
                onCheckedChange={(checked) => setForm({ ...form, isVatRegistered: checked ? 1 : 0 })}
                data-testid="switch-vat-registered"
              />
              <Label className="text-sm">Sind Sie MWST-pflichtig?</Label>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Geschäftsjahr</Label>
                <Input
                  value={form.fiscalYear ?? "2026"}
                  onChange={(e) => setForm({ ...form, fiscalYear: e.target.value })}
                  data-testid="input-fiscal-year"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Rechnungs-Präfix</Label>
                <Input
                  value={form.invoicePrefix ?? "RE"}
                  onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })}
                  data-testid="input-invoice-prefix"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Beleg-Präfix</Label>
                <Input
                  value={form.receiptPrefix ?? "B"}
                  onChange={(e) => setForm({ ...form, receiptPrefix: e.target.value })}
                  data-testid="input-receipt-prefix"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nächste Rechnungs-Nr</Label>
                <Input
                  type="number"
                  value={form.currentInvoiceNumber ?? 1}
                  onChange={(e) => setForm({ ...form, currentInvoiceNumber: parseInt(e.target.value) || 1 })}
                  data-testid="input-current-invoice-nr"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nächste Beleg-Nr</Label>
                <Input
                  type="number"
                  value={form.currentReceiptNumber ?? 1}
                  onChange={(e) => setForm({ ...form, currentReceiptNumber: parseInt(e.target.value) || 1 })}
                  data-testid="input-current-receipt-nr"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-settings">
            <Save className="h-4 w-4 mr-1.5" />
            {updateMutation.isPending ? "Speichern..." : "Einstellungen speichern"}
          </Button>
        </div>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Datenexport</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Exportiert alle Daten des aktuellen Geschäftsjahres als JSON-Datei.
          </p>
          <Button variant="outline" onClick={handleExport} data-testid="button-export">
            <Download className="h-4 w-4 mr-1.5" /> Geschäftsjahr exportieren
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
