import { useOrders, Order } from "./orders";
import { useDashboardFilter } from "@/hooks/useDashboardFilter";

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

// Função auxiliar para filtrar pedidos pela data de hoje
const filterOrdersByToday = (orders: Order[]): Order[] => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  return orders.filter(order => {
    const orderDate = new Date(order.created_at);
    return orderDate >= todayStart;
  });
};


export const useOrderStatusChartData = () => {
  const { filteredCompanyId } = useDashboardFilter();
  // Usamos useOrders, que já lida com o filtro de empresa (ou todas)
  const { data: orders, isLoading, isError, error } = useOrders(filteredCompanyId);

  const metrics: ChartData[] = [];

  if (orders) {
    // Filtramos apenas os pedidos criados hoje
    const todayOrders = filterOrdersByToday(orders);
    
    const statusCounts = todayOrders.reduce((acc, order) => {
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