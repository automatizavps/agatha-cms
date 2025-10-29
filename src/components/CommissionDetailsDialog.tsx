import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, ShoppingCart, CalendarCheck, User, DollarSign, Clock, Package, Tag, Building, Percent } from 'lucide-react';
import { CommissionRecordReport } from '@/integrations/supabase/reportHooks';
import { useOrderById, Order } from '@/integrations/supabase/orders';
import { useAppointmentById, Appointment } from '@/integrations/supabase/appointments';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { usePromotionById } from '@/integrations/supabase/promotions';

interface CommissionDetailsDialogProps {
  record: CommissionRecordReport | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const getStatusBadge = (status: string, t: (key: string, options?: any) => string) => {
  const baseClasses = "capitalize px-3 py-1 rounded-full text-xs font-semibold";
  const translatedStatus = t(status.replace('_', ' '));
  
  let colorClass = "bg-muted/50 text-muted-foreground";
  if (status.includes('entregue') || status.includes('concluido')) {
    colorClass = "bg-green-700/80 text-green-200 dark:bg-green-900/80 dark:text-green-300";
  } else if (status.includes('cancelado')) {
    colorClass = "bg-red-700/80 text-red-200 dark:bg-red-900/80 dark:text-red-300";
  } else if (status.includes('pendente') || status.includes('confirmado')) {
    colorClass = "bg-yellow-700/80 text-yellow-200 dark:bg-yellow-900/80 dark:text-yellow-300";
  }
  
  return <span className={cn(baseClasses, colorClass)}>{translatedStatus}</span>;
};

const CommissionDetailsDialog: React.FC<CommissionDetailsDialogProps> = ({ record, isOpen, onOpenChange }) => {
  const { t } = useTranslation();
  
  const isOrder = record?.tipo_referencia === 'pedido';
  const isAppointment = record?.tipo_referencia === 'agendamento';
  
  // Busca os dados do Pedido/Agendamento
  const { data: order, isLoading: isLoadingOrder } = useOrderById(isOrder ? record?.referencia_id : undefined);
  const { data: appointment, isLoading: isLoadingAppointment } = useAppointmentById(isAppointment ? record?.referencia_id : undefined);
  
  const data = isOrder ? order : appointment;
  const isLoading = isLoadingOrder || isLoadingAppointment;
  
  // Busca a promoção (se houver)
  const promotionId = data?.promocao_id;
  const { data: promotion, isLoading: isLoadingPromotion } = usePromotionById(promotionId || undefined);

  const renderDetails = () => {
    if (isLoading) {
      return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }
    
    if (!data) {
      return <p className="text-center text-muted-foreground p-4">{t('no_data_found')}</p>;
    }
    
    const isOrderData = data && 'pedido_itens' in data;
    const items = isOrderData ? data.pedido_itens : ('agendamento_itens' in data ? data.agendamento_itens : []);
    const client = data.clientes;
    const responsible = data.responsavel;
    
    // Calcula o valor total dos itens (sem desconto)
    const subtotal = items.reduce((sum, item) => sum + (item.quantidade * item.preco_unitario), 0);
    
    // O valor total do pedido/agendamento (já com desconto aplicado, se houver)
    const finalTotal = isOrderData ? data.valor_total : subtotal * (1 - (promotion?.desconto_percentual || 0) / 100);
    
    const date = new Date(data.data_hora || data.created_at);
    
    return (
      <div className="space-y-6">
        {/* Seção de Metadados */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 border-b pb-4">
          <div className="flex items-center gap-2">
            {isOrderData ? <ShoppingCart className="h-5 w-5 text-muted-foreground" /> : <CalendarCheck className="h-5 w-5 text-muted-foreground" />}
            <div>
              <p className="text-sm font-medium">{t('type')}</p>
              <p className="font-semibold capitalize">{t(record?.tipo_referencia || 'N/A')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{t('order_table_header_total')}</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(finalTotal)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{t('order_table_header_date')}</p>
              <p className="font-semibold">{format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
            </div>
          </div>
        </div>
        
        {/* Seção de Pessoas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Cliente */}
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2"><User className="h-4 w-4" /> {t('order_table_header_client')}</h4>
            <Separator />
            <p className="text-sm font-medium">{client?.nome || 'N/A'}</p>
            <p className="text-xs text-muted-foreground">{client?.email || client?.telefone || 'N/A'}</p>
          </div>
          
          {/* Responsável */}
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2"><User className="h-4 w-4" /> {t('responsible')}</h4>
            <Separator />
            <p className="text-sm font-medium">{responsible?.nome_completo || 'N/A'}</p>
            <p className="text-xs text-muted-foreground">{responsible ? t('user_table_header_profile') : 'N/A'}</p>
          </div>
        </div>
        
        {/* Seção de Itens */}
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-2"><Package className="h-4 w-4" /> {t('nav_products_services')}</h4>
          <Separator />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('product_name')}</TableHead>
                  <TableHead className="text-center">{t('quantity')}</TableHead>
                  <TableHead className="text-right">{t('unit_price')}</TableHead>
                  <TableHead className="text-right">{t('order_table_header_total')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium text-sm">{item.produtos?.nome || t('unknown_item')}</TableCell>
                    <TableCell className="text-center">{item.quantidade}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(item.preco_unitario)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(item.quantidade * item.preco_unitario)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        
        {/* Seção de Totais e Comissão */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4" /> {t('commission_details', { defaultValue: 'Detalhes da Comissão' })}</h4>
            <Separator />
            <p className="text-sm flex justify-between">
              <span className="text-muted-foreground">{t('commission_value')}:</span>
              <span className="font-bold text-green-600">{formatCurrency(record?.valor_comissao || 0)}</span>
            </p>
            <p className="text-sm flex justify-between">
              <span className="text-muted-foreground">{t('order_table_header_status')}:</span>
              {getStatusBadge(record?.status || 'N/A', t)}
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-semibold flex items-center gap-2"><Tag className="h-4 w-4" /> {t('promotion', { defaultValue: 'Promoção' })}</h4>
            <Separator />
            <p className="text-sm flex justify-between">
              <span className="text-muted-foreground">{t('promotion_name')}:</span>
              <span className="font-medium">{promotion?.nome || 'N/A'}</span>
            </p>
            <p className="text-sm flex justify-between">
              <span className="text-muted-foreground">{t('discount_percentage')}:</span>
              <span className="font-medium text-red-500">{promotion?.desconto_percentual ? `${promotion.desconto_percentual}%` : 'N/A'}</span>
            </p>
            <p className="text-sm flex justify-between">
              <span className="text-muted-foreground">{t('subtotal', { defaultValue: 'Subtotal' })}:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl w-[90vw] max-w-[90vw] h-[90vh] max-h-[90vh] flex flex-col" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isOrder ? <ShoppingCart className="h-6 w-6" /> : <CalendarCheck className="h-6 w-6" />}
            {t('details_of_reference', { defaultValue: 'Detalhes da Referência' })}: #{record?.referencia_id.slice(0, 8)}
          </DialogTitle>
          <DialogDescription>
            {t('commission_record_details_description', { defaultValue: 'Informações detalhadas sobre o item que gerou esta comissão.' })}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4">
          {renderDetails()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommissionDetailsDialog;