import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Product, deleteProduct } from "@/integrations/supabase/products";
import { MoreHorizontal, Trash2, Pencil, Clock, Image as ImageIcon, Building, ArrowUpDown, ArrowUp, ArrowDown, History } from "lucide-react";
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
import EditServiceSheet from "./EditServiceSheet";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom"; // Importando Link

interface ServiceOnlyTableProps {
  services: Product[];
  canWrite: boolean; // NOVO
}

interface ServiceActionsProps {
  service: Product;
  onEdit: (service: Product) => void;
  canWrite: boolean; // NOVO
}

type SortKey = 'nome' | 'empresa' | 'categoria' | 'tempo_servico' | 'preco';
type SortDirection = 'asc' | 'desc';

const ServiceActions: React.FC<ServiceActionsProps> = ({ service, onEdit, canWrite }) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  // CHAME TODOS OS HOOKS NO TOPO
  const deleteMutation = useMutation({
    mutationFn: () => deleteProduct(service.id, service.nome, service.tipo, service.empresa_id, queryClient),
    onSuccess: () => {
      showSuccess(`Serviço ${service.nome} excluído com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ["services_only"] });
    },
    onError: (error) => {
      showError(t("error_loading_data") + ": " + error.message);
    },
  });

  // RETORNO CONDICIONAL DEPOIS DOS HOOKS
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
        
        {/* NOVO: Ver Histórico */}
        <DropdownMenuItem asChild>
          <Link to={`/products/${service.id}`}>
            <History className="mr-2 h-4 w-4" /> {t('sales_history_table_title')}
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => onEdit(service)}>
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

  // Verifica se a classe 'text-right' está presente para aplicar 'justify-end'
  const isTextRight = className?.includes('text-right');
  // Verifica se a classe 'text-center' está presente para aplicar 'justify-center'
  const isTextCenter = className?.includes('text-center');

  return (
    <TableHead className={cn("cursor-pointer hover:text-foreground transition-colors", className)} onClick={() => onSort(sortKey)}>
      <div className={cn("flex items-center gap-1", isTextRight && "justify-end", isTextCenter && "justify-center")}>
        {children}
        <Icon className="ml-1 h-3 w-3 opacity-50" />
      </div>
    </TableHead>
  );
};


const ServiceOnlyTable: React.FC<ServiceOnlyTableProps> = ({ services, canWrite }) => {
  const [editingService, setEditingService] = useState<Product | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const { data: profile } = useCurrentUserProfile();
  const [sortKey, setSortKey] = useState<SortKey>('nome');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const { t } = useTranslation();
  
  const isSuperAdmin = profile?.perfil_id === 1;

  const handleEdit = (service: Product) => {
    setEditingService(service);
    setIsEditSheetOpen(true);
  };

  const handleCloseEditSheet = (open: boolean) => {
    setIsEditSheetOpen(open);
    if (!open) {
      setEditingService(null);
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
  
  const sortedServices = useMemo(() => {
    if (!services) return [];
    
    const sorted = [...services].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortKey) {
        case 'nome':
          aValue = a.nome;
          bValue = b.nome;
          break;
        case 'empresa':
          aValue = a.empresa?.nome || '';
          bValue = b.empresa?.nome || '';
          break;
        case 'categoria':
          aValue = a.categoria || '';
          bValue = b.categoria || '';
          break;
        case 'tempo_servico':
          aValue = a.tempo_servico || 0;
          bValue = b.tempo_servico || 0;
          break;
        case 'preco':
          aValue = a.preco;
          bValue = b.preco;
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
  }, [services, sortKey, sortDirection]);


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
              <TableHead className="w-[50px]">Avatar</TableHead>
              <SortableHeader 
                sortKey="nome" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
              >
                {t('nav_services')}
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
                sortKey="categoria" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                className="hidden sm:table-cell"
              >
                {t('product_table_header_category')}
              </SortableHeader>
              <SortableHeader 
                sortKey="tempo_servico" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                // Removendo text-right
              >
                {t('service_table_header_duration')}
              </SortableHeader>
              <SortableHeader 
                sortKey="preco" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                className="text-right"
              >
                {t('product_table_header_price')}
              </SortableHeader>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedServices.map((service) => (
              <TableRow key={service.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {service.fotos && service.fotos.length > 0 ? (
                      <img src={service.fotos[0]} alt={service.nome} className="h-8 w-8 object-cover rounded-md" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground p-1 border rounded-md" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{service.nome}</TableCell>
                {isSuperAdmin && (
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      {service.empresa?.nome || 'N/A'}
                    </div>
                  </TableCell>
                )}
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  {service.categoria || 'N/A'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {service.tempo_servico ? `${service.tempo_servico} min` : 'N/A'}
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(service.preco)}
                </TableCell>
                <TableCell className="text-right">
                  <ServiceActions service={service} onEdit={handleEdit} canWrite={canWrite} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {editingService && (
        <EditServiceSheet 
          service={editingService} 
          isOpen={isEditSheetOpen} 
          onOpenChange={handleCloseEditSheet} 
        />
      )}
    </>
  );
};

export default ServiceOnlyTable;