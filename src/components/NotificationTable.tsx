import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Notification, markNotificationAsRead, deleteNotification } from "@/integrations/supabase/notifications";
import { MoreHorizontal, Trash2, CheckCheck, Bell, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";
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
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";

interface NotificationTableProps {
  notifications: Notification[];
  selectedIds: Set<string>;
  onSelectChange: (newSelectedIds: Set<string>) => void;
}

interface NotificationActionsProps {
  notification: Notification;
  queryClient: any;
}

type SortKey = 'titulo' | 'created_at' | 'lida';
type SortDirection = 'asc' | 'desc';

const NotificationActions: React.FC<NotificationActionsProps> = ({ notification, queryClient }) => {
  const { t } = useTranslation();
  const userId = notification.user_id;

  const markReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    },
    onError: (error) => {
      showError(t("error_loading_data") + ": " + error.message);
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      showSuccess(t('notification_deleted_success'));
      queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
    },
    onError: (error) => {
      showError(t("error_loading_data") + ": " + error.message);
    },
  });

  const handleMarkRead = () => {
    if (!notification.lida) {
      markReadMutation.mutate(notification.id);
    }
  };
  
  const handleDelete = () => {
    if (window.confirm(t('confirm_delete_single'))) {
      deleteMutation.mutate(notification.id);
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
        
        {!notification.lida && (
          <DropdownMenuItem onClick={handleMarkRead} disabled={markReadMutation.isPending}>
            <CheckCheck className="mr-2 h-4 w-4" /> {t('mark_as_read')}
          </DropdownMenuItem>
        )}
        
        {notification.link && (
          <DropdownMenuItem asChild>
            <Link to={notification.link}>
              <ExternalLink className="mr-2 h-4 w-4" /> {t('view_details')}
            </Link>
          </DropdownMenuItem>
        )}
        
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


const NotificationTable: React.FC<NotificationTableProps> = ({ notifications, selectedIds, onSelectChange }) => {
  const queryClient = useQueryClient();
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { t } = useTranslation();

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc'); // Padrão para 'desc' em data/hora
    }
  };
  
  const sortedNotifications = useMemo(() => {
    if (!notifications) return [];
    
    const sorted = [...notifications].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortKey) {
        case 'titulo':
          aValue = a.titulo;
          bValue = b.titulo;
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'lida':
          // Ordena não lidas (false) antes de lidas (true)
          aValue = a.lida ? 1 : 0;
          bValue = b.lida ? 1 : 0;
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
  }, [notifications, sortKey, sortDirection]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(notifications.map(n => n.id));
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
  
  const isAllSelected = notifications.length > 0 && selectedIds.size === notifications.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < notifications.length;


  return (
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
              />
            </TableHead>
            <SortableHeader 
              sortKey="lida" 
              currentSortKey={sortKey} 
              currentSortDirection={sortDirection} 
              onSort={handleSort}
              className="w-[100px]"
            >
              {t('notification_table_header_status')}
            </SortableHeader>
            <SortableHeader 
              sortKey="titulo" 
              currentSortKey={sortKey} 
              currentSortDirection={sortDirection} 
              onSort={handleSort}
            >
              {t('notification_table_header_title')}
            </SortableHeader>
            <TableHead className="hidden md:table-cell">{t('notification_table_header_message')}</TableHead>
            <SortableHeader 
              sortKey="created_at" 
              currentSortKey={sortKey} 
              currentSortDirection={sortDirection} 
              onSort={handleSort}
              className="hidden sm:table-cell"
            >
              {t('notification_table_header_time')}
            </SortableHeader>
            <TableHead className="text-right">{t('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedNotifications.map((notification) => (
            <TableRow 
              key={notification.id} 
              className={cn(
                "transition-colors",
                !notification.lida ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/50",
                selectedIds.has(notification.id) && "bg-accent/50 dark:bg-accent/20 hover:bg-accent/70 dark:hover:bg-accent/30" // Highlight selected rows
              )}
            >
              {/* Checkbox Cell */}
              <TableCell className="text-center">
                <Checkbox
                  checked={selectedIds.has(notification.id)}
                  onCheckedChange={(checked) => handleSelectRow(notification.id, !!checked)}
                />
              </TableCell>
              <TableCell>
                <span className={cn(
                  "font-medium text-xs",
                  notification.lida ? "text-muted-foreground" : "text-primary"
                )}>
                  {notification.lida ? t('read') : t('unread')}
                </span>
              </TableCell>
              <TableCell className="font-medium">
                {notification.titulo}
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-xs truncate">
                {notification.mensagem || 'N/A'}
              </TableCell>
              <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <span>{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {format(new Date(notification.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell className="text-right">
                <NotificationActions notification={notification} queryClient={queryClient} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default NotificationTable;