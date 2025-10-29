import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClientTransaction } from "@/integrations/supabase/clientHistory";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Loader2, CalendarIcon, Filter, User, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, ListOrdered } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUsers } from "@/integrations/supabase/users";
import { useDashboardFilter } from "@/hooks/useDashboardFilter";
import { useClientTransactions } from "@/integrations/supabase/clientHistory";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // IMPORTAÇÃO CORRIGIDA

type TransactionType = 'Pedido' | 'Agendamento';
type SortKey = 'data_transacao' | 'tipo_transacao' | 'valor_total' | 'responsavel_nome' | 'status';
type SortDirection = 'asc' | 'desc';

interface ClientTransactionTableProps {
  clientId: string;
  companyId: string;
}

const transactionTypeOptions: { value: TransactionType | 'all', label: string }[] = [
  { value: 'all', label: 'Todos os Tipos' },
  { value: 'Pedido', label: 'Pedidos' },
  { value: 'Agendamento', label: 'Agendamentos' },
];

const getStatusBadge = (status: string, t: (key: string, options?: any) => string) => {
  const baseClasses = "capitalize px-3 py-1 rounded-full text-xs font-semibold";
  const translatedStatus = t(status.replace('_', ' '));
  
  switch (status) {
    case 'entregue':
    case 'concluido':
      return <span className={cn(baseClasses, "bg-green-700/80 text-green-200 dark:bg-green-900/80 dark:text-green-300")}>{translatedStatus}</span>;
    case 'cancelado':
      return <span className={cn(baseClasses, "bg-red-700/80 text-red-200 dark:bg-red-900/80 dark:text-red-300")}>{translatedStatus}</span>;
    case 'pendente_entrega':
    case 'pendente':
    case 'confirmado':
    default:
      return <span className={cn(baseClasses, "bg-yellow-700/80 text-yellow-200 dark:bg-yellow-900/80 dark:text-yellow-300")}>{translatedStatus}</span>;
  }
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

interface SortableHeaderProps {
  children: React.ReactNode;
  sortKey: SortKey;
  currentSortKey: SortKey;
  currentSortDirection: SortDirection;
  onSort: (key: SortKey) => void;
  className?: string;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({ children, sortKey, currentSortKey, currentSortDirection, onSort, className }) => {
  const isCurrent = currentSortKey === sortKey;
  
  const Icon = isCurrent 
    ? (currentSortDirection === 'asc' ? ArrowUp : ArrowDown) 
    : ArrowUpDown;

  return (
    <TableHead className={cn("cursor-pointer hover:text-foreground transition-colors", className)} onClick={() => onSort(sortKey)}>
      <div className="flex items-center gap-1">
        {children}
        <Icon className="ml-1 h-3 w-3 opacity-50" />
      </div>
    </TableHead>
  );
};


const ClientTransactionTable: React.FC<ClientTransactionTableProps> = ({ clientId, companyId }) => {
  const { t } = useTranslation();
  const { filteredCompanyId } = useDashboardFilter();
  
  // Filtros
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [responsibleFilter, setResponsibleFilter] = useState<string | 'all'>('all');
  
  // Ordenação
  const [sortKey, setSortKey] = useState<SortKey>('data_transacao');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // Dados
  const { data: transactions, isLoading, isError, refetch, isRefetching } = useClientTransactions(clientId, {
    type: typeFilter,
    startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
    endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
    responsibleId: responsibleFilter === 'all' ? undefined : responsibleFilter,
  });
  
  // Usuários (Responsáveis)
  const { data: users, isLoading: isLoadingUsers } = useUsers();
  
  const availableUsers = useMemo(() => {
    if (!users) return [];
    // Filtra usuários que pertencem à empresa do cliente
    return users.filter(user => user.empresa_id === companyId);
  }, [users, companyId]);
  
  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc'); // Padrão para 'desc' em data/hora
    }
  };
  
  const sortedTransactions = useMemo(() => {
    if (!transactions) return [];
    
    const sorted = [...transactions].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortKey) {
        case 'data_transacao':
          aValue = new Date(a.data_transacao).getTime();
          bValue = new Date(b.data_transacao).getTime();
          break;
        case 'tipo_transacao':
          aValue = a.tipo_transacao;
          bValue = b.tipo_transacao;
          break;
        case 'valor_total':
          aValue = a.valor_total;
          bValue = b.valor_total;
          break;
        case 'responsavel_nome':
          aValue = a.responsavel_nome || '';
          bValue = b.responsavel_nome || '';
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }
      
      if (typeof aValue === 'string' || typeof aValue === 'number') {
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      }
      return 0;
    });
    
    return sorted;
  }, [transactions, sortKey, sortDirection]);


  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ListOrdered className="h-5 w-5" /> {t('transaction_history_title', { defaultValue: 'Histórico de Transações' })}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        
        {/* --- Filter UI --- */}
        <div className="flex flex-col md:flex-row items-start md:items-center mb-4 gap-3 flex-wrap">
          
          {/* Filtro de Tipo */}
          <Select onValueChange={(val) => setTypeFilter(val as TransactionType | 'all')} value={typeFilter} disabled={isLoading}>
            <SelectTrigger className="w-full md:w-[180px]">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder={t('filter_all_status')} />
            </SelectTrigger>
            <SelectContent>
              {transactionTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} className="capitalize">
                  {t(option.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Filtro de Responsável */}
          <Select onValueChange={(val) => setResponsibleFilter(val)} value={responsibleFilter} disabled={isLoading || isLoadingUsers}>
            <SelectTrigger className="w-full md:w-[180px]">
              <User className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder={t('responsible')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filter_all_status')}</SelectItem>
              {availableUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.nome_completo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Filtro de Data */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full md:w-[280px] justify-start text-left font-normal",
                  (!startDate || !endDate) && "text-muted-foreground"
                )}
                disabled={isLoading}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate && endDate ? (
                  `${format(startDate, 'dd/MM/yyyy', { locale: ptBR })} - ${format(endDate, 'dd/MM/yyyy', { locale: ptBR })}`
                ) : (
                  <span>{t('select_date_range')}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{ from: startDate, to: endDate }}
                onSelect={(range) => {
                  setStartDate(range?.from);
                  setEndDate(range?.to);
                }}
                numberOfMonths={2}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
          
          {/* Botão de Recarregar */}
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => refetch()} 
            disabled={isRefetching}
            className="shrink-0"
          >
            {isRefetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Tabela de Dados */}
        {isLoading && !isRefetching ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isError || !sortedTransactions || sortedTransactions.length === 0 ? (
          <div className="text-center p-4 text-muted-foreground">
            {t('no_transactions_found', { defaultValue: 'Nenhuma transação encontrada com os filtros aplicados.' })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader 
                    sortKey="data_transacao" 
                    currentSortKey={sortKey} 
                    currentSortDirection={sortDirection} 
                    onSort={handleSort}
                  >
                    {t('order_table_header_date')}
                  </SortableHeader>
                  <SortableHeader 
                    sortKey="tipo_transacao" 
                    currentSortKey={sortKey} 
                    currentSortDirection={sortDirection} 
                    onSort={handleSort}
                  >
                    {t('type')}
                  </SortableHeader>
                  <SortableHeader 
                    sortKey="valor_total" 
                    currentSortKey={sortKey} 
                    currentSortDirection={sortDirection} 
                    onSort={handleSort}
                  >
                    {t('order_table_header_total')}
                  </SortableHeader>
                  <SortableHeader 
                    sortKey="responsavel_nome" 
                    currentSortKey={sortKey} 
                    currentSortDirection={sortDirection} 
                    onSort={handleSort}
                    className="hidden sm:table-cell"
                  >
                    {t('responsible')}
                  </SortableHeader>
                  <TableHead className="hidden md:table-cell">{t('nav_products_services')}</TableHead>
                  <SortableHeader 
                    sortKey="status" 
                    currentSortKey={sortKey} 
                    currentSortDirection={sortDirection} 
                    onSort={handleSort}
                    className="text-center"
                  >
                    {t('order_table_header_status')}
                  </SortableHeader>
                  <TableHead className="hidden lg:table-cell">{t('user_table_header_company')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTransactions.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(item.data_transacao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.tipo_transacao === 'Pedido' ? 'default' : 'secondary'} className="capitalize">
                        {t(item.tipo_transacao)}
                      </Badge>
                    </TableCell>
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
                      {getStatusBadge(item.status, t)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {item.empresas?.nome || 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientTransactionTable;