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
import { Loader2, Building, Tag, Package, Clock, DollarSign, Percent, Check, ChevronsUpDown, Users, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { useCompanies } from "@/integrations/supabase/companies";
import { CommissionRule, CommissionType, EntityType, useRuleEntities } from "@/integrations/supabase/commissions";
import { useCategories } from "@/integrations/supabase/categories";
import { useProductsOnly, useServicesOnly } from "@/integrations/supabase/products";
import { useMemo, useEffect } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useUsers } from "@/integrations/supabase/users"; // Importando usuários
import { Badge } from "@/components/ui/badge";

const entityTypeOptions: { value: EntityType, label: string, icon: React.ReactNode }[] = [
  { value: 'produto', label: 'Produto Específico', icon: <Package className="h-4 w-4" /> },
  { value: 'servico', label: 'Serviço Específico', icon: <Clock className="h-4 w-4" /> },
  { value: 'categoria', label: 'Categoria', icon: <Tag className="h-4 w-4" /> },
];

const commissionTypeOptions: { value: CommissionType, label: string, icon: React.ReactNode }[] = [
  { value: 'fixo', label: 'Valor Fixo (R$)', icon: <DollarSign className="h-4 w-4" /> },
  { value: 'percentual', label: 'Percentual (%)', icon: <Percent className="h-4 w-4" /> },
];

// Definimos o esquema base
const baseFormSchema = z.object({
  empresa_id: z.string().uuid({
    message: "Selecione uma empresa válida.",
  }).or(z.literal("")).optional(),
  
  tipo_entidade: z.enum(['produto', 'servico', 'categoria']),
  // ALTERADO: Agora é um array de IDs
  entidade_ids: z.array(z.string().uuid()).min(1, { message: "Selecione pelo menos uma entidade." }),
  
  tipo_valor: z.enum(['fixo', 'percentual']),
  valor: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "O valor deve ser um número positivo.",
  }),
  
  usuario_ids: z.array(z.string().uuid()).optional(),
});

type CommissionRuleFormValues = z.infer<typeof baseFormSchema>;

interface CommissionRuleFormProps {
  onSubmit: (values: { 
    tipo_entidade: EntityType; 
    entidade_ids: string[]; // NOVO
    tipo_valor: CommissionType; 
    valor: number; 
    empresa_id?: string;
    usuario_ids: string[];
  }) => void;
  isSubmitting: boolean;
  defaultRule?: CommissionRule & { usuario_ids?: string[] };
  isEditing?: boolean;
}

const CommissionRuleForm: React.FC<CommissionRuleFormProps> = ({ onSubmit, isSubmitting, defaultRule, isEditing = false }) => {
  const { data: profile, isLoading: isLoadingProfile } = useCurrentUserProfile();
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  const { data: allUsers, isLoading: isLoadingAllUsers } = useUsers();
  const { t } = useTranslation();
  
  // Carrega as entidades associadas para preencher o defaultValues na edição
  const { data: defaultEntities, isLoading: isLoadingDefaultEntities } = useRuleEntities(defaultRule?.id || '');
  
  const isSuperAdmin = profile?.is_super_admin;
  const isCheckingPermissions = isLoadingProfile || (isSuperAdmin && isLoadingCompanies) || isLoadingAllUsers || isLoadingDefaultEntities;

  // Ajusta o schema dinamicamente: empresa_id é obrigatório na CRIAÇÃO para Super Admin
  const formSchema = isSuperAdmin && !isEditing
    ? baseFormSchema.extend({
        empresa_id: z.string().uuid({
          message: t("select_valid_company"),
        }).min(1, { message: t("company_required_super_admin") }),
      })
    : baseFormSchema;

  const form = useForm<CommissionRuleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      empresa_id: defaultRule?.empresa_id || "",
      tipo_entidade: defaultRule?.tipo_entidade || 'produto',
      // Inicializa com os IDs carregados
      entidade_ids: defaultEntities?.map(e => e.id) || [], 
      tipo_valor: defaultRule?.tipo_valor || 'percentual',
      valor: defaultRule?.valor ? String(defaultRule.valor) : "0",
      usuario_ids: defaultRule?.usuario_ids || [],
    },
  });
  
  // Sincroniza entidades carregadas na edição
  useEffect(() => {
    if (isEditing && defaultEntities && defaultEntities.length > 0) {
      form.setValue('entidade_ids', defaultEntities.map(e => e.id), { shouldValidate: true });
    }
  }, [isEditing, defaultEntities, form]);
  
  // Observa o ID da empresa e o tipo de entidade
  const selectedCompanyId = isEditing 
    ? defaultRule?.empresa_id 
    : (isSuperAdmin ? form.watch('empresa_id') : profile?.empresa_id);
    
  const isCompanySelected = !!selectedCompanyId;
  const currentEntityType = form.watch('tipo_entidade');
  const selectedEntityIds = form.watch('entidade_ids') || [];
  
  // Carrega dados dependentes da empresa
  const { data: categories, isLoading: isLoadingCategories } = useCategories(selectedCompanyId || undefined);
  const { data: products, isLoading: isLoadingProducts } = useProductsOnly();
  const { data: services, isLoading: isLoadingServices } = useServicesOnly();
  
  const isLoadingEntities = isLoadingCategories || isLoadingProducts || isLoadingServices;
  
  // Filtra usuários que pertencem à empresa selecionada
  const availableUsers = useMemo(() => {
    if (!allUsers || !isCompanySelected) return [];
    return allUsers.filter(user => user.empresa_id === selectedCompanyId);
  }, [allUsers, selectedCompanyId, isCompanySelected]);
  
  // Combina todos os itens (produtos e serviços)
  const allItems = useMemo(() => {
    if (!isCompanySelected) return [];
    const all = [...(services || []), ...(products || [])];
    return all
      .filter(item => item.empresa_id === selectedCompanyId)
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [services, products, selectedCompanyId, isCompanySelected]);
  
  // Define as opções de entidade com base no tipo selecionado
  const entityOptions = useMemo(() => {
    if (!isCompanySelected || isLoadingEntities) return [];
    
    if (currentEntityType === 'categoria') {
      return categories?.map(c => ({ id: c.id, name: c.nome })) || [];
    }
    
    if (currentEntityType === 'produto') {
      return allItems.filter(item => item.tipo === 'produto').map(item => ({ id: item.id, name: item.nome }));
    }
    
    if (currentEntityType === 'servico') {
      return allItems.filter(item => item.tipo === 'servico').map(item => ({ id: item.id, name: item.nome }));
    }
    
    return [];
  }, [currentEntityType, isCompanySelected, isLoadingEntities, categories, allItems]);
  
  // Mapeia os IDs selecionados para nomes para exibição
  const selectedEntityNames = useMemo(() => {
    const selected = entityOptions.filter(e => selectedEntityIds.includes(e.id));
    return selected.map(e => e.name);
  }, [selectedEntityIds, entityOptions]);
  
  // Encontra o nome da empresa para exibição desabilitada
  const companyName = companies?.find(c => c.id === defaultRule?.empresa_id)?.nome;
  
  // Determina se o campo empresa deve ser editável (apenas Super Admin na CRIAÇÃO)
  const isCompanyFieldEditable = isSuperAdmin && !isSubmitting && !isEditing;
  
  // Determina se o campo empresa deve ser exibido (Super Admin ou se estiver editando)
  const shouldShowCompanyField = isSuperAdmin || isEditing;
  
  const handleEntityToggle = (entityId: string) => {
    const currentIds = form.getValues('entidade_ids') || [];
    const newIds = currentIds.includes(entityId)
      ? currentIds.filter(id => id !== entityId)
      : [...currentIds, entityId];
      
    form.setValue('entidade_ids', newIds, { shouldValidate: true });
  };


  const handleSubmit = (values: CommissionRuleFormValues) => {
    const valor = parseFloat(values.valor);
    
    const empresa_id = isSuperAdmin && values.empresa_id ? values.empresa_id : undefined;

    onSubmit({
      tipo_entidade: values.tipo_entidade,
      entidade_ids: values.entidade_ids || [],
      tipo_valor: values.tipo_valor,
      valor: valor,
      empresa_id: empresa_id,
      usuario_ids: values.usuario_ids || [],
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
                      // Limpa entidade e usuários ao mudar a empresa
                      form.setValue('entidade_ids', []);
                      form.setValue('usuario_ids', []);
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
        
        {/* Tipo de Entidade */}
        <FormField
          control={form.control}
          name="tipo_entidade"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('commission_entity_type', { defaultValue: 'Aplicar a' })}</FormLabel>
              <Select 
                onValueChange={(value) => {
                  field.onChange(value as EntityType);
                  // Resetar entidades ao mudar o tipo
                  form.setValue('entidade_ids', []);
                }} 
                value={field.value} 
                disabled={isSubmitting || !isCompanySelected}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("select_rule_type", { defaultValue: 'Selecione o tipo' })} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {entityTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        {option.icon} {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Entidade Específica (Multi-Select) */}
        <FormField
          control={form.control}
          name="entidade_ids"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{t('commission_entity', { defaultValue: 'Entidade' })}</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between",
                        selectedEntityIds.length === 0 && "text-muted-foreground"
                      )}
                      disabled={isLoadingEntities || isSubmitting || !isCompanySelected || entityOptions.length === 0}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {selectedEntityIds.length > 0
                          ? t('members_selected', { count: selectedEntityIds.length, defaultValue: '{{count}} entidade(s) selecionada(s)' })
                          : t('select_entity', { defaultValue: 'Selecione a(s) entidade(s)' })}
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder={t('search_entity', { defaultValue: 'Buscar entidade...' })} />
                    <CommandEmpty>{t('no_data_found')}</CommandEmpty>
                    <CommandGroup>
                      {entityOptions.map((option) => {
                        const isSelected = selectedEntityIds.includes(option.id);
                        return (
                          <CommandItem
                            value={option.name}
                            key={option.id}
                            onSelect={() => handleEntityToggle(option.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                isSelected ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {option.name}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              
              {/* Exibição das entidades selecionadas */}
              {selectedEntityNames.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedEntityNames.map(name => (
                    <Badge key={name} variant="secondary" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
              )}
              
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Usuários Aplicáveis (Mantido) */}
        <FormField
          control={form.control}
          name="usuario_ids"
          render={({ field }) => {
            const selectedUserIds = field.value || [];
            const selectedUsers = availableUsers.filter(u => selectedUserIds.includes(u.id));
            
            return (
              <FormItem className="flex flex-col">
                <FormLabel>{t('team_members', { defaultValue: 'Usuários Aplicáveis (Opcional)' })}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between",
                          selectedUserIds.length === 0 && "text-muted-foreground"
                        )}
                        disabled={isLoadingAllUsers || isSubmitting || !isCompanySelected}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Users className="h-4 w-4" />
                          {selectedUserIds.length > 0
                            ? t('members_selected', { count: selectedUserIds.length, defaultValue: '{{count}} usuário(s) selecionado(s)' })
                            : t('general_rule', { defaultValue: 'Regra Geral (Todos os Usuários)' })}
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder={t('search_user')} />
                      <CommandEmpty>{t('no_users_found')}</CommandEmpty>
                      <CommandGroup>
                        {/* Opção para Regra Geral */}
                        <CommandItem
                          value={t('general_rule', { defaultValue: 'Regra Geral' })}
                          key="all"
                          onSelect={() => {
                            form.setValue("usuario_ids", [], { shouldValidate: true });
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedUserIds.length === 0 ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {t('general_rule', { defaultValue: 'Regra Geral (Aplicável a todos)' })}
                        </CommandItem>
                        
                        {/* Usuários Específicos */}
                        {availableUsers.map((user) => {
                          const isSelected = selectedUserIds.includes(user.id);
                          return (
                            <CommandItem
                              value={user.nome_completo}
                              key={user.id}
                              onSelect={() => {
                                const currentIds = field.value || [];
                                const newIds = isSelected
                                  ? currentIds.filter((id) => id !== user.id)
                                  : [...currentIds, user.id];
                                form.setValue("usuario_ids", newIds, { shouldValidate: true });
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
                
                {/* Exibição dos usuários selecionados */}
                {selectedUsers.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedUsers.map(user => (
                      <Badge key={user.id} variant="secondary" className="text-xs">
                        {user.nome_completo.split(' ')[0]}
                      </Badge>
                    ))}
                  </div>
                )}
                
                <FormMessage />
              </FormItem>
            );
          }}
        />
        
        {/* Tipo e Valor do Comissionamento */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="tipo_valor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('commission_value_type', { defaultValue: 'Tipo de Valor' })}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("select_value_type", { defaultValue: 'Selecione' })} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {commissionTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          {option.icon} {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="valor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('commission_value', { defaultValue: 'Valor' })} ({form.watch('tipo_valor') === 'fixo' ? 'R$' : '%'})</FormLabel>
                <FormControl>
                  <Input 
                    placeholder={form.watch('tipo_valor') === 'fixo' ? "10.00" : "5"} 
                    {...field} 
                    disabled={isSubmitting}
                    type="number"
                    step={form.watch('tipo_valor') === 'fixo' ? "0.01" : "1"}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <Button 
          type="submit" 
          className="w-full" 
          disabled={isSubmitting || !isCompanySelected || isLoadingEntities}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : isEditing ? (
            t('save_changes')
          ) : (
            t('create_commission_rule', { defaultValue: 'Criar Regra' })
          )}
        </Button>
      </form>
    </Form>
  );
};

export default CommissionRuleForm;