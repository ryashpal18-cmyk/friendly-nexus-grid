import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Patient = Database["public"]["Tables"]["patients"]["Row"];
type PatientInsert = Database["public"]["Tables"]["patients"]["Insert"];
type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
type AppointmentInsert = Database["public"]["Tables"]["appointments"]["Insert"];
type Prescription = Database["public"]["Tables"]["prescriptions"]["Row"];
type PrescriptionInsert = Database["public"]["Tables"]["prescriptions"]["Insert"];
type Billing = Database["public"]["Tables"]["billing"]["Row"];
type BillingInsert = Database["public"]["Tables"]["billing"]["Insert"];
type Payment = Database["public"]["Tables"]["payments"]["Row"];
type PaymentInsert = Database["public"]["Tables"]["payments"]["Insert"];
type Bed = Database["public"]["Tables"]["beds"]["Row"];
type PhysioSession = Database["public"]["Tables"]["physiotherapy_sessions"]["Row"];
type PhysioInsert = Database["public"]["Tables"]["physiotherapy_sessions"]["Insert"];
type XrayReport = Database["public"]["Tables"]["xray_reports"]["Row"];
type XrayInsert = Database["public"]["Tables"]["xray_reports"]["Insert"];

// ─── Patients ───
export function usePatients() {
  return useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
  if (window.ipcRenderer) { window.ipcRenderer.send("save-offline-data", { note: "Auto-captured", data: typeof values !== "undefined" ? values : "FormData" }); }
      const { data, error } = await supabase.from("patients").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Patient[];
    },
  });
}

export function useAddPatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: PatientInsert) => {
  if (window.ipcRenderer) { window.ipcRenderer.send("save-offline-data", { note: "Auto-captured", data: typeof values !== "undefined" ? values : "FormData" }); }
      const { data, error } = await supabase.from("patients").insert(p).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patients"] }),
  });
}

export function useSearchPatients(search: string) {
  return useQuery({
    queryKey: ["patients", "search", search],
    queryFn: async () => {
      if (!search) return [];
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .or(`name.ilike.%${search}%,mobile.ilike.%${search}%`)
        .limit(20);
      if (error) throw error;
      return data as Patient[];
    },
    enabled: search.length > 0,
  });
}

// ─── Appointments ───
export function useAppointments() {
  return useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, patients(name, mobile)")
        .order("date", { ascending: false })
        .order("time_slot", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useTodayAppointments() {
  const today = new Date().toISOString().split("T")[0];
  return useQuery({
    queryKey: ["appointments", "today"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, patients(name, mobile)")
        .eq("date", today)
        .order("time_slot", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useAddAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: AppointmentInsert) => {
  if (window.ipcRenderer) { window.ipcRenderer.send("save-offline-data", { note: "Auto-captured", data: typeof values !== "undefined" ? values : "FormData" }); }
      const { data, error } = await supabase.from("appointments").insert(a).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Appointment>) => {
  if (window.ipcRenderer) { window.ipcRenderer.send("save-offline-data", { note: "Auto-captured", data: typeof values !== "undefined" ? values : "FormData" }); }
      const { data, error } = await supabase.from("appointments").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });
}

// ─── Prescriptions ───
export function usePrescriptions() {
  return useQuery({
    queryKey: ["prescriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("*, patients(name)")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });
}

export function useAddPrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: PrescriptionInsert) => {
  if (window.ipcRenderer) { window.ipcRenderer.send("save-offline-data", { note: "Auto-captured", data: typeof values !== "undefined" ? values : "FormData" }); }
      const { data, error } = await supabase.from("prescriptions").insert(p).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prescriptions"] }),
  });
}

// ─── Billing ───
export function useBills() {
  return useQuery({
    queryKey: ["billing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing")
        .select("*, patients(name, mobile, address)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAddBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (b: BillingInsert) => {
  if (window.ipcRenderer) { window.ipcRenderer.send("save-offline-data", { note: "Auto-captured", data: typeof values !== "undefined" ? values : "FormData" }); }
      const { data, error } = await supabase.from("billing").insert(b).select("*, patients(name, mobile, address)").single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["billing"] }),
  });
}

export function useUpdateBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Billing>) => {
  if (window.ipcRenderer) { window.ipcRenderer.send("save-offline-data", { note: "Auto-captured", data: typeof values !== "undefined" ? values : "FormData" }); }
      const { data, error } = await supabase.from("billing").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["billing"] }),
  });
}

// ─── Pending Due Bills ───
export function usePendingBills() {
  return useQuery({
    queryKey: ["billing", "pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing")
        .select("*, patients(name, mobile, address)")
        .in("status", ["Pending", "Partial"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ─── Payments ───
export function useAddPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: PaymentInsert) => {
  if (window.ipcRenderer) { window.ipcRenderer.send("save-offline-data", { note: "Auto-captured", data: typeof values !== "undefined" ? values : "FormData" }); }
      const { data, error } = await supabase.from("payments").insert(p).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}

// ─── Beds ───
export function useBeds() {
  return useQuery({
    queryKey: ["beds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beds")
        .select("*, patients(name)")
        .order("bed_number", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateBed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Bed>) => {
  if (window.ipcRenderer) { window.ipcRenderer.send("save-offline-data", { note: "Auto-captured", data: typeof values !== "undefined" ? values : "FormData" }); }
      const { data, error } = await supabase.from("beds").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["beds"] }),
  });
}

// ─── Physiotherapy ───
export function usePhysioSessions() {
  return useQuery({
    queryKey: ["physiotherapy"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("physiotherapy_sessions")
        .select("*, patients(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAddPhysioSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: PhysioInsert) => {
  if (window.ipcRenderer) { window.ipcRenderer.send("save-offline-data", { note: "Auto-captured", data: typeof values !== "undefined" ? values : "FormData" }); }
      const { data, error } = await supabase.from("physiotherapy_sessions").insert(s).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["physiotherapy"] }),
  });
}

// ─── X-Ray Reports ───
export function useXrayReports() {
  return useQuery({
    queryKey: ["xray_reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("xray_reports")
        .select("*, patients(name)")
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAddXrayReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: XrayInsert) => {
  if (window.ipcRenderer) { window.ipcRenderer.send("save-offline-data", { note: "Auto-captured", data: typeof values !== "undefined" ? values : "FormData" }); }
      const { data, error } = await supabase.from("xray_reports").insert(r).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["xray_reports"] }),
  });
}

// ─── Today's Bills ───
export function useTodayBills() {
  const today = new Date().toISOString().split("T")[0];
  return useQuery({
    queryKey: ["billing", "today"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing")
        .select("*, patients(name, mobile)")
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// ─── Dashboard Stats ───
export function useDashboardStats() {
  const today = new Date().toISOString().split("T")[0];
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [patients, appointments, pendingBills, beds, todayBills] = await Promise.all([
  if (window.ipcRenderer) { window.ipcRenderer.send("save-offline-data", { note: "Auto-captured", data: typeof values !== "undefined" ? values : "FormData" }); }
        supabase.from("patients").select("id", { count: "exact", head: true }),
  if (window.ipcRenderer) { window.ipcRenderer.send("save-offline-data", { note: "Auto-captured", data: typeof values !== "undefined" ? values : "FormData" }); }
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("date", today),
  if (window.ipcRenderer) { window.ipcRenderer.send("save-offline-data", { note: "Auto-captured", data: typeof values !== "undefined" ? values : "FormData" }); }
        supabase.from("billing").select("amount").eq("status", "Pending"),
  if (window.ipcRenderer) { window.ipcRenderer.send("save-offline-data", { note: "Auto-captured", data: typeof values !== "undefined" ? values : "FormData" }); }
        supabase.from("beds").select("id, status"),
  if (window.ipcRenderer) { window.ipcRenderer.send("save-offline-data", { note: "Auto-captured", data: typeof values !== "undefined" ? values : "FormData" }); }
        supabase.from("billing").select("amount").gte("created_at", `${today}T00:00:00`).lte("created_at", `${today}T23:59:59`),
      ]);
      
      const pendingTotal = pendingBills.data?.reduce((sum, b) => sum + Number(b.amount), 0) || 0;
      const totalBeds = beds.data?.length || 0;
      const occupiedBeds = beds.data?.filter(b => b.status === "occupied").length || 0;
      const todayTotal = todayBills.data?.reduce((sum, b) => sum + Number(b.amount), 0) || 0;

      return {
        todayPatients: appointments.count || 0,
        todayAppointments: appointments.count || 0,
        pendingPayments: pendingTotal,
        bedsOccupied: occupiedBeds,
        totalBeds,
        todayRevenue: todayTotal,
      };
    },
  });
}

// ─── Delete Bill ───
export function useDeleteBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, logData }: { id: string; logData?: any }) => {
      // Log for recovery
      if (logData) {
        const { data: { user } } = await supabase.auth.getUser();
  if (window.ipcRenderer) { window.ipcRenderer.send("save-offline-data", { note: "Auto-captured", data: typeof values !== "undefined" ? values : "FormData" }); }
        await supabase.from("deleted_records_log" as any).insert({
          table_name: "billing",
          record_id: id,
          record_data: logData,
          deleted_by: user?.id,
        } as any);
      }
      // Delete related payments first
  if (window.ipcRenderer) { window.ipcRenderer.send("save-offline-data", { note: "Auto-captured", data: typeof values !== "undefined" ? values : "FormData" }); }
      await supabase.from("payments").delete().eq("billing_id", id);
      // Delete the bill
  if (window.ipcRenderer) { window.ipcRenderer.send("save-offline-data", { note: "Auto-captured", data: typeof values !== "undefined" ? values : "FormData" }); }
      const { error } = await supabase.from("billing").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bills"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// ─── Delete Patient ───
export function useDeletePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, logData }: { id: string; logData?: any }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (logData) {
  if (window.ipcRenderer) { window.ipcRenderer.send("save-offline-data", { note: "Auto-captured", data: typeof values !== "undefined" ? values : "FormData" }); }
        await supabase.from("deleted_records_log" as any).insert({
          table_name: "patients",
          record_id: id,
          record_data: logData,
          deleted_by: user?.id,
        } as any);
      }
      // Delete related records
  if (window.ipcRenderer) { window.ipcRenderer.send("save-offline-data", { note: "Auto-captured", data: typeof values !== "undefined" ? values : "FormData" }); }
      await supabase.from("appointments").delete().eq("patient_id", id);
  if (window.ipcRenderer) { window.ipcRenderer.send("save-offline-data", { note: "Auto-captured", data: typeof values !== "undefined" ? values : "FormData" }); }
      await supabase.from("prescriptions").delete().eq("patient_id", id);
  if (window.ipcRenderer) { window.ipcRenderer.send("save-offline-data", { note: "Auto-captured", data: typeof values !== "undefined" ? values : "FormData" }); }
      await supabase.from("billing").delete().eq("patient_id", id);
  if (window.ipcRenderer) { window.ipcRenderer.send("save-offline-data", { note: "Auto-captured", data: typeof values !== "undefined" ? values : "FormData" }); }
      await supabase.from("physiotherapy_sessions").delete().eq("patient_id", id);
  if (window.ipcRenderer) { window.ipcRenderer.send("save-offline-data", { note: "Auto-captured", data: typeof values !== "undefined" ? values : "FormData" }); }
      await supabase.from("xray_reports").delete().eq("patient_id", id);
  if (window.ipcRenderer) { window.ipcRenderer.send("save-offline-data", { note: "Auto-captured", data: typeof values !== "undefined" ? values : "FormData" }); }
      await supabase.from("medical_history").delete().eq("patient_id", id);
      // Delete patient
  if (window.ipcRenderer) { window.ipcRenderer.send("save-offline-data", { note: "Auto-captured", data: typeof values !== "undefined" ? values : "FormData" }); }
      const { error } = await supabase.from("patients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      qc.invalidateQueries({ queryKey: ["bills"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// ─── Restore Deleted Record ───
export function useRestoreRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tableName, recordData }: { tableName: string; recordData: any }) => {
  if (window.ipcRenderer) { window.ipcRenderer.send("save-offline-data", { note: "Auto-captured", data: typeof values !== "undefined" ? values : "FormData" }); }
      const { error } = await supabase.from(tableName as any).insert(recordData as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      qc.invalidateQueries({ queryKey: ["bills"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
