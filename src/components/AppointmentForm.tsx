import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Loader2, CalendarIcon, Check, ChevronsUpDown, PlusCircle, Trash2, Building, DollarSign, Tag } from "lucide-react";
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
import { Appointment } from "@/integrations/supabase/appointments";
import { useClients } from "@/integrations/supabase/clients";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import React, { useMemo, useEffect, useState } from "react";
import { useServicesOnly, useProductsOnly, Product } from "@/integrations/supabase/products";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { useCompanies } from "@/integrations/supabase/companies";
import { useTranslation } from "react-i18next";
import PromotionSelector from "./PromotionSelector";
import { Promotion, usePromotionRules } from "@/integrations/supabase/promotions";
import { useUsers } from "@/integrations/supabase/users";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client"; // Importando supabase para buscar promoção

const statusOptions: Appointment['status'][] = ['pendente', 'confirmado', 'cancelado', 'concluido'];

const itemSchema = z.object({
  produto_id: z.string().uuid({ message: "Selecione um item válido." }).min(1, { message: "Selecione um item válido." }),
  quantidade: z.coerce.number().int().min(1, { message: "Mínimo 1." }),
  preco_unitario: z.coerce.number().min(0, { message: "Preço deve ser positivo." }),
});

const baseFormSchema = z.object({
  cliente_id: z.string().uuid({
    message: "Selecione um cliente válido.",
  }).min(1, { message: "O cliente é obrigatório." }),
  responsavel_id: z.string().uuid({
    message: "Selecione um responsável válido.",
  }).min(1, { message: "O responsável é obrigatório." }),
  date: z.date({
    required_error: "A data do agendamento é obrigatória.",
  }),
  time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "Formato de hora inválido (HH:mm).",
  }),
  status: z.enum(statusOptions, {
    required_error: "O status é obrigatório.",
  }).optional(),
  // Items é opcional no base, mas será forçado na criação
  items: z.array(itemSchema).optional(),
  
  empresa_id: z.string().uuid({
    message: "Selecione uma empresa válida.",
  }).or(z.literal("")).optional(),
  promocao_id: z.string().uuid().nullable().optional(),
});

type AppointmentFormValues = z.infer<typeof baseFormSchema>;

interface ItemToCreate {
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
}

interface AppointmentFormProps {
  onSubmit: (values: { cliente_id: string; responsavel_id: string; data_hora: Date; items: ItemToCreate[]; status?: Appointment['status']; empresa_id?: string; promocao_id?: string | null }) => void;
  isSubmitting: boolean;
  defaultValues?: Partial<AppointmentFormValues & { items: ItemToCreate[] }>;
  isEditing?: boolean;
  canEditStatus?: boolean; // NOVA PROP
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({ onSubmit, isSubmitting, defaultValues, isEditing = false, canEditStatus = false }) => {
  const { data: profile, isLoading: isLoadingProfile } = useCurrentUserProfile();
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  const { data: users, isLoading: isLoadingUsers } = useUsers();
  const { data: clients, isLoading: isLoadingClients } = useClients();
  const { data: services, isLoading: isLoadingServices } = useServicesOnly();
  const { data: products, isLoading: isLoadingProducts } = useProductsOnly();
  const { t } = useTranslation();
  
  const isSuperAdmin = profile?.is_super_admin;
  const isCheckingPermissions = isLoadingProfile || (isSuperAdmin && isLoadingCompanies);

  // Ajusta o schema dinamicamente: 
  let finalFormSchema = baseFormSchema;
  
  if (!isEditing) {
    // Na criação, items é obrigatório
    finalFormSchema = finalFormSchema.extend({
      items: z.array(itemSchema).min(1, { message: "O agendamento deve ter pelo menos um serviço/produto." }),
    });
    
    // Na criação, Super Admin deve selecionar a empresa
    if (isSuperAdmin) {
      finalFormSchema = finalFormSchema.extend({
        empresa_id: z.string().uuid({
          message: t("select_valid_company"),
        }).min(1, { message: t("company_required_super_admin") }),
      });
    }
  }


  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(finalFormSchema),
    defaultValues: {
      cliente_id: defaultValues?.cliente_id || "",
      responsavel_id: defaultValues?.responsavel_id || "",
      date: defaultValues?.date,
      time: defaultValues?.time || "09:00",
      status: defaultValues?.status || 'pendente',
      items: defaultValues?.items || [],
      empresa_id: defaultValues?.empresa_id || "",
      promocao_id: defaultValues?.promocao_id || null,
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  const selectedCompanyId = isEditing 
    ? defaultValues?.empresa_id 
    : (isSuperAdmin ? form.watch('empresa_id') : profile?.empresa_id);
    
  const isCompanySelected = !!selectedCompanyId;
  
  const filteredClients = useMemo(() => {
    if (!clients || !isCompanySelected) return [];
    return clients.filter(client => client.empresa_id === selectedCompanyId);
  }, [clients, selectedCompanyId, isCompanySelected]);
  
  const filteredUsers = useMemo(() => {
    if (!users || !isCompanySelected) return [];
    return users.filter(user => user.empresa_id === selectedCompanyId);
  }, [users, selectedCompanyId, isCompanySelected]);

  const allItems = useMemo(() => {
    if (!isCompanySelected) return [];
    const all = [...(services || []), ...(products || [])];
    return all
      .filter(item => item.empresa_id === selectedCompanyId)
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [services, products, selectedCompanyId, isCompanySelected]);
  
  const isLoadingItems = isLoadingServices || isLoadingProducts;

  // NOVO: Efeito para revalidar o formulário quando a empresa muda ou os itens carregam
  useEffect(() => {
    // Dispara a revalidação de todos os campos para aplicar as novas regras de estoque
    if (isCompanySelected && !isLoadingItems) {
      form.trigger();
    }
  }, [selectedCompanyId, isLoadingItems, form]);


  useEffect(() => {
    // Sincroniza defaultValues na edição, se necessário
    if (isEditing && defaultValues) {
      if (defaultValues.items && defaultValues.items.length > 0 && defaultValues.empresa_id) {
        form.reset({
          cliente_id: defaultValues.cliente_id || "",
          responsavel_id: defaultValues.responsavel_id || "",
          date: defaultValues.date,
          time: defaultValues.time || "HH:mm",
          status: defaultValues.status || 'pendente',
          items: defaultValues.items,
          empresa_id: defaultValues.empresa_id,
          promocao_id: defaultValues.promocao_id || null,
        });
      }
    }
  }, [defaultValues, isEditing, form]);

  const [activePromotion, setActivePromotion] = useState<Promotion | null>(null);
  const { data: promotionRules, isLoading: isLoadingPromotionRules } = usePromotionRules(activePromotion?.id || '');

  // Sincroniza a promoção inicial na edição
  useEffect(() => {
    if (isEditing && defaultValues?.promocao_id && !activePromotion) {
      // Busca a promoção pelo ID para preencher o activePromotion
      const fetchInitialPromotion = async () => {
        const { data: promoData } = await supabase
          .from('promocoes')
          .select('id, nome, desconto_percentual, data_inicio, data_fim, is_active')
          .eq('id', defaultValues.promocao_id)
          .single();
        if (promoData) {
          setActivePromotion(promoData as Promotion);
        }
      };
      fetchInitialPromotion();
    } else if (!isEditing) {
      setActivePromotion(null); // Limpa a promoção ao criar um novo
    }
  }, [isEditing, defaultValues?.promocao_id]);

  // Validação da promoção
  const isPromotionValid = useMemo(() => {
    if (!activePromotion || !promotionRules || promotionRules.length === 0) return true;
    if (isLoadingPromotionRules) return true;

    const currentItems = form.getValues("items");
    if (currentItems.length === 0) return false;

    return currentItems.some(appointmentItem => {
      const productDetails = allItems.find(p => p.id === appointmentItem.produto_id);
      if (!productDetails) return false;

      return promotionRules.some(rule => {
        if (rule.tipo_regra === 'produto' && rule.entidade_id === productDetails.id) return true;
        if (rule.tipo_regra === 'servico' && rule.entidade_id === productDetails.id) return true;
        
        // Verifica se o ID da categoria do produto/serviço corresponde ao ID da entidade da regra
        if (rule.tipo_regra === 'categoria' && productDetails.categoria && rule.entidade_id === productDetails.categoria) return true;
        
        return false;
      });
    });
  }, [activePromotion, promotionRules, form.watch("items"), allItems, isLoadingPromotionRules]);

  const calculateTotal = useMemo(() => {
    let total = form.getValues("items").reduce((sum, item) => {
      return sum + (item.quantidade * item.preco_unitario);
    }, 0);

    if (isPromotionValid && activePromotion && activePromotion.desconto_percentual > 0) {
      total = total * (1 - activePromotion.desconto_percentual / 100);
    }
    return total;
  }, [form.watch("items"), activePromotion, isPromotionValid]);
  
  const handleAddItem = () => {
    append({ produto_id: "", quantidade: 1, preco_unitario: 0 });
  };
  
  const handleProductChange = (index: number, productId: string) => {
    const selectedItem = allItems.find(item => item.id === productId);
    if (selectedItem) {
      form.setValue(`items.${index}.preco_unitario`, selectedItem.preco);
      form.setValue(`items.${index}.produto_id`, productId);
      
      // Para agendamentos, a quantidade é 1 por padrão e não há validação de estoque
      form.setValue(`items.${index}.quantidade`, 1);
    }
  };
  
  const getItemName = (productId: string) => {
    const item = allItems.find(i => i.id === productId);
    return item ? `${item.nome} (${item.tipo === 'produto' ? t('nav_products') : t('nav_services')})` : t('unknown_item');
  };

  const handleSubmit = (values: AppointmentFormValues) => {
    const [hours, minutes] = values.time.split(':').map(Number);
    
    const data_hora = new Date(values.date);
    data_hora.setHours(hours, minutes, 0, 0);
    
    const empresa_id = isSuperAdmin && values.empresa_id ? values.empresa_id : undefined;
    
    // Garante que promocao_id seja NULL se for string vazia
    const final_promocao_id = values.promocao_id === "" ? null : values.promocao_id;

    // Se estiver editando, não enviamos o array de items, apenas os dados principais
    const itemsPayload = isEditing ? [] : values.items!.map(item => ({
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
    }));

    onSubmit({
      cliente_id: values.cliente_id,
      responsavel_id: values.responsavel_id,
      data_hora: data_hora,
      items: itemsPayload, // Vazio na edição, preenchido na criação
      status: values.status,
      empresa_id: empresa_id,
      promocao_id: isPromotionValid ? final_promocao_id : null,
    });
  };
  
  const isCompanyFieldEditable = isSuperAdmin && !isSubmitting && !isEditing;
  
  const companyIdToDisplay = isEditing ? defaultValues?.empresa_id : form.watch('empresa_id');
  const companyName = companies?.find(c => c.id === companyIdToDisplay)?.nome;
  
  const shouldShowCompanyField = isSuperAdmin || isEditing;
  
  const shouldShowWarning = isSuperAdmin && !isCompanySelected && !isEditing;
  
  // NOVO: Verifica se o formulário está inválido (apenas na criação)
  const isFormInvalid = !isEditing && (!form.formState.isValid || !form.watch('cliente_id') || !form.watch('responsavel_id') || form.watch('items')?.length === 0);

  
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
                      form.setValue('cliente_id', '');
                      form.setValue('responsavel_id', '');
                      form.setValue('items', []);
                      form.setValue('promocao_id', null);
                      setActivePromotion(null);
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
        
        {shouldShowWarning && (
          <div className="p-3 bg-yellow-100/50 dark:bg-yellow-900/20 border border-yellow-400/50 rounded-md text-sm text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
            <Building className="h-4 w-4" />
            {t('select_company_to_load_data')}
          </div>
        )}
        
        <FormField
          control={form.control}
          name="cliente_id"
          render={({ field }) => {
            const selectedClient = filteredClients.find(c => c.id === field.value);
            return (
            <FormItem className="flex flex-col">
              <FormLabel>{t('order_table_header_client')}</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                      disabled={isSubmitting || !isCompanySelected}
                    >
                      {field.value
                        ? selectedClient?.nome
                        : isLoadingClients ? t("loading_clients") : t("select_client")}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder={t('search_client')} />
                    <CommandEmpty>{t('no_clients_found')}</CommandEmpty>
                    <CommandGroup>
                      {filteredClients.map((client) => (
                        <CommandItem
                          value={client.nome}
                          key={client.id}
                          onSelect={() => {
                            form.setValue("cliente_id", client.id);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              client.id === field.value
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {client.nome}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}}
        />
        
        <FormField
          control={form.control}
          name="responsavel_id"
          render={({ field }) => {
            const selectedUser = filteredUsers.find(u => u.id === field.value);
            return (
            <FormItem>
              <FormLabel>{t('responsible')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingUsers || isSubmitting || !isCompanySelected}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingUsers ? t("loading_users") : t("select_responsible")}>
                      {selectedUser ? `${selectedUser.nome_completo} (${selectedUser.perfis?.nome})` : t("select_responsible")}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {filteredUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.nome_completo} ({user.perfis?.nome})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{t('order_table_header_date')}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
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
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('time')} (HH:mm)</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ex: 14:30" 
                    {...field} 
                    disabled={isSubmitting} 
                    type="time"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Campo de Status (Apenas na Edição) */}
        {isEditing && (
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('order_table_header_status')}</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value} 
                  disabled={isSubmitting || !canEditStatus} // USANDO canEditStatus
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("select_status")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status} className="capitalize">
                        {t(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!canEditStatus && (
                  <FormDescription className="text-destructive">
                    {t('access_denied_write', { defaultValue: 'Você não tem permissão para alterar o status.' })}
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">{t('nav_products_services')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="border p-3 rounded-md space-y-3 relative">
                <h4 className="text-sm font-medium text-muted-foreground">{t('item')} #{index + 1}</h4>
                
                <FormField
                  control={form.control}
                  name={`items.${index}.produto_id`}
                  render={({ field: itemField }) => {
                    const selectedItem = allItems.find(item => item.id === itemField.value);
                    return (
                      <FormItem className="flex flex-col">
                        <FormLabel>{t('service_product')}</FormLabel>
                        {isEditing ? (
                          <FormControl>
                            <Input 
                              value={getItemName(itemField.value)} 
                              disabled 
                              className="bg-muted/50"
                            />
                          </FormControl>
                        ) : (
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className={cn(
                                    "w-full justify-between",
                                    !itemField.value && "text-muted-foreground"
                                  )}
                                  disabled={isLoadingItems || isSubmitting || !isCompanySelected}
                                >
                                  {itemField.value
                                    ? getItemName(itemField.value)
                                    : allItems.length === 0 ? t("loading_items") : t("select_item")}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                              <Command>
                                <CommandInput placeholder={t('search_item', { defaultValue: 'Buscar item...' })} />
                                <CommandEmpty>{t('no_data_found')}</CommandEmpty>
                                <CommandGroup>
                                  {allItems.map((item) => (
                                    <CommandItem
                                      value={`${item.nome} (${item.tipo})`}
                                      key={item.id}
                                      onSelect={() => {
                                        handleProductChange(index, item.id);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          item.id === itemField.value
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      {item.nome} ({item.tipo === 'produto' ? t('nav_products') : t('nav_services')})
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        )}
                      <FormMessage />
                    </FormItem>
                  )}}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantidade`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('quantity')}</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            placeholder="1" 
                            {...field} 
                            onChange={(e) => field.onChange(e.target.value)}
                            disabled={isSubmitting || isEditing}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name={`items.${index}.preco_unitario`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('unit_price')} (R$)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
                            {...field} 
                            onChange={(e) => field.onChange(e.target.value)}
                            disabled={isSubmitting || isEditing}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {!isEditing && (
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
                )}
              </div>
            ))}
            
            {fields.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">
                {t('add_services_or_products')}
              </p>
            )}
            
            <FormMessage>{form.formState.errors.items?.message}</FormMessage>
          </CardContent>
          
          {/* NOVO: Botão Adicionar Item fora do CardHeader */}
          {!isEditing && (
            <div className="p-4 pt-0">
              <Button type="button" variant="outline" className="w-full" onClick={handleAddItem} disabled={isSubmitting || !isCompanySelected}>
                <PlusCircle className="mr-2 h-4 w-4" /> {t('add_item')}
              </Button>
            </div>
          )}
        </Card>

        <FormField
          control={form.control}
          name="promocao_id"
          render={({ field }) => (
            <FormItem>
              <PromotionSelector
                companyId={selectedCompanyId}
                selectedPromotionId={field.value || null}
                onPromotionChange={(promo) => {
                  field.onChange(promo?.id || null);
                  setActivePromotion(promo);
                }}
                disabled={isSubmitting || !isCompanySelected}
                label={t('promotion', { defaultValue: 'Promoção' })}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        
        {!isPromotionValid && activePromotion && (
          <Alert variant="destructive">
            <Tag className="h-4 w-4" />
            <AlertTitle>{t('promotion_not_applicable_title', { defaultValue: 'Promoção Não Aplicável' })}</AlertTitle>
            <AlertDescription>
              {t('promotion_not_applicable_description', { promoName: activePromotion.nome })}
            </AlertDescription>
          </Alert>
        )}
        
        <Separator />
        
        <div className="flex justify-between items-center pt-2">
          <span className="text-lg font-semibold">{t('order_table_header_total')}:</span>
          <span className="text-2xl font-bold text-primary flex items-center gap-1">
            {/* REMOVIDO O ÍCONE DollarSign */}
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculateTotal)}
            {isPromotionValid && activePromotion && activePromotion.desconto_percentual > 0 && (
              <span className="text-base text-green-500 ml-2">
                (-{activePromotion.desconto_percentual}%)
              </span>
            )}
          </span>
        </div>
        
        <Button 
          type="submit" 
          className="w-full" 
          disabled={isSubmitting || (isSuperAdmin && !isCompanySelected && !isEditing) || isFormInvalid}
        >
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : isEditing ? (
            t('update_order_button')
          ) : (
            t('create_order')
          )}
        </Button>
        
        {isEditing && (
          <p className="text-sm text-muted-foreground text-center">
            {t('item_editing_not_allowed')}
          </p>
        )}
      </form>
    </Form>
  );
};

export default AppointmentForm;