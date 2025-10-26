import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Client, deleteClient, deleteClients } from "@/integrations/supabase/clients";
import { MoreHorizontal, Trash2, Pencil, User, Building, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient, QueryClient } from "@tanstack/react-query";
import { showError, showSuccess } from "@/utils/toast";
import EditClientSheet from "./EditClientSheet";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox"; // Importando Checkbox
import { useCanWrite } from "@/hooks/use-module-permission"; // REINTRODUZIDO

interface ClientTableProps {
  clients: Client[];
  selectedIds: Set<string>; // NOVO
  onSelectChange: (newSelectedIds: Set<string>) => void; // NOVO
}

interface ClientActionsProps {
  client: Client;
  onEdit: (client: Client) => void;
  canWrite: boolean; // NOVO
}

type SortKey = 'nome' | 'empresa' | 'email' | 'telefone' | 'endereco_completo';
type SortDirection = 'asc' | 'desc';

const ClientActions: React.FC<ClientActionsProps> = ({ client, onEdit, canWrite }) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  if (!canWrite) {
    return null;
  }

  const deleteMutation = useMutation({
    mutationFn: () => deleteClient(client.id, client.nome, client.empresa_id, queryClient),
    onSuccess: () => {
      showSuccess(`Cliente ${client.nome} excluído com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (error) => {
      showError(t("error_loading_data") + ": " + error.message);
    },
  });

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
        <DropdownMenuItem onClick={() => onEdit(client)}>
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


const ClientTable: React.FC<ClientTableProps> = ({ clients, selectedIds, onSelectChange }) => {
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const { data: profile } = useCurrentUserProfile();
  const [sortKey, setSortKey] = useState<SortKey>('nome');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const { t } = useTranslation();
  
  // CORRIGIDO: Usando a flag is_super_admin
  const isSuperAdmin = profile?.is_super_admin;
  const canWriteClients = useCanWrite('clients'); // Obtendo a permissão
  
  // Mutação para exclusão em massa (redefinida aqui para usar o queryClient)
  const queryClient = useQueryClient();
  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => {
      // Encontra os nomes dos clientes selecionados
      const selectedClients = clients.filter(c => ids.includes(c.id));
      const clientNames = selectedClients.map(c => c.nome);
      const companyId = profile?.empresa_id || selectedClients[0]?.empresa_id || ''; // Usa o ID da empresa do primeiro cliente ou do perfil
      
      return deleteClients(ids, clientNames, companyId, queryClient);
    },
    onSuccess: () => {
      showSuccess(t('clients_deleted_success', { count: selectedIds.size }));
      onSelectChange(new Set()); // Limpa a seleção
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (error) => {
      showError(t('error_loading_data') + ": " + error.message);
    },
  });
  
  // Função de exclusão em massa (chamada na página Clients.tsx)
  // NOTA: A função handleBulkDelete foi movida para Clients.tsx, mas a mutação precisa ser acessível lá.
  // Como não podemos passar a mutação diretamente, vamos garantir que a página Clients.tsx tenha acesso à lógica de exclusão em massa.
  // Por enquanto, removemos a lógica de exclusão em massa daqui, pois ela deve estar na página pai.

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setIsEditSheetOpen(true);
  };

  const handleCloseEditSheet = (open: boolean) => {
    setIsEditSheetOpen(open);
    if (!open) {
      setEditingClient(null);
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
  
  const sortedClients = useMemo(() => {
    if (!clients) return [];
    
    const sorted = [...clients].sort((a, b) => {
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
        case 'email':
          aValue = a.email || '';
          bValue = b.email || '';
          break;
        case 'telefone':
          aValue = a.telefone || '';
          bValue = b.telefone || '';
          break;
        case 'endereco_completo':
          aValue = a.endereco_completo || '';
          bValue = b.endereco_completo || '';
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
  }, [clients, sortKey, sortDirection]);
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(clients.map(c => c.id));
      onSelectChange(allIds);
    } else {
      onSelectChange(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelectedIds = new Set(selectedIds);
    if (checked) {
      newSelectedIds.add(id);
    } else {
      newSelectedIds.delete(id);
    }
    onSelectChange(newSelectedIds);
  };
  
  const isAllSelected = clients.length > 0 && selectedIds.size === clients.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < clients.length;


  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {/* Checkbox Header */}
              <TableHead className="w-[50px] text-center">
                <Checkbox
                  checked={isAllSelected || isIndeterminate}
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                  aria-label={t('select_all')}
                  disabled={!canWriteClients}
                />
              </TableHead>
              <SortableHeader 
                sortKey="nome" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
              >
                {t('user_table_header_name')}
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
                sortKey="email" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                className="hidden sm:table-cell"
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
                sortKey="endereco_completo" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                className="hidden lg:table-cell"
              >
                {t('client_table_header_address')}
              </SortableHeader>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedClients.map((client) => (
              <TableRow 
                key={client.id}
                className={cn(
                  selectedIds.has(client.id) && "bg-accent/50 dark:bg-accent/20 hover:bg-accent/70 dark:hover:bg-accent/30"
                )}
              >
                {/* Checkbox Cell */}
                <TableCell className="text-center">
                  <Checkbox
                    checked={selectedIds.has(client.id)}
                    onCheckedChange={(checked) => handleSelectRow(client.id, !!checked)}
                    disabled={!canWriteClients}
                  />
                </TableCell>
                <TableCell className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {client.nome}
                </TableCell>
                {isSuperAdmin && (
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      {client.empresa?.nome || 'N/A'}
                    </div>
                  </TableCell>
                )}
                <TableCell className="hidden sm:table-cell">{client.email || 'N/A'}</TableCell>
                <TableCell className="hidden md:table-cell">{client.telefone || 'N/A'}</TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{client.endereco_completo || 'N/A'}</TableCell>
                <TableCell className="text-right">
                  <ClientActions client={client} onEdit={handleEdit} canWrite={canWriteClients} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {editingClient && (
        <EditClientSheet 
          client={editingClient} 
          isOpen={isEditSheetOpen} 
          onOpenChange={handleCloseEditSheet} 
        />
      )}
    </>
  );
};

export default ClientTable;