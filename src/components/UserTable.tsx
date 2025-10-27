import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserProfile, deleteUser } from "@/integrations/supabase/users";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, MoreHorizontal, Trash2, Pencil, Phone, MapPin, Building, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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
import EditUserSheet from "./EditUserSheet";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface UserTableProps {
  users: UserProfile[];
  canWrite: boolean; // NOVO
}

interface UserActionsProps {
  user: UserProfile;
  onEdit: (user: UserProfile) => void;
  canWrite: boolean; // NOVO
}

type SortKey = 'nome_completo' | 'empresa' | 'telefone' | 'endereco_completo' | 'perfil';
type SortDirection = 'asc' | 'desc';

const UserActions: React.FC<UserActionsProps> = ({ user, onEdit, canWrite }) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  // MOVIDO: Chamar hooks incondicionalmente no topo
  const deleteMutation = useMutation({
    mutationFn: () => deleteUser(user.id, user.nome_completo, user.empresa_id, queryClient),
    onSuccess: () => {
      showSuccess(`Usuário ${user.nome_completo} excluído com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ["users"] });
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
        <DropdownMenuItem onClick={() => onEdit(user)}>
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


const UserTable: React.FC<UserTableProps> = ({ users, canWrite }) => {
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const { data: profile } = useCurrentUserProfile();
  const [sortKey, setSortKey] = useState<SortKey>('nome_completo');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const { t } = useTranslation();

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    setIsEditSheetOpen(true);
  };

  const handleCloseEditSheet = (open: boolean) => {
    setIsEditSheetOpen(open);
    if (!open) {
      setEditingUser(null);
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
  
  const sortedUsers = useMemo(() => {
    if (!users) return [];
    
    const sorted = [...users].sort((a, b) => {
      // Prioridade 1: Super Admin sempre no topo
      const isASuperAdmin = a.perfis?.nome === 'Super Admin';
      const isBSuperAdmin = b.perfis?.nome === 'Super Admin';
      
      if (isASuperAdmin && !isBSuperAdmin) return -1;
      if (!isASuperAdmin && isBSuperAdmin) return 1;
      
      // Se ambos são SA ou nenhum é SA, aplica a ordenação normal
      let aValue: any;
      let bValue: any;
      
      switch (sortKey) {
        case 'nome_completo':
          aValue = a.nome_completo;
          bValue = b.nome_completo;
          break;
        case 'empresa':
          aValue = a.empresa?.nome || '';
          bValue = b.empresa?.nome || '';
          break;
        case 'telefone':
          aValue = a.telefone || '';
          bValue = b.telefone || '';
          break;
        case 'endereco_completo':
          aValue = a.endereco_completo || '';
          bValue = b.endereco_completo || '';
          break;
        case 'perfil':
          aValue = a.perfis?.nome || '';
          bValue = b.perfis?.nome || '';
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
  }, [users, sortKey, sortDirection]);


  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Avatar</TableHead>
              <SortableHeader 
                sortKey="nome_completo" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
              >
                {t('user_table_header_name')}
              </SortableHeader>
              <SortableHeader 
                sortKey="empresa" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                className="hidden xl:table-cell"
              >
                {t('user_table_header_company')}
              </SortableHeader>
              <SortableHeader 
                sortKey="telefone" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                className="hidden lg:table-cell"
              >
                {t('user_table_header_phone')}
              </SortableHeader>
              <SortableHeader 
                sortKey="endereco_completo" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                className="hidden xl:table-cell"
              >
                {t('user_table_header_address')}
              </SortableHeader>
              <SortableHeader 
                sortKey="perfil" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
              >
                {t('user_table_header_profile')}
              </SortableHeader>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedUsers.map((user) => (
              <TableRow 
                key={user.id}
                // Adiciona destaque visual para o Super Admin
                className={cn(
                  user.perfis?.nome === 'Super Admin' && "bg-primary/10 hover:bg-primary/20 transition-colors"
                )}
              >
                <TableCell>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url || undefined} alt={user.nome_completo} />
                    <AvatarFallback>
                      {user.nome_completo ? user.nome_completo[0] : <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">{user.nome_completo}</TableCell>
                <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    {/* Exibe o nome da empresa, ou 'Super Admin' se não tiver empresa/perfil customizado */}
                    {user.empresa?.nome || (user.perfil_customizado_id === null && user.empresa_id === null ? 'Super Admin' : 'N/A')}
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {user.telefone || 'N/A'}
                  </div>
                </TableCell>
                <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {user.endereco_completo || 'N/A'}
                  </div>
                </TableCell>
                <TableCell>{user.perfis?.nome || "N/A"}</TableCell>
                <TableCell className="text-right">
                  <UserActions user={user} onEdit={handleEdit} canWrite={canWrite} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {editingUser && (
        <EditUserSheet 
          user={editingUser} 
          isOpen={isEditSheetOpen} 
          onOpenChange={handleCloseEditSheet} 
        />
      )}
    </>
  );
};

export default UserTable;