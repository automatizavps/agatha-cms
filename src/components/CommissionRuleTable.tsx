import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CommissionRule, deleteCommissionRule, CommissionType, EntityType } from "@/integrations/supabase/commissions";
import { MoreHorizontal, Trash2, Pencil, DollarSign, Percent, ArrowUpDown, ArrowUp, ArrowDown, Tag, Package, Clock, Building } from "lucide-react";
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
import EditCommissionRuleSheet from "./EditCommissionRuleSheet";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface CommissionRuleTableProps {
  rules: CommissionRule[];
  canWrite: boolean;
}

interface RuleActionsProps {
  rule: CommissionRule;
  onEdit: (rule: CommissionRule) => void;
  canWrite: boolean;
}

type SortKey = 'tipo_entidade' | 'entidade' | 'tipo_valor' | 'valor' | 'empresa';
type SortDirection = 'asc' | 'desc';

const RuleActions: React.FC<RuleActionsProps> = ({ rule, onEdit, canWrite }) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  const deleteMutation = useMutation({
    mutationFn: () => deleteCommissionRule(rule.id, queryClient),
    onSuccess: () => {
      showSuccess(t('commission_rule_deleted_success', { defaultValue: 'Regra de comissionamento excluída com sucesso!' }));
      queryClient.invalidateQueries({ queryKey: ["commissionRules"] });
    },
    onError: (error) => {
      showError(t("error_loading_data") + ": " + error.message);
    },
  });

  if (!canWrite) {
    return null;
  }

  const handleDelete = () => {
    if (window.confirm(t('confirm_delete'))) {
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
        <DropdownMenuItem onClick={() => onEdit(rule)}>
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
      <div className={cn("flex items-center gap-1", className?.includes('text-right') && "justify-end", className?.includes('text-center') && "justify-center")}>
        {children}
        <Icon className="ml-1 h-3 w-3 opacity-50" />
      </div>
    </TableHead>
  );
};


const CommissionRuleTable: React.FC<CommissionRuleTableProps> = ({ rules, canWrite }) => {
  const [editingRule, setEditingRule] = useState<CommissionRule | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const { data: profile } = useCurrentUserProfile();
  const [sortKey, setSortKey] = useState<SortKey>('tipo_entidade');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const { t } = useTranslation();
  
  const isSuperAdmin = profile?.is_super_admin;

  const handleEdit = (rule: CommissionRule) => {
    setEditingRule(rule);
    setIsEditSheetOpen(true);
  };

  const handleCloseEditSheet = (open: boolean) => {
    setIsEditSheetOpen(open);
    if (!open) {
      setEditingRule(null);
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
  
  const sortedRules = useMemo(() => {
    if (!rules) return [];
    
    const sorted = [...rules].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortKey) {
        case 'tipo_entidade':
          aValue = a.tipo_entidade;
          bValue = b.tipo_entidade;
          break;
        case 'entidade':
          aValue = a.entidade?.nome || '';
          bValue = b.entidade?.nome || '';
          break;
        case 'tipo_valor':
          aValue = a.tipo_valor;
          bValue = b.tipo_valor;
          break;
        case 'valor':
          aValue = a.valor;
          bValue = b.valor;
          break;
        case 'empresa':
          aValue = a.empresas?.nome || '';
          bValue = b.empresas?.nome || '';
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
  }, [rules, sortKey, sortDirection]);

  const formatValue = (rule: CommissionRule) => {
    if (rule.tipo_valor === 'fixo') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(rule.valor);
    }
    return `${rule.valor}%`;
  };
  
  const getEntityTypeIcon = (type: EntityType) => {
    switch (type) {
      case 'produto': return <Package className="h-4 w-4 text-muted-foreground" />;
      case 'servico': return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'categoria': return <Tag className="h-4 w-4 text-muted-foreground" />;
      default: return null;
    }
  };
  
  const getEntityTypeBadge = (type: EntityType) => {
    const baseClasses = "capitalize";
    switch (type) {
      case 'produto': return <Badge variant="default" className={baseClasses}>{t('nav_products')}</Badge>;
      case 'servico': return <Badge variant="secondary" className={baseClasses}>{t('nav_services')}</Badge>;
      case 'categoria': return <Badge variant="outline" className={baseClasses}>{t('page_title_categories')}</Badge>;
      default: return null;
    }
  };


  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader 
                sortKey="tipo_entidade" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
              >
                {t('commission_entity_type', { defaultValue: 'Tipo' })}
              </SortableHeader>
              <SortableHeader 
                sortKey="entidade" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
              >
                {t('commission_entity', { defaultValue: 'Entidade' })}
              </SortableHeader>
              <SortableHeader 
                sortKey="tipo_valor" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                className="hidden sm:table-cell"
              >
                {t('commission_value_type', { defaultValue: 'Tipo de Valor' })}
              </SortableHeader>
              <SortableHeader 
                sortKey="valor" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                className="text-right"
              >
                {t('commission_value', { defaultValue: 'Valor' })}
              </SortableHeader>
              {isSuperAdmin && (
                <SortableHeader 
                  sortKey="empresa" 
                  currentSortKey={sortKey} 
                  currentSortDirection={sortDirection} 
                  onSort={handleSort}
                  className="hidden md:table-cell"
                >
                  {t('user_table_header_company')}
                </SortableHeader>
              )}
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="font-medium">
                  {getEntityTypeBadge(rule.tipo_entidade)}
                </TableCell>
                <TableCell className="font-medium flex items-center gap-2">
                  {getEntityTypeIcon(rule.tipo_entidade)}
                  {rule.entidade?.nome || rule.entidade_id.slice(0, 8)}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground capitalize">
                  {t(rule.tipo_valor)}
                </TableCell>
                <TableCell className="text-right font-semibold text-primary">
                  {formatValue(rule)}
                </TableCell>
                {isSuperAdmin && (
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      {rule.empresas?.nome || 'N/A'}
                    </div>
                  </TableCell>
                )}
                <TableCell className="text-right">
                  <RuleActions rule={rule} onEdit={handleEdit} canWrite={canWrite} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {editingRule && (
        <EditCommissionRuleSheet 
          rule={editingRule} 
          isOpen={isEditSheetOpen} 
          onOpenChange={handleCloseEditSheet} 
        />
      )}
    </>
  );
};

export default CommissionRuleTable;