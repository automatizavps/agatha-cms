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

// Definimos o esquema base universal (campos que sempre existem)
const universalSchema = z.object({
  full_name: z.string().min(2, {
    message: "O nome completo deve ter pelo menos 2 caracteres.",
  }),
  perfil_id: z.string().min(1, { // UUID ou '1'
    message: "Selecione um perfil.",
  }),
  telefone: z.string().optional().nullable(),
  endereco_completo: z.string().optional().nullable(),
});

// Definimos os campos que variam (email, empresa, senha)
const variableFields = {
  email: z.string().email({ message: "Insira um email válido." }),
  empresa_id: z.string().uuid({
    message: "Selecione uma empresa válida.",
  }).or(z.literal("")).optional().nullable(),
  password: z.string(),
  confirmPassword: z.string(),
};

// Esquema base para tipagem (inclui todos os campos como opcionais/nulos)
const baseFormSchema = universalSchema.extend({
  email: variableFields.email.optional(),
  empresa_id: variableFields.empresa_id,
  password: variableFields.password.optional(),
  confirmPassword: variableFields.confirmPassword.optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem.',
  path: ['confirmPassword'],
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
    password?: string; // NOVO
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

  // --- Lógica de Definição do Schema (Corrigida) ---
  const finalFormSchema = useMemo(() => {
    let schema = universalSchema;
    
    if (isEditing) {
      // EDIÇÃO: Email é opcional, Senha é opcional (para não alterar)
      schema = schema.extend({
        email: variableFields.email.optional(), // Opcional na edição
        password: variableFields.password.optional(),
        confirmPassword: variableFields.confirmPassword.optional(),
      });
      
      // Se for Super Admin, o campo empresa_id é incluído (opcional/nullable)
      if (isSuperAdmin) {
        schema = schema.extend({
          empresa_id: variableFields.empresa_id,
        });
      }
      
    } else {
      // CRIAÇÃO: Email é obrigatório, Senha é obrigatória (min 6)
      schema = schema.extend({
        email: variableFields.email, // Obrigatório na criação
        password: variableFields.password.min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
        confirmPassword: variableFields.confirmPassword.min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
      }).refine((data) => data.password === data.confirmPassword, {
        message: 'As senhas não coincidem.',
        path: ['confirmPassword'],
      });
      
      if (isSuperAdmin) {
        // Na criação, Super Admin deve selecionar a empresa (obrigatório)
        schema = schema.extend({
            empresa_id: variableFields.empresa_id.min(1, { message: t("company_required_super_admin") }),
          });
      }
    }
    
    // Adiciona a validação de senhas que não coincidem, se houver campos de senha
    if (!isEditing) {
        schema = schema.refine((data) => data.password === data.confirmPassword, {
            message: 'As senhas não coincidem.',
            path: ['confirmPassword'],
        });
    }
    
    return schema;
  }, [isEditing, isSuperAdmin, t]);
  // --- Fim da Lógica de Definição do Schema ---


  const form = useForm<UserFormValues>({
    resolver: zodResolver(finalFormSchema),
    defaultValues: {
      full_name: defaultValues?.full_name || "",
      email: defaultValues?.email || "", 
      perfil_id: String(defaultValues?.perfil_id || ""),
      telefone: defaultValues?.telefone || "",
      endereco_completo: defaultValues?.endereco_completo || "",
      empresa_id: defaultValues?.empresa_id || "",
      password: "", // Adicionado
      confirmPassword: "", // Adicionado
    },
  });
  
  // Observa o ID da empresa selecionada (relevante para carregar perfis customizados)
  const selectedCompanyId = isSuperAdmin ? form.watch('empresa_id') : defaultValues?.empresa_id;
  
  // Carrega perfis customizados filtrados pela empresa selecionada
  const { data: customProfiles, isLoading: isLoadingCustomProfiles } = useCustomProfiles(selectedCompanyId || undefined);
  
  const isLoadingProfiles = isLoadingCustomProfiles;

  // Combina perfis globais (apenas Super Admin) e customizados
  const allProfiles = useMemo(() => {
    let combined: { id: string; nome: string; }[] = [];
    
    // 1. Adicionar perfis customizados se uma empresa estiver selecionada
    if (selectedCompanyId && customProfiles) {
      const mappedCustomProfiles = customProfiles.map(p => ({
        id: p.id,
        nome: `${p.nome} (Custom)`,
      }));
      
      combined.push(...mappedCustomProfiles);
    }
    
    // 2. Na edição, se o perfil atual for o antigo SA ('1') ou um perfil customizado que não está na lista,
    // precisamos garantir que ele apareça.
    if (isEditing && defaultValues?.perfil_id) {
        const currentProfileId = String(defaultValues.perfil_id);
        
        // Caso 1: Antigo Super Admin (ID '1')
        if (currentProfileId === '1' && !combined.some(p => p.id === '1')) {
            combined.push({ id: '1', nome: 'Super Admin (Antigo)' });
        }
        
        // Caso 2: Perfil customizado que não foi carregado (ex: empresa inativa)
        if (currentProfileId !== '1' && !customProfiles?.some(p => p.id === currentProfileId)) {
            const currentProfileName = defaultValues.perfis?.nome || t('unknown_profile');
            // Adicionamos o perfil atual se ele for um UUID e não estiver na lista
            if (currentProfileId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                 combined.push({ id: currentProfileId, nome: `${currentProfileName} (${t('unknown_profile')})` });
            }
        }
    }
    
    return combined;
  }, [customProfiles, selectedCompanyId, isEditing, defaultValues, t]);


  const handleSubmit = (values: UserFormValues) => {
    // Normaliza campos vazios para null antes de enviar ao Supabase
    const telefone = values.telefone ? values.telefone : null;
    const endereco_completo = values.endereco_completo ? values.endereco_completo : null;
    
    let empresa_id: string | null | undefined = undefined;
    
    if (isSuperAdmin) {
      // Se for Super Admin, enviamos o ID da empresa (ou null se for string vazia)
      // Na criação, values.empresa_id é garantido ser uma string UUID
      empresa_id = values.empresa_id || null;
    } else {
      // Se não for Super Admin, o convite não deveria ser possível, mas se for edição,
      // o empresa_id é o do usuário logado (que não é usado na mutação de edição, mas é bom ter).
      empresa_id = currentProfile?.empresa_id || null;
    }

    onSubmit({
      full_name: values.full_name,
      email: values.email!, // Email é obrigatório na criação, opcional na edição
      perfil_id: values.perfil_id, // Passa o UUID ou '1'
      telefone: telefone,
      endereco_completo: endereco_completo,
      empresa_id: empresa_id,
      password: values.password, // NOVO: Inclui a senha
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
        
        {/* Campo Empresa (Visível para SA na Criação e Edição) */}
        {isSuperAdmin && (
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
        
        {/* Campos de Senha (Apenas na Criação) */}
        {!isEditing && (
          <>
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
                      disabled={isSubmitting} 
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
                      disabled={isSubmitting} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
        
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
                onValueChange={field.onChange} 
                value={field.value} 
                disabled={isSubmitting || (isSuperAdmin && !selectedCompanyId)}
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
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
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