import { useOrders, Order } from "./orders";
import { useDashboardFilter } from "@/hooks/useDashboardFilter";
import { format } from "date-fns"; // Importando format

interface ChartData {
  name: string;
  count: number;
  fill: string;
}

// Cores ajustadas para melhor contraste no tema escuro
const statusColors: Record<Order['status'], string> = {
  pendente_entrega: '#fde047', // yellow-300
  entregue: '#4ade80', // green-400
  cancelado: '#f87171', // red-400
};

export const useOrderStatusChartData = () => {
  const { filteredCompanyId } = useDashboardFilter();
  
  // Define o filtro para 'today' usando DateRange
  const todayStart = format(new Date(), 'yyyy-MM-dd');
  
  // Passamos filteredCompanyId e o filtro 'today' para useOrders
  // CORREÇÃO: useOrders retorna { orders, totalCount }, então desestruturamos orders
  const { data: paginatedData, isLoading, isError, error } = useOrders(filteredCompanyId, {
    startDate: todayStart,
    endDate: todayStart,
  });
  
  const orders = paginatedData?.orders; // Extrai o array de pedidos

  const metrics: ChartData[] = [];

  if (orders) {
    // Não precisamos mais de filterOrdersByToday, pois o fetch já filtra pela data de criação
    
    const statusCounts = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<Order['status'], number>);

    metrics.push(
      ...Object.entries(statusCounts).map(([status, count]) => ({
        name: status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1),
        count: count,
        fill: statusColors[status as Order['status']],
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