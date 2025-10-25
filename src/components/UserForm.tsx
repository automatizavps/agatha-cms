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
import { Loader2, Building, Tag } from "lucide-react";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { useCompanies } from "@/integrations/supabase/companies";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { useCustomProfiles } from "@/integrations/supabase/customProfiles";
import { UserProfile } from "@/integrations/supabase/users";

// Definimos o esquema base
const baseFormSchema = z.object({
  email: z.string().email({
    message: "Insira um email válido.",
  }),
  nome_completo: z.string().min(2, {
    message: "O nome deve ter pelo menos 2 caracteres.",
  }),
  telefone: z.string().optional().nullable(),
  endereco_completo: z.string().optional().nullable(),
  
  // perfil_id: UUID do perfil customizado OU '2' para Admin OU '1' para Super Admin
  perfil_id: z.string().min(1, { message: "O perfil é obrigatório." }),
  
  // empresa_id: UUID da empresa
  empresa_id: z.string().uuid({
    message: "Selecione uma empresa válida.",
  }).or(z.literal("")).optional(),
});

type UserFormValues = z.infer<typeof baseFormSchema>;

interface UserFormProps {
  onSubmit: (values: { 
    email: string; 
    nome_completo: string; 
    telefone: string | null; 
    endereco_completo: string | null; 
    perfil_id: string; 
    empresa_id: string; 
  }) => void;
  isSubmitting: boolean;
  defaultValues?: Partial<UserFormValues & { id?: string }>;
  isEditing?: boolean;
}

const UserForm: React.FC<UserFormProps> = ({ onSubmit, isSubmitting, defaultValues, isEditing = false }) => {
  const { data: profile, isLoading: isLoadingProfile } = useCurrentUserProfile();
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  const { t } = useTranslation();
  
  const isSuperAdmin = profile?.is_super_admin;
  const isCheckingPermissions = isLoadingProfile || (isSuperAdmin && isLoadingCompanies);
  
  // Observa o ID da empresa selecionada (ou usa o ID do perfil se não for SA)
  const companyIdForProfiles = isSuperAdmin ? form.watch('empresa_id') : profile?.empresa_id;
  const isCompanySelected = !!companyIdForProfiles;
  
  // Carrega perfis customizados filtrados pela empresa selecionada
  const { data: customProfiles, isLoading: isLoadingCustomProfiles } = useCustomProfiles(companyIdForProfiles || undefined);
  
  // Ajusta o schema dinamicamente: email é opcional na edição, empresa_id é obrigatório na CRIAÇÃO para SA
  const formSchema = baseFormSchema.extend({
    email: isEditing ? baseFormSchema.shape.email.optional() : baseFormSchema.shape.email,
    empresa_id: isSuperAdmin && !isEditing
      ? z.string().uuid({
          message: t("select_valid_company"),
        }).min(1, { message: t("company_required_super_admin") })
      : baseFormSchema.shape.empresa_id,
  });

  const form = useForm<UserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: defaultValues?.email || "",
      nome_completo: defaultValues?.nome_completo || "",
      telefone: defaultValues?.telefone || "",
      endereco_completo: defaultValues?.endereco_completo || "",
      perfil_id: defaultValues?.perfil_id || "",
      empresa_id: defaultValues?.empresa_id || "",
    },
  });
  
  // Opções de perfil disponíveis
  const profileOptions = useMemo(() => {
    if (!customProfiles) return [];
    
    const options = [...customProfiles.map(p => ({ id: p.id, nome: p.nome }))];
    
    // Adiciona o perfil Admin (ID 2) se a empresa estiver selecionada
    if (isCompanySelected) {
      options.unshift({ id: '2', nome: 'Admin' });
    }
    
    // Adiciona o perfil Super Admin (ID 1) se o usuário logado for SA
    if (isSuperAdmin) {
      options.unshift({ id: '1', nome: 'Super Admin' });
    }
    
    return options;
  }, [customProfiles, isSuperAdmin, isCompanySelected]);
  
  // Observa o ID da empresa selecionada (ou usa o ID do perfil se não for SA)
  const selectedCompanyId = isEditing 
    ? defaultValues?.empresa_id 
    : (isSuperAdmin ? form.watch('empresa_id') : profile?.empresa_id);
    
  const companyName = companies?.find(c => c.id === selectedCompanyId)?.nome;
  
  // Determina se o campo empresa deve ser exibido
  const shouldShowCompanyField = isSuperAdmin || isEditing;
  
  // Determina se o campo empresa deve ser editável
  const isCompanyFieldEditable = isSuperAdmin && !isSubmitting && !isEditing;
  
  // Determina se o aviso deve ser exibido (Apenas Super Admin E empresa não selecionada)
  const shouldShowWarning = isSuperAdmin && !isCompanySelected && !isEditing;


  const handleSubmit = (values: UserFormValues) => {
    // Normaliza campos vazios para null
    const telefone = values.telefone ? values.telefone : null;
    const endereco_completo = values.endereco_completo ? values.endereco_completo : null;
    
    // A empresa_id é obrigatória para a mutação, seja do formulário (SA) ou do perfil (Admin)
    const finalEmpresaId = selectedCompanyId || values.empresa_id;
    
    if (!finalEmpresaId) {
      form.setError('empresa_id', { message: t("company_required_super_admin") });
      return;
    }

    onSubmit({
      email: values.email,
      nome_completo: values.nome_completo,
      telefone: telefone,
      endereco_completo: endereco_completo,
      perfil_id: values.perfil_id,
      empresa_id: finalEmpresaId,
    });
  };
  
  if (isCheckingPermissions || isLoadingCustomProfiles) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        
        {/* Campo Empresa */}
        {shouldShowCompanyField && (
          <FormField
            control={form.control}
            name="empresa_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('user_table_header_company')}</FormLabel>
                {isCompanyFieldEditable ? (
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Limpa o perfil ao mudar a empresa
                      form.setValue('perfil_id', '');
                    }} 
                    value={field.value} 
                    disabled={isLoadingCompanies || isSubmitting}
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
                ) : (
                  <FormControl>
                    <Input 
                      value={companyName || t("company_not_found")} 
                      disabled 
                      className="bg-muted/50"
                    />
                  </FormControl>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        {/* Aviso se a empresa não estiver selecionada (Apenas Super Admin na CRIAÇÃO) */}
        {shouldShowWarning && (
          <div className="p-3 bg-yellow-100/50 dark:bg-yellow-900/20 border border-yellow-400/50 rounded-md text-sm text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
            <Building className="h-4 w-4" />
            {t('select_company_to_load_data')}
          </div>
        )}
        
        {/* Perfil de Acesso */}
        <FormField
          control={form.control}
          name="perfil_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('user_table_header_profile')}</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value} 
                disabled={isSubmitting || isLoadingCustomProfiles || !isCompanySelected}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingCustomProfiles ? t("loading_profiles") : t("select_profile")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {profileOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Email (Apenas na Criação) */}
        {!isEditing && (
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('profile_email')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('email_placeholder')} {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        {/* Nome Completo */}
        <FormField
          control={form.control}
          name="nome_completo"
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
        
        {/* Telefone */}
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
        
        {/* Endereço */}
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
        
        <Button 
          type="submit" 
          className="w-full" 
          disabled={isSubmitting || !isCompanySelected}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : isEditing ? (
            t('save_changes')
          ) : (
            t('invite_user')
          )}
        </Button>
      </form>
    </Form>
  );
};

export default UserForm;