import { useAppointments, Appointment } from "./appointments";

interface ChartData {
  name: string;
  count: number;
  fill: string;
}

const statusColors: Record<Appointment['status'], string> = {
  pendente: '#facc15', // yellow-500
  confirmado: '#10b981', // green-500
  cancelado: '#ef4444', // red-500
  concluido: '#3b82f6', // blue-500
};

export const useAppointmentChartData = () => {
  const { data: appointments, isLoading, isError, error } = useAppointments();

  const chartData: ChartData[] = [];

  if (appointments) {
    const statusCounts = appointments.reduce((acc, appointment) => {
      acc[appointment.status] = (acc[appointment.status] || 0) + 1;
      return acc;
    }, {} as Record<Appointment['status'], number>);

    chartData.push(
      ...Object.entries(statusCounts).map(([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        count: count,
        fill: statusColors[status as Appointment['status']],
      }))
    );
  }

  return {
    chartData,
    isLoading,
    isError,
    error,
  };
};