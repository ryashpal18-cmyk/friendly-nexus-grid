import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, FileText, Image, Download } from "lucide-react";
import { useXrayReports, useAddXrayReport, usePatients } from "@/hooks/useDatabase";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import AIXrayReport from "@/components/AIXrayReport";

const typeIcon: Record<string, string> = {
  "X-Ray": "bg-primary/10 text-primary",
  "MRI": "bg-secondary/10 text-secondary",
  "Lab Report": "bg-success/10 text-success",
  "Prescription": "bg-warning/10 text-warning",
};

export default function Reports() {
  const { data: reports, isLoading } = useXrayReports();
  const { data: patients } = usePatients();
  const addReport = useAddXrayReport();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ patient_id: "", report_type: "X-Ray" });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedSavedReport, setSelectedSavedReport] = useState<any>(null);
  const savedAiReports = reports?.filter((r: any) => r.report_data) || [];

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patient_id || !file) {
      toast({ title: "Error", description: "Select patient and file", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const filePath = `${form.patient_id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("xray-files").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("xray-files").getPublicUrl(filePath);

      await addReport.mutateAsync({
        patient_id: form.patient_id,
        file_url: urlData.publicUrl,
        report_type: form.report_type,
      });
      toast({ title: "Success", description: "Report uploaded!" });
      setForm({ patient_id: "", report_type: "X-Ray" });
      setFile(null);
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <AIXrayReport />

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">📂 Saved Reports</CardTitle>
          </CardHeader>
          <CardContent>
            {!savedAiReports.length ? (
              <p className="text-muted-foreground text-sm text-center py-6">No AI reports saved yet</p>
            ) : (
              <div className="space-y-3">
                {savedAiReports.map((r: any) => (
                  <div key={r.id} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1.5fr_1fr_1fr_auto] gap-3 items-center p-3 rounded-lg border hover:bg-muted/30">
                    <div><p className="text-sm font-medium">{r.patient_name || (r.patients as any)?.name || "Unknown"}</p><p className="text-xs text-muted-foreground sm:hidden">{r.body_part || "—"}</p></div>
                    <div className="hidden sm:block text-xs text-muted-foreground">{new Date(r.created_at || r.uploaded_at).toLocaleDateString("en-IN")}</div>
                    <div className="hidden sm:block text-xs">{r.body_part || "—"} · {r.view_projection || "—"}</div>
                    <Button variant="outline" size="sm" onClick={() => setSelectedSavedReport(r)}>View</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!selectedSavedReport} onOpenChange={(v) => !v && setSelectedSavedReport(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
            <DialogHeader><DialogTitle className="font-heading">Saved AI Report</DialogTitle></DialogHeader>
            {selectedSavedReport && (() => { const data = JSON.parse(selectedSavedReport.report_data || "{}"); return <div className="space-y-4 text-sm"><div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3"><div><span className="text-muted-foreground">Name</span><b className="block">{selectedSavedReport.patient_name || "Unknown"}</b></div><div><span className="text-muted-foreground">Body Part</span><b className="block">{selectedSavedReport.body_part || data.bodyPartDetected || "—"}</b></div><div><span className="text-muted-foreground">View</span><b className="block">{selectedSavedReport.view_projection || "—"}</b></div><div><span className="text-muted-foreground">Date</span><b className="block">{new Date(selectedSavedReport.created_at || selectedSavedReport.uploaded_at).toLocaleDateString("en-IN")}</b></div></div><section><h3 className="font-bold text-primary">Findings</h3><p className="whitespace-pre-line">{data.findings?.overall}</p>{[["Bones", data.findings?.bones], ["Soft Tissues", data.findings?.softTissues], ["Specific", data.findings?.specificFindings], ["Extra", data.findings?.extraFindings]].filter(([, v]) => v).map(([k, v]) => <p key={k}><b>{k}:</b> {v}</p>)}</section><section className="rounded-lg bg-primary/10 border-l-4 border-primary p-3"><h3 className="font-bold text-primary">Impression</h3><p className="whitespace-pre-line font-medium">{data.impression}</p></section>{data.recommendations && <section><h3 className="font-bold text-primary">Recommendations</h3><p>{data.recommendations}</p></section>}</div>; })()}
          </DialogContent>
        </Dialog>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="module-header">Reports & X-Ray</h1>
            <p className="text-sm text-muted-foreground">Upload and manage medical reports</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Upload className="h-4 w-4" />Upload Report</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-heading">Upload Report</DialogTitle></DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-2">
                  <Label>Patient</Label>
                  <Select value={form.patient_id} onValueChange={v => setForm(p => ({ ...p, patient_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                    <SelectContent>
                      {patients?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Report Type</Label>
                  <Select value={form.report_type} onValueChange={v => setForm(p => ({ ...p, report_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="X-Ray">X-Ray</SelectItem>
                      <SelectItem value="MRI">MRI</SelectItem>
                      <SelectItem value="Lab Report">Lab Report</SelectItem>
                      <SelectItem value="Prescription">Prescription</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>File</Label>
                  <Input type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files?.[0] || null)} />
                </div>
                <Button type="submit" className="w-full" disabled={uploading}>
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-base">Uploaded Reports</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : !reports?.length ? (
              <p className="text-muted-foreground text-sm text-center py-8">No reports uploaded yet</p>
            ) : (
              <div className="space-y-3">
                {reports.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${typeIcon[r.report_type || ""] || "bg-muted"}`}>
                        {r.report_type === "X-Ray" ? <Image className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{(r.patients as any)?.name}</p>
                        <p className="text-xs text-muted-foreground">{new Date(r.uploaded_at).toLocaleDateString("en-IN")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">{r.report_type}</Badge>
                      {r.file_url && (
                        <a href={r.file_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Download className="h-4 w-4" /></Button>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
