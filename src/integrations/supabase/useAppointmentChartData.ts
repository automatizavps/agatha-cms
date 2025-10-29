import { useAppointments, Appointment } from "./appointments";
import { useDashboardFilter } from "@/hooks/useDashboardFilter"; // Importando o hook de filtro
import { format } from "date-fns"; // Importando format

interface ChartData {
  name: string;
  count: number;
  fill: string;
}

// Cores ajustadas para melhor contraste no tema escuro
const statusColors: Record<Appointment['status'], string> = {
  pendente: '#fde047', // yellow-300
  confirmado: '#4ade80', // green-400
  cancelado: '#f87171', // red-400
  concluido: '#60a5fa', // blue-400
};

export const useAppointmentChartData = () => {
  const { filteredCompanyId } = useDashboardFilter();
  
  // Define o filtro para 'today' usando DateRange
  const todayStart = format(new Date(), 'yyyy-MM-dd');
  
  // Passamos filteredCompanyId e o filtro 'today' para useAppointments
  const { data: appointments, isLoading, isError, error } = useAppointments(filteredCompanyId, {
    startDate: todayStart,
    endDate: todayStart,
  });

  const metrics: ChartData[] = [];

  if (appointments) {
    const statusCounts = appointments.reduce((acc, appointment) => {
      acc[appointment.status] = (acc[appointment.status] || 0) + 1;
      return acc;
    }, {} as Record<Appointment['status'], number>);

    metrics.push(
      ...Object.entries(statusCounts).map(([status, count]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        count: count,
        fill: statusColors[status as Appointment['status']],
      }))
    );
  }

  return {
    chartData: metrics,
    isLoading,
    isError,
    error,
  };
};