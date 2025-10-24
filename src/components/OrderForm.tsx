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
import { Loader2, PlusCircle, Trash2, DollarSign, Building } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClients } from "@/integrations/supabase/clients";
import { useProductsOnly, useServicesOnly, Product } from "@/integrations/supabase/products";
import { OrderStatus } from "@/integrations/supabase/orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import React, { useMemo, useEffect } from "react";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { useCompanies } from "@/integrations/supabase/companies";
import { useTranslation } from "react-i18next";

const statusOptions: OrderStatus[] = ['pendente_entrega', 'entregue', 'cancelado'];

// Esquema de item temporário para uso interno do formulário
const itemSchema = z.object({
  produto_id: z.string().uuid({ message: "Selecione um item válido." }),
  quantidade: z.coerce.number().int().min(1, { message: "Mínimo 1." }),
  preco_unitario: z.coerce.number().min(0.01, { message: "Preço deve ser positivo." }),
});

// Definimos o esquema base
const baseFormSchema = z.object({
  cliente_id: z.string().uuid({
    message: "Selecione um cliente válido.",
  }),
  items: z.array(itemSchema).min(1, { message: "O pedido deve ter pelo menos um item." }),
  status: z.enum(statusOptions, {
    required_error: "O status é obrigatório.",
  }).optional(),
  empresa_id: z.string().uuid({
    message: "Selecione uma empresa válida.",
  }).or(z.literal("")).optional(),
});

type OrderFormValues = z.infer<typeof baseFormSchema>;

interface ItemToCreate {
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
}

interface OrderFormProps {
  onSubmit: (values: { cliente_id: string; valor_total: number; items: ItemToCreate[]; status?: OrderStatus; empresa_id?: string }) => void;
  isSubmitting: boolean;
  defaultValues?: Partial<OrderFormValues>; 
  isEditing?: boolean;
}

const OrderForm: React.FC<OrderFormProps> = ({ onSubmit, isSubmitting, defaultValues, isEditing = false }) => {
  const { data: profile, isLoading: isLoadingProfile } = useCurrentUserProfile();
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  const { data: clients, isLoading: isLoadingClients } = useClients();
  const { data: products, isLoading: isLoadingProducts } = useProductsOnly();
  const { data: services, isLoading: isLoadingServices } = useServicesOnly();
  const { t } = useTranslation();
  
  const isSuperAdmin = profile?.is_super_admin; // Usando a flag correta
  const isCheckingPermissions = isLoadingProfile || (isSuperAdmin && isLoadingCompanies);

  // --- 1. Determinar o Schema Final (antes de usar useForm) ---
  const initialSchema = useMemo(() => {
    let schema = baseFormSchema;
    
    if (isSuperAdmin && !isEditing) {
      schema = schema.extend({
        empresa_id: z.string().uuid({
          message: t("select_valid_company"),
        }).min(1, { message: t("company_required_super_admin") }),
      });
    }
    return schema;
  }, [isSuperAdmin, isEditing, t]);

  // --- 2. Inicializar o Formulário ---
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(initialSchema),
    defaultValues: {
      cliente_id: defaultValues?.cliente_id || "",
      items: defaultValues?.items || [],
      status: defaultValues?.status || 'pendente_entrega',
      empresa_id: defaultValues?.empresa_id || "",
    },
  });
  
  // --- 3. Variáveis dependentes de form.watch/profile ---
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  // Observa o ID da empresa selecionada (ou usa o ID do perfil se não for SA)
  const companyIdFromDefault = defaultValues?.empresa_id;
  const companyIdFromWatch = isSuperAdmin ? form.watch('empresa_id') : profile?.empresa_id;
  const selectedCompanyId = isEditing ? companyIdFromDefault : companyIdFromWatch;
    
  const isCompanySelected = !!selectedCompanyId;
  
  // Filtra Clientes e Itens com base na empresa selecionada
  const filteredClients = useMemo(() => {
    if (!clients || !isCompanySelected) return [];
    return clients.filter(client => client.empresa_id === selectedCompanyId);
  }, [clients, selectedCompanyId, isCompanySelected]);

  const allItems = useMemo(() => {
    if (!isCompanySelected) return [];
    // Filtramos os itens que pertencem à empresa selecionada
    const all = [...(services || []), ...(products || [])];
    return all
      .filter(item => item.empresa_id === selectedCompanyId)
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [services, products, selectedCompanyId, isCompanySelected]);
  
  const isLoadingItems = isLoadingServices || isLoadingProducts;

  // Função auxiliar para obter o produto pelo ID
  const getProductById = (id: string): Product | undefined => {
    return allItems.find(i => i.id === id);
  };

  // --- 4. Validação de Estoque (Refine no nível do Resolver) ---
  
  // Recria o resolver com a validação de estoque, que agora depende de allItems
  const stockValidationSchema = useMemo(() => {
    return initialSchema.extend({
      items: z.array(itemSchema).min(1, { message: "O pedido deve ter pelo menos um item." })
        .refine((items) => {
          if (!isCompanySelected || isLoadingItems) return true; 
          
          for (const item of items) {
            const product = getProductById(item.produto_id);
            
            if (product && product.tipo === 'produto' && product.estoque_total !== null && product.estoque_total !== undefined) {
              if (item.quantidade > product.estoque_total) {
                return false; 
              }
            }
          }
          return true;
        }, {
          message: "Erro de estoque em um ou mais produtos.",
          path: ['items'],
        }),
    });
  }, [initialSchema, isCompanySelected, isLoadingItems, getProductById]);
  
  // Atualiza o resolver do formulário dinamicamente
  useEffect(() => {
    form.setResolver(zodResolver(stockValidationSchema));
  }, [stockValidationSchema, form]);
  
  // Sincroniza os itens padrão se eles mudarem (útil para o EditSheet carregar os dados)
  useEffect(() => {
    if (isEditing && defaultValues?.items && defaultValues.items.length > 0 && fields.length === 0) {
      form.reset({
        ...form.getValues(),
        items: defaultValues.items,
      });
    }
  }, [defaultValues?.items, fields.length, form, isEditing]);


  const calculateTotal = form.watch("items").reduce((sum, item) => {
    return sum + (item.quantidade * item.preco_unitario);
  }, 0);
  
  const handleAddItem = () => {
    append({ produto_id: "", quantidade: 1, preco_unitario: 0 });
  };
  
  const handleProductChange = (index: number, productId: string) => {
    const selectedItem = allItems.find(item => item.id === productId);
    if (selectedItem) {
      // Atualiza o preço unitário automaticamente ao selecionar o produto/serviço
      form.setValue(`items.${index}.preco_unitario`, selectedItem.preco);
      form.setValue(`items.${index}.produto_id`, productId);
      // Dispara a validação da quantidade e do array
      form.trigger(`items.${index}.quantidade`);
      form.trigger(`items`);
    }
  };
  
  // Função auxiliar para obter o nome do item
  const getItemName = (productId: string) => {
    const item = allItems.find(i => i.id === productId);
    return item ? `${item.nome} (${item.tipo === 'produto' ? t('nav_products') : t('nav_services')})` : t('unknown_item');
  };
  
  // Função de validação de estoque (usada apenas para exibir a mensagem no campo)
  const validateStock = (item: ItemToCreate) => {
    const product = getProductById(item.produto_id);
    
    if (!product) {
      return t('select_item');
    }
    
    // Se for serviço ou se o estoque for nulo/indefinido, não há limite de estoque
    if (product.tipo === 'servico' || product.estoque_total === null || product.estoque_total === undefined) {
      return true;
    }
    
    // Se for produto, verifica o estoque
    if (item.quantidade > product.estoque_total) {
      return t('stock_exceeded', { 
        name: product.nome, 
        stock: product.estoque_total 
      });
    }
    
    return true;
  };


  const handleSubmit = (values: OrderFormValues) => {
    const empresa_id = isSuperAdmin && values.empresa_id ? values.empresa_id : undefined;
    
    onSubmit({
      cliente_id: values.cliente_id,
      valor_total: calculateTotal,
      items: values.items.map(item => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
      })),
      status: values.status,
      empresa_id: empresa_id,
    });
  };
  
  // Determina se o campo empresa deve ser editável (apenas Super Admin na CRIAÇÃO)
  const isCompanyFieldEditable = isSuperAdmin && !isSubmitting && !isEditing;
  
  // Encontra o nome da empresa para exibição desabilitada
  const companyIdToDisplay = isEditing ? defaultValues?.empresa_id : form.watch('empresa_id');
  const companyName = companies?.find(c => c.id === companyIdToDisplay)?.nome;
  
  // Determina se o campo empresa deve ser exibido (Super Admin ou se estiver editando)
  const shouldShowCompanyField = isSuperAdmin || isEditing;
  
  // Determina se o aviso deve ser exibido (Apenas Super Admin E empresa não selecionada)
  const shouldShowWarning = isSuperAdmin && !isCompanySelected && !isEditing;

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
        
        {/* Campo Empresa (Apenas Super Admin ou Edição) */}
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
                      // Limpa campos dependentes ao mudar a empresa
                      form.setValue('cliente_id', '');
                      form.setValue('items', []);
                    }} 
                    value={field.value} 
                    disabled={isLoadingCompanies || isSubmitting || isEditing}
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
                      // Exibe o nome da empresa ou 'N/A' se não for encontrado
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

        {/* Cliente */}
        <FormField
          control={form.control}
          name="cliente_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('order_table_header_client')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingClients || isSubmitting || isEditing || !isCompanySelected}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingClients ? t("loading_clients") : t("select_client")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {filteredClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.nome} ({client.email || client.telefone || 'N/A'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Status (Sempre visível na Edição) */}
        {isEditing && (
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('order_table_header_status')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("select_status")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status} className="capitalize">
                        {status.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Itens do Pedido */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">{t('order_list_title')}</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={handleAddItem} disabled={isSubmitting || isEditing || !isCompanySelected}>
              <PlusCircle className="mr-2 h-4 w-4" /> {t('add_item')}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="border p-3 rounded-md space-y-3 relative">
                <h4 className="text-sm font-medium text-muted-foreground">{t('item')} #{index + 1}</h4>
                
                {/* Produto/Serviço */}
                <FormField
                  control={form.control}
                  name={`items.${index}.produto_id`}
                  render={({ field: itemField }) => (
                    <FormItem>
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
                        <Select 
                          onValueChange={(val) => handleProductChange(index, val)} 
                          value={itemField.value} 
                          disabled={isLoadingItems || isSubmitting || isEditing || !isCompanySelected}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={allItems.length === 0 ? t("loading_items") : t("select_item")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {allItems.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.nome} ({item.tipo === 'produto' ? t('nav_products') : t('nav_services')})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Quantidade */}
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
                            onChange={(e) => {
                              field.onChange(e.target.value);
                              // Dispara a validação ao mudar a quantidade
                              form.trigger(`items.${index}.quantidade`);
                              form.trigger(`items`);
                            }}
                            disabled={isSubmitting || isEditing}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                    // A validação de estoque é mantida aqui para exibir a mensagem específica do campo
                    rules={{ validate: (value) => validateStock({ ...form.getValues().items[index], quantidade: Number(value) }) }}
                  />
                  
                  {/* Preço Unitário */}
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
            
            <Separator />
            
            <div className="flex justify-between items-center pt-2">
              <span className="text-lg font-semibold">{t('order_table_header_total')}:</span>
              <span className="text-2xl font-bold text-primary flex items-center gap-1">
                <DollarSign className="h-5 w-5" />
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculateTotal)}
              </span>
            </div>
            
            {/* Mensagem de erro do array (para validação de estoque global) */}
            <FormMessage>{form.formState.errors.items?.message}</FormMessage>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={isSubmitting || (isSuperAdmin && !isCompanySelected && !isEditing)}>
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

export default OrderForm;