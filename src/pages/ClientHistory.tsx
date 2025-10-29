import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, DollarSign, CalendarCheck, Building, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useClients } from "@/integrations/supabase/clients";
import { showError } from "@/utils/toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ClientTransactionTable from "@/components/ClientTransactionTable"; // NOVO IMPORT

const ClientHistory = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const { t } = useTranslation();

  // Apenas carrega os clientes para obter os detalhes do cliente
  const { data: clients, isLoading: isLoadingClients, isError: isErrorClients, error: errorClients } = useClients();

  const isLoading = isLoadingClients;
  const isError = isErrorClients;
  const error = errorClients;

  const client = clients?.find(c => c.id === clientId);
  
  const clientName = client?.nome || t('loading');
  const clientInitials = clientName.slice(0, 2).toUpperCase();
  
  if (isError && error) {
    showError(t("error_loading_data") + ": " + error.message);
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }
  
  if (!client) {
    return (
      <DashboardLayout>
        <div className="text-center p-4 text-muted-foreground">
          {t('client_not_found', { defaultValue: 'Cliente não encontrado.' })}
        </div>
      </DashboardLayout>
    );
  }
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl lg:text-2xl font-bold tracking-tight">
          {t('client_report_title', { defaultValue: 'Relatório do Cliente' })}
        </h1>
        <p className="text-muted-foreground">
          {t('client_report_subtitle', { defaultValue: 'Visão completa de todas as transações e dados de contato.' })}
        </p>
        
        {/* Detalhes do Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <User className="h-5 w-5" /> {client.nome}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col items-center space-y-2 border-r md:border-r-0 md:border-b-0 md:border-r lg:border-b-0 pr-4">
              <Avatar className="h-20 w-20 border-2 border-primary/50">
                <AvatarImage src={client.avatar_url || undefined} alt={client.nome} className="object-cover" />
                <AvatarFallback className="text-2xl">{clientInitials}</AvatarFallback>
              </Avatar>
              <p className="text-sm font-medium">{client.nome}</p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">{t('contact_info', { defaultValue: 'Contato' })}</h3>
              <Separator />
              <p className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{t('profile_email')}:</span> {client.email || 'N/A'}
              </p>
              <p className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{t('user_table_header_phone')}:</span> {client.telefone || 'N/A'}
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">{t('address_info', { defaultValue: 'Localização' })}</h3>
              <Separator />
              <p className="text-sm flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{t('client_table_header_address')}:</span> {client.endereco_completo || 'N/A'}
              </p>
              <p className="text-sm flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{t('order_table_header_date')}:</span> {format(new Date(client.created_at), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
          </CardContent>
        </Card>
        
        {/* Histórico de Transações (Tabela com Filtros) */}
        <ClientTransactionTable 
          clientId={client.id} 
          companyId={client.empresa_id} 
        />
      </div>
    </DashboardLayout>
  );
};

export default ClientHistory;