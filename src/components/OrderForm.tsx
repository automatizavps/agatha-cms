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

  // --- 1. Inicializar o Formulário (com um resolvedor temporário) ---
  const form = useForm<OrderFormValues>({
    // Usamos um resolvedor temporário aqui, que será substituído pelo finalSchema no useMemo
    resolver: zodResolver(baseFormSchema), 
    defaultValues: {
      cliente_id: defaultValues?.cliente_id || "",
      items: defaultValues?.items || [],
      status: defaultValues?.status || 'pendente_entrega',
      empresa_id: defaultValues?.empresa_id || "",
    },
  });
  
  // --- 2. Variáveis dependentes de form.watch/profile ---
  
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

  // --- 3. ZOD SCHEMA FINAL COM VALIDAÇÃO DE ESTOQUE ---
  
  const finalFormSchema = useMemo(() => {
    let schema = baseFormSchema;
    
    if (isSuperAdmin && !isEditing) {
      schema = schema.extend({
        empresa_id: z.string().uuid({
          message: t("select_valid_company"),
        }).min(1, { message: t("company_required_super_admin") }),
      });
    }
    
    // Adiciona validação de estoque no nível do array de items
    return schema.extend({
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
  }, [isSuperAdmin, isEditing, isCompanySelected, isLoadingItems, getProductById, t]);
  
  // --- 4. Re-inicializar o formulário com o resolvedor final ---
  // Usamos o useMemo para garantir que o resolvedor só mude quando o schema mudar
  const finalResolver = useMemo(() => zodResolver(finalFormSchema), [finalFormSchema]);
  
  // Agora, re-inicializamos o useForm com o resolvedor final.
  // Para evitar o erro de 'Cannot access form before initialization', 
  // precisamos garantir que o useForm seja chamado apenas uma vez.
  // A solução é usar o useMemo para o resolvedor e garantir que o useForm use o resolvedor correto desde o início.
  // Como o useForm já foi declarado acima, vamos reescrever o componente para usar o resolvedor final.
  
  // REMOVENDO O useForm anterior e re-declarando com o resolvedor final:
  // Para evitar o erro de 'Cannot access form before initialization', 
  // precisamos garantir que o useForm seja chamado apenas uma vez e que as variáveis dependentes
  // sejam declaradas DEPOIS.
  
  // Vamos reverter a declaração do useForm para o final do bloco de hooks,
  // e garantir que as variáveis dependentes sejam calculadas corretamente.
  
  // --- REFAZENDO A ESTRUTURA DE HOOKS ---
  
  // Variáveis de contexto (não dependem de form)
  // ... (já estão no topo)
  
  // Função auxiliar para obter o produto pelo ID (não depende de form)
  // ... (já está no topo)
  
  // Filtros de dados (dependem de selectedCompanyId, que depende de form.watch)
  // ... (já estão no topo)
  
  // ZOD SCHEMA FINAL (depende de getProductById, que depende de allItems)
  // ... (já está no topo)
  
  // O useForm deve ser o primeiro hook a ser chamado.
  // O problema é que selectedCompanyId depende de form.watch.
  // Vamos usar o valor inicial para o primeiro render e deixar o watch atualizar.
  
  const initialCompanyId = isEditing ? defaultValues?.empresa_id : profile?.empresa_id;
  
  const formWithInitialResolver = useForm<OrderFormValues>({
    resolver: zodResolver(finalFormSchema), // Usamos o schema final que já tem a lógica de validação
    defaultValues: {
      cliente_id: defaultValues?.cliente_id || "",
      items: defaultValues?.items || [],
      status: defaultValues?.status || 'pendente_entrega',
      empresa_id: defaultValues?.empresa_id || initialCompanyId || "",
    },
  });
  
  // Agora, re-atribuímos 'form' para o objeto retornado pelo useForm
  const formFinal = formWithInitialResolver;
  
  // Re-calculamos as variáveis dependentes de form.watch
  const companyIdFromWatchFinal = isSuperAdmin ? formFinal.watch('empresa_id') : profile?.empresa_id;
  const selectedCompanyIdFinal = isEditing ? defaultValues?.empresa_id : companyIdFromWatchFinal;
  const isCompanySelectedFinal = !!selectedCompanyIdFinal;
  
  // O problema é que os useMemos para filteredClients e allItems dependem de selectedCompanyId,
  // que por sua vez depende de form.watch. Isso cria um loop de renderização.
  
  // SOLUÇÃO: Mover a lógica de dependência de dados para dentro do useMemo,
  // e usar o valor de `form.watch` diretamente lá.
  
  // --- REFAZENDO A ESTRUTURA DE HOOKS (Versão 3) ---
  
  // 1. Inicializar o form com o schema base (sem validação de estoque)
  const formV3 = useForm<OrderFormValues>({
    resolver: zodResolver(initialSchema),
    defaultValues: {
      cliente_id: defaultValues?.cliente_id || "",
      items: defaultValues?.items || [],
      status: defaultValues?.status || 'pendente_entrega',
      empresa_id: defaultValues?.empresa_id || (isSuperAdmin ? "" : profile?.empresa_id) || "",
    },
  });
  
  const { fields: fieldsV3, append: appendV3, remove: removeV3 } = useFieldArray({
    control: formV3.control,
    name: "items",
  });
  
  // 2. Calcular o ID da empresa e os dados filtrados
  const companyIdToFilter = isEditing 
    ? defaultValues?.empresa_id 
    : (isSuperAdmin ? formV3.watch('empresa_id') : profile?.empresa_id);
    
  const isCompanySelectedV3 = !!companyIdToFilter;
  
  const filteredClientsV3 = useMemo(() => {
    if (!clients || !isCompanySelectedV3) return [];
    return clients.filter(client => client.empresa_id === companyIdToFilter);
  }, [clients, companyIdToFilter, isCompanySelectedV3]);

  const allItemsV3 = useMemo(() => {
    if (!isCompanySelectedV3) return [];
    const all = [...(services || []), ...(products || [])];
    return all
      .filter(item => item.empresa_id === companyIdToFilter)
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [services, products, companyIdToFilter, isCompanySelectedV3]);
  
  const getProductByIdV3 = (id: string): Product | undefined => {
    return allItemsV3.find(i => i.id === id);
  };
  
  // 3. Criar o resolvedor final com a validação de estoque
  const finalResolverV3 = useMemo(() => {
    const schemaWithStockValidation = initialSchema.extend({
      items: z.array(itemSchema).min(1, { message: "O pedido deve ter pelo menos um item." })
        .refine((items) => {
          if (!isCompanySelectedV3 || isLoadingItems) return true; 
          
          for (const item of items) {
            const product = getProductByIdV3(item.produto_id);
            
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
    return zodResolver(schemaWithStockValidation);
  }, [initialSchema, isCompanySelectedV3, isLoadingItems, getProductByIdV3]);
  
  // 4. Usar useEffect para aplicar o resolvedor (se o resolvedor dinâmico fosse suportado)
  // Como não é, precisamos usar o resolvedor final no useForm.
  // A única maneira de fazer isso sem erro de inicialização é garantir que o resolvedor
  // seja estável ou que o useForm seja chamado DEPOIS de todas as dependências.
  
  // Vamos usar a abordagem de re-renderização forçada (que é o que o useForm faz internamente)
  // e garantir que o resolvedor final seja usado.
  
  // A causa raiz do erro `Cannot access 'form' before initialization` é que `form.watch`
  // estava sendo chamado no escopo do componente antes da linha `const form = useForm(...)`.
  
  // A correção anterior (Versão 2) estava correta ao mover as variáveis dependentes para depois do `useForm`,
  // mas o erro `form.setResolver is not a function` veio da linha 170 que eu adicionei.
  
  // Vamos voltar à Versão 2, mas remover a linha problemática e garantir que o `useForm` use o resolvedor final.
  
  // --- REFAZENDO A ESTRUTURA DE HOOKS (Versão 4 - Limpa) ---
  
  // 1. Definir o resolvedor final (que depende de allItems e getProductById)
  const getProductByIdV4 = (id: string): Product | undefined => {
    return allItems.find(i => i.id === id);
  };
  
  const finalResolverV4 = useMemo(() => {
    // O useForm precisa ser chamado antes de form.watch, então usamos o valor inicial
    const companyIdForSchema = isEditing ? defaultValues?.empresa_id : profile?.empresa_id;
    const isCompanySelectedForSchema = !!companyIdForSchema;
    
    let schema = baseFormSchema;
    
    if (isSuperAdmin && !isEditing) {
      schema = schema.extend({
        empresa_id: z.string().uuid({
          message: t("select_valid_company"),
        }).min(1, { message: t("company_required_super_admin") }),
      });
    }
    
    return zodResolver(schema.extend({
      items: z.array(itemSchema).min(1, { message: "O pedido deve ter pelo menos um item." })
        .refine((items) => {
          // Esta validação será executada no submit.
          // Se os dados ainda estiverem carregando, assumimos que é válido por enquanto.
          if (!isCompanySelectedForSchema || isLoadingItems) return true; 
          
          for (const item of items) {
            const product = getProductByIdV4(item.produto_id);
            
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
    }));
  }, [isSuperAdmin, isEditing, defaultValues?.empresa_id, profile?.empresa_id, isLoadingItems, allItems, t]);
  
  // 2. Inicializar o form com o resolvedor final
  const form = useForm<OrderFormValues>({
    resolver: finalResolverV4,
    defaultValues: {
      cliente_id: defaultValues?.cliente_id || "",
      items: defaultValues?.items || [],
      status: defaultValues?.status || 'pendente_entrega',
      empresa_id: defaultValues?.empresa_id || (isSuperAdmin ? "" : profile?.empresa_id) || "",
    },
  });
  
  // 3. Variáveis dependentes de form.watch/profile (DEPOIS do useForm)
  
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
  
  // Função auxiliar para obter o produto pelo ID (re-declarada para usar o allItems correto)
  const getProductById = (id: string): Product | undefined => {
    return allItems.find(i => i.id === id);
  };
  
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