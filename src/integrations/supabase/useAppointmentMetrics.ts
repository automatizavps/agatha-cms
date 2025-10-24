import { useAppointments, Appointment } from "./appointments";

interface AppointmentMetrics {
  totalAppointments: number;
  confirmedAppointments: number;
  pendingAppointments: number;
}

export const useAppointmentMetrics = (companyId?: string, startDate?: Date, endDate?: Date) => {
  // Se houver filtro de data, não usamos o filtro 'today' no useAppointments
  const dateFilterType = !startDate && !endDate ? 'today' : undefined;
  
  // Passamos companyId e o filtro de data
  const { data: appointments, isLoading, isError, error } = useAppointments(companyId, dateFilterType, startDate, endDate);

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