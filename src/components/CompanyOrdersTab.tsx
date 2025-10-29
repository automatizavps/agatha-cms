import React from 'react';
import { useOrders, OrderStatus } from '@/integrations/supabase/orders';
import { useTranslation } from 'react-i18next';
import { Loader2, ShoppingCart, User, Calendar } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CompanyOrdersTabProps {
  companyId: string;
}

const getStatusBadge = (status: OrderStatus, t: (key: string) => string) => {
  const baseClasses = "capitalize px-3 py-1 rounded-full text-xs font-semibold";
  switch (status) {
    case 'entregue':
      return <span className={cn(baseClasses, "bg-green-700/80 text-green-200 dark:bg-green-900/80 dark:text-green-300")}>{t('entregue')}</span>;
    case 'cancelado':
      return <span className={cn(baseClasses, "bg-red-700/80 text-red-200 dark:bg-red-900/80 dark:text-red-300")}>{t('cancelado')}</span>;
    case 'pendente_entrega':
    default:
      return <span className={cn(baseClasses, "bg-yellow-700/80 text-yellow-200 dark:bg-yellow-900/80 dark:text-yellow-300")}>{t('pendente_entrega').replace(' ', ' ')}</span>;
  }
};

const CompanyOrdersTab: React.FC<CompanyOrdersTabProps> = ({ companyId }) => {
  const { t } = useTranslation();
  // Filtra pedidos pela empresa, sem filtros de data
  const { data: orders, isLoading, isError } = useOrders(companyId);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (isError || !orders || orders.length === 0) {
    return <p className="text-center text-muted-foreground p-4">{t('no_orders_found')}</p>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <ShoppingCart className="h-5 w-5" /> {t('nav_orders')} ({orders.length})
      </h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('order_table_header_id')}</TableHead>
              <TableHead>{t('order_table_header_client')}</TableHead>
              <TableHead className="hidden sm:table-cell">{t('responsible')}</TableHead>
              <TableHead className="hidden md:table-cell">{t('order_table_header_date')}</TableHead>
              <TableHead className="text-right">{t('order_table_header_total')}</TableHead>
              <TableHead className="text-center">{t('order_table_header_status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium text-xs text-muted-foreground">
                  {order.id.slice(0, 8)}
                </TableCell>
                <TableCell className="font-medium">{order.clientes?.nome || 'N/A'}</TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {order.responsavel?.nome_completo || 'N/A'}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(order.valor_total)}
                </TableCell>
                <TableCell className="text-center">
                  {getStatusBadge(order.status, t)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CompanyOrdersTab;