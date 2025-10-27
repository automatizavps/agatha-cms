import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, Building } from "lucide-react";
import { Client } from "@/integrations/supabase/clients";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { useCompanies } from "@/integrations/supabase/companies";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next"; // Importando tradução
import React, { useState, useEffect } from "react";
import ClientAvatarUpload from "./ClientAvatarUpload"; // NOVO IMPORT

// Definimos o esquema base
const baseFormSchema = z.object({
  nome: z.string().min(2, {
    message: "O nome deve ter pelo menos 2 caracteres.",
  }),
  email: z.string().email({
    message: "Insira um email válido.",
  }).or(z.literal("")).nullable(), // Permite string vazia ou null
  telefone: z.string().optional().nullable(),
  endereco_completo: z.string().optional().nullable(),
  // empresa_id é opcional no base, mas será estendido para ser obrigatório na criação para SA
  empresa_id: z.string().uuid({
    message: "Selecione uma empresa válida.",
  }).or(z.literal("")).optional(),
});

type ClientFormValues = z.infer<typeof baseFormSchema>;

interface ClientFormProps {
  onSubmit: (values: { nome: string; email: string | null; telefone: string | null; endereco_completo: string | null; avatar_url: string | null; empresa_id?: string }) => void;
  isSubmitting: boolean;
  defaultValues?: Partial<ClientFormValues & { id?: string; avatar_url?: string | null }>;
  isEditing?: boolean;
}

const ClientForm: React.FC<ClientFormProps> = ({ onSubmit, isSubmitting, defaultValues, isEditing = false }) => {
  const { data: profile, isLoading: isLoadingProfile } = useCurrentUserProfile();
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  const { t } = useTranslation();
  
  // Estado para o Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(defaultValues?.avatar_url || null);
  
  // Sincroniza o avatar_url inicial
  useEffect(() => {
    setAvatarUrl(defaultValues?.avatar_url || null);
  }, [defaultValues?.avatar_url]);
  
  // Usando a flag correta
  const isSuperAdmin = profile?.is_super_admin;
  const isCheckingPermissions = isLoadingProfile || (isSuperAdmin && isLoadingCompanies);

  // Ajusta o schema dinamicamente: se for Super Admin, empresa_id é obrigatório na CRIAÇÃO
  const formSchema = isSuperAdmin && !isEditing
    ? baseFormSchema.extend({
        empresa_id: z.string().uuid({
          message: t("select_valid_company"),
        }).min(1, { message: t("company_required_super_admin") }),
      })
    : baseFormSchema;

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: defaultValues?.nome || "",
      email: defaultValues?.email || "",
      telefone: defaultValues?.telefone || "",
      endereco_completo: defaultValues?.endereco_completo || "",
      empresa_id: defaultValues?.empresa_id || "",
    },
  });
  
  // Observa o nome do cliente para o fallback do avatar
  const clientName = form.watch('nome');

  // Visibilidade: APENAS Super Admin pode ver e interagir com este campo.
  const shouldShowCompanyField = isSuperAdmin;
  
  // Observa o ID da empresa selecionada (ou usa o ID do perfil se não for SA)
  const companyIdForData = isEditing 
    ? defaultValues?.empresa_id 
    : (isSuperAdmin ? form.watch('empresa_id') : profile?.empresa_id);
    
  const isCompanySelected = !!companyIdForData;
  
  // Encontra o nome da empresa para exibição desabilitada
  const companyName = companies?.find(c => c.id === companyIdForData)?.nome;
  
  // ID do cliente (necessário para o upload)
  const clientId = defaultValues?.id || 'new';


  const handleSubmit = (values: ClientFormValues) => {
    // Normaliza campos vazios para null antes de enviar ao Supabase
    const email = values.email ? values.email : null;
    const telefone = values.telefone ? values.telefone : null;
    const endereco_completo = values.endereco_completo ? values.endereco_completo : null;
    
    // Se for Super Admin, envia o empresa_id selecionado. Caso contrário, não envia (será obtido via RPC).
    const empresa_id = isSuperAdmin && values.empresa_id ? values.empresa_id : undefined;

    onSubmit({
      nome: values.nome,
      email: email,
      telefone: telefone,
      endereco_completo: endereco_completo,
      avatar_url: avatarUrl, // Inclui o URL do avatar
      empresa_id: empresa_id,
    });
  };
  
  if (isCheckingPermissions) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        
        {/* Seção de Avatar (Apenas na Edição e se a empresa estiver selecionada) */}
        {isEditing && companyIdForData && (
          <div className="flex flex-col items-center border-b pb-4">
            <h3 className="text-lg font-semibold mb-2">{t('avatar', { defaultValue: 'Avatar' })}</h3>
            <ClientAvatarUpload 
              currentAvatarUrl={avatarUrl}
              onUploadComplete={setAvatarUrl}
              disabled={isSubmitting}
              companyId={companyIdForData}
              clientId={clientId}
              clientName={clientName}
            />
          </div>
        )}
        
        {/* Campo Empresa (Visível APENAS para Super Admin) */}
        {shouldShowCompanyField && (
          <FormField
            control={form.control}
            name="empresa_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('user_table_header_company')}</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value} 
                  // O campo é editável se for Super Admin e não estiver submetendo
                  disabled={isLoadingCompanies || isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingCompanies ? t("loading_companies") : companyName || t("select_company")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {companies?.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('client_name')}</FormLabel>
              <FormControl>
                <Input placeholder={t('client_name_placeholder')} {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('profile_email')} ({t('optional')})</FormLabel>
              <FormControl>
                <Input 
                  placeholder="email@exemplo.com" 
                  {...field} 
                  disabled={isSubmitting}
                  value={field.value || ""} // Garante que o input não seja undefined
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="telefone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('user_table_header_phone')} ({t('optional')})</FormLabel>
              <FormControl>
                <Input 
                  placeholder="(XX) XXXXX-XXXX" 
                  {...field} 
                  disabled={isSubmitting}
                  value={field.value || ""} // Garante que o input não seja undefined
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
              <FormLabel>{t('client_table_header_address')} ({t('optional')})</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Rua, Número, Bairro, Cidade, Estado" 
                  {...field} 
                  disabled={isSubmitting}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : isEditing ? (
            t('save_changes')
          ) : (
            t('add_new_client')
          )}
        </Button>
      </form>
    </Form>
  );
};

export default ClientForm;