import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Key, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import { useSession } from '@/integrations/supabase/auth';

const passwordSchema = z.object({
  password: z.string().min(6, {
    message: 'A nova senha deve ter pelo menos 6 caracteres.',
  }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem.',
  path: ['confirmPassword'],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

interface ForcePasswordChangeDialogProps {
  isOpen: boolean;
  onPasswordChanged: () => void;
}

// Função para limpar o flag must_change_password via Edge Function
const clearPasswordFlag = async (accessToken: string) => {
  const { data, error } = await supabase.functions.invoke("clear-password-flag", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (error) {
    console.error("Error clearing password flag via Edge Function:", error);
    throw new Error(error.message);
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
};

const ForcePasswordChangeDialog: React.FC<ForcePasswordChangeDialogProps> = ({ isOpen, onPasswordChanged }) => {
  const { t } = useTranslation();
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
    mutationFn: async (newPassword: string) => {
      if (!accessToken) throw new Error("Sessão ausente.");
      
      // 1. Atualizar a senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw new Error(updateError.message);
      }
      
      // 2. Limpar o flag must_change_password
      await clearPasswordFlag(accessToken);
    },
    onSuccess: () => {
      showSuccess('Sua senha foi alterada com sucesso!');
      form.reset();
      onPasswordChanged(); // Notifica o componente pai para fechar o modal
    },
    onError: (error) => {
      showError('Falha ao alterar a senha: ' + error.message);
    },
  });

  const handleSubmit = (values: PasswordFormValues) => {
    mutation.mutate(values.password);
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> {t('change_password')}
          </DialogTitle>
          <DialogDescription>
            {t('reset_password_description', { name: t('your_account') })}
            <p className="mt-2 font-semibold text-foreground">
              {t('must_change_password_warning')}
            </p>
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

export default ForcePasswordChangeDialog;