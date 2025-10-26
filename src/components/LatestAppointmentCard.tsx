import React from 'react';
import { Appointment } from '@/integrations/supabase/appointments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CheckCircle, XCircle, AlertTriangle, Building, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Importando Avatar

interface LatestAppointmentCardProps {
  appointment: Appointment;
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

const LatestAppointmentCard: React.FC<LatestAppointmentCardProps> = ({ appointment }) => {
  const { t } = useTranslation();
  const statusClass = statusColors[appointment.status] || 'border-muted bg-muted/50';
  const statusIcon = statusIcons[appointment.status];
  
  const appointmentDate = new Date(appointment.data_hora);
  const formattedDate = format(appointmentDate, 'dd/MM/yyyy', { locale: ptBR });
  const formattedTime = format(appointmentDate, 'HH:mm');
  
  const responsibleName = appointment.responsavel?.nome_completo || t('responsible');
  const responsibleAvatarUrl = appointment.responsavel?.avatar_url;
  const initials = responsibleName.slice(0, 2).toUpperCase();

  return (
    <Card className={cn("w-full flex flex-col h-full border-l-4 transition-shadow hover:shadow-lg", statusClass)}>
      <CardHeader className="p-3 pb-1 flex-row items-center justify-between">
        <CardTitle className="text-base truncate font-semibold">
          {appointment.clientes?.nome || t('no_data_found')}
        </CardTitle>
        <div className="flex items-center gap-1 text-xs font-medium capitalize">
          {statusIcon}
          <span className="text-muted-foreground">{t(appointment.status)}</span>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-1 space-y-2 text-sm flex-1">
        
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
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-sm truncate">{responsibleName}</span>
        </div>
        
        {/* Empresa (Apenas se for Super Admin ou se precisar mostrar) */}
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