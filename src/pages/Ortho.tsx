import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, MessageCircle, CalendarDays, Plane, Send, Bone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAddFractureCase, useFractureCases, useFollowupsAround } from "@/hooks/useOrtho";
import { useAddPatient, useSearchPatients } from "@/hooks/useDatabase";
import { sendSMS } from "@/services/smsService";

const FRACTURE_TYPES = ["Simple", "Compound", "Hairline", "Dislocation"];
const PLASTER_TYPES = ["POP", "Fiber", "Slab", "None"];
const BODY_PARTS = ["Hand", "Wrist", "Elbow", "Shoulder", "Leg", "Knee", "Ankle", "Foot", "Hip", "Spine", "Other"];

const LEAVE_KEY = "ortho_leave_dates";
const getLeaves = (): string[] => {
  try { return JSON.parse(localStorage.getItem(LEAVE_KEY) || "[]"); } catch { return []; }
};
const setLeaves = (l: string[]) => localStorage.setItem(LEAVE_KEY, JSON.stringify(l));

const addDaysISO = (base: string, days: number) => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", weekday: "short" });

const followupSMS = (name: string, date: string) =>
  `Namaste ${name}, aapka follow-up Balaji Ortho Care Center me ${fmt(date)} ko hai. Dr. S. S. Rathore. Samay par aaye. Dhanyawad.`;
const leaveSMS = (name: string, oldDate: string, newDate: string) =>
  `Namaste ${name}, ${fmt(oldDate)} ko clinic band rahega. Aapka follow-up ${fmt(newDate)} ko shift kar diya gaya hai. Balaji Ortho Care Center.`;

export default function Ortho() {
  const todayIso = new Date().toISOString().slice(0, 10);

  // ─── Entry form ───
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [age, setAge] = useState("");
  const [selPatient, setSelPatient] = useState<any>(null);
  const { data: hits } = useSearchPatients(mobile.length >= 4 ? mobile : name.length >= 2 ? name : "");
  const addPatient = useAddPatient();

  const [bodyPart, setBodyPart] = useState("");
  const [side, setSide] = useState("Right");
  const [fractureType, setFractureType] = useState("");
  const [plasterType, setPlasterType] = useState("POP");
  const [plasterDate, setPlasterDate] = useState(todayIso);
  const [followupDays, setFollowupDays] = useState("7");
  const [notes, setNotes] = useState("");
  const nextFollowup = useMemo(() => addDaysISO(plasterDate, Number(followupDays) || 7), [plasterDate, followupDays]);

  const addCase = useAddFractureCase();
  const { data: cases, refetch: refetchCases } = useFractureCases();
  const { data: followups, refetch: refetchFollowups } = useFollowupsAround();

  const pickPatient = (p: any) => { setSelPatient(p); setName(p.name); setMobile(p.mobile || ""); setAge(String(p.age ?? "")); };
  const resetForm = () => {
    setName(""); setMobile(""); setAge(""); setSelPatient(null);
    setBodyPart(""); setSide("Right"); setFractureType(""); setPlasterType("POP");
    setPlasterDate(todayIso); setFollowupDays("7"); setNotes("");
  };

  const handleSave = async () => {
    if (!name || !mobile) return toast.error("Naam aur mobile zaroori hai");
    if (!bodyPart || !fractureType) return toast.error("Body part aur fracture type select karo");
    let patient = selPatient;
    if (!patient) {
      patient = await addPatient.mutateAsync({ name, mobile, age: age ? Number(age) : null } as any);
    }
    try {
      await addCase.mutateAsync({
        patient_id: patient.id,
        patient_type: "fracture",
        body_part: bodyPart, side, fracture_type: fractureType,
        plaster_type: plasterType, plaster_date: plasterDate,
        followup_days: Number(followupDays) || 7,
        next_followup_date: nextFollowup,
        plaster_status: "Active",
        doctor_notes: notes || null,
      } as any);
      toast.success("Case saved");
      // Auto SMS
      const ok = await sendSMS(mobile, followupSMS(name, nextFollowup));
      toast[ok ? "success" : "error"](ok ? "SMS sent" : "SMS failed");
      resetForm();
      refetchCases(); refetchFollowups();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    }
  };

  // ─── 7-day calendar ───
  const next7 = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysISO(todayIso, i)), [todayIso]);
  const followupsByDate = useMemo(() => {
    const m: Record<string, any[]> = {};
    (followups || []).forEach((f: any) => {
      if (!f.next_followup_date) return;
      (m[f.next_followup_date] ||= []).push(f);
    });
    return m;
  }, [followups]);

  // ─── Leave manager ───
  const [leaves, setLeavesState] = useState<string[]>(getLeaves());
  const [leaveDate, setLeaveDate] = useState(todayIso);
  const [leaveBusy, setLeaveBusy] = useState(false);

  const addSingleLeave = async () => {
    if (!leaveDate) return;
    const affected = (followups || []).filter((f: any) => f.next_followup_date === leaveDate);
    if (!affected.length) {
      const updated = [...new Set([...leaves, leaveDate])];
      setLeaves(updated); setLeavesState(updated);
      return toast.success("Leave saved (no patients on this date)");
    }
    setLeaveBusy(true);
    let sent = 0;
    for (const f of affected) {
      const newDate = addDaysISO(leaveDate, 1);
      const ok = await sendSMS(f.patients?.mobile || "", leaveSMS(f.patients?.name || "Patient", leaveDate, newDate));
      if (ok) sent++;
    }
    const updated = [...new Set([...leaves, leaveDate])];
    setLeaves(updated); setLeavesState(updated);
    setLeaveBusy(false);
    toast.success(`Leave set, ${sent}/${affected.length} SMS sent`);
  };

  const removeLeave = (d: string) => {
    const updated = leaves.filter((x) => x !== d);
    setLeaves(updated); setLeavesState(updated);
  };

  // ─── Long leave bulk SMS ───
  const [longFrom, setLongFrom] = useState(todayIso);
  const [longTo, setLongTo] = useState(addDaysISO(todayIso, 3));
  const [longMsg, setLongMsg] = useState("");
  const [longBusy, setLongBusy] = useState(false);

  const longAffected = useMemo(() => {
    return (followups || []).filter(
      (f: any) => f.next_followup_date && f.next_followup_date >= longFrom && f.next_followup_date <= longTo
    );
  }, [followups, longFrom, longTo]);

  const sendLongLeave = async () => {
    if (!longAffected.length) return toast.error("Is range me koi follow-up nahi");
    const msg = longMsg || `Namaste, Balaji Ortho Care Center ${fmt(longFrom)} se ${fmt(longTo)} tak band rahega. Kripya baad me visit kare. Dr. S. S. Rathore.`;
    setLongBusy(true);
    let sent = 0;
    for (const f of longAffected) {
      const personal = msg.replace("{name}", f.patients?.name || "Patient");
      const ok = await sendSMS(f.patients?.mobile || "", personal);
      if (ok) sent++;
    }
    // mark all dates as leave
    const dates = new Set(leaves);
    for (let d = longFrom; d <= longTo; d = addDaysISO(d, 1)) dates.add(d);
    const updated = [...dates];
    setLeaves(updated); setLeavesState(updated);
    setLongBusy(false);
    toast.success(`${sent}/${longAffected.length} SMS sent`);
  };

  // ─── All patients ───
  const [search, setSearch] = useState("");
  const filteredCases = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return cases || [];
    return (cases || []).filter((c: any) =>
      (c.patients?.name || "").toLowerCase().includes(q) ||
      (c.patients?.mobile || "").includes(q) ||
      (c.body_part || "").toLowerCase().includes(q)
    );
  }, [cases, search]);

  const resendSMS = async (c: any) => {
    if (!c.patients?.mobile || !c.next_followup_date) return toast.error("Mobile/date missing");
    const ok = await sendSMS(c.patients.mobile, followupSMS(c.patients.name, c.next_followup_date));
    toast[ok ? "success" : "error"](ok ? "SMS sent" : "SMS failed");
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Bone className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-heading font-bold">Ortho / Fracture Panel</h1>
        </div>

        <Tabs defaultValue="entry" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto">
            <TabsTrigger value="entry">New Entry</TabsTrigger>
            <TabsTrigger value="calendar">7-Day Calendar</TabsTrigger>
            <TabsTrigger value="leave">Leave</TabsTrigger>
            <TabsTrigger value="bulk">Long Leave SMS</TabsTrigger>
            <TabsTrigger value="all">All Patients</TabsTrigger>
          </TabsList>

          {/* ── ENTRY ── */}
          <TabsContent value="entry" className="space-y-3 mt-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Patient</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Mobile *</Label>
                  <Input value={mobile} onChange={(e) => { setMobile(e.target.value.replace(/\D/g, "").slice(0, 10)); setSelPatient(null); }} placeholder="10-digit" />
                </div>
                <div>
                  <Label>Name *</Label>
                  <Input value={name} onChange={(e) => { setName(e.target.value); setSelPatient(null); }} />
                </div>
                <div>
                  <Label>Age</Label>
                  <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} />
                </div>
                {!selPatient && !!hits?.length && (
                  <div className="md:col-span-3 border rounded-md divide-y max-h-40 overflow-auto">
                    {hits.slice(0, 5).map((p: any) => (
                      <button key={p.id} type="button" onClick={() => pickPatient(p)}
                        className="w-full text-left p-2 hover:bg-muted text-sm flex justify-between">
                        <span>{p.name}</span>
                        <span className="text-xs text-muted-foreground">{p.mobile}</span>
                      </button>
                    ))}
                  </div>
                )}
                {selPatient && <div className="md:col-span-3 text-xs text-success">✓ Existing patient</div>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Fracture Details</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Body Part *</Label>
                  <Select value={bodyPart} onValueChange={setBodyPart}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{BODY_PARTS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Side</Label>
                  <Select value={side} onValueChange={setSide}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Right">Right</SelectItem>
                      <SelectItem value="Left">Left</SelectItem>
                      <SelectItem value="Both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fracture Type *</Label>
                  <Select value={fractureType} onValueChange={setFractureType}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{FRACTURE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Plaster Type</Label>
                  <Select value={plasterType} onValueChange={setPlasterType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PLASTER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Plaster Date</Label>
                  <Input type="date" value={plasterDate} onChange={(e) => setPlasterDate(e.target.value)} />
                </div>
                <div>
                  <Label>Follow-up Days</Label>
                  <Input type="number" value={followupDays} onChange={(e) => setFollowupDays(e.target.value)} />
                </div>
                <div className="md:col-span-3">
                  <Label>Next Follow-up</Label>
                  <Input value={fmt(nextFollowup)} readOnly className="bg-muted" />
                </div>
                <div className="md:col-span-3">
                  <Label>Doctor Notes</Label>
                  <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={addCase.isPending} className="gap-2">
                <Save className="h-4 w-4" /> Save & Send SMS
              </Button>
              <Button variant="outline" onClick={resetForm}>Reset</Button>
            </div>
          </TabsContent>

          {/* ── CALENDAR ── */}
          <TabsContent value="calendar" className="mt-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" /> Next 7 Days Follow-ups
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
                {next7.map((d) => {
                  const list = followupsByDate[d] || [];
                  const isLeave = leaves.includes(d);
                  return (
                    <div key={d} className={`border rounded-md p-2 min-h-[120px] ${isLeave ? "bg-destructive/10 border-destructive/30" : ""}`}>
                      <div className="text-xs font-medium mb-2 flex items-center justify-between">
                        <span>{fmt(d)}</span>
                        {isLeave && <Badge variant="destructive" className="text-[10px]">Leave</Badge>}
                      </div>
                      {list.length === 0 ? (
                        <div className="text-xs text-muted-foreground">—</div>
                      ) : list.map((f: any) => (
                        <div key={f.id} className="text-xs p-1 mb-1 bg-muted rounded">
                          <div className="font-medium truncate">{f.patients?.name}</div>
                          <div className="text-muted-foreground truncate">{f.body_part} · {f.patients?.mobile}</div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── LEAVE ── */}
          <TabsContent value="leave" className="mt-3 space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><Plane className="h-4 w-4" /> Single Day Leave</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                  <div className="flex-1">
                    <Label>Leave Date</Label>
                    <Input type="date" value={leaveDate} onChange={(e) => setLeaveDate(e.target.value)} />
                  </div>
                  <Button onClick={addSingleLeave} disabled={leaveBusy} className="gap-2">
                    <Send className="h-4 w-4" /> Mark Leave & Notify
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  Affected follow-ups: {(followups || []).filter((f: any) => f.next_followup_date === leaveDate).length}
                </div>
                {!!leaves.length && (
                  <div>
                    <Label>Marked Leaves</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {leaves.sort().map((d) => (
                        <Badge key={d} variant="secondary" className="gap-1">
                          {fmt(d)}
                          <button onClick={() => removeLeave(d)} className="ml-1 hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── BULK SMS ── */}
          <TabsContent value="bulk" className="mt-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><Send className="h-4 w-4" /> Long Leave / Bulk SMS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>From</Label>
                    <Input type="date" value={longFrom} onChange={(e) => setLongFrom(e.target.value)} />
                  </div>
                  <div>
                    <Label>To</Label>
                    <Input type="date" value={longTo} onChange={(e) => setLongTo(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Message (optional, use {"{name}"} for patient name)</Label>
                  <Textarea rows={3} value={longMsg} onChange={(e) => setLongMsg(e.target.value)}
                    placeholder={`Namaste {name}, Balaji Ortho Care Center ${fmt(longFrom)} se ${fmt(longTo)} tak band rahega...`} />
                </div>
                <div className="text-sm text-muted-foreground">
                  Patients in range: <strong>{longAffected.length}</strong>
                </div>
                <Button onClick={sendLongLeave} disabled={longBusy || !longAffected.length} className="gap-2">
                  <Send className="h-4 w-4" /> Send Bulk SMS
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ALL ── */}
          <TabsContent value="all" className="mt-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">All Fracture Patients</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Search by name, mobile, body part..." value={search} onChange={(e) => setSearch(e.target.value)} />
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead>Body Part</TableHead>
                        <TableHead>Plaster</TableHead>
                        <TableHead>Next FU</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCases.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No records</TableCell></TableRow>
                      ) : filteredCases.map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.patients?.name}</TableCell>
                          <TableCell>{c.patients?.mobile}</TableCell>
                          <TableCell>{c.body_part} {c.side ? `(${c.side})` : ""}</TableCell>
                          <TableCell>{c.plaster_type} · {c.plaster_date ? fmt(c.plaster_date) : ""}</TableCell>
                          <TableCell>{c.next_followup_date ? fmt(c.next_followup_date) : "—"}</TableCell>
                          <TableCell><Badge variant={c.plaster_status === "Active" ? "default" : "secondary"}>{c.plaster_status}</Badge></TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => resendSMS(c)}>
                              <MessageCircle className="h-3 w-3" /> SMS
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
