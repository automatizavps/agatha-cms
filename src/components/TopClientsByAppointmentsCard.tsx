import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListOrdered, Loader2, CalendarCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTopClientsByAppointments } from '@/integrations/supabase/topClients';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TopClientsByAppointmentsCardProps {
  companyId: string | undefined;
}

const TopClientsByAppointmentsCard: React.FC<TopClientsByAppointmentsCardProps> = ({ companyId }) => {
  const { t } = useTranslation();
  const { data: clients, isLoading, isError } = useTopClientsByAppointments(companyId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarCheck className="h-5 w-5" /> {t('top_clients_appointments_title', { defaultValue: 'Top 10 Clientes por Agendamentos' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !clients || clients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarCheck className="h-5 w-5" /> {t('top_clients_appointments_title', { defaultValue: 'Top 10 Clientes por Agendamentos' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 text-muted-foreground">
          {isError ? t("chart_error") : t("no_data_found")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarCheck className="h-5 w-5" /> {t('top_clients_appointments_title', { defaultValue: 'Top 10 Clientes por Agendamentos' })}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>{t('client_name')}</TableHead>
                <TableHead className="text-right">{t('total_appointments')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client, index) => {
                const initials = client.nome_cliente.slice(0, 2).toUpperCase();
                
                return (
                  <TableRow key={client.cliente_id}>
                    <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={client.avatar_url || undefined} alt={client.nome_cliente} className="object-cover" />
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        {client.nome_cliente}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {client.total_agendamentos}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default TopClientsByAppointmentsCard;