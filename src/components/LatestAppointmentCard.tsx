import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, User, Briefcase, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Appointment } from '@/types/appointments';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface LatestAppointmentCardProps {
  appointment: Appointment;
}

const LatestAppointmentCard: React.FC<LatestAppointmentCardProps> = ({ appointment }) => {
  const { t } = useTranslation();
  
  const formattedDate = appointment.data_hora 
    ? format(new Date(appointment.data_hora), 'dd/MM/yyyy', { locale: ptBR }) 
    : t('date_unavailable');
    
  const formattedTime = appointment.data_hora 
    ? format(new Date(appointment.data_hora), 'HH:mm', { locale: ptBR }) 
    : '';

  const statusText = t(`appointment_status_${appointment.status}`);
  const isCompleted = appointment.status === 'concluido';

  return (
    <Card className="w-full shadow-md hover:shadow-lg transition-shadow border-l-4 border-primary">
      <CardContent className="p-4 space-y-3">
        
        {/* Nome do Cliente e Status */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col min-w-0">
            <p className="font-semibold truncate text-base" title={appointment.cliente?.nome || t('client_unavailable')}>
              {appointment.cliente?.nome || t('client_unavailable')}
            </p>
          </div>
          <Badge 
            variant={isCompleted ? 'default' : 'secondary'} 
            className="ml-2 flex-shrink-0"
          >
            {isCompleted && <CheckCircle className="h-3 w-3 mr-1" />}
            {statusText}
          </Badge>
        </div>

        {/* Data e Hora */}
        <div className="flex items-center gap-2 text-muted-foreground flex-wrap"> {/* Adicionado flex-wrap */}
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm font-medium">{formattedDate}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 flex-shrink-0" /> {/* Removido ml-2 */}
            <span className="text-sm font-medium">{formattedTime}</span>
          </div>
        </div>

        {/* Responsável */}
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={appointment.responsavel?.avatar_url || undefined} alt={appointment.responsavel?.nome_completo || 'Responsável'} />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <p className="text-sm font-medium truncate" title={appointment.responsavel?.nome_completo || t('responsible_unavailable')}>
            {appointment.responsavel?.nome_completo || t('responsible_unavailable')}
          </p>
        </div>

        {/* Serviço Principal (Item 1) */}
        {appointment.agendamento_itens && appointment.agendamento_itens.length > 0 && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary flex-shrink-0" />
            <p className="text-sm font-bold truncate" title={appointment.agendamento_itens[0].produto?.nome || t('service_unavailable')}>
              {appointment.agendamento_itens[0].produto?.nome || t('service_unavailable')}
            </p>
          </div>
        )}

        {/* Empresa */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Briefcase className="h-4 w-4 flex-shrink-0" />
          <p className="truncate" title={appointment.empresa?.nome || t('company_unavailable')}>
            {appointment.empresa?.nome || t('company_unavailable')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LatestAppointmentCard;