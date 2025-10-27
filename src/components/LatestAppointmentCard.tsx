import React from 'react';
import { Appointment } from '@/integrations/supabase/appointments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CheckCircle, XCircle, AlertTriangle, Building, Clock, Package, DollarSign, Percent } from 'lucide-react'; // Adicionado Percent
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Importando Avatar
import { usePromotionById } from '@/integrations/supabase/promotions'; // NOVO IMPORT

interface LatestAppointmentCardProps {
  appointment: Appointment;
  onClick: (appointment: Appointment) => void; // NOVO: Propriedade de clique
}

// Cores e classes baseadas no status
const statusColors: Record<Appointment['status'], string> = {
  pendente: 'border-yellow-500 bg-yellow-500/10',
  confirmado: 'border-green-500 bg-green-500/10',
  cancelado: 'border-red-500 bg-red-500/10',
  concluido: 'border-primary/50 bg-primary/10',
};

const statusIcons: Record<Appointment['status'], React.ReactNode> = {
  pendente: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  confirmado: <CheckCircle className="h-4 w-4 text-green-500" />,
  cancelado: <XCircle className="h-4 w-4 text-red-500" />,
  concluido: <CheckCircle className="h-4 w-4 text-primary" />,
};

const LatestAppointmentCard: React.FC<LatestAppointmentCardProps> = ({ appointment, onClick }) => {
  const { t } = useTranslation();
  const statusClass = statusColors[appointment.status] || 'border-muted bg-muted/50';
  const statusIcon = statusIcons[appointment.status];
  
  const appointmentDate = new Date(appointment.data_hora);
  const formattedDate = format(appointmentDate, 'dd/MM/yyyy', { locale: ptBR });
  const formattedTime = format(appointmentDate, 'HH:mm');
  
  const responsibleName = appointment.responsavel?.nome_completo || t('responsible');
  const responsibleAvatarUrl = appointment.responsavel?.avatar_url;
  const responsibleInitials = responsibleName.slice(0, 2).toUpperCase();
  
  // Dados do Cliente
  const clientName = appointment.clientes?.nome || t('no_data_found');
  const clientAvatarUrl = appointment.clientes?.avatar_url;
  const clientInitials = clientName.slice(0, 2).toUpperCase();
  
  // Extrai o nome do primeiro item
  const items = appointment.agendamento_itens || [];
  const mainItemName = items[0]?.produtos?.nome || t('no_data_found');
  
  // NOVO: Busca detalhes da promoção
  const { data: promotion, isLoading: isLoadingPromotion } = usePromotionById(appointment.promocao_id || undefined);

  // Cálculo do Valor Total
  const totalValue = useMemo(() => {
    let sum = items.reduce((acc, item) => {
      const price = parseFloat(String(item.preco_unitario)) || 0;
      const quantity = parseInt(String(item.quantidade)) || 0;
      return acc + (price * quantity);
    }, 0);

    if (promotion && promotion.desconto_percentual > 0) {
      sum = sum * (1 - promotion.desconto_percentual / 100);
    }
    return sum;
  }, [items, promotion]);

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
      onClick={() => onClick(appointment)} // Adicionando o manipulador de clique
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
          <span className="text-muted-foreground">{t(appointment.status)}</span>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-1 space-y-2 text-sm flex-1">
        
        {/* Valor Total */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-sm font-medium text-primary">{formatCurrency(totalValue)}</span>
          {isLoadingPromotion ? (
            <Loader2 className="h-3 w-3 animate-spin ml-1" />
          ) : promotion && promotion.desconto_percentual > 0 && (
            <span className="text-xs text-green-500 flex items-center ml-1">
              <Percent className="h-3 w-3 mr-0.5" /> -{promotion.desconto_percentual}%
            </span>
          )}
        </div>
        
        {/* Data e Hora */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium">{formattedDate}</span>
          <Clock className="h-4 w-4 flex-shrink-0 ml-2" />
          <span className="text-sm font-medium">{formattedTime}</span>
        </div>
        
        {/* Responsável (Agora com Avatar) */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Avatar className="h-6 w-6">
            <AvatarImage src={responsibleAvatarUrl || undefined} alt={responsibleName} />
            <AvatarFallback className="text-xs">{responsibleInitials}</AvatarFallback>
          </Avatar>
          <span className="text-sm truncate">{responsibleName}</span>
        </div>
        
        {/* Serviço/Produto Principal */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Package className="h-4 w-4 flex-shrink-0" /> 
          <span className="text-sm truncate font-medium text-foreground">{mainItemName}</span>
          {items.length > 1 && (
            <span className="text-xs text-muted-foreground ml-1"> (+{items.length - 1} {t('items')})</span>
          )}
        </div>
        
        {/* Empresa */}
        {appointment.empresas?.nome && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building className="h-4 w-4 flex-shrink-0" />
            <span className="text-xs truncate">{appointment.empresas.nome}</span>
          </div>
        )}
        
      </CardContent>
    </Card>
  );
};

export default LatestAppointmentCard;