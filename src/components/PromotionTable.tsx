import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Promotion, deletePromotion, PromotionRule } from "@/integrations/supabase/promotions";
import { MoreHorizontal, Trash2, Pencil, Percent, Building, ArrowUpDown, ArrowUp, ArrowDown, Calendar, Tag, Package, Clock } from "lucide-react";
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
import { format, isPast, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface PromotionTableProps {
  promotions: Promotion[];
  canWrite: boolean;
}

interface PromotionActionsProps {
  promotion: Promotion;
  onEdit: (promotion: Promotion) => void;
  canWrite: boolean;
}

type SortKey = 'nome' | 'empresa' | 'desconto' | 'data_inicio' | 'data_fim';
type SortDirection = 'asc' | 'desc';

const PromotionActions: React.FC<PromotionActionsProps> = ({ promotion, onEdit, canWrite }) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  const deleteMutation = useMutation({
    mutationFn: () => deletePromotion(promotion.id, promotion.nome, promotion.empresa_id || '', queryClient),
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
      <div className={cn("flex items-center gap-1", className?.includes('text-right') && "justify-end")}>
        {children}
        <Icon className="ml-1 h-3 w-3 opacity-50" />
      </div>
    </TableHead>
  );
};

const getStatusBadge = (startDate: string, endDate: string) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();
  
  if (isPast(end)) {
    return <Badge variant="destructive">{t('status_finished', { defaultValue: 'Finalizada' })}</Badge>;
  }
  if (isFuture(start)) {
    return <Badge variant="secondary">{t('status_scheduled', { defaultValue: 'Agendada' })}</Badge>;
  }
  // Se não está no passado e não está no futuro, está ativa
  return <Badge className="bg-green-600 hover:bg-green-600/90 text-white">{t('status_active', { defaultValue: 'Ativa' })}</Badge>;
};

const PromotionTable: React.FC<PromotionTableProps> = ({ promotions, canWrite }) => {
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const { data: profile } = useCurrentUserProfile();
  const [sortKey, setSortKey] = useState<SortKey>('data_inicio');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
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
      setSortDirection('desc');
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
        case 'desconto':
          aValue = a.desconto_percentual;
          bValue = b.desconto_percentual;
          break;
        case 'data_inicio':
          aValue = new Date(a.data_inicio).getTime();
          bValue = new Date(b.data_inicio).getTime();
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
  
  const getRuleIcon = (type: PromotionRule['tipo_regra']) => {
    switch (type) {
      case 'product': return <Package className="h-3 w-3 text-muted-foreground" />;
      case 'service': return <Clock className="h-3 w-3 text-muted-foreground" />;
      case 'category': return <Tag className="h-3 w-3 text-muted-foreground" />;
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
                sortKey="nome" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
              >
                {t('promotion_name', { defaultValue: 'Promoção' })}
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
              <SortableHeader 
                sortKey="desconto" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                className="text-right"
              >
                {t('discount_percentage', { defaultValue: 'Desconto' })}
              </SortableHeader>
              <TableHead className="hidden sm:table-cell">{t('promotion_rules', { defaultValue: 'Regras' })}</TableHead>
              <SortableHeader 
                sortKey="data_inicio" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                className="hidden lg:table-cell"
              >
                {t('start_date', { defaultValue: 'Início' })}
              </SortableHeader>
              <SortableHeader 
                sortKey="data_fim" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                className="hidden lg:table-cell"
              >
                {t('end_date', { defaultValue: 'Fim' })}
              </SortableHeader>
              <TableHead className="text-center">{t('order_table_header_status')}</TableHead>
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
                {isSuperAdmin && (
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      {promotion.empresas?.nome || 'N/A'}
                    </div>
                  </TableCell>
                )}
                <TableCell className="text-right font-semibold text-primary">
                  {promotion.desconto_percentual}%
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        {/* Exibe os ícones dos tipos de regra únicos */}
                        {promotion.regras && Array.from(new Set(promotion.regras.map(r => r.tipo_regra))).map(type => (
                          <span key={type} className="p-1 border rounded-full bg-secondary/50">
                            {getRuleIcon(type)}
                          </span>
                        ))}
                        {promotion.regras?.length === 0 && t('no_rules', { defaultValue: 'Sem Regras' })}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {promotion.regras?.length === 0 ? t('no_rules', { defaultValue: 'Sem Regras' }) : 
                        t('rules_count', { count: promotion.regras?.length, defaultValue: '{{count}} Regras' })
                      }
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {format(new Date(promotion.data_inicio), "dd/MM/yyyy", { locale: ptBR })}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {format(new Date(promotion.data_fim), "dd/MM/yyyy", { locale: ptBR })}
                </TableCell>
                <TableCell className="text-center">
                  {getStatusBadge(promotion.data_inicio, promotion.data_fim)}
                </TableCell>
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