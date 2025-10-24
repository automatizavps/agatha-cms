import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, Mail, Phone, MapPin } from "lucide-react";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { useSession } from "@/integrations/supabase/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showSuccess, showError } from "@/utils/toast";
import AvatarUpload from "./AvatarUpload";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useTranslation } from "react-i18next";
import ChangePasswordDialog from "./ChangePasswordDialog"; // Importando o novo componente

// Esquema de validação para os campos editáveis
const profileSchema = z.object({
  nome_completo: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  telefone: z.string().optional().nullable(),
  endereco_completo: z.string().optional().nullable(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

// Função de mutação para atualizar o perfil (apenas nome, telefone, endereço e avatar_url)
interface UpdateProfileParams {
  id: string;
  nome_completo: string;
  telefone: string | null;
  endereco_completo: string | null;
  avatar_url: string | null;
}

const updateProfile = async ({ id, nome_completo, telefone, endereco_completo, avatar_url }: UpdateProfileParams) => {
  // 1. Atualizar a tabela 'usuarios'
  const { data, error } = await supabase
    .from("usuarios")
    .update({
      nome_completo,
      telefone,
      endereco_completo,
      avatar_url,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating profile:", error);
    throw new Error(error.message);
  }
  
  // 2. Atualizar metadados do auth.users (opcional, mas bom para consistência)
  await supabase.auth.updateUser({
    data: {
      full_name: nome_completo,
      telefone: telefone,
      endereco_completo: endereco_completo,
    }
  });

  return data;
};


const UserProfileSettings = () => {
  const { user } = useSession();
  const { data: profile, isLoading: isLoadingProfile } = useCurrentUserProfile();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (data) => {
      showSuccess("Seu perfil foi atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
    onError: (error) => {
      showError(t("error_loading_data") + ": " + error.message);
    },
  });
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nome_completo: profile?.nome_completo || "",
      telefone: profile?.telefone || "",
      endereco_completo: profile?.endereco_completo || "",
    },
    values: { // Usar 'values' para sincronizar com o estado do query
      nome_completo: profile?.nome_completo || "",
      telefone: profile?.telefone || "",
      endereco_completo: profile?.endereco_completo || "",
    },
  });

  const handleAvatarUploadComplete = (newUrl: string | null) => {
    if (!profile) return;
    
    // Dispara a mutação para atualizar apenas o avatar_url no banco de dados
    mutation.mutate({
      id: profile.id,
      nome_completo: profile.nome_completo, // Mantém os valores atuais
      telefone: profile.telefone,
      endereco_completo: profile.endereco_completo,
      avatar_url: newUrl,
    });
  };

  const handleSubmit = (values: ProfileFormValues) => {
    if (!profile) return;
    
    const telefone = values.telefone ? values.telefone : null;
    const endereco_completo = values.endereco_completo ? values.endereco_completo : null;

    mutation.mutate({
      id: profile.id,
      nome_completo: values.nome_completo,
      telefone: telefone,
      endereco_completo: endereco_completo,
      avatar_url: profile.avatar_url, // Mantém o avatar_url atual
    });
  };

  if (isLoadingProfile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('settings_user_title')}</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  if (!profile) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" /> {t('settings_user_title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Seção de Avatar */}
        <div className="flex flex-col items-center border-b pb-4">
          <h3 className="text-lg font-semibold mb-2">Minha Foto</h3> {/* ALTERADO AQUI */}
          <AvatarUpload 
            currentAvatarUrl={profile.avatar_url}
            onUploadComplete={handleAvatarUploadComplete}
            disabled={mutation.isPending}
          />
        </div>

        {/* Formulário de Dados Pessoais */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            
            <FormField
              control={form.control}
              name="nome_completo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('profile_full_name')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('profile_full_name')} {...field} disabled={mutation.isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormItem>
              <FormLabel>{t('profile_email')} (Não Editável)</FormLabel>
              <Input value={user?.email || "N/A"} disabled className="bg-muted/50" />
            </FormItem>
            
            <FormField
              control={form.control}
              name="telefone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('user_table_header_phone')} (Opcional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="(XX) XXXXX-XXXX" 
                      {...field} 
                      disabled={mutation.isPending}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="endereco_completo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('client_table_header_address')} (Opcional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Rua, Número, Bairro, Cidade, Estado" 
                      {...field} 
                      disabled={mutation.isPending}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                t('save_changes')
              )}
            </Button>
          </form>
        </Form>
        
        {/* Botão de Mudança de Senha */}
        <div className="pt-4 border-t">
          <ChangePasswordDialog />
        </div>
        
      </CardContent>
    </Card>
  );
};

export default UserProfileSettings;