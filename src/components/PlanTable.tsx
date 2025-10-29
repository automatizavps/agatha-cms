import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plan, deletePlan } from "@/integrations/supabase/plans";
import { MoreHorizontal, Trash2, Pencil, DollarSign, Users, ArrowUpDown, ArrowUp, ArrowDown, ShieldCheck, Calendar } from "lucide-react";
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
import EditPlanSheet from "./EditPlanSheet";
import { Badge } from "@/components/ui/badge";
import { format, isPast, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PlanTableProps {
  plans: Plan[];
  canWrite: boolean;
}

interface PlanActionsProps {
  plan: Plan;
  onEdit: (plan: Plan) => void;
  canWrite: boolean;
}

type SortKey = 'nome' | 'limite_usuarios' | 'preco' | 'data_inicio';
type SortDirection = 'asc' | 'desc';

const PlanActions: React.FC<PlanActionsProps> = ({ plan, onEdit, canWrite }) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  const deleteMutation = useMutation({
    mutationFn: () => deletePlan(plan.id, plan.nome, queryClient),
    onSuccess: () => {
      showSuccess(t('plan_deleted_success', { name: plan.nome }));
      queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
    onError: (error) => {
      showError(t("error_loading_data") + ": " + error.message);
    },
  });
  
  if (!canWrite) {
    return null;
  }

  const handleDelete = () => {
    if (window.confirm(t('confirm_delete_plan', { defaultValue: `Tem certeza que deseja excluir o plano ${plan.nome}? Empresas associadas ficarão sem plano.` }))) {
      deleteMutation.mutate();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">{t('actions')}</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onEdit(plan)}>
          <Pencil className="mr-2 h-4 w-4" /> {t('edit')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleDelete} 
          disabled={deleteMutation.isPending}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" /> {t('delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
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

// Função para determinar o status da vigência
const getPlanStatus = (plan: Plan) => {
  if (!plan.data_inicio || !plan.data_fim) {
    return <Badge variant="secondary">{plan.data_inicio ? 'Sem Fim' : 'Indefinido'}</Badge>;
  }
  
  const start = new Date(plan.data_inicio);
  const end = new Date(plan.data_fim);
  const now = new Date();
  
  if (isPast(end)) {
    return <Badge variant="destructive">Expirado</Badge>;
  }
  
  if (isFuture(start)) {
    return <Badge className="bg-blue-600 hover:bg-blue-600/90 text-white">Agendado</Badge>;
  }
  
  // Se não expirou e não está agendado, está ativo
  return <Badge className="bg-green-600 hover:bg-green-600/90 text-white">Ativo</Badge>;
};


const PlanTable: React.FC<PlanTableProps> = ({ plans, canWrite }) => {
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('nome');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const { t } = useTranslation();
  
  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setIsEditSheetOpen(true);
  };

  const handleCloseEditSheet = (open: boolean) => {
    setIsEditSheetOpen(open);
    if (!open) {
      setEditingPlan(null);
    }
  };
  
  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };
  
  const sortedPlans = useMemo(() => {
    if (!plans) return [];
    
    const sorted = [...plans].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortKey) {
        case 'nome':
          aValue = a.nome;
          bValue = b.nome;
          break;
        case 'limite_usuarios':
          aValue = a.limite_usuarios;
          bValue = b.limite_usuarios;
          break;
        case 'preco':
          aValue = a.preco;
          bValue = b.preco;
          break;
        case 'data_inicio':
          aValue = a.data_inicio ? new Date(a.data_inicio).getTime() : 0;
          bValue = b.data_inicio ? new Date(b.data_inicio).getTime() : 0;
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
  }, [plans, sortKey, sortDirection]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };


  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader 
                sortKey="nome" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
              >
                {t('plan_name', { defaultValue: 'Plano' })}
              </SortableHeader>
              <SortableHeader 
                sortKey="limite_usuarios" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                className="text-center hidden sm:table-cell"
              >
                {t('user_limit', { defaultValue: 'Limite Usuários' })}
              </SortableHeader>
              <SortableHeader 
                sortKey="data_inicio" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                className="hidden md:table-cell"
              >
                {t('plan_duration', { defaultValue: 'Vigência' })}
              </SortableHeader>
              <SortableHeader 
                sortKey="preco" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                className="text-right"
              >
                {t('plan_price', { defaultValue: 'Preço' })}
              </SortableHeader>
              <TableHead className="text-center">{t('order_table_header_status')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPlans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  {plan.nome}
                </TableCell>
                <TableCell className="text-center hidden sm:table-cell text-sm text-muted-foreground">
                  <div className="flex items-center justify-center gap-1">
                    <Users className="h-3 w-3" />
                    {plan.limite_usuarios}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {plan.data_inicio ? format(new Date(plan.data_inicio), "dd/MM/yyyy", { locale: ptBR }) : 'N/A'} - {plan.data_fim ? format(new Date(plan.data_fim), "dd/MM/yyyy", { locale: ptBR }) : 'N/A'}
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold text-primary">
                  {formatCurrency(plan.preco)}
                </TableCell>
                <TableCell className="text-center">
                  {getPlanStatus(plan)}
                </TableCell>
                <TableCell className="text-right">
                  <PlanActions plan={plan} onEdit={handleEdit} canWrite={canWrite} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {editingPlan && (
        <EditPlanSheet 
          plan={editingPlan} 
          isOpen={isEditSheetOpen} 
          onOpenChange={handleCloseEditSheet} 
        />
      )}
    </>
  );
};

export default PlanTable;