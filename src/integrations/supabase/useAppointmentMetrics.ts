import { useAppointments, Appointment } from "./appointments";

interface AppointmentMetrics {
  totalAppointments: number;
  confirmedAppointments: number;
  pendingAppointments: number;
}

export const useAppointmentMetrics = (companyId?: string, startDate?: Date, endDate?: Date) => {
  // Se houver filtro de data, buscamos todos os agendamentos no período.
  // Se não houver filtro de data, usamos 'today' como filtro padrão para manter o comportamento original do dashboard.
  const dateFilter = !startDate && !endDate ? 'today' : undefined;
  
  const { data: appointments, isLoading, isError, error } = useAppointments(companyId, dateFilter, startDate, endDate);

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