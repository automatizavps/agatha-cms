import { useAppointments, Appointment } from "./appointments";
import { format } from "date-fns";

interface AppointmentMetrics {
  totalAppointments: number;
  confirmedAppointments: number;
  pendingAppointments: number;
}

export const useAppointmentMetrics = (companyId?: string) => {
  // Define o filtro para 'today' usando DateRange
  const todayStart = format(new Date(), 'yyyy-MM-dd');
  
  // Passamos companyId e o filtro 'today' para useAppointments
  // O hook agora retorna { appointments, totalCount }
  const { data: paginatedData, isLoading, isError, error } = useAppointments(companyId, {
    startDate: todayStart,
    endDate: todayStart,
  }, 1, 1000); // Usamos uma página grande para garantir que todas as métricas do dia sejam contadas

  const appointments = paginatedData?.appointments;

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