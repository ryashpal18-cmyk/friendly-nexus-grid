import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import {
  Users, Calendar, Receipt, FileText, Activity, UserPlus,
  Stethoscope, BedDouble, TrendingUp, Clock, IndianRupee, MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDashboardStats, useTodayAppointments, usePrescriptions, usePhysioSessions, useTodayBills, usePendingBills } from "@/hooks/useDatabase";
import { useNavigate } from "react-router-dom";

const statusColors: Record<string, string> = {
  "Scheduled": "bg-info/10 text-info",
  "In Progress": "bg-warning/10 text-warning",
  "Waiting": "bg-muted text-muted-foreground",
  "Completed": "bg-success/10 text-success",
  "Cancelled": "bg-destructive/10 text-destructive",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: stats } = useDashboardStats();
  const { data: todayApts } = useTodayAppointments();
  const { data: prescriptions } = usePrescriptions();
  const { data: physio } = usePhysioSessions();
  const { data: todayBills } = useTodayBills();
  const { data: pendingBills } = usePendingBills();

  const todayTotalAmount = todayBills?.reduce((sum, b) => sum + Number(b.amount), 0) || 0;
  const pendingTotal = pendingBills?.reduce((sum, b) => sum + Number(b.amount), 0) || 0;

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
                  { label: "Upload X-Ray", icon: FileText, path: "/reports" },
                  { label: "Physiotherapy", icon: Activity, path: "/physiotherapy" },
                  { label: "View Reports", icon: TrendingUp, path: "/analytics" },
                ].map((action) => (
                  <Button key={action.label} variant="outline" className="h-auto py-3 flex flex-col items-center gap-2 hover:bg-accent" onClick={() => navigate(action.path)}>
                    <action.icon className="h-5 w-5 text-primary" />
                    <span className="text-xs">{action.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

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
                      <th className="text-left py-2 font-medium">Patient</th>
                      <th className="text-left py-2 font-medium hidden sm:table-cell">Mobile</th>
                      <th className="text-right py-2 font-medium">Due Amount</th>
                      <th className="text-center py-2 font-medium">Status</th>
                      <th className="text-right py-2 font-medium">Remind</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingBills.slice(0, 10).map(bill => {
                      const patient = bill.patients as any;
                      const mobile = patient?.mobile || "";
                      const cleanMobile = mobile.replace(/\D/g, "");
                      const num = cleanMobile.startsWith("91") ? cleanMobile : `91${cleanMobile}`;
                      const reminderUrl = mobile ? `https://wa.me/${num}?text=${encodeURIComponent(`Namaste ${patient?.name}, Balaji Ortho Care Center se aapka Rs. ${Number(bill.amount).toLocaleString()} pending hai. Kripya jama karein. Dhanyawad!`)}` : "";
                      return (
                        <tr key={bill.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-2 font-medium">{patient?.name}</td>
                          <td className="py-2 hidden sm:table-cell text-muted-foreground text-xs">{mobile}</td>
                          <td className="py-2 text-right font-bold text-warning">₹{Number(bill.amount).toLocaleString()}</td>
                          <td className="py-2 text-center">
                            <Badge variant="secondary" className="text-[10px] border-0 bg-warning/10 text-warning">{bill.status}</Badge>
                          </td>
                          <td className="py-2 text-right">
                            {mobile && (
                              <a href={reminderUrl} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-success">
                                  <MessageCircle className="h-3 w-3" />
                                </Button>
                              </a>
                            )}
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
