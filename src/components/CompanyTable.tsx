import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Company, deleteCompany, updateCompany } from "@/integrations/supabase/companies";
import { MoreHorizontal, Trash2, Pencil, Building, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle, XCircle, Loader2, AlertTriangle, ShieldCheck, Calendar } from "lucide-react";
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
import EditCompanySheet from "./EditCompanySheet";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { Badge } from "@/components/ui/badge"; // IMPORTAÇÃO CORRIGIDA
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CompanyTableProps {
  companies: Company[];
  canWrite: boolean; // NOVO
}

interface CompanyActionsProps {
  company: Company;
  onEdit: (company: Company) => void;
  isSuperAdmin: boolean;
  canWrite: boolean; // NOVO
}

type SortKey = 'nome' | 'email' | 'telefone' | 'cnpj' | 'is_active' | 'plano' | 'vigencia';
type SortDirection = 'asc' | 'desc';

const CompanyActions: React.FC<CompanyActionsProps> = ({ company, onEdit, isSuperAdmin, canWrite }) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  // MOVIDO: Chamar hooks incondicionalmente no topo
  const deleteMutation = useMutation({
    mutationFn: () => deleteCompany(company.id, company.nome, queryClient),
    onSuccess: () => {
      showSuccess(`Empresa ${company.nome} excluída com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      // Invalida queries de usuários e dashboard para forçar revalidação
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
    onError: (error) => {
      showError(t("error_loading_data") + ": " + error.message);
    },
  });
  
  const toggleActiveMutation = useMutation({
    mutationFn: (isActive: boolean) => updateCompany({ 
      id: company.id, 
      nome: company.nome, 
      cnpj: company.cnpj, 
      telefone: company.telefone, 
      endereco_completo: company.endereco_completo, 
      email: company.email,
      is_active: isActive,
      plano_id: company.plano_id, // Incluindo plano_id
    }),
    onSuccess: (data) => {
      const status = data.is_active ? "ativada" : "desativada";
      showSuccess(`Empresa ${data.nome} ${status} com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      // Invalida queries de usuários e dashboard para forçar revalidação de RLS
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
    onError: (error) => {
      showError(t("error_loading_data") + ": " + error.message);
    },
  });

  if (!canWrite) {
    return null;
  }

  const handleDelete = () => {
    if (!isSuperAdmin) return;
    
    // Aviso de atenção
    const confirmationMessage = `ATENÇÃO! Ao excluir a empresa ${company.nome}, TODOS os dados relacionados (usuários, clientes, pedidos, agendamentos, produtos, etc.) serão PERMANENTEMENTE excluídos. Esta ação não pode ser desfeita. Confirma a exclusão?`;
    
    if (window.confirm(confirmationMessage)) {
      deleteMutation.mutate();
    }
  };
  
  const handleToggleActive = () => {
    const newStatus = !company.is_active;
    const action = newStatus ? "ativar" : "desativar";
    if (window.confirm(`Tem certeza que deseja ${action} a empresa ${company.nome}?`)) {
      toggleActiveMutation.mutate(newStatus);
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
        <DropdownMenuItem onClick={() => onEdit(company)}>
          <Pencil className="mr-2 h-4 w-4" /> {t('edit')}
        </DropdownMenuItem>
        
        {isSuperAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleToggleActive} 
              disabled={toggleActiveMutation.isPending}
              className={cn(
                company.is_active ? "text-destructive focus:text-destructive" : "text-green-500 focus:text-green-500"
              )}
            >
              {toggleActiveMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : company.is_active ? (
                <XCircle className="mr-2 h-4 w-4" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              {company.is_active ? "Desativar Empresa" : "Ativar Empresa"}
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleDelete} 
              disabled={deleteMutation.isPending}
              className="text-destructive focus:text-destructive font-bold"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <AlertTriangle className="mr-2 h-4 w-4" />
              )}
              {t('delete')} Empresa
            </DropdownMenuItem>
          </>
        )}
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

// Função auxiliar para formatar a vigência
const formatVigency = (start: string | null, end: string | null) => {
  if (!start || !end) return 'N/A';
  
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  const formattedStart = format(startDate, "dd/MM/yyyy", { locale: ptBR });
  const formattedEnd = format(endDate, "dd/MM/yyyy", { locale: ptBR });
  
  return `${formattedStart} - ${formattedEnd}`;
};


const CompanyTable: React.FC<CompanyTableProps> = ({ companies, canWrite }) => {
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('nome');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const { data: profile } = useCurrentUserProfile();
  const { t } = useTranslation();
  
  // CORRIGIDO: Usar a flag is_super_admin do perfil
  const isSuperAdmin = profile?.is_super_admin;

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setIsEditSheetOpen(true);
  };

  const handleCloseEditSheet = (open: boolean) => {
    setIsEditSheetOpen(open);
    if (!open) {
      setEditingCompany(null);
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
  
  const sortedCompanies = useMemo(() => {
    if (!companies) return [];
    
    const sorted = [...companies].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortKey) {
        case 'nome':
          aValue = a.nome;
          bValue = b.nome;
          break;
        case 'email':
          aValue = a.email || '';
          bValue = b.email || '';
          break;
        case 'telefone':
          aValue = a.telefone || '';
          bValue = b.telefone || '';
          break;
        case 'cnpj':
          aValue = a.cnpj || '';
          bValue = b.cnpj || '';
          break;
        case 'is_active':
          aValue = a.is_active ? 1 : 0;
          bValue = b.is_active ? 1 : 0;
          break;
        case 'plano':
          aValue = a.planos?.nome || '';
          bValue = b.planos?.nome || '';
          break;
        case 'vigencia':
          // Ordena pela data de fim (mais próxima primeiro)
          aValue = a.planos?.data_fim ? new Date(a.planos.data_fim).getTime() : 0;
          bValue = b.planos?.data_fim ? new Date(b.planos.data_fim).getTime() : 0;
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
  }, [companies, sortKey, sortDirection]);


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
                {t('user_table_header_name')}
              </SortableHeader>
              {isSuperAdmin && (
                <>
                  <SortableHeader 
                    sortKey="plano" 
                    currentSortKey={sortKey} 
                    currentSortDirection={sortDirection} 
                    onSort={handleSort}
                    className="hidden lg:table-cell"
                  >
                    {t('plan_name', { defaultValue: 'Plano' })}
                  </SortableHeader>
                  <SortableHeader 
                    sortKey="vigencia" 
                    currentSortKey={sortKey} 
                    currentSortDirection={sortDirection} 
                    onSort={handleSort}
                    className="hidden xl:table-cell"
                  >
                    {t('plan_duration', { defaultValue: 'Vigência' })}
                  </SortableHeader>
                </>
              )}
              <SortableHeader 
                sortKey="email" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                className="hidden 2xl:table-cell"
              >
                {t('profile_email')}
              </SortableHeader>
              <SortableHeader 
                sortKey="telefone" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                className="hidden md:table-cell"
              >
                {t('user_table_header_phone')}
              </SortableHeader>
              <SortableHeader 
                sortKey="cnpj" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                className="hidden sm:table-cell"
              >
                CNPJ
              </SortableHeader>
              <SortableHeader 
                sortKey="is_active" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                className="text-center"
              >
                Status
              </SortableHeader>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCompanies.map((company) => (
              <TableRow key={company.id} className={!company.is_active ? "bg-destructive/10 hover:bg-destructive/20" : ""}>
                <TableCell className="font-medium flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  {company.nome}
                </TableCell>
                {isSuperAdmin && (
                  <>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        {company.planos?.nome || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatVigency(company.planos?.data_inicio || null, company.planos?.data_fim || null)}
                      </div>
                    </TableCell>
                  </>
                )}
                <TableCell className="hidden 2xl:table-cell text-sm text-muted-foreground">
                  {company.email || 'N/A'}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {company.telefone || 'N/A'}
                </TableCell>
                <TableCell className="hidden sm:table-cell">{company.cnpj || 'N/A'}</TableCell>
                <TableCell className="text-center">
                  {company.is_active ? (
                    <Badge className="bg-green-600 hover:bg-green-600/90 text-white">Ativa</Badge>
                  ) : (
                    <Badge variant="destructive">Inativa</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <CompanyActions company={company} onEdit={handleEdit} isSuperAdmin={isSuperAdmin || false} canWrite={canWrite} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {editingCompany && (
        <EditCompanySheet 
          company={editingCompany} 
          isOpen={isEditSheetOpen} 
          onOpenChange={handleCloseEditSheet} 
        />
      )}
    </>
  );
};

export default CompanyTable;