"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form as ShadcnForm,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, CalendarIcon, PlusCircle, Trash2, Building, Tag, Package, Clock, Check, ChevronsUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import React, { useMemo, useEffect } from "react";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { useCompanies } from "@/integrations/supabase/companies";
import { useTranslation } from "react-i18next";
import { Promotion, PromotionRule } from "@/integrations/supabase/promotions";
import { useCategories } from "@/integrations/supabase/categories";
import { useProductsOnly, useServicesOnly, Product } from "@/integrations/supabase/products";
import { Switch } from "@/components/ui/switch";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
type RuleType = 'categoria' | 'produto' | 'servico';

const ruleSchema = z.object({
  tipo_regra: z.enum(['categoria', 'produto', 'servico']),
  entidade_id: z.string().uuid({ message: "Selecione uma entidade válida." }),
  entidade_nome: z.string().optional(), // Apenas para exibição no formulário
});

// Definimos o esquema base
const baseFormSchema = z.object({
  nome: z.string().min(2, {
    message: "O nome deve ter pelo menos 2 caracteres.",
  }),
  data_inicio: z.date({
    required_error: "A data de início é obrigatória.",
  }),
  data_fim: z.date({
    required_error: "A data final é obrigatória.",
  }),
  desconto_percentual: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0 && parseFloat(val) <= 100, {
    message: "O desconto deve ser entre 0.01 e 100.",
  }),
  is_active: z.boolean(),
  rules: z.array(ruleSchema).min(1, { message: "A promoção deve ter pelo menos uma regra." }),
  
  // Campo Empresa (opcional no base)
  empresa_id: z.string().uuid({
    message: "Selecione uma empresa válida.",
  }).or(z.literal("")).optional(), 
});

type PromotionFormValues = z.infer<typeof baseFormSchema>;

interface ItemToCreate {
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
}

interface PromotionFormProps {
  onSubmit: (values: { 
    nome: string; 
    data_inicio: Date; 
    data_fim: Date; 
    desconto_percentual: number; 
    is_active: boolean;
    rules: Omit<PromotionRule, 'id' | 'promocao_id' | 'created_at' | 'entidade'>[];
    empresa_id?: string;
  }) => void;
  isSubmitting: boolean;
  defaultPromotion?: Promotion & { regras: PromotionRule[] };
  isEditing?: boolean;
}

const NONE_VALUE = "__NONE__";

const PromotionForm: React.FC<PromotionFormProps> = ({ onSubmit, isSubmitting, defaultPromotion, isEditing = false }) => {
  const { data: profile, isLoading: isLoadingCurrentProfile } = useCurrentUserProfile();
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  const { t } = useTranslation();
  
  const isSuperAdmin = profile?.is_super_admin;
  const isCheckingPermissions = isLoadingCurrentProfile || (isSuperAdmin && isLoadingCompanies);

  // Ajusta o schema dinamicamente: empresa_id é obrigatório na CRIAÇÃO para Super Admin
  const formSchema = isSuperAdmin && !isEditing
    ? baseFormSchema.extend({
        empresa_id: z.string().uuid({
          message: t("select_valid_company"),
        }).min(1, { message: t("company_required_super_admin") }),
      })
    : baseFormSchema;

  const form = useForm<PromotionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: defaultPromotion?.nome || "",
      data_inicio: defaultPromotion?.data_inicio ? new Date(defaultPromotion.data_inicio) : new Date(),
      data_fim: defaultPromotion?.data_fim ? new Date(defaultPromotion.data_fim) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
      desconto_percentual: defaultPromotion?.desconto_percentual ? String(defaultPromotion.desconto_percentual) : "10",
      is_active: defaultPromotion?.is_active ?? true,
      rules: defaultPromotion?.regras?.map(r => ({
        tipo_regra: r.tipo_regra,
        entidade_id: r.entidade_id,
        entidade_nome: r.entidade?.nome || r.entidade_id,
      })) || [],
      empresa_id: defaultPromotion?.empresa_id || "",
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "rules",
  });
  
  // Observa o ID da empresa selecionada (ou usa o ID do perfil se não for SA)
  const selectedCompanyId = isEditing 
    ? defaultPromotion?.empresa_id 
    : (isSuperAdmin ? form.watch('empresa_id') : profile?.empresa_id);
    
  const isCompanySelected = !!selectedCompanyId;
  
  // Carrega dados dependentes da empresa
  const { data: categories, isLoading: isLoadingCategories } = useCategories(selectedCompanyId || undefined);
  const { data: products, isLoading: isLoadingProducts } = useProductsOnly();
  const { data: services, isLoading: isLoadingServices } = useServicesOnly();
  
  const isLoadingRulesData = isLoadingCategories || isLoadingProducts || isLoadingServices;

  // Combina todos os itens (produtos e serviços) para o seletor de entidade
  const allItems = useMemo(() => {
    if (!isCompanySelected) return [];
    const all = [...(services || []), ...(products || [])];
    return all
      .filter(item => item.empresa_id === selectedCompanyId)
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [services, products, selectedCompanyId, isCompanySelected]);
  
  // Encontra o nome da empresa para exibição desabilitada
  const companyName = companies?.find(c => c.id === defaultPromotion?.empresa_id)?.nome;
  
  // Determina se o campo empresa deve ser editável (apenas Super Admin na CRIAÇÃO)
  const isCompanyFieldEditable = isSuperAdmin && !isSubmitting && !isEditing;
  
  // Determina se o campo empresa deve ser exibido (Super Admin ou se estiver editando)
  const shouldShowCompanyField = isSuperAdmin || isEditing;
  
  // Determina se o aviso deve ser exibido (Apenas Super Admin E empresa não selecionada)
  const shouldShowWarning = isSuperAdmin && !isCompanySelected && !isEditing;


  const handleAddRule = () => {
    append({ tipo_regra: 'produto', entidade_id: "", entidade_nome: "" });
  };
  
  const handleRuleTypeChange = (index: number, type: RuleType) => {
    form.setValue(`rules.${index}.tipo_regra`, type);
    form.setValue(`rules.${index}.entidade_id`, "");
    form.setValue(`rules.${index}.entidade_nome`, "");
  };
  
  const handleEntityChange = (index: number, entityId: string, entityName: string) => {
    form.setValue(`rules.${index}.entidade_id`, entityId);
    form.setValue(`rules.${index}.entidade_nome`, entityName);
  };


  const handleSubmit = (values: PromotionFormValues) => {
    const desconto_percentual = parseFloat(values.desconto_percentual);
    
    const empresa_id = isSuperAdmin && values.empresa_id ? values.empresa_id : undefined;

    onSubmit({
      nome: values.nome,
      data_inicio: values.data_inicio,
      data_fim: values.data_fim,
      desconto_percentual: desconto_percentual,
      is_active: values.is_active,
      rules: values.rules.map(r => ({
        tipo_regra: r.tipo_regra,
        entidade_id: r.entidade_id,
      })),
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
    <ShadcnForm {...form}>
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
                      // Limpa regras ao mudar a empresa
                      form.setValue('rules', []);
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

        {/* Nome e Desconto */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>{t('promotion_name', { defaultValue: 'Nome da Promoção' })}</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Black Friday de Serviços" {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="desconto_percentual"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('discount_percentage', { defaultValue: 'Desconto (%)' })}</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="10" 
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
        </div>
        
        {/* Datas de Vigência */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="data_inicio"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{t('start_date', { defaultValue: 'Data de Início' })}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal h-8",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={isSubmitting}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>{t('select_date')}</span>}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="data_fim"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{t('end_date', { defaultValue: 'Data Final' })}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal h-8",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={isSubmitting}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>{t('select_date')}</span>}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </FormField>
              )}
          />
        </div>
        
        {/* Status Ativo/Inativo */}
        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>{t('promotion_status', { defaultValue: 'Status da Promoção' })}</FormLabel>
                <p className="text-sm text-muted-foreground">
                  {field.value ? t('status_active', { defaultValue: 'Ativa (Visível para clientes)' }) : t('status_inactive', { defaultValue: 'Inativa (Suspensa temporariamente)' })}
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isSubmitting}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Regras da Promoção */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">{t('promotion_rules', { defaultValue: 'Regras de Aplicação' })}</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={handleAddRule} disabled={isSubmitting || !isCompanySelected}>
              <PlusCircle className="mr-2 h-4 w-4" /> {t('add_rule', { defaultValue: 'Adicionar Regra' })}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="border p-3 rounded-md space-y-3 relative">
                <h4 className="text-sm font-medium text-muted-foreground">{t('rule')} #{index + 1}</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Tipo de Regra */}
                  <FormField
                    control={form.control}
                    name={`rules.${index}.tipo_regra`}
                    render={({ field: ruleField }) => (
                      <FormItem>
                        <FormLabel>{t('rule_type', { defaultValue: 'Tipo' })}</FormLabel>
                        <Select 
                          onValueChange={(val) => handleRuleTypeChange(index, val as RuleType)} 
                          value={ruleField.value} 
                          disabled={isSubmitting || !isCompanySelected}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('select_rule_type', { defaultValue: 'Selecione o tipo' })} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="categoria">{t('categories')}</SelectItem>
                            <SelectItem value="produto">{t('nav_products')}</SelectItem>
                            <SelectItem value="servico">{t('nav_services')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Entidade (Categoria/Produto/Serviço) */}
                  <FormField
                    control={form.control}
                    name={`rules.${index}.entidade_id`}
                    render={({ field: entityField }) => {
                      const ruleType = form.watch(`rules.${index}.tipo_regra`);
                      let options: { id: string; name: string; }[] = [];
                      let placeholder = t('select_entity', { defaultValue: 'Selecione a entidade' });
                      let icon = <Tag className="h-4 w-4" />;
                      
                      if (ruleType === 'categoria') {
                        options = categories?.map(c => ({ id: c.id, name: c.nome })) || [];
                        placeholder = t('select_category_placeholder', { defaultValue: 'Selecione a categoria' });
                        icon = <Tag className="h-4 w-4" />;
                      } else if (ruleType === 'produto' || ruleType === 'servico') {
                        const filteredItems = allItems.filter(item => item.tipo === ruleType);
                        options = filteredItems.map(item => ({ id: item.id, name: item.nome }));
                        placeholder = ruleType === 'produto' ? t('select_product', { defaultValue: 'Selecione o produto' }) : t('select_service', { defaultValue: 'Selecione o serviço' });
                        icon = ruleType === 'produto' ? <Package className="h-4 w-4" /> : <Clock className="h-4 w-4" />;
                      }
                      
                      const selectedOption = options.find(o => o.id === entityField.value);
                      
                      return (
                        <FormItem className="md:col-span-2">
                          <FormLabel>{t('entity', { defaultValue: 'Entidade' })}</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className={cn(
                                    "w-full justify-between",
                                    !entityField.value && "text-muted-foreground"
                                  )}
                                  disabled={isLoadingRulesData || isSubmitting || !isCompanySelected}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    {icon}
                                    {entityField.value
                                      ? selectedOption?.name || form.watch(`rules.${index}.entidade_nome`) || t('unknown_entity', { defaultValue: 'Entidade Desconhecida' })
                                      : placeholder}
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
                                  {options.map((option) => (
                                    <CommandItem
                                      value={option.name}
                                      key={option.id}
                                      onSelect={() => {
                                        handleEntityChange(index, option.id, option.name);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          option.id === entityField.value
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      {option.name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </FormItem>
                        );
                      }}
                    />
                  </div>
                  
                  <Button 
                    type="button" 
                    variant="destructive" 
                    size="icon" 
                    className="absolute top-3 right-3 h-6 w-6"
                    onClick={() => remove(index)}
                    disabled={isSubmitting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              {fields.length === 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  {t('add_rule_description', { defaultValue: 'Adicione regras para definir onde a promoção será aplicada.' })}
                </p>
              )}
              
              <FormMessage>{form.formState.errors.rules?.message}</FormMessage>
            </CardContent>
          </Card>

        <Button type="submit" className="w-full" disabled={isSubmitting || (isSuperAdmin && !isCompanySelected)}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : isEditing ? (
            t('save_changes')
          ) : (
            t('create_promotion', { defaultValue: 'Criar Promoção' })
          )}
        </Button>
      </form>
    </ShadcnForm>
  );
};

export default PromotionForm;