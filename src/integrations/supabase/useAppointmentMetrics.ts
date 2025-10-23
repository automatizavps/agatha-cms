import { useAppointments, Appointment } from "./appointments";
import { useDashboardFilter } from "@/hooks/useDashboardFilter"; // Importando o hook de filtro

interface AppointmentMetrics {
  totalAppointments: number;
  confirmedAppointments: number;
  pendingAppointments: number;
}

export const useAppointmentMetrics = (companyId?: string) => {
  // Passamos companyId para useAppointments, que agora lida com o filtro opcional
  const { data: appointments, isLoading, isError, error } = useAppointments(companyId);

  const metrics: AppointmentMetrics = {
    totalAppointments: 0,
    confirmedAppointments: 0,
    pendingAppointments: 0,
  };

  if (appointments) {
    metrics.totalAppointments = appointments.length;
    metrics.confirmedAppointments = appointments.filter(
      (a) => a.status === 'confirmado'
    ).length;
    metrics.pendingAppointments = appointments.filter(
      (a) => a.status === 'pendente'
    ).length;
  }

  return {
    metrics,
    isLoading,
    isError,
    error,
  };
};