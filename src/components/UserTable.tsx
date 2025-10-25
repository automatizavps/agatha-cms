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
import { MoreHorizontal, Trash2, Pencil, User, Building, ArrowUpDown, ArrowUp, ArrowDown, Mail, Phone } from "lucide-react";
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
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface UserTableProps {
  users: UserProfile[];
}

interface UserActionsProps {
  user: UserProfile;
  onEdit: (user: UserProfile) => void;
  canWrite: boolean;
  isCurrentUser: boolean;
}

type SortKey = 'nome_completo' | 'empresa' | 'email' | 'perfil';
type SortDirection = 'asc' | 'desc';

const UserActions: React.FC<UserActionsProps> = ({ user, onEdit, canWrite, isCurrentUser }) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      showSuccess(`Usuário ${user.nome_completo} excluído com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      showError(t("error_loading_data") + ": " + error.message);
    },
  });

  const handleDelete = () => {
    if (window.confirm(t('confirm_delete'))) {
      deleteMutation.mutate(user.id);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0" disabled={!canWrite}>
          <span className="sr-only">{t('actions')}</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
        
        {canWrite && (
          <DropdownMenuItem onClick={() => onEdit(user)}>
            <Pencil className="mr-2 h-4 w-4" /> {t('edit')}
          </DropdownMenuItem>
        )}
        
        {canWrite && !isCurrentUser && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleDelete} 
              disabled={deleteMutation.isPending}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> {t('delete')}
            </DropdownMenuItem>
          </>
        )}
        
        {isCurrentUser && (
          <DropdownMenuItem disabled className="text-muted-foreground">
            {t('cannot_delete_self')}
          </DropdownMenuItem>
        )}
        
        {!canWrite && (
          <DropdownMenuItem disabled className="text-muted-foreground">
            {t('no_actions_available')}
          </DropdownMenuItem>
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


const UserTable: React.FC<UserTableProps> = ({ users }) => {
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const { data: profile } = useCurrentUserProfile();
  const [sortKey, setSortKey] = useState<SortKey>('nome_completo');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const { t } = useTranslation();
  
  const isSuperAdmin = profile?.is_super_admin;
  const currentUserId = profile?.id;
  
  // Permissão de escrita no módulo 'users'
  const canWriteUsers = profile?.permissions['users'] === 'escrita' || isSuperAdmin;

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
        case 'email':
          aValue = a.email || '';
          bValue = b.email || '';
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
              <SortableHeader 
                sortKey="nome_completo" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
              >
                {t('user_table_header_name')}
              </SortableHeader>
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
                sortKey="perfil" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                className="hidden md:table-cell"
              >
                {t('user_table_header_profile')}
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
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedUsers.map((user) => {
              const isCurrentUser = user.id === currentUserId;
              
              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {user.nome_completo}
                    {isCurrentUser && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {t('nav_profile')}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm font-medium">
                    {user.perfis?.nome || t('unknown_profile')}
                  </TableCell>
                  {isSuperAdmin && (
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {user.empresa?.nome || 'N/A'}
                      </div>
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <UserActions 
                      user={user} 
                      onEdit={handleEdit} 
                      canWrite={canWriteUsers}
                      isCurrentUser={isCurrentUser}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
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