import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, MessageCircle, Save, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { BodyDiagram, type BodySelection } from "@/components/ortho/BodyDiagram";
import {
  useAddFractureCase,
  useAddHospital,
  useFractureCases,
  useFractureXrays,
  useHospitals,
  uploadFractureXray,
  useUpdateFractureCase,
} from "@/hooks/useOrtho";
import { useAddPatient, useSearchPatients } from "@/hooks/useDatabase";
import { buildFractureMessage, buildNormalMessage, openWhatsApp } from "@/lib/whatsappOrtho";

type PatientType = "normal" | "fracture" | "referred";

const FRACTURE_TYPES = ["Simple", "Compound", "Hairline", "Dislocation"];
const CAUSES = ["Fall", "Accident", "Sports", "Other"];
const PLASTER_TYPES = ["POP", "Fiber"];
const REFERRAL_REASONS = ["Surgery Required", "Specialist Opinion", "MRI / CT Scan", "Higher Center", "Other"];

function addDaysISO(base: string, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function Ortho() {
  const todayIso = new Date().toISOString().slice(0, 10);

  // ─── Patient (quick add or search) ───
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientMobile, setPatientMobile] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const { data: searchHits } = useSearchPatients(
    patientMobile.length >= 4 ? patientMobile : patientName.length >= 2 ? patientName : "",
  );
  const addPatient = useAddPatient();

  // ─── Patient type ───
  const [patientType, setPatientType] = useState<PatientType>("fracture");

  // ─── Fracture ───
  const [body, setBody] = useState<BodySelection | null>(null);
  const [fractureType, setFractureType] = useState("");
  const [cause, setCause] = useState("");
  const [plasterType, setPlasterType] = useState("POP");
  const [plasterDate, setPlasterDate] = useState(todayIso);
  const [followupDays, setFollowupDays] = useState("7");
  const [doctorNotes, setDoctorNotes] = useState("");
  const nextFollowup = useMemo(
    () => addDaysISO(plasterDate, Number(followupDays) || 0),
    [plasterDate, followupDays],
  );

  // ─── Referred ───
  const [hospitalName, setHospitalName] = useState("");
  const [hospitalDoctor, setHospitalDoctor] = useState("");
  const [referralReason, setReferralReason] = useState("");
  const [newHospital, setNewHospital] = useState(false);
  const { data: hospitals } = useHospitals();
  const addHospital = useAddHospital();

  // ─── Saved case (for X-ray + WhatsApp) ───
  const [savedCaseId, setSavedCaseId] = useState<string | null>(null);
  const [savedCaseData, setSavedCaseData] = useState<any>(null);
  const { data: xrays, refetch: refetchXrays } = useFractureXrays(savedCaseId || undefined);

  const addCase = useAddFractureCase();
  const updateCase = useUpdateFractureCase();
  const { data: recentCases } = useFractureCases();

  // Auto-fill hospital doctor on hospital pick
  useEffect(() => {
    if (!newHospital && hospitalName) {
      const h = (hospitals || []).find((x: any) => x.name === hospitalName);
      if (h?.doctor_name) setHospitalDoctor(h.doctor_name);
    }
  }, [hospitalName, hospitals, newHospital]);

  const pickPatient = (p: any) => {
    setSelectedPatient(p);
    setPatientName(p.name);
    setPatientMobile(p.mobile || "");
    setPatientAge(String(p.age ?? ""));
  };

  const ensurePatient = async () => {
    if (selectedPatient) return selectedPatient;
    if (!patientName || !patientMobile) {
      toast.error("Patient name and mobile required");
      return null;
    }
    const p = await addPatient.mutateAsync({
      name: patientName,
      mobile: patientMobile,
      age: patientAge ? Number(patientAge) : null,
    } as any);
    setSelectedPatient(p);
    return p;
  };

  const handleSave = async () => {
    const patient = await ensurePatient();
    if (!patient) return;

    if (patientType === "fracture") {
      if (!body) return toast.error("Select body part");
      if (!fractureType) return toast.error("Select fracture type");
    }
    if (patientType === "referred") {
      if (!hospitalName) return toast.error("Hospital required");
      if (newHospital) {
        try {
          await addHospital.mutateAsync({ name: hospitalName, doctor_name: hospitalDoctor });
        } catch {
          /* ignore duplicate */
        }
      }
    }

    const payload: any = {
      patient_id: patient.id,
      patient_type: patientType,
      doctor_notes: doctorNotes || null,
    };
    if (patientType === "fracture") {
      Object.assign(payload, {
        body_part: body!.body_part,
        side: body!.side,
        fracture_type: fractureType,
        cause: cause || null,
        plaster_type: plasterType,
        plaster_date: plasterDate,
        followup_days: Number(followupDays) || 7,
        next_followup_date: nextFollowup,
        plaster_status: "Active",
      });
    }
    if (patientType === "referred") {
      Object.assign(payload, {
        hospital_name: hospitalName,
        doctor_name: hospitalDoctor || null,
        referral_reason: referralReason || null,
      });
    }

    try {
      const saved: any = await addCase.mutateAsync(payload);
      setSavedCaseId(saved.id);
      setSavedCaseData({ ...saved, patients: patient });
      toast.success("Case saved");
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    }
  };

  const handleXrayUpload = async (files: FileList | null) => {
    if (!files || !savedCaseId || !selectedPatient) {
      toast.error("Save case first");
      return;
    }
    try {
      for (const f of Array.from(files)) {
        await uploadFractureXray(savedCaseId, selectedPatient.id, f);
      }
      toast.success("X-ray uploaded");
      refetchXrays();
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    }
  };

  const handleSendWhatsApp = () => {
    if (!savedCaseData || !selectedPatient) {
      toast.error("Save case first");
      return;
    }
    const msg =
      patientType === "fracture"
        ? buildFractureMessage(selectedPatient, null, savedCaseData)
        : buildNormalMessage(selectedPatient, { service: "Consultation" } as any);
    openWhatsApp(selectedPatient.mobile, msg);
  };

  const updatePlasterStatus = async (status: string) => {
    if (!savedCaseId) return;
    await updateCase.mutateAsync({ id: savedCaseId, plaster_status: status } as any);
    setSavedCaseData((d: any) => ({ ...d, plaster_status: status }));
    toast.success(`Plaster marked ${status}`);
  };

  const resetForm = () => {
    setSelectedPatient(null);
    setPatientName("");
    setPatientMobile("");
    setPatientAge("");
    setBody(null);
    setFractureType("");
    setCause("");
    setPlasterType("POP");
    setPlasterDate(todayIso);
    setFollowupDays("7");
    setDoctorNotes("");
    setHospitalName("");
    setHospitalDoctor("");
    setReferralReason("");
    setNewHospital(false);
    setSavedCaseId(null);
    setSavedCaseData(null);
    setPatientType("fracture");
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-heading font-bold">🦴 Ortho — Fracture Entry</h1>
          {savedCaseId && (
            <Button variant="outline" size="sm" onClick={resetForm} className="gap-1">
              <Plus className="h-4 w-4" /> New Entry
            </Button>
          )}
        </div>

        {/* Patient quick entry */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Patient</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Mobile *</Label>
              <Input
                value={patientMobile}
                onChange={(e) => {
                  setPatientMobile(e.target.value.replace(/\D/g, "").slice(0, 10));
                  setSelectedPatient(null);
                }}
                placeholder="10-digit"
              />
            </div>
            <div>
              <Label>Name *</Label>
              <Input
                value={patientName}
                onChange={(e) => {
                  setPatientName(e.target.value);
                  setSelectedPatient(null);
                }}
              />
            </div>
            <div>
              <Label>Age</Label>
              <Input
                type="number"
                value={patientAge}
                onChange={(e) => setPatientAge(e.target.value)}
              />
            </div>
            {!selectedPatient && !!searchHits?.length && (
              <div className="md:col-span-3 border rounded-md divide-y">
                {searchHits.slice(0, 5).map((p: any) => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full text-left p-2 hover:bg-muted text-sm flex items-center justify-between"
                    onClick={() => pickPatient(p)}
                  >
                    <span>
                      <Search className="inline h-3 w-3 mr-1 text-muted-foreground" />
                      {p.name}
                    </span>
                    <span className="text-xs text-muted-foreground">{p.mobile}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedPatient && (
              <div className="md:col-span-3 text-xs text-success">
                ✓ Existing patient selected
              </div>
            )}
          </CardContent>
        </Card>

        {/* Patient Type */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Patient Type</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={patientType}
              onValueChange={(v) => setPatientType(v as PatientType)}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              {(["normal", "fracture", "referred"] as PatientType[]).map((t) => (
                <Label
                  key={t}
                  className={`flex items-center gap-2 border rounded-md p-3 cursor-pointer ${
                    patientType === t ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <RadioGroupItem value={t} />
                  <span className="capitalize">{t} Patient</span>
                </Label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Fracture flow */}
        {patientType === "fracture" && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-heading">Body Part *</CardTitle>
              </CardHeader>
              <CardContent>
                <BodyDiagram value={body} onSelect={setBody} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-heading">Fracture Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Fracture Type *</Label>
                  <Select value={fractureType} onValueChange={setFractureType}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {FRACTURE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Cause</Label>
                  <Select value={cause} onValueChange={setCause}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {CAUSES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-heading">Treatment</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <Label>Plaster Type</Label>
                  <Select value={plasterType} onValueChange={setPlasterType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PLASTER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Plaster Date</Label>
                  <Input type="date" value={plasterDate} onChange={(e) => setPlasterDate(e.target.value)} />
                </div>
                <div>
                  <Label>Follow-up Days</Label>
                  <Input
                    type="number"
                    value={followupDays}
                    onChange={(e) => setFollowupDays(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Next Follow-up</Label>
                  <Input value={nextFollowup} readOnly className="bg-muted" />
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Referred flow */}
        {patientType === "referred" && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading">Referral</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Hospital *</Label>
                {!newHospital ? (
                  <div className="flex gap-2">
                    <Select value={hospitalName} onValueChange={setHospitalName}>
                      <SelectTrigger><SelectValue placeholder="Select hospital" /></SelectTrigger>
                      <SelectContent>
                        {(hospitals || []).map((h: any) => (
                          <SelectItem key={h.id} value={h.name}>{h.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" onClick={() => { setNewHospital(true); setHospitalName(""); setHospitalDoctor(""); }}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} placeholder="New hospital name" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setNewHospital(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <Label>Doctor</Label>
                <Input value={hospitalDoctor} onChange={(e) => setHospitalDoctor(e.target.value)} placeholder="Doctor name" />
              </div>
              <div className="md:col-span-2">
                <Label>Reason</Label>
                <Select value={referralReason} onValueChange={setReferralReason}>
                  <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                  <SelectContent>
                    {REFERRAL_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Doctor notes (always) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Doctor Notes (internal)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea value={doctorNotes} onChange={(e) => setDoctorNotes(e.target.value)} rows={2} />
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={addCase.isPending} className="gap-2">
            <Save className="h-4 w-4" /> {savedCaseId ? "Update" : "Save Case"}
          </Button>
          <Button variant="outline" onClick={handleSendWhatsApp} className="gap-2" disabled={!savedCaseId}>
            <MessageCircle className="h-4 w-4" /> Send WhatsApp (Hindi)
          </Button>
        </div>

        {/* X-ray system - fracture only */}
        {patientType === "fracture" && savedCaseId && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading">X-Ray Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center justify-center border-2 border-dashed rounded-md p-4 cursor-pointer hover:bg-muted">
                <Upload className="h-4 w-4 mr-2" />
                <span className="text-sm">Upload X-ray (multiple allowed)</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleXrayUpload(e.target.files)}
                />
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(xrays || []).map((x: any) => (
                  <div key={x.id} className="relative border rounded-md overflow-hidden">
                    <img src={x.file_url} alt="X-ray" className="w-full h-24 object-cover" />
                    <Badge className="absolute bottom-1 left-1 text-[10px]">
                      {new Date(x.image_date).toLocaleDateString()}
                    </Badge>
                  </div>
                ))}
                {!xrays?.length && (
                  <p className="col-span-full text-xs text-muted-foreground text-center py-2">
                    No X-rays yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plaster status */}
        {patientType === "fracture" && savedCaseId && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading">Plaster Status</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <Badge variant="outline">Current: {savedCaseData?.plaster_status || "Active"}</Badge>
              <Button size="sm" variant="outline" onClick={() => updatePlasterStatus("Active")}>Active</Button>
              <Button size="sm" variant="outline" onClick={() => updatePlasterStatus("Removed")}>Removed</Button>
              <Button size="sm" variant="outline" onClick={() => updatePlasterStatus("Missed")}>Missed</Button>
            </CardContent>
          </Card>
        )}

        {/* Recent cases */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading">Recent Fracture Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-72 overflow-auto">
              {!recentCases?.length && (
                <p className="text-sm text-muted-foreground text-center py-3">No cases yet</p>
              )}
              {(recentCases || []).slice(0, 10).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between border rounded-md p-2 text-sm">
                  <div>
                    <p className="font-medium">{c.patients?.name} <span className="text-xs text-muted-foreground">· {c.patients?.mobile}</span></p>
                    <p className="text-xs text-muted-foreground">
                      {c.patient_type === "fracture"
                        ? `${c.side || ""} ${c.body_part || ""} · ${c.fracture_type || "-"} · Next: ${c.next_followup_date || "-"}`
                        : c.patient_type === "referred"
                        ? `Referred → ${c.hospital_name}`
                        : "Normal"}
                    </p>
                  </div>
                  <Badge variant="outline">{c.plaster_status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
