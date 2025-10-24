import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Key, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { showSuccess, showError } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/auth';

const passwordSchema = z.object({
  password: z.string().min(6, {
    message: 'A senha deve ter pelo menos 6 caracteres.',
  }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem.',
  path: ['confirmPassword'],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

interface ResetPasswordDialogProps {
  userIdToUpdate: string;
  userName: string;
}

const resetUserPassword = async ({ userIdToUpdate, newPassword, accessToken }: { userIdToUpdate: string, newPassword: string, accessToken: string }) => {
  const { data, error } = await supabase.functions.invoke("reset-user-password", {
    body: { userIdToUpdate, newPassword },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    console.error("Error resetting password via Edge Function:", error);
    throw new Error(error.message);
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
};

const ResetPasswordDialog: React.FC<ResetPasswordDialogProps> = ({ userIdToUpdate, userName }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const { session } = useSession();
  const accessToken = session?.access_token;

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (newPassword: string) => resetUserPassword({ userIdToUpdate, newPassword, accessToken: accessToken! }),
    onSuccess: () => {
      showSuccess(`Senha de ${userName} atualizada com sucesso!`);
      setIsOpen(false);
      form.reset();
    },
    onError: (error) => {
      showError('Falha ao atualizar senha: ' + error.message);
    },
  });

  const handleSubmit = (values: PasswordFormValues) => {
    if (!accessToken) {
      showError("Sessão de administrador ausente.");
      return;
    }
    mutation.mutate(values.password);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-start">
          <Key className="mr-2 h-4 w-4" />
          {t('reset_password')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('reset_password_title')}</DialogTitle>
          <DialogDescription>
            {t('reset_password_description', { name: userName })}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('new_password')}</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      {...field} 
                      disabled={mutation.isPending} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('confirm_new_password')}</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      {...field} 
                      disabled={mutation.isPending} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="submit" disabled={mutation.isPending} className="w-full">
                {mutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  t('update_password_button')
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ResetPasswordDialog;