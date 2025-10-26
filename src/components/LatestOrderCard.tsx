import React from 'react';
import { Order } from '@/integrations/supabase/orders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, DollarSign, ShoppingCart, CheckCircle, XCircle, AlertTriangle, Building } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface LatestOrderCardProps {
  order: Order;
}

// Cores e classes baseadas no status
const statusColors: Record<Order['status'], string> = {
  pendente_entrega: 'border-yellow-500 bg-yellow-500/10',
  entregue: 'border-green-500 bg-green-500/10',
  cancelado: 'border-red-500 bg-red-500/10',
};

const statusIcons: Record<Order['status'], React.ReactNode> = {
  pendente_entrega: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  entregue: <CheckCircle className="h-4 w-4 text-green-500" />,
  cancelado: <XCircle className="h-4 w-4 text-red-500" />,
};

const LatestOrderCard: React.FC<LatestOrderCardProps> = ({ order }) => {
  const { t } = useTranslation();
  const statusClass = statusColors[order.status] || 'border-muted bg-muted/50';
  const statusIcon = statusIcons[order.status];
  
  const orderDate = new Date(order.created_at);
  const formattedDate = format(orderDate, 'dd/MM/yyyy', { locale: ptBR });
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card className={cn("w-full flex flex-col h-full border-l-4 transition-shadow hover:shadow-lg", statusClass)}>
      <CardHeader className="p-3 pb-1 flex-row items-center justify-between">
        <CardTitle className="text-base truncate font-semibold">
          {order.clientes?.nome || t('no_data_found')}
        </CardTitle>
        <div className="flex items-center gap-1 text-xs font-medium capitalize">
          {statusIcon}
          <span className="text-muted-foreground">{t(order.status.replace('_', ' '))}</span>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-1 space-y-2 text-sm flex-1">
        
        {/* Valor Total */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <DollarSign className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium text-primary">{formatCurrency(order.valor_total)}</span>
        </div>
        
        {/* Data do Pedido */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <ShoppingCart className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm truncate">{t('order_table_header_date')}: {formattedDate}</span>
        </div>
        
        {/* ID do Pedido */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-xs font-mono truncate">#{order.id.slice(0, 8)}</span>
        </div>
        
      </CardContent>
    </Card>
  );
};

export default LatestOrderCard;