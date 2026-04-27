import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import {
  Users, Calendar, Receipt, FileText, Activity, UserPlus,
  Stethoscope, BedDouble, TrendingUp, Clock, IndianRupee, MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useDashboardStats, useTodayAppointments, usePrescriptions, usePhysioSessions, useTodayBills, usePendingBills, usePatients, useBills, useReportPayments } from "@/hooks/useDatabase";
import { useNavigate } from "react-router-dom";
import { useMemo, useRef, useState } from "react";

const statusColors: Record<string, string> = {
  "Scheduled": "bg-info/10 text-info",
  "In Progress": "bg-warning/10 text-warning",
  "Waiting": "bg-muted text-muted-foreground",
  "Completed": "bg-success/10 text-success",
  "Cancelled": "bg-destructive/10 text-destructive",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement | null>(null);
  const { data: stats } = useDashboardStats();
  const { data: todayApts } = useTodayAppointments();
  const { data: prescriptions } = usePrescriptions();
  const { data: physio } = usePhysioSessions();
  const { data: todayBills } = useTodayBills();
  const { data: pendingBills } = usePendingBills();
  const { data: patients } = usePatients();
  const { data: bills } = useBills();
  const { data: reportPayments } = useReportPayments();
  const [nameQuery, setNameQuery] = useState("");
  const [mobileQuery, setMobileQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  const todayTotalAmount = todayBills?.reduce((sum, b) => sum + Number(b.amount), 0) || 0;
  const pendingTotal = pendingBills?.reduce((sum, b) => sum + Math.max(Number(b.amount) - Number((b as any).amount_paid || 0), 0), 0) || 0;
  const todayIso = new Date().toISOString().slice(0, 10);
  const monthIso = todayIso.slice(0, 7);
  const aiIncome = useMemo(() => {
    const payments = reportPayments || [];
    return payments.reduce((acc, p) => {
      const amount = Number(p.amount || 0);
      acc.total += amount;
      acc.count += 1;
      if (p.payment_date === todayIso) acc.today += amount;
      if (p.payment_date?.startsWith(monthIso)) acc.month += amount;
      return acc;
    }, { today: 0, month: 0, total: 0, count: 0 });
  }, [reportPayments, todayIso, monthIso]);
  const nameMatches = useMemo(() => nameQuery.trim() ? (patients || []).filter(p => p.name?.toLowerCase().includes(nameQuery.toLowerCase())).slice(0, 8) : [], [patients, nameQuery]);
  const mobileMatches = useMemo(() => {
    const digits = mobileQuery.replace(/\D/g, "");
    return digits ? (patients || []).filter(p => (p.mobile || "").replace(/\D/g, "").includes(digits)).slice(0, 8) : [];
  }, [patients, mobileQuery]);
  const selectedBills = useMemo(() => selectedPatient ? (bills || []).filter(b => b.patient_id === selectedPatient.id) : [], [bills, selectedPatient]);
  const selectedSummary = selectedBills.reduce((acc, bill) => {
    const total = Number(bill.amount || 0);
    const paid = Number((bill as any).amount_paid || 0);
    acc.total += total;
    acc.paid += paid;
    acc.due += Math.max(total - paid, 0);
    return acc;
  }, { total: 0, paid: 0, due: 0 });

  const buildDueReminder = (patient: any, total: number, paid: number, due: number) => `नमस्ते ${patient?.name || "Patient"} जी 🙏
Balaji Ortho Care Center की सूचना।

आपका बिल विवरण:
💰 कुल बिल: ₹${total}
✅ जमा राशि: ₹${paid}
❗ बकाया राशि: ₹${due}

कृपया ₹${due} जल्द जमा करवाएं।

धन्यवाद 🙏
Balaji Ortho Care Center`;

  const openReminder = (patient: any, total: number, paid: number, due: number) => {
    const digits = (patient?.mobile || "").replace(/\D/g, "").replace(/^91/, "");
    if (!digits) return;
    window.open(`https://wa.me/91${digits}?text=${encodeURIComponent(buildDueReminder(patient, total, paid, due))}`, "_blank");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/images/logo.png" alt="Logo" className="h-10 w-10 object-contain" />
            <div>
              <h1 className="module-header">Dashboard</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Welcome back, Dr. Rathore · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <Button className="emergency-btn gap-2 w-fit" onClick={() => navigate("/opd")}>
            <UserPlus className="h-4 w-4" />
            New Patient Admission
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Today's Patients" value={stats?.todayPatients ?? 0} icon={Users} variant="primary" />
          <StatCard title="Appointments" value={stats?.todayAppointments ?? 0} icon={Calendar} variant="secondary" />
          <StatCard title="Pending Payments" value={`₹${(stats?.pendingPayments ?? 0).toLocaleString()}`} icon={Receipt} variant="warning" />
          <StatCard title="Today's Revenue" value={`₹${(stats?.todayRevenue ?? 0).toLocaleString()}`} icon={IndianRupee} variant="success" />
        </div>

        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              💰 AI Report Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="rounded-lg bg-success/10 p-3"><p className="text-muted-foreground text-xs">Aaj</p><p className="font-bold text-success">₹{aiIncome.today.toLocaleString()}</p></div>
              <div className="rounded-lg bg-primary/10 p-3"><p className="text-muted-foreground text-xs">Is mahine</p><p className="font-bold text-primary">₹{aiIncome.month.toLocaleString()}</p></div>
              <div className="rounded-lg bg-secondary/10 p-3"><p className="text-muted-foreground text-xs">Total reports</p><p className="font-bold text-secondary">{aiIncome.count}</p></div>
              <div className="rounded-lg bg-warning/10 p-3"><p className="text-muted-foreground text-xs">Total income</p><p className="font-bold text-warning">₹{aiIncome.total.toLocaleString()}</p></div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Today's Appointments */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-heading flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Today's Appointments
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-primary text-xs" onClick={() => navigate("/appointments")}>View All</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {!todayApts?.length && <p className="text-sm text-muted-foreground text-center py-4">No appointments today</p>}
              {todayApts?.slice(0, 5).map((apt) => (
                <div key={apt.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Stethoscope className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{(apt.patients as any)?.name}</p>
                      <p className="text-xs text-muted-foreground">{apt.notes || "Consultation"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium">{apt.time_slot || "--"}</p>
                    <Badge variant="secondary" className={(statusColors[apt.status] || "") + " text-[10px] border-0"}>
                      {apt.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Today's Patients Billing */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-heading flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  Today's Patients
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-primary text-xs" onClick={() => navigate("/billing")}>View All</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {!todayBills?.length && <p className="text-sm text-muted-foreground text-center py-4">No bills today</p>}
                {todayBills?.slice(0, 6).map((bill) => {
                  const displayService = bill.service.includes("|")
                    ? bill.service.split("|").map((s: string) => s.split(":")[0].trim()).join(", ")
                    : bill.service;
                  return (
                    <div key={bill.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{(bill.patients as any)?.name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[150px]">{displayService}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">₹{Number(bill.amount).toLocaleString()}</p>
                        <Badge variant="secondary" className={`text-[10px] border-0 ${bill.status === "Paid" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                          {bill.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
              {todayBills && todayBills.length > 0 && (
                <div className="mt-4 p-3 bg-primary/10 rounded-lg flex justify-between items-center">
                  <span className="text-sm font-medium">Total ({todayBills.length} patients)</span>
                  <span className="text-lg font-bold text-primary">₹{todayTotalAmount.toLocaleString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "New Patient", icon: Users, path: "/opd" },
                  { label: "New Appointment", icon: Calendar, path: "/appointments" },
                  { label: "Create Bill", icon: Receipt, path: "/billing" },
                  { label: "AI Report", icon: null, path: "/reports", featured: true },
                  { label: "Patient Khoje", icon: null, path: "#patient-search", search: true },
                  { label: "Upload X-Ray", icon: FileText, path: "/reports" },
                  { label: "Physiotherapy", icon: Activity, path: "/physiotherapy" },
                  { label: "View Reports", icon: TrendingUp, path: "/analytics" },
                ].map((action) => (
                  <Button key={action.label} variant="outline" className={`h-auto py-3 flex flex-col items-center gap-2 hover:bg-accent ${action.featured ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground border-0 shadow-md hover:opacity-90" : ""}`} onClick={() => action.search ? searchRef.current?.scrollIntoView({ behavior: "smooth" }) : navigate(action.path)}>
                    {action.icon ? <action.icon className={`h-5 w-5 ${action.featured ? "text-primary-foreground" : "text-primary"}`} /> : <span className="text-xl leading-none">{action.search ? "🔍" : "🩻"}</span>}
                    <span className="text-xs">{action.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card ref={searchRef} id="patient-search" className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading">🔍 Patient Khoje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="relative space-y-2">
                <p className="text-xs font-medium text-muted-foreground">BOX 1 - Naam Se</p>
                <Input value={nameQuery} onChange={(e) => setNameQuery(e.target.value)} placeholder="Patient ka naam likhe..." />
                {nameMatches.length > 0 && <div className="absolute z-20 w-full rounded-md border bg-card shadow-lg max-h-64 overflow-auto">{nameMatches.map((p) => <button key={p.id} className="w-full text-left px-3 py-2 hover:bg-muted text-sm" onClick={() => { setSelectedPatient(p); setNameQuery(p.name || ""); }}><b>{p.name}</b><br /><span className="text-xs text-muted-foreground">{p.mobile || "No mobile"} · {p.address || "No village"}</span></button>)}</div>}
              </div>
              <div className="relative space-y-2">
                <p className="text-xs font-medium text-muted-foreground">BOX 2 - Mobile Se</p>
                <Input value={mobileQuery} onChange={(e) => setMobileQuery(e.target.value)} placeholder="Mobile number likhe..." />
                {mobileMatches.length > 0 && <div className="absolute z-20 w-full rounded-md border bg-card shadow-lg max-h-64 overflow-auto">{mobileMatches.map((p) => <button key={p.id} className="w-full text-left px-3 py-2 hover:bg-muted text-sm" onClick={() => { setSelectedPatient(p); setMobileQuery(p.mobile || ""); }}><b>{p.name}</b><br /><span className="text-xs text-muted-foreground">{p.mobile || "No mobile"} · {p.address || "No village"}</span></button>)}</div>}
              </div>
            </div>
            {selectedPatient && <div className="rounded-lg border p-4 bg-muted/20 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div><h3 className="font-heading font-bold text-lg">{selectedPatient.name}</h3><p className="text-sm text-muted-foreground">{selectedPatient.age || "—"}y · {selectedPatient.gender || "—"} · {selectedPatient.mobile || "—"}</p><p className="text-sm">Village: <b>{selectedPatient.address || "—"}</b></p></div>
                <Button onClick={() => navigate("/billing")} className="gap-2">➕ Naya Bill</Button>
              </div>
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-xs text-muted-foreground"><th className="text-left py-2">Date</th><th className="text-left py-2">No</th><th className="text-right py-2">Total</th><th className="text-right py-2">Paid</th><th className="text-right py-2">Due</th></tr></thead><tbody>{selectedBills.length === 0 ? <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No bills yet</td></tr> : selectedBills.map((bill) => { const total = Number(bill.amount || 0); const paid = Number((bill as any).amount_paid || 0); const due = Math.max(total - paid, 0); return <tr key={bill.id} className="border-b"><td className="py-2">{new Date(bill.created_at).toLocaleDateString("en-IN")}</td><td className="py-2">INV-{bill.id.slice(0, 8).toUpperCase()}</td><td className="py-2 text-right">₹{total.toLocaleString()}</td><td className="py-2 text-right text-success">₹{paid.toLocaleString()}</td><td className="py-2 text-right text-destructive font-bold">₹{due.toLocaleString()}</td></tr>; })}</tbody></table></div>
              <div className="grid grid-cols-3 gap-3"><div className="rounded-lg bg-card p-3"><p className="text-xs text-muted-foreground">Total Billed</p><b>₹{selectedSummary.total.toLocaleString()}</b></div><div className="rounded-lg bg-card p-3"><p className="text-xs text-muted-foreground">Paid</p><b className="text-success">₹{selectedSummary.paid.toLocaleString()}</b></div><div className="rounded-lg bg-card p-3"><p className="text-xs text-muted-foreground">Due</p><b className="text-destructive">₹{selectedSummary.due.toLocaleString()}</b></div></div>
            </div>}
          </CardContent>
        </Card>

        {/* Pending Due Section */}
        {pendingBills && pendingBills.length > 0 && (
          <Card className="border-warning/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-heading flex items-center gap-2 text-warning">
                  <Receipt className="h-4 w-4" />
                  Pending Dues ({pendingBills.length} patients) — ₹{pendingTotal.toLocaleString()}
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-primary text-xs" onClick={() => navigate("/billing")}>View All</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-xs">
                      <th className="text-left py-2 font-medium">Name</th>
                      <th className="text-left py-2 font-medium hidden sm:table-cell">Date</th>
                      <th className="text-right py-2 font-medium">Total</th>
                      <th className="text-center py-2 font-medium">Paid</th>
                      <th className="text-right py-2 font-medium text-destructive">DUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingBills.slice(0, 10).map(bill => {
                      const patient = bill.patients as any;
                      const mobile = patient?.mobile || "";
                      const total = Number(bill.amount || 0);
                      const paid = Number((bill as any).amount_paid || 0);
                      const due = Math.max(total - paid, 0);
                      if (due <= 0) return null;
                      return (
                        <tr key={bill.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-2 font-medium">{patient?.name}</td>
                          <td className="py-2 hidden sm:table-cell text-muted-foreground text-xs">{new Date(bill.created_at).toLocaleDateString("en-IN")}</td>
                          <td className="py-2 text-right font-medium">₹{total.toLocaleString()}</td>
                          <td className="py-2 text-center">
                            <span className="text-success font-medium">₹{paid.toLocaleString()}</span>
                          </td>
                          <td className="py-2 text-right font-bold text-destructive">
                            ₹{due.toLocaleString()}
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-success ml-1 disabled:text-muted-foreground" onClick={() => openReminder(patient, total, paid, due)} title="WhatsApp reminder" disabled={!mobile}>
                              <MessageCircle className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-heading flex items-center gap-2">
                  <FileText className="h-4 w-4 text-secondary" />
                  Recent Prescriptions
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-primary text-xs" onClick={() => navigate("/opd")}>View All</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {!prescriptions?.length && <p className="text-sm text-muted-foreground text-center py-4">No prescriptions yet</p>}
              {prescriptions?.slice(0, 5).map((rx) => (
                <div key={rx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{(rx.patients as any)?.name}</p>
                    <p className="text-xs text-muted-foreground">{rx.diagnosis}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(rx.created_at).toLocaleDateString("en-IN")}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <Activity className="h-4 w-4 text-secondary" />
                Physiotherapy Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!physio?.length && <p className="text-sm text-muted-foreground text-center py-4">No sessions yet</p>}
              {physio?.slice(0, 4).map((pt) => (
                <div key={pt.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{(pt.patients as any)?.name}</p>
                    <p className="text-xs text-muted-foreground">{pt.exercise_plan}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium">Session {pt.session_number}/{pt.total_sessions}</p>
                    <p className="text-xs text-muted-foreground">Pain: {pt.pain_scale}/10</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
