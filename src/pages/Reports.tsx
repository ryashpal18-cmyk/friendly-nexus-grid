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
