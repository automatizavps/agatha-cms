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
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { useCompanies } from "@/integrations/supabase/companies";
import { useCustomProfiles } from "@/integrations/supabase/customProfiles";
import { useMemo } from "react";
import { useTranslation } from "react-i18next"; // Importando tradução

// Definimos o esquema base
const baseFormSchema = z.object({
  full_name: z.string().min(2, {
    message: "O nome completo deve ter pelo menos 2 caracteres.",
  }),
  // O email é validado apenas na criação (isEditing = false)
  email: z.string().email({
    message: "Insira um email válido.",
  }),
  perfil_id: z.string().min(1, { // Agora é o UUID ou '1'
    message: "Selecione um perfil.",
  }),
  telefone: z.string().optional().nullable(),
  endereco_completo: z.string().optional().nullable(),
  // empresa_id é opcional no base, mas será estendido para ser obrigatório na criação para SA
  empresa_id: z.string().uuid({
    message: "Selecione uma empresa válida.",
  }).or(z.literal("")).optional().nullable(),
});

type UserFormValues = z.infer<typeof baseFormSchema>;

interface UserFormProps {
  onSubmit: (values: { 
    full_name: string; 
    email: string; 
    perfil_id: string; 
    telefone: string | null; 
    endereco_completo: string | null;
    empresa_id?: string | null;
  }) => void;
  isSubmitting: boolean;
  defaultValues?: Partial<UserFormValues & { perfis?: { nome: string } | null }>;
  isEditing?: boolean;
}

const UserForm: React.FC<UserFormProps> = ({ onSubmit, isSubmitting, defaultValues, isEditing = false }) => {
  const { data: currentProfile, isLoading: isLoadingCurrentProfile } = useCurrentUserProfile();
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  const { t } = useTranslation();
  
  const isSuperAdmin = currentProfile?.is_super_admin;
  const isCheckingPermissions = isLoadingCurrentProfile || (isSuperAdmin && isLoadingCompanies);

  // Ajusta o schema dinamicamente: 
  let finalFormSchema = baseFormSchema;
  
  if (isEditing) {
    finalFormSchema = finalFormSchema.extend({
      email: z.string().optional(),
      // Na edição, empresa_id é opcional (pode ser null)
      empresa_id: z.string().uuid({ message: t("select_valid_company") }).or(z.literal("")).optional().nullable(),
      perfil_id: z.string().min(1, { message: t("select_profile") }),
    });
  } else if (isSuperAdmin) {
    // Na criação, Super Admin deve selecionar a empresa (ou deixar vazio para SA Antigo)
    finalFormSchema = finalFormSchema.extend({
        empresa_id: z.string().uuid({
          message: t("select_valid_company"),
        }).or(z.literal("")).optional().nullable(),
      });
  } else {
    // Se não for Super Admin, o convite não deveria ser possível
    return <p className="text-destructive">{t("only_super_admin_can_invite")}</p>;
  }


  const form = useForm<UserFormValues>({
    resolver: zodResolver(finalFormSchema),
    defaultValues: {
      full_name: defaultValues?.full_name || "",
      email: defaultValues?.email || "", 
      perfil_id: String(defaultValues?.perfil_id || ""),
      telefone: defaultValues?.telefone || "",
      endereco_completo: defaultValues?.endereco_completo || "",
      // Garante que o valor inicial seja string vazia se for null, para o Select funcionar
      empresa_id: defaultValues?.empresa_id || "",
    },
  });
  
  // Observa o ID da empresa selecionada (relevante para carregar perfis customizados)
  const selectedCompanyId = isSuperAdmin ? form.watch('empresa_id') : defaultValues?.empresa_id;
  
  // Carrega perfis customizados filtrados pela empresa selecionada
  const { data: customProfiles, isLoading: isLoadingCustomProfiles } = useCustomProfiles(selectedCompanyId || undefined);
  
  const isLoadingProfiles = isLoadingCustomProfiles;

  // Combina perfis globais (Super Admin) e customizados
  const allProfiles = useMemo(() => {
    let combined: { id: string; nome: string; }[] = [];
    
    // 1. Adicionar Super Admin (ID '1') - Apenas se for Super Admin logado
    if (isSuperAdmin) {
        combined.push({ id: '1', nome: 'Super Admin' });
    }
    
    // 2. Adicionar perfis customizados se uma empresa estiver selecionada
    if (selectedCompanyId && customProfiles) {
      const mappedCustomProfiles = customProfiles.map(p => ({
        id: p.id,
        nome: `${p.nome} (Custom)`,
      }));
      
      combined.push(...mappedCustomProfiles);
    }
    
    // 3. Na edição, se o perfil atual for um perfil customizado que não está na lista (ex: filtro de empresa mudou),
    // precisamos garantir que ele apareça.
    if (isEditing && defaultValues?.perfil_id && defaultValues.perfil_id !== '1') {
        const currentProfileId = String(defaultValues.perfil_id);
        
        if (!customProfiles?.some(p => p.id === currentProfileId)) {
            const currentProfileName = defaultValues.perfis?.nome || t('unknown_profile');
            // Adicionamos o perfil atual se ele for um UUID e não estiver na lista
            if (currentProfileId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                 combined.push({ id: currentProfileId, nome: `${currentProfileName} (${t('unknown_profile')})` });
            }
        }
    }
    
    // Remove duplicatas e ordena
    const uniqueProfiles = Array.from(new Map(combined.map(p => [p.id, p])).values());
    
    // Ordena: SA no topo, depois por nome
    return uniqueProfiles.sort((a, b) => {
        if (a.id === '1') return -1;
        if (b.id === '1') return 1;
        return a.nome.localeCompare(b.nome);
    });
  }, [customProfiles, selectedCompanyId, isEditing, defaultValues, isSuperAdmin, t]);


  const handleSubmit = (values: UserFormValues) => {
    // Normaliza campos vazios para null antes de enviar ao Supabase
    const telefone = values.telefone ? values.telefone : null;
    const endereco_completo = values.endereco_completo ? values.endereco_completo : null;
    
    let empresa_id: string | null | undefined = undefined;
    
    if (isSuperAdmin) {
      // Se for Super Admin, enviamos o ID da empresa (ou null se for string vazia)
      empresa_id = values.empresa_id || null;
    } else {
      // Se não for Super Admin, o empresa_id é o do usuário logado (fixo)
      empresa_id = currentProfile?.empresa_id || null;
    }

    onSubmit({
      full_name: values.full_name,
      email: values.email,
      perfil_id: values.perfil_id, // Passa o UUID ou '1'
      telefone: telefone,
      endereco_completo: endereco_completo,
      empresa_id: empresa_id,
    });
  };
  
  // Determina se o campo empresa deve ser exibido
  const shouldShowCompanyField = isSuperAdmin;
  
  // Encontra o nome da empresa para exibição desabilitada (se não for SA)
  const companyName = companies?.find(c => c.id === defaultValues?.empresa_id)?.nome;
  
  // Verifica se o perfil selecionado é o Super Admin (ID '1')
  const isSelectedProfileSA = form.watch('perfil_id') === '1';
  
  // Validação de empresa para perfis não-SA
  const isCompanyRequired = !isSelectedProfileSA;
  const isCompanySelected = !!form.watch('empresa_id');
  
  // Desabilita o botão se a empresa for obrigatória e não estiver selecionada
  const isSubmitDisabled = isSubmitting || (isSuperAdmin && !isEditing && isCompanyRequired && !isCompanySelected);


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
        
        {/* Campo Empresa (Visível para SA) */}
        {shouldShowCompanyField && (
          <FormField
            control={form.control}
            name="empresa_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('user_table_header_company')}</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value);
                    // Limpa o perfil selecionado ao mudar a empresa
                    form.setValue('perfil_id', ''); 
                  }} 
                  value={field.value || ""} 
                  disabled={isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingCompanies ? t("loading_companies") : t("select_company")} />
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
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('profile_full_name')}</FormLabel>
              <FormControl>
                <Input placeholder={t('profile_full_name')} {...field} disabled={isSubmitting} />
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
              <FormLabel>{t('profile_email')}</FormLabel>
              <FormControl>
                <Input 
                  placeholder={isEditing ? undefined : t('email_placeholder')} 
                  {...field} 
                  disabled={isEditing || isSubmitting}
                  value={field.value || ""}
                  className={isEditing ? "bg-muted/50" : ""}
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
        
        <FormField
          control={form.control}
          name="perfil_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('user_table_header_profile')}</FormLabel>
              <Select 
                onValueChange={(value) => {
                    field.onChange(value);
                    // Se o perfil for SA, limpa a empresa_id
                    if (value === '1' && isSuperAdmin) {
                        form.setValue('empresa_id', null);
                    }
                    // Se o perfil não for SA, e a empresa_id estiver nula, força a seleção
                    if (value !== '1' && isSuperAdmin && !form.getValues('empresa_id')) {
                        form.setError('empresa_id', { type: 'manual', message: t("company_required_super_admin") });
                    } else {
                        form.clearErrors('empresa_id');
                    }
                }} 
                value={field.value} 
                disabled={isSubmitting || (isSuperAdmin && !selectedCompanyId && !isEditing)}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingProfiles ? t("loading_profiles") : t("select_profile")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {allProfiles.map((profile) => (
                    <SelectItem key={profile.id} value={String(profile.id)}>
                      {profile.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
              {isSuperAdmin && !isEditing && !selectedCompanyId && (
                <p className="text-xs text-destructive mt-1">{t("select_company_to_load_profiles")}</p>
              )}
              {isSuperAdmin && isCompanyRequired && !isCompanySelected && (
                <p className="text-xs text-destructive mt-1">{t("company_required_for_profile")}</p>
              )}
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitDisabled}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : isEditing ? (
            t('save_changes')
          ) : (
            t('add_new_user')
          )}
        </Button>
      </form>
    </Form>
  );
};

export default UserForm;