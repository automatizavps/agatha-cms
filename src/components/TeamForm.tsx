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
import { Loader2, Check, ChevronsUpDown } from "lucide-react";
import { Team } from "@/types/supabase"; // Importando o tipo centralizado
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { useCompanies } from "@/integrations/supabase/companies";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUsers } from "@/integrations/supabase/users";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

// Definimos o esquema base
const baseFormSchema = z.object({
  nome: z.string().min(2, {
    message: "O nome deve ter pelo menos 2 caracteres.",
  }),
  meta_mensal_valor: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "O valor deve ser um número positivo.",
  }),
  meta_mensal_quantidade: z.string().refine(val => !isNaN(parseInt(val)) && parseInt(val) >= 0, {
    message: "A quantidade deve ser um número inteiro positivo.",
  }),
  empresa_id: z.string().uuid({
    message: "Selecione uma empresa válida.",
  }).or(z.literal("")).optional(),
  
  // Membros são tratados como um array de IDs de string
  member_ids: z.array(z.string().uuid()).optional(),
});

type TeamFormValues = z.infer<typeof baseFormSchema>;

interface TeamFormProps {
  onSubmit: (values: { 
    nome: string; 
    meta_mensal_valor: number; 
    meta_mensal_quantidade: number; 
    member_ids: string[];
    empresa_id?: string;
  }) => void;
  isSubmitting: boolean;
  defaultValues?: Partial<TeamFormValues & { member_ids: string[] }>;
  isEditing?: boolean;
}

const TeamForm: React.FC<TeamFormProps> = ({ onSubmit, isSubmitting, defaultValues, isEditing = false }) => {
  const { data: profile, isLoading: isLoadingProfile } = useCurrentUserProfile();
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  const { data: users, isLoading: isLoadingUsers } = useUsers();
  const { t } = useTranslation();
  
  const isSuperAdmin = profile?.perfil_id === 1;
  const isCheckingPermissions = isLoadingProfile || (isSuperAdmin && isLoadingCompanies) || isLoadingUsers;

  // Ajusta o schema dinamicamente: se for Super Admin, empresa_id é obrigatório na criação
  const formSchema = isSuperAdmin && !isEditing
    ? baseFormSchema.extend({
        empresa_id: z.string().uuid({
          message: t("select_valid_company"),
        }).min(1, { message: t("company_required_super_admin") }),
      })
    : baseFormSchema;

  const form = useForm<TeamFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: defaultValues?.nome || "",
      meta_mensal_valor: defaultValues?.meta_mensal_valor ? String(defaultValues.meta_mensal_valor) : "0",
      meta_mensal_quantidade: defaultValues?.meta_mensal_quantidade ? String(defaultValues.meta_mensal_quantidade) : "0",
      empresa_id: defaultValues?.empresa_id || "",
      member_ids: defaultValues?.member_ids || [],
    },
  });

  const handleSubmit = (values: TeamFormValues) => {
    const meta_mensal_valor = parseFloat(values.meta_mensal_valor);
    const meta_mensal_quantidade = parseInt(values.meta_mensal_quantidade);
    
    const empresa_id = isSuperAdmin && values.empresa_id ? values.empresa_id : undefined;

    onSubmit({
      nome: values.nome,
      meta_mensal_valor: meta_mensal_valor,
      meta_mensal_quantidade: meta_mensal_quantidade,
      member_ids: values.member_ids || [],
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
  
  const allUsers = users || [];
  const selectedMemberIds = form.watch("member_ids") || [];
  
  // Filtra usuários que pertencem à empresa selecionada (se Super Admin) ou à empresa do Admin
  const availableUsers = allUsers.filter(user => {
    if (isSuperAdmin && form.watch('empresa_id')) {
      return user.empresa_id === form.watch('empresa_id');
    }
    // Se não for Super Admin, só mostra usuários da própria empresa (RLS já garante isso, mas filtramos por segurança)
    return user.empresa_id === profile?.empresa_id;
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        
        {/* Campo Empresa (Apenas Super Admin na Criação) */}
        {isSuperAdmin && !isEditing && (
          <FormField
            control={form.control}
            name="empresa_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('user_table_header_company')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingCompanies || isSubmitting}>
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

        {/* Nome da Equipe */}
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('team_name')}</FormLabel>
              <FormControl>
                <Input placeholder={t('team_name_placeholder')} {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Metas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="meta_mensal_valor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('team_meta_value')} (R$)</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="10000.00" 
                    {...field} 
                    disabled={isSubmitting}
                    type="number"
                    step="0.01"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="meta_mensal_quantidade"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('team_meta_quantity')}</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="100" 
                    {...field} 
                    disabled={isSubmitting}
                    type="number"
                    step="1"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Seleção de Membros */}
        <FormField
          control={form.control}
          name="member_ids"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{t('team_members')}</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between",
                        selectedMemberIds.length === 0 && "text-muted-foreground"
                      )}
                      disabled={isLoadingUsers || isSubmitting}
                    >
                      {selectedMemberIds.length > 0
                        ? t('members_selected', { count: selectedMemberIds.length })
                        : t('select_members')}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder={t('search_user')} />
                    <CommandEmpty>{t('no_users_found')}</CommandEmpty>
                    <CommandGroup>
                      {availableUsers.map((user) => {
                        const isSelected = selectedMemberIds.includes(user.id);
                        return (
                          <CommandItem
                            value={user.nome_completo}
                            key={user.id}
                            onSelect={() => {
                              const currentIds = field.value || [];
                              const newIds = isSelected
                                ? currentIds.filter((id) => id !== user.id)
                                : [...currentIds, user.id];
                              form.setValue("member_ids", newIds, { shouldValidate: true });
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                isSelected ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {user.nome_completo} ({user.perfis?.nome})
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
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
            t('create_team')
          )}
        </Button>
      </form>
    </Form>
  );
};

export default TeamForm;