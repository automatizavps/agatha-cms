import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, DollarSign, CalendarCheck, ShoppingCart, ListOrdered, Building, Clock, Package } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useParams, Link } from "react-router-dom";
import { useClientTransactions, ClientTransaction } from "@/integrations/supabase/clientHistory";
import { useClients } from "@/integrations/supabase/clients";
import { showError } from "@/utils/toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCompanies } from "@/integrations/supabase/companies";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

const ClientHistory = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const { t } = useTranslation();

  const { data: transactions, isLoading: isLoadingTransactions, isError: isErrorTransactions, error: errorTransactions } = useClientTransactions(clientId || '');
  const { data: clients, isLoading: isLoadingClients } = useClients();
  const { data: companies } = useCompanies();

  const isLoading = isLoadingTransactions || isLoadingClients;
  const isError = isErrorTransactions;
  const error = errorTransactions;

  const client = clients?.find(c => c.id === clientId);
  
  const clientName = client?.nome || t('loading');
  const clientInitials = clientName.slice(0, 2).toUpperCase();
  
  const companyMap = useMemo(() => {
    return new Map(companies?.map(c => [c.id, c.nome]));
  }, [companies]);

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
  
  const getTransactionTypeBadge = (type: ClientTransaction['tipo_transacao']) => {
    const baseClasses = "capitalize";
    switch (type) {
      case 'Pedido':
        return <Badge className={baseClasses} variant="default">{t('nav_orders')}</Badge>;
      case 'Agendamento':
        return <Badge className={baseClasses} variant="secondary">{t('nav_appointments')}</Badge>;
      default:
        return <Badge className={baseClasses} variant="outline">{type}</Badge>;
    }
  };
  
  const getStatusBadge = (status: string) => {
    const baseClasses = "capitalize px-3 py-1 rounded-full text-xs font-semibold";
    switch (status) {
      case 'entregue':
      case 'concluido':
        return <span className={cn(baseClasses, "bg-green-700/80 text-green-200 dark:bg-green-900/80 dark:text-green-300")}>{t(status)}</span>;
      case 'cancelado':
        return <span className={cn(baseClasses, "bg-red-700/80 text-red-200 dark:bg-red-900/80 dark:text-red-300")}>{t(status)}</span>;
      case 'pendente_entrega':
      case 'pendente':
      case 'confirmado':
      default:
        return <span className={cn(baseClasses, "bg-yellow-700/80 text-yellow-200 dark:bg-yellow-900/80 dark:text-yellow-300")}>{t(status.replace('_', ' '))}</span>;
    }
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
        
        {/* Histórico de Transações (Tabela) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ListOrdered className="h-5 w-5" /> {t('transaction_history_title', { defaultValue: 'Histórico de Transações' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingTransactions ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : isErrorTransactions || !transactions || transactions.length === 0 ? (
              <div className="text-center p-4 text-muted-foreground">
                {t('no_transactions_found', { defaultValue: 'Nenhuma transação (pedido ou agendamento) encontrada para este cliente.' })}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('order_table_header_date')}</TableHead>
                      <TableHead>{t('type')}</TableHead>
                      <TableHead>{t('order_table_header_total')}</TableHead>
                      <TableHead className="hidden sm:table-cell">{t('responsible')}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('nav_products_services')}</TableHead>
                      <TableHead className="text-center">{t('order_table_header_status')}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t('user_table_header_company')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(item.data_transacao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>{getTransactionTypeBadge(item.tipo_transacao)}</TableCell>
                        <TableCell className="font-semibold text-primary">
                          {formatCurrency(item.valor_total)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {item.responsavel_nome || 'N/A'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-xs truncate">
                          {item.itens.map(i => `${i.nome} (x${i.quantidade})`).join(', ')}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(item.status)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {companyMap.get(item.empresa_id) || 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ClientHistory;