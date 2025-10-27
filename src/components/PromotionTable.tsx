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
import { MoreHorizontal, Trash2, Pencil, Tag, Building, ArrowUpDown, ArrowUp, ArrowDown, Calendar, DollarSign, CheckCircle, XCircle, Package, Clock } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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

type SortKey = 'nome' | 'empresa' | 'data_inicio' | 'desconto_percentual' | 'is_active';
type SortDirection = 'asc' | 'desc';

const PromotionActions: React.FC<PromotionActionsProps> = ({ promotion, onEdit, canWrite }) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  const deleteMutation = useMutation({
    mutationFn: () => deletePromotion(promotion.id, promotion.nome, promotion.empresa_id, queryClient),
    onSuccess: () => {
      showSuccess(t('promotion_deleted_success', { name: promotion.nome, defaultValue: 'Promoção excluída com sucesso!' }));
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

const getStatusBadge = (promotion: Promotion) => {
  const now = new Date();
  const startDate = new Date(promotion.data_inicio);
  const endDate = new Date(promotion.data_fim);
  
  let status: 'active' | 'scheduled' | 'expired' | 'inactive';
  
  if (!promotion.is_active) {
    status = 'inactive';
  } else if (now >= startDate && now <= endDate) {
    status = 'active';
  } else if (now < startDate) {
    status = 'scheduled';
  } else {
    status = 'expired';
  }
  
  const baseClasses = "capitalize px-2 py-0.5 rounded-full text-xs font-semibold";
  
  switch (status) {
    case 'active':
      return <Badge className={cn(baseClasses, "bg-green-600 hover:bg-green-600/90 text-white")}>{t('status_active', { defaultValue: 'Ativa' })}</Badge>;
    case 'scheduled':
      return <Badge className={cn(baseClasses, "bg-blue-600 hover:bg-blue-600/90 text-white")}>{t('status_scheduled', { defaultValue: 'Agendada' })}</Badge>;
    case 'expired':
      return <Badge variant="destructive">{t('status_expired', { defaultValue: 'Expirada' })}</Badge>;
    case 'inactive':
    default:
      return <Badge variant="secondary">{t('status_inactive', { defaultValue: 'Inativa' })}</Badge>;
  }
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
        case 'data_inicio':
          aValue = new Date(a.data_inicio).getTime();
          bValue = new Date(b.data_inicio).getTime();
          break;
        case 'desconto_percentual':
          aValue = a.desconto_percentual;
          bValue = b.desconto_percentual;
          break;
        case 'is_active':
          aValue = a.is_active ? 1 : 0;
          bValue = b.is_active ? 1 : 0;
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
                className="text-center hidden sm:table-cell"
              >
                {t('discount_percentage', { defaultValue: 'Desconto' })}
              </SortableHeader>
              <SortableHeader 
                sortKey="data_inicio" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                className="hidden md:table-cell"
              >
                {t('start_date', { defaultValue: 'Vigência' })}
              </SortableHeader>
              {isSuperAdmin && (
                <SortableHeader 
                  sortKey="empresa" 
                  currentSortKey={sortKey} 
                  currentSortDirection={sortDirection} 
                  onSort={handleSort}
                  className="hidden lg:table-cell"
                >
                  {t('user_table_header_company')}
                </SortableHeader>
              )}
              <SortableHeader 
                sortKey="is_active" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                className="text-center"
              >
                {t('order_table_header_status')}
              </SortableHeader>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPromotions.map((promotion) => (
              <TableRow key={promotion.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  {promotion.nome}
                </TableCell>
                <TableCell className="text-center hidden sm:table-cell font-semibold text-primary">
                  {promotion.desconto_percentual}%
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(promotion.data_inicio), "dd/MM/yyyy", { locale: ptBR })} - {format(new Date(promotion.data_fim), "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                </TableCell>
                {isSuperAdmin && (
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      {promotion.empresas?.nome || 'N/A'}
                    </div>
                  </TableCell>
                )}
                <TableCell className="text-center">
                  {getStatusBadge(promotion)}
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