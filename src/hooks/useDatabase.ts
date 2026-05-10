import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDashboardStats() {
  const today = new Date().toISOString().split("T")[0];
  return useQuery({
    queryKey: ["dashboard-stats"],
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const [patients, appointments, pendingBills, beds, todayBills] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("date", today),
        supabase.from("billing").select("amount, amount_paid, status").in("status", ["Pending", "Partial"]),
        supabase.from("beds").select("id, status"),
        supabase.from("billing").select("amount").gte("created_at", `${today}T00:00:00`).lte("created_at", `${today}T23:59:59`),
      ]);
      const pendingTotal = pendingBills.data?.reduce((sum, b) => sum + Math.max(Number(b.amount || 0) - Number((b as any).amount_paid || 0), 0), 0) || 0;
      const todayTotal = todayBills.data?.reduce((sum, b) => sum + Number(b.amount || 0), 0) || 0;
      return {
        todayPatients: patients.count || 0,
        todayAppointments: appointments.count || 0,
        pendingPayments: pendingTotal,
        bedsOccupied: beds.data?.filter(b => b.status === "occupied").length || 0,
        totalBeds: beds.data?.length || 0,
        todayRevenue: todayTotal,
      };
    },
  });
}

export function useTodayBills() {
  const today = new Date().toISOString().split("T")[0];
  return useQuery({
    queryKey: ["billing", "today"],
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase.from("billing").select("*, patients(name, mobile, address)").gte("created_at", `${today}T00:00:00`).lte("created_at", `${today}T23:59:59`).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function usePendingBills() {
  return useQuery({
    queryKey: ["billing", "pending"],
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase.from("billing").select("*, patients(name, mobile, address)").in("status", ["Pending", "Partial"]).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useBills() {
  return useQuery({
    queryKey: ["billing", "all"],
    staleTime: 0,
    refetchOnMount: true,
    queryFn: async () => {
      const { data, error } = await supabase.from("billing").select("*, patients(name, mobile, address)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function usePatients() {
  return useQuery({
    queryKey: ["patients"],
    staleTime: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.from("patients").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bill: { id: string; amount: number; amount_paid: number; status: string }) => {
      const { data, error } = await supabase.from("billing").update({ amount: bill.amount, amount_paid: bill.amount_paid, status: bill.status }).eq("id", bill.id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useTodayAppointments() {
  const today = new Date().toISOString().split("T")[0];
  return useQuery({
    queryKey: ["appointments", "today"],
    staleTime: 0,
    refetchOnMount: true,
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments").select("*, patients(name, mobile)").eq("date", today).order("time");
      if (error) throw error;
      return data;
    },
  });
}

export function usePrescriptions() {
  return useQuery({
    queryKey: ["prescriptions"],
    staleTime: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.from("prescriptions").select("*, patients(name)").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
  });
}

export function usePhysioSessions() {
  return useQuery({
    queryKey: ["physio_sessions"],
    staleTime: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.from("physiotherapy_sessions").select("*, patients(name)").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
  });
}

export function useReportPayments() {
  return useQuery({
    queryKey: ["report_payments"],
    staleTime: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.from("billing").select("amount, amount_paid, created_at, status").eq("status", "Paid").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(b => ({ amount: Number(b.amount_paid || b.amount || 0), payment_date: b.created_at?.slice(0, 10) }));
    },
  });
}

export function useAddBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bill: any) => {
      const { data, error } = await supabase.from("billing").insert(bill).select("*, patients(name, mobile)").single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useDeleteBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("billing").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function saveLocalData(type: string, data: any) {
  try {
    const existing = JSON.parse(localStorage.getItem(`local_${type}`) || "[]");
    existing.push({ ...data, savedAt: new Date().toISOString() });
    localStorage.setItem(`local_${type}`, JSON.stringify(existing));
  } catch {}
}
