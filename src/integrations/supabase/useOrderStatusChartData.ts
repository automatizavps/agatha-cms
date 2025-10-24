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

// Função auxiliar para filtrar pedidos pela data de hoje (mantida para uso interno se não houver filtro externo)
const filterOrdersByToday = (orders: Order[]): Order[] => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  return orders.filter(order => {
    const orderDate = new Date(order.created_at);
    return orderDate >= todayStart;
  });
};


export const useOrderStatusChartData = (startDate?: Date, endDate?: Date) => {
  const { filteredCompanyId } = useDashboardFilter();
  
  // Se houver filtro de data, passamos as datas. Caso contrário, passamos undefined para buscar todos os dados (que serão filtrados por 'hoje' abaixo).
  const { data: orders, isLoading, isError, error } = useOrders(filteredCompanyId, startDate, endDate);

  const metrics: ChartData[] = [];

  if (orders) {
    // Se houver filtro de data, usamos todos os pedidos retornados.
    // Se NÃO houver filtro de data, filtramos apenas os pedidos criados hoje.
    const ordersToProcess = startDate || endDate ? orders : filterOrdersByToday(orders);
    
    const statusCounts = ordersToProcess.reduce((acc, order) => {
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