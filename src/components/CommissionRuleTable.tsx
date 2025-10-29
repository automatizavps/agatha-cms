import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CommissionRule, deleteCommissionRule, CommissionType, EntityType, useRuleUsers } from "@/integrations/supabase/commissions";
import { MoreHorizontal, Trash2, Pencil, DollarSign, Percent, ArrowUpDown, ArrowUp, ArrowDown, Tag, Package, Clock, Building, Users, Loader2 } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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

// Componente para exibir os usuários afetados
const RuleUsersDisplay: React.FC<{ ruleId: string }> = ({ ruleId }) => {
  const { data: members, isLoading } = useRuleUsers(ruleId);
  const { t } = useTranslation();

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }
  
  if (!members || members.length === 0) {
    return <span className="text-muted-foreground">{t('general_rule', { defaultValue: 'Regra Geral' })}</span>;
  }
  
  const displayMembers = members.slice(0, 3);
  const remainingCount = members.length - displayMembers.length;

  const tooltipContent = (
    <div className="space-y-1 text-sm">
      <p className="font-semibold mb-1">{t('team_members')}:</p>
      {members.map((member, index) => (
        <div key={index} className="flex items-center gap-2">
          <span>{member.usuarios?.nome_completo || t('no_data_found')}</span>
        </div>
      ))}
    </div>
  );

  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 cursor-default">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {displayMembers.map(m => m.usuarios?.nome_completo?.split(' ')[0] || 'Usuário').join(', ')}
            {remainingCount > 0 && ` (+${remainingCount})`}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
};

// NOVO: Componente para exibir as entidades afetadas
const RuleEntitiesDisplay: React.FC<{ rule: CommissionRule }> = ({ rule }) => {
  const { t } = useTranslation();
  
  if (!rule.entidades || rule.entidades.length === 0) {
    return <span className="text-muted-foreground">N/A</span>;
  }
  
  const displayEntities = rule.entidades.slice(0, 2);
  const remainingCount = rule.entidades.length - displayEntities.length;

  const tooltipContent = (
    <div className="space-y-1 text-sm">
      <p className="font-semibold mb-1">{t('commission_entity', { defaultValue: 'Entidades' })}:</p>
      {rule.entidades.map((entity, index) => (
        <div key={index} className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs capitalize">{t(entity.tipo || 'categoria')}</Badge>
          <span>{entity.nome}</span>
        </div>
      ))}
    </div>
  );

  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <div className="flex flex-col items-start cursor-default">
          <span className="font-medium">
            {displayEntities.map(e => e.nome).join(', ')}
            {remainingCount > 0 && ` (+${remainingCount})`}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
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
          // Ordena pelo nome da primeira entidade
          aValue = a.entidades?.[0]?.nome || '';
          bValue = b.entidades?.[0]?.nome || '';
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
              <TableHead>{t('team_members', { defaultValue: 'Usuários' })}</TableHead>
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
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRules.map((rule) => (
              <TableRow key={rule.id}>
                {isSuperAdmin && (
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      {rule.empresas?.nome || 'N/A'}
                    </div>
                  </TableCell>
                )}
                <TableCell className="font-medium">
                  {getEntityTypeBadge(rule.tipo_entidade)}
                </TableCell>
                <TableCell className="font-medium">
                  <RuleEntitiesDisplay rule={rule} />
                </TableCell>
                <TableCell>
                  <RuleUsersDisplay ruleId={rule.id} />
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground capitalize">
                  {t(rule.tipo_valor)}
                </TableCell>
                <TableCell className="text-right font-semibold text-primary">
                  {formatValue(rule)}
                </TableCell>
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