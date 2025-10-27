import React, { useMemo } from 'react';
import { Order } from '@/integrations/supabase/orders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, ShoppingCart, CheckCircle, XCircle, AlertTriangle, Building, Package, Clock, Calendar, DollarSign, Percent } from 'lucide-react'; // Adicionado Percent
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // NOVO IMPORT
import { usePromotionById } from '@/integrations/supabase/promotions'; // NOVO IMPORT
import { Loader2 } from 'lucide-react';

interface LatestOrderCardProps {
  order: Order;
  onClick: (order: Order) => void; // NOVO: Propriedade de clique
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

const LatestOrderCard: React.FC<LatestOrderCardProps> = ({ order, onClick }) => {
  const { t } = useTranslation();
  const statusClass = statusColors[order.status] || 'border-muted bg-muted/50';
  const statusIcon = statusIcons[order.status];
  
  const orderDate = new Date(order.created_at);
  // Separando data e hora
  const formattedDate = format(orderDate, 'dd/MM/yyyy', { locale: ptBR });
  const formattedTime = format(orderDate, 'HH:mm');
  
  // Dados do Cliente
  const clientName = order.clientes?.nome || t('no_data_found');
  const clientAvatarUrl = order.clientes?.avatar_url;
  const clientInitials = clientName.slice(0, 2).toUpperCase();
  
  // Lógica para exibir os itens
  const items = order.pedido_itens || [];
  const mainItemName = items[0]?.produtos?.nome || t('no_data_found');
  const otherItemsCount = items.length > 1 ? items.length - 1 : 0;

  // NOVO: Busca detalhes da promoção
  const { data: promotion, isLoading: isLoadingPromotion } = usePromotionById(order.promocao_id || undefined);

  // Cálculo do Valor Total com desconto
  const totalValueWithDiscount = useMemo(() => {
    let total = order.valor_total;
    if (promotion && promotion.desconto_percentual > 0) {
      total = total * (1 - promotion.desconto_percentual / 100);
    }
    return total;
  }, [order.valor_total, promotion]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card 
      className={cn(
        "w-full flex flex-col h-full border-l-4 transition-shadow hover:shadow-lg cursor-pointer", 
        statusClass
      )}
      onClick={() => onClick(order)} // Adicionando o manipulador de clique
    >
      <CardHeader className="p-3 pb-1 flex-row items-center justify-between">
        {/* Cliente e Avatar no topo */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={clientAvatarUrl || undefined} alt={clientName} className="object-cover" />
            <AvatarFallback className="text-sm">{clientInitials}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-base truncate font-semibold">
            {clientName}
          </CardTitle>
        </div>
        
        {/* Status */}
        <div className="flex items-center gap-1 text-xs font-medium capitalize flex-shrink-0 ml-2">
          {statusIcon}
          <span className="text-muted-foreground">{t(order.status.replace('_', ' '))}</span>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-1 space-y-2 text-sm flex-1">
        
        {/* Valor Total */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-sm font-medium text-primary">{formatCurrency(totalValueWithDiscount)}</span>
          {isLoadingPromotion ? (
            <Loader2 className="h-3 w-3 animate-spin ml-1" />
          ) : promotion && promotion.desconto_percentual > 0 && (
            <span className="text-xs text-green-500 flex items-center ml-1">
              <Percent className="h-3 w-3 mr-0.5" /> -{promotion.desconto_percentual}%
            </span>
          )}
        </div>
        
        {/* Item Principal */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Package className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm truncate font-medium text-foreground">
            {mainItemName}
            {otherItemsCount > 0 && (
              <span className="text-xs text-muted-foreground ml-1"> (+{otherItemsCount} {t('items')})</span>
            )}
          </span>
        </div>
        
        {/* Data e Hora do Pedido (Separados) */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium">{formattedDate}</span>
          <Clock className="h-4 w-4 flex-shrink-0 ml-2" />
          <span className="text-sm font-medium">{formattedTime}</span>
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