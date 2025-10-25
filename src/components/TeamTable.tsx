import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Team, deleteTeam, useTeamMembers } from "@/integrations/supabase/teams";
import { MoreHorizontal, Trash2, Pencil, Users, DollarSign, Target, Building, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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
import EditTeamSheet from "./EditTeamSheet";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface TeamTableProps {
  teams: Team[];
  canWrite: boolean; // NOVO
}

interface TeamActionsProps {
  team: Team;
  onEdit: (team: Team) => void;
  canWrite: boolean; // NOVO
}

type SortKey = 'nome' | 'empresa' | 'meta_valor' | 'meta_quantidade';
type SortDirection = 'asc' | 'desc';

const TeamActions: React.FC<TeamActionsProps> = ({ team, onEdit, canWrite }) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  if (!canWrite) {
    return null;
  }

  const deleteMutation = useMutation({
    mutationFn: deleteTeam,
    onSuccess: () => {
      showSuccess(t('team_deleted_success', { name: team.nome }));
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (error) => {
      showError(t("error_loading_data") + ": " + error.message);
    },
  });

  const handleDelete = () => {
    if (window.confirm(t('confirm_delete'))) {
      deleteMutation.mutate(team.id);
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
        <DropdownMenuItem onClick={() => onEdit(team)}>
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


// Componente para exibir os membros da equipe
const TeamMembersDisplay: React.FC<{ teamId: string }> = ({ teamId }) => {
  const { data: members, isLoading } = useTeamMembers(teamId);
  const { t } = useTranslation();

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }
  
  if (!members || members.length === 0) {
    return <span className="text-muted-foreground">{t('no_members')}</span>;
  }
  
  const displayMembers = members.slice(0, 3);
  const remainingCount = members.length - displayMembers.length;

  const tooltipContent = (
    <div className="space-y-1 text-sm">
      <p className="font-semibold mb-1">{t('team_members')}:</p>
      {members.map((member, index) => (
        <div key={index} className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={member.usuarios?.avatar_url || undefined} alt={member.usuarios?.nome_completo} />
            <AvatarFallback className="text-xs">{member.usuarios?.nome_completo?.slice(0, 2).toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          <span>{member.usuarios?.nome_completo || t('no_data_found')}</span>
        </div>
      ))}
    </div>
  );

  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <div className="flex items-center -space-x-2 cursor-default">
          {displayMembers.map((member, index) => (
            <Avatar key={index} className="h-8 w-8 border-2 border-background">
              <AvatarImage src={member.usuarios?.avatar_url || undefined} alt={member.usuarios?.nome_completo} />
              <AvatarFallback className="text-xs bg-secondary">
                {member.usuarios?.nome_completo?.slice(0, 1).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          ))}
          {remainingCount > 0 && (
            <div className="h-8 w-8 flex items-center justify-center bg-muted rounded-full border-2 border-background text-xs font-medium">
              +{remainingCount}
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
};


const TeamTable: React.FC<TeamTableProps> = ({ teams, canWrite }) => {
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const { data: profile } = useCurrentUserProfile();
  const [sortKey, setSortKey] = useState<SortKey>('nome');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const { t } = useTranslation();
  
  const isSuperAdmin = profile?.perfil_id === 1;

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setIsEditSheetOpen(true);
  };

  const handleCloseEditSheet = (open: boolean) => {
    setIsEditSheetOpen(open);
    if (!open) {
      setEditingTeam(null);
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
  
  const sortedTeams = useMemo(() => {
    if (!teams) return [];
    
    const sorted = [...teams].sort((a, b) => {
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
        case 'meta_valor':
          aValue = a.meta_mensal_valor;
          bValue = b.meta_mensal_valor;
          break;
        case 'meta_quantidade':
          aValue = a.meta_mensal_quantidade;
          bValue = b.meta_mensal_quantidade;
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
  }, [teams, sortKey, sortDirection]);


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
              <SortableHeader 
                sortKey="nome" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
              >
                {t('team_name')}
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
              <TableHead className="hidden sm:table-cell">{t('team_members')}</TableHead>
              <SortableHeader 
                sortKey="meta_valor" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                className="text-right hidden md:table-cell"
              >
                {t('team_meta_value')}
              </SortableHeader>
              <SortableHeader 
                sortKey="meta_quantidade" 
                currentSortKey={sortKey} 
                currentSortDirection={sortDirection} 
                onSort={handleSort}
                className="text-right hidden md:table-cell"
              >
                {t('team_meta_quantity')}
              </SortableHeader>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTeams.map((team) => (
              <TableRow key={team.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  {team.nome}
                </TableCell>
                {isSuperAdmin && (
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      {team.empresas?.nome || 'N/A'}
                    </div>
                  </TableCell>
                )}
                <TableCell className="hidden sm:table-cell">
                  <TeamMembersDisplay teamId={team.id} />
                </TableCell>
                <TableCell className="text-right hidden md:table-cell font-semibold text-primary">
                  {formatCurrency(team.meta_mensal_valor)}
                </TableCell>
                <TableCell className="text-right hidden md:table-cell text-sm text-muted-foreground">
                  {team.meta_mensal_quantidade} {t('units')}
                </TableCell>
                <TableCell className="text-right">
                  <TeamActions team={team} onEdit={handleEdit} canWrite={canWrite} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {editingTeam && (
        <EditTeamSheet 
          team={editingTeam} 
          isOpen={isEditSheetOpen} 
          onOpenChange={handleCloseEditSheet} 
        />
      )}
    </>
  );
};

export default TeamTable;