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
import { useCustomProfiles } from "@/integrations/supabase/customProfiles"; // Importando perfis customizados
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
    });
  } else if (isSuperAdmin) {
    finalFormSchema = finalFormSchema.extend({
        empresa_id: z.string().uuid({
          message: "Selecione uma empresa válida.",
        }).min(1, { message: "A empresa é obrigatória para o Super Admin ao convidar." }),
      });
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
  
  // Observa o ID da empresa selecionada (apenas relevante para Super Admin na criação)
  const selectedCompanyId = isSuperAdmin && !isEditing ? form.watch('empresa_id') : undefined;
  
  // Carrega perfis customizados filtrados pela empresa selecionada
  const { data: customProfiles, isLoading: isLoadingCustomProfiles } = useCustomProfiles(selectedCompanyId);
  
  const isLoadingProfiles = isLoadingGlobalProfiles || isLoadingCustomProfiles;

  // Combina perfis globais e customizados
  const allProfiles = useMemo(() => {
    if (!globalProfiles) return [];
    
    let combined = [...globalProfiles];
    
    // Se for Super Admin e uma empresa estiver selecionada, adicionamos os perfis customizados
    if (isSuperAdmin && selectedCompanyId && customProfiles) {
      // Mapeamos perfis customizados para o formato Profile (id: string, nome: string)
      const mappedCustomProfiles = customProfiles.map(p => ({
        id: p.id,
        nome: `${p.nome} (Custom)`,
        descricao: `Perfil customizado da empresa ${p.empresas?.nome || ''}`,
      }));
      
      // Adicionamos os perfis customizados. Usamos o ID do perfil customizado (UUID)
      // e não o perfil_id (1, 2, 3)
      combined.push(...mappedCustomProfiles as any);
    }
    
    // Se não for Super Admin, ou se estiver editando, mostramos apenas os perfis globais
    // (A lógica de edição de perfil customizado para Admin/Funcionário é mais complexa e será tratada separadamente)
    if (!isSuperAdmin && !isEditing) {
        // Admin/Funcionário só pode convidar Funcionários (ID 3)
        return combined.filter(p => p.id === 3);
    }
    
    // Na edição, se o perfil atual for customizado, garantimos que ele apareça na lista
    if (isEditing && defaultValues?.perfil_id && isNaN(Number(defaultValues.perfil_id))) {
        const existingCustomProfile = customProfiles?.find(p => p.id === defaultValues.perfil_id);
        if (existingCustomProfile && !combined.some(p => p.id === existingCustomProfile.id)) {
             combined.push({
                id: existingCustomProfile.id,
                nome: `${existingCustomProfile.nome} (Custom)`,
                descricao: `Perfil customizado da empresa ${existingCustomProfile.empresas?.nome || ''}`,
             } as any);
        }
    }
    
    return combined;
  }, [globalProfiles, customProfiles, isSuperAdmin, selectedCompanyId, isEditing, defaultValues?.perfil_id]);


  const handleSubmit = (values: UserFormValues) => {
    // Normaliza campos vazios para null antes de enviar ao Supabase
    const telefone = values.telefone ? values.telefone : null;
    const endereco_completo = values.endereco_completo ? values.endereco_completo : null;
    
    let empresa_id: string | null | undefined = undefined;
    
    if (isSuperAdmin) {
      // Se for Super Admin, enviamos o ID da empresa (ou null se for string vazia)
      empresa_id = values.empresa_id || null;
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
                  disabled={isLoadingCompanies || isSubmitting || isEditing}
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
                disabled={isLoadingProfiles || isSubmitting || (isSuperAdmin && !isEditing && !selectedCompanyId)}
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