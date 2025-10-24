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
import { useProfiles } from "@/integrations/supabase/profiles";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { useCompanies } from "@/integrations/supabase/companies";
import { useCustomProfiles } from "@/integrations/supabase/customProfiles";
import { useMemo } from "react";

// Definimos o esquema base
const baseFormSchema = z.object({
  full_name: z.string().min(2, {
    message: "O nome completo deve ter pelo menos 2 caracteres.",
  }),
  // O email é validado apenas na criação (isEditing = false)
  email: z.string().email({
    message: "Insira um email válido.",
  }),
  perfil_id: z.string().min(1, {
    message: "Selecione um perfil.",
  }),
  telefone: z.string().optional().nullable(),
  endereco_completo: z.string().optional().nullable(),
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
  defaultValues?: Partial<UserFormValues>;
  isEditing?: boolean;
}

const UserForm: React.FC<UserFormProps> = ({ onSubmit, isSubmitting, defaultValues, isEditing = false }) => {
  const { data: globalProfiles, isLoading: isLoadingGlobalProfiles } = useProfiles();
  const { data: currentProfile, isLoading: isLoadingCurrentProfile } = useCurrentUserProfile();
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  
  const isSuperAdmin = currentProfile?.perfil_id === 1;
  const isCheckingPermissions = isLoadingCurrentProfile || (isSuperAdmin && isLoadingCompanies);

  // Ajusta o schema dinamicamente: 
  let finalFormSchema = baseFormSchema;
  
  if (isEditing) {
    finalFormSchema = finalFormSchema.extend({
      email: z.string().optional(),
      // Na edição, se for Super Admin, empresa_id é opcional (pode ser null)
      empresa_id: isSuperAdmin 
        ? z.string().uuid({ message: "Selecione uma empresa válida." }).or(z.literal("")).optional().nullable()
        : z.string().optional().nullable(),
    });
  } else if (isSuperAdmin) {
    // Na criação, Super Admin deve selecionar a empresa
    finalFormSchema = finalFormSchema.extend({
        empresa_id: z.string().uuid({
          message: "Selecione uma empresa válida.",
        }).min(1, { message: "A empresa é obrigatória para o Super Admin ao convidar." }),
      });
  } else {
    // Se não for Super Admin, ele não pode usar este formulário para convidar,
    // pois não há perfis globais 2 e 3 disponíveis.
    // O botão de adicionar usuário deve ser ocultado para Admin/Funcionário.
    return <p className="text-destructive">Apenas Super Admin pode convidar novos usuários.</p>;
  }


  const form = useForm<UserFormValues>({
    resolver: zodResolver(finalFormSchema),
    defaultValues: {
      full_name: defaultValues?.full_name || "",
      email: defaultValues?.email || "", 
      perfil_id: defaultValues?.perfil_id || "",
      telefone: defaultValues?.telefone || "",
      endereco_completo: defaultValues?.endereco_completo || "",
      empresa_id: defaultValues?.empresa_id || "",
    },
  });
  
  // Observa o ID da empresa selecionada (relevante para carregar perfis customizados)
  const selectedCompanyId = isSuperAdmin ? form.watch('empresa_id') : defaultValues?.empresa_id;
  
  // Carrega perfis customizados filtrados pela empresa selecionada
  const { data: customProfiles, isLoading: isLoadingCustomProfiles } = useCustomProfiles(selectedCompanyId || undefined);
  
  const isLoadingProfiles = isLoadingGlobalProfiles || isLoadingCustomProfiles;

  // Combina perfis globais e customizados
  const allProfiles = useMemo(() => {
    if (!globalProfiles) return [];
    
    let combined = [...globalProfiles];
    
    // Adicionamos perfis customizados se uma empresa estiver selecionada
    if (selectedCompanyId && customProfiles) {
      const mappedCustomProfiles = customProfiles.map(p => ({
        // Usamos o ID do perfil customizado (UUID) como ID
        id: p.id,
        nome: `${p.nome} (Custom)`,
        descricao: `Perfil customizado da empresa ${p.empresas?.nome || ''}`,
      }));
      
      combined.push(...mappedCustomProfiles as any);
    }
    
    // Filtra perfis globais 2 e 3, mantendo apenas o Super Admin (ID 1)
    const filteredGlobalProfiles = combined.filter(p => p.id === 1 || typeof p.id === 'string');
    
    // Na edição, se o perfil atual for um dos perfis globais 2 ou 3 (que não estão mais na lista),
    // precisamos garantir que ele apareça para que o formulário não quebre.
    if (isEditing && defaultValues?.perfil_id && !isNaN(Number(defaultValues.perfil_id)) && Number(defaultValues.perfil_id) !== 1) {
        const existingGlobalProfile = globalProfiles.find(p => p.id === Number(defaultValues.perfil_id));
        if (existingGlobalProfile && !filteredGlobalProfiles.some(p => p.id === existingGlobalProfile.id)) {
             filteredGlobalProfiles.push(existingGlobalProfile as any);
        }
    }
    
    return filteredGlobalProfiles;
  }, [globalProfiles, customProfiles, selectedCompanyId, isEditing, defaultValues?.perfil_id]);


  const handleSubmit = (values: UserFormValues) => {
    // Normaliza campos vazios para null antes de enviar ao Supabase
    const telefone = values.telefone ? values.telefone : null;
    const endereco_completo = values.endereco_completo ? values.endereco_completo : null;
    
    let empresa_id: string | null | undefined = undefined;
    
    if (isSuperAdmin) {
      // Se for Super Admin, enviamos o ID da empresa (ou null se for string vazia)
      empresa_id = values.empresa_id || null;
    } else {
      // Se não for Super Admin, o convite não deveria ser possível, mas se for edição,
      // o empresa_id é o do usuário logado (que não é usado na mutação de edição, mas é bom ter).
      empresa_id = currentProfile?.empresa_id || null;
    }

    onSubmit({
      full_name: values.full_name,
      email: values.email,
      perfil_id: values.perfil_id,
      telefone: telefone,
      endereco_completo: endereco_completo,
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
        
        {/* Campo Empresa (Visível para SA na Criação e Edição) */}
        {isSuperAdmin && (
          <FormField
            control={form.control}
            name="empresa_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Empresa</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value);
                    // Limpa o perfil selecionado ao mudar a empresa
                    form.setValue('perfil_id', ''); 
                  }} 
                  value={field.value || ""} 
                  disabled={isLoadingCompanies || isSubmitting} // Habilitado na edição para SA
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingCompanies ? "Carregando empresas..." : "Selecione a empresa"} />
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
              <FormLabel>Nome Completo</FormLabel>
              <FormControl>
                <Input placeholder="Nome completo do usuário" {...field} disabled={isSubmitting} />
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
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input 
                  // Remove o placeholder na edição para exibir o valor real
                  placeholder={isEditing ? undefined : "email@exemplo.com"} 
                  {...field} 
                  disabled={isEditing || isSubmitting} // Desabilita email na edição
                  value={field.value || ""} // Garante que o valor seja sempre uma string
                  className={isEditing ? "bg-muted/50" : ""} // Adiciona estilo desabilitado
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
              <FormLabel>Telefone (Opcional)</FormLabel>
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
              <FormLabel>Endereço Completo (Opcional)</FormLabel>
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
              <FormLabel>Perfil</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value} 
                disabled={isLoadingProfiles || isSubmitting || (isSuperAdmin && !selectedCompanyId)}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingProfiles ? "Carregando perfis..." : "Selecione um perfil"} />
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
                <p className="text-xs text-destructive mt-1">Selecione uma empresa para carregar os perfis customizados.</p>
              )}
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : isEditing ? (
            "Salvar Alterações"
          ) : (
            "Adicionar Usuário"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default UserForm;