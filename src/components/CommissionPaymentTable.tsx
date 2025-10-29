import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CommissionRecordReport } from "@/integrations/supabase/reportHooks";
import { MoreHorizontal, CheckCheck, DollarSign, ArrowUpDown, ArrowUp, ArrowDown, Loader2, XCircle, RefreshCw, Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showError, showSuccess } from "@/utils/toast";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ExportButton from "./ExportButton";
import { updateCommissionStatus } from "@/integrations/supabase/commissions";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { flattenDataForExport } from "@/utils/export";

interface CommissionPaymentTableProps {
  records: CommissionRecordReport[];
  onRowClick: (record: CommissionRecordReport) => void; // NOVO: Propriedade de clique
}

interface PaymentActionsProps {
  record: CommissionRecordReport;
  t: (key: string, options?: any) => string; // Passando t
}

type SortKey = 'usuario' | 'tipo_referencia' | 'valor_comissao' | 'status' | 'created_at';
type SortDirection = 'asc' | 'desc';

const PaymentActions: React.FC<PaymentActionsProps> = ({ record, t }) => {
  const queryClient = useQueryClient();
  
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: CommissionRecordReport['status'] }) => updateCommissionStatus(id, status, queryClient),
    onSuccess: (data) => {
      showSuccess(t('commission_status_updated_success', { status: t(data.status) }));
      queryClient.invalidateQueries({ queryKey: ["commissionReport"] });
    },
    onError: (error) => {
      showError(t("error_loading_data") + ": " + error.message);
    },
  });

  const handleMarkPaid = () => {
    if (record.status !== 'pendente' && !window.confirm(t('confirm_change_status', { status: t('paid') }))) return;
    updateStatusMutation.mutate({ id: record.id, status: 'pago' });
  };
  
  const handleMarkCanceled = () => {
    if (record.status !== 'pendente' && !window.confirm(t('confirm_change_status', { status: t('cancelado') }))) return;
    updateStatusMutation.mutate({ id: record.id, status: 'cancelado' });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0" disabled={updateStatusMutation.isPending}>
          <span className="sr-only">{t('actions')}</span>
          {updateStatusMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreHorizontal className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
        
        {record.status !== 'pago' && (
          <DropdownMenuItem onClick={handleMarkPaid} disabled={updateStatusMutation.isPending}>
            <CheckCheck className="mr-2 h-4 w-4 text-green-600" /> {t('mark_as_paid', { defaultValue: 'Marcar como Pago' })}
          </DropdownMenuItem>
        )}
        
        {record.status !== 'cancelado' && (
          <DropdownMenuItem onClick={handleMarkCanceled} disabled={updateStatusMutation.isPending} className="text-destructive focus:text-destructive">
            <XCircle className="mr-2 h-4 w-4" /> {t('mark_as_canceled', { defaultValue: 'Marcar como Cancelado' })}
          </DropdownMenuItem>
        )}
        
        {/* Adicionar outras ações se necessário */}
      </DropdownMenuContent>
    </DropdownMenu>
  );
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
      <div className={cn("flex items-center gap-1", className?.includes('text-right') && "justify-end", className?.includes('text-center') && "justify-center")}>
        {children}
        <Icon className="ml-1 h-3 w-3 opacity-50" />
      </div>
    </TableHead>
  );
};


const CommissionPaymentTable: React.FC<CommissionPaymentTableProps> = ({ records, onRowClick }) => {
  const { t } = useTranslation(); // CHAME O HOOK AQUI
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  // MOVIDO PARA DENTRO DO COMPONENTE
  const getStatusBadge = (status: CommissionRecordReport['status']) => {
    const baseClasses = "capitalize px-3 py-1 rounded-full text-xs font-semibold";
    switch (status) {
      case 'pago':
        return <span className={cn(baseClasses, "bg-green-700/80 text-green-200 dark:bg-green-900/80 dark:text-green-300")}>{t('paid')}</span>;
      case 'cancelado':
        return <span className={cn(baseClasses, "bg-red-700/80 text-red-200 dark:bg-red-900/80 dark:text-red-300")}>{t('cancelado')}</span>;
      case 'pendente':
      default:
        return <span className={cn(baseClasses, "bg-yellow-700/80 text-yellow-200 dark:bg-yellow-900/80 dark:text-yellow-300")}>{t('pending')}</span>;
    }
  };
  
  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };
  
  const sortedRecords = useMemo(() => {
    if (!records) return [];
    
    const sorted = [...records].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortKey) {
        case 'usuario':
          aValue = a.usuarios?.nome_completo || '';
          bValue = b.usuarios?.nome_completo || '';
          break;
        case 'tipo_referencia':
          aValue = a.tipo_referencia;
          bValue = b.tipo_referencia;
          break;
        case 'valor_comissao':
          aValue = a.valor_comissao;
          bValue = b.valor_comissao;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
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
  }, [records, sortKey, sortDirection]);
  
  // Mapeamento de dados para exportação
  const exportData = useMemo(() => {
    return records.map(record => ({
      ID_Comissao: record.id,
      Data_Criacao: format(new Date(record.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
      Status: record.status.toUpperCase(),
      Valor_Comissao: record.valor_comissao,
      Usuario: record.usuarios?.nome_completo || 'N/A',
      Tipo_Referencia: record.tipo_referencia.toUpperCase(),
      ID_Referencia: record.referencia_id,
      Empresa: record.empresas?.nome || 'N/A',
    }));
  }, [records]);


  return (
    <>
      <div className="flex justify-end mb-3">
        <ExportButton 
          data={exportData} 
          fileName={`Pagamentos_Comissoes_${format(new Date(), 'yyyyMMdd')}`}
          disabled={records.length === 0}
          isLoading={false}
        />
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader 
                sortKey="usuario" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
              >
                {t('commission_table_header_user', { defaultValue: 'Usuário' })}
              </SortableHeader>
              <SortableHeader 
                sortKey="tipo_referencia" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                className="hidden sm:table-cell"
              >
                {t('commission_table_header_type', { defaultValue: 'Tipo' })}
              </SortableHeader>
              <TableHead className="hidden md:table-cell">{t('commission_table_header_reference', { defaultValue: 'Referência' })}</TableHead>
              <SortableHeader 
                sortKey="valor_comissao" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                className="text-right"
              >
                {t('commission_value', { defaultValue: 'Valor' })}
              </SortableHeader>
              <SortableHeader 
                sortKey="status" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                className="text-center"
              >
                {t('order_table_header_status')}
              </SortableHeader>
              <SortableHeader 
                sortKey="created_at" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                className="hidden lg:table-cell"
              >
                {t('order_table_header_date')}
              </SortableHeader>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRecords.map((record) => (
              <TableRow 
                key={record.id} 
                className={cn(
                  record.status === 'pendente' && "bg-yellow-500/5 dark:bg-yellow-900/10",
                  "cursor-pointer hover:bg-accent/50 transition-colors" // Torna a linha clicável
                )}
                onClick={() => onRowClick(record)} // Adiciona o manipulador de clique
              >
                <TableCell className="font-medium">{record.usuarios?.nome_completo || 'N/A'}</TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground capitalize">
                  {t(record.tipo_referencia)}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <span className="font-mono cursor-default">{record.referencia_id.slice(0, 8)}</span>
                    </TooltipTrigger>
                    <TooltipContent>ID Completo: {record.referencia_id}</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-right font-semibold text-primary">
                  {formatCurrency(record.valor_comissao)}
                </TableCell>
                <TableCell className="text-center">
                  {getStatusBadge(record.status)}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {format(new Date(record.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell className="text-right">
                  <PaymentActions record={record} t={t} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default CommissionPaymentTable;