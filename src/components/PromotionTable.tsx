import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Promotion, deletePromotion, RuleType, usePromotionRules } from "@/integrations/supabase/promotions";
import { MoreHorizontal, Trash2, Pencil, Tag, Building, ArrowUpDown, ArrowUp, ArrowDown, Percent, Calendar, Users, Package, Clock } from "lucide-react";
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
import EditPromotionSheet from "./EditPromotionSheet";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useProductsOnly, useServicesOnly } from "@/integrations/supabase/products";
import { useCategories } from "@/integrations/supabase/categories";
import { useClients } from "@/integrations/supabase/clients";

interface PromotionTableProps {
  promotions: Promotion[];
  canWrite: boolean;
}

interface PromotionActionsProps {
  promotion: Promotion;
  onEdit: (promotion: Promotion) => void;
  canWrite: boolean;
}

type SortKey = 'nome' | 'empresa' | 'desconto_percentual' | 'data_fim';
type SortDirection = 'asc' | 'desc';

const PromotionActions: React.FC<PromotionActionsProps> = ({ promotion, onEdit, canWrite }) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  const deleteMutation = useMutation({
    mutationFn: () => deletePromotion(promotion.id, promotion.nome, promotion.empresa_id, queryClient),
    onSuccess: () => {
      showSuccess(t('promotion_deleted_success', { name: promotion.nome, defaultValue: 'Promoção excluída com sucesso.' }));
      queryClient.invalidateQueries({ queryKey: ["promotions"] });
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
        <DropdownMenuItem onClick={() => onEdit(promotion)}>
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

// Componente para exibir as regras de segmentação
const PromotionRulesDisplay: React.FC<{ promotionId: string }> = ({ promotionId }) => {
  const { data: rules, isLoading } = usePromotionRules(promotionId);
  const { t } = useTranslation();
  
  // Carrega todos os dados necessários para mapear IDs para nomes
  const { data: products } = useProductsOnly();
  const { data: services } = useServicesOnly();
  const { data: categories } = useCategories();
  const { data: clients } = useClients();
  
  const entityMap = useMemo(() => {
    const map = new Map<string, string>();
    products?.forEach(p => map.set(p.id, p.nome));
    services?.forEach(s => map.set(s.id, s.nome));
    categories?.forEach(c => map.set(c.id, c.nome));
    clients?.forEach(c => map.set(c.id, c.nome));
    return map;
  }, [products, services, categories, clients]);

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }
  
  if (!rules || rules.length === 0) {
    return <span className="text-muted-foreground">{t('no_rules', { defaultValue: 'Nenhuma regra' })}</span>;
  }
  
  const ruleCounts = rules.reduce((acc, rule) => {
    acc[rule.tipo_regra] = (acc[rule.tipo_regra] || 0) + 1;
    return acc;
  }, {} as Record<RuleType, number>);
  
  const displayRules = Object.entries(ruleCounts).map(([type, count]) => {
    let icon: React.ReactNode;
    let label: string;
    
    switch (type as RuleType) {
      case 'produto': icon = <Package className="h-3 w-3" />; label = t('nav_products'); break;
      case 'servico': icon = <Clock className="h-3 w-3" />; label = t('nav_services'); break;
      case 'categoria': icon = <Tag className="h-3 w-3" />; label = t('product_table_header_category'); break;
      case 'cliente': icon = <Users className="h-3 w-3" />; label = t('nav_clients'); break;
      default: icon = null; label = 'N/A';
    }
    
    return (
      <Badge key={type} variant="secondary" className="text-xs flex items-center gap-1">
        {icon} {label} ({count})
      </Badge>
    );
  });
  
  const tooltipContent = (
    <div className="space-y-1 text-sm max-w-xs">
      <p className="font-semibold mb-1">{t('promotion_rules')}:</p>
      {rules.map((rule, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="capitalize text-muted-foreground text-xs w-1/3">{t(rule.tipo_regra)}:</span>
          <span className="font-medium truncate w-2/3">{entityMap.get(rule.entidade_id) || rule.entidade_id.slice(0, 8)}</span>
        </div>
      ))}
    </div>
  );

  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <div className="flex flex-wrap gap-1 cursor-default">
          {displayRules}
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
};


const PromotionTable: React.FC<PromotionTableProps> = ({ promotions, canWrite }) => {
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const { data: profile } = useCurrentUserProfile();
  const [sortKey, setSortKey] = useState<SortKey>('data_fim');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const { t } = useTranslation();
  
  const isSuperAdmin = profile?.is_super_admin;

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setIsEditSheetOpen(true);
  };

  const handleCloseEditSheet = (open: boolean) => {
    setIsEditSheetOpen(open);
    if (!open) {
      setEditingPromotion(null);
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
  
  const sortedPromotions = useMemo(() => {
    if (!promotions) return [];
    
    const sorted = [...promotions].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortKey) {
        case 'nome':
          aValue = a.nome;
          bValue = b.nome;
          break;
        case 'empresa':
          aValue = a.empresas?.nome || '';
          bValue = b.empresas?.nome || '';
          break;
        case 'desconto_percentual':
          aValue = a.desconto_percentual;
          bValue = b.desconto_percentual;
          break;
        case 'data_fim':
          aValue = new Date(a.data_fim).getTime();
          bValue = new Date(b.data_fim).getTime();
          break;
        default:
          return 0;
      }
      
      if (typeof aValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [promotions, sortKey, sortDirection]);
  
  const getStatusBadge = (dataFim: string) => {
    const isExpired = isPast(new Date(dataFim));
    if (isExpired) {
      return <Badge variant="destructive">{t('expired', { defaultValue: 'Expirada' })}</Badge>;
    }
    return <Badge className="bg-green-600 hover:bg-green-600/90 text-white">{t('active', { defaultValue: 'Ativa' })}</Badge>;
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
                {t('promotion_name', { defaultValue: 'Promoção' })}
              </SortableHeader>
              <SortableHeader 
                sortKey="desconto_percentual" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                className="text-right hidden sm:table-cell"
              >
                {t('discount_percentage', { defaultValue: 'Desconto' })}
              </SortableHeader>
              <TableHead className="hidden md:table-cell">{t('promotion_rules')}</TableHead>
              <SortableHeader 
                sortKey="data_fim" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                className="hidden lg:table-cell"
              >
                {t('end_date', { defaultValue: 'Data Fim' })}
              </SortableHeader>
              <TableHead className="text-center">Status</TableHead>
              {isSuperAdmin && (
                <SortableHeader 
                  sortKey="empresa" 
                  currentSortKey={sortKey} 
                  currentSortDirection={sortDirection} 
                  onSort={handleSort}
                  className="hidden xl:table-cell"
                >
                  {t('user_table_header_company')}
                </SortableHeader>
              )}
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPromotions.map((promotion) => (
              <TableRow key={promotion.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  {promotion.nome}
                </TableCell>
                <TableCell className="text-right hidden sm:table-cell font-semibold text-primary">
                  {promotion.desconto_percentual}%
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  <PromotionRulesDisplay promotionId={promotion.id} />
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(promotion.data_fim), "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {getStatusBadge(promotion.data_fim)}
                </TableCell>
                {isSuperAdmin && (
                  <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      {promotion.empresas?.nome || 'N/A'}
                    </div>
                  </TableCell>
                )}
                <TableCell className="text-right">
                  <PromotionActions promotion={promotion} onEdit={handleEdit} canWrite={canWrite} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {editingPromotion && (
        <EditPromotionSheet 
          promotion={editingPromotion} 
          isOpen={isEditSheetOpen} 
          onOpenChange={handleCloseEditSheet} 
        />
      )}
    </>
  );
};

export default PromotionTable;