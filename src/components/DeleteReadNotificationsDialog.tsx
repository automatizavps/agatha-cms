import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { deleteAllReadNotifications } from '@/integrations/supabase/notifications';
import { showSuccess, showError } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import { useSession } from '@/integrations/supabase/auth';

interface DeleteReadNotificationsDialogProps {
  disabled: boolean;
}

const DeleteReadNotificationsDialog: React.FC<DeleteReadNotificationsDialogProps> = ({ disabled }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useSession();

  const mutation = useMutation({
    mutationFn: deleteAllReadNotifications,
    onSuccess: () => {
      showSuccess(t('delete_read_success'));
      // Invalida todas as queries de notificação para forçar o refresh
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    },
    onError: (error) => {
      showError(t('error_loading_data') + ": " + error.message);
    },
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="destructive" 
          size="sm" 
          disabled={disabled || mutation.isPending}
        >
          {mutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          {t('delete_read_notifications')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('confirm_delete_read_title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('confirm_delete_read_message')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction 
            onClick={(e) => {
              e.preventDefault(); // Previne o fechamento automático antes da mutação
              mutation.mutate();
            }}
            disabled={mutation.isPending}
            className="bg-destructive hover:bg-destructive/90"
          >
            {mutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              t('delete_confirm')
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteReadNotificationsDialog;