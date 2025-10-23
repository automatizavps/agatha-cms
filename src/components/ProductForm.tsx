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
import { Product, ProductType } from "@/integrations/supabase/products";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MultiImageUpload from "./MultiImageUpload";
import { useState } from "react";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { useCompanies } from "@/integrations/supabase/companies";

// Definimos o esquema base
const baseFormSchema = z.object({
  nome: z.string().min(2, {
    message: "O nome deve ter pelo menos 2 caracteres.",
  }),
  preco: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "O preço deve ser um número positivo.",
  }),
  tipo: z.enum(['produto', 'servico'], {
    required_error: "O tipo é obrigatório.",
  }),
  estoque_total: z.string().optional().nullable(), // Apenas para produto
  tempo_servico: z.string().optional().nullable(), // Apenas para serviço (em minutos)
  
  // Novos campos
  marca: z.string().optional().nullable(),
  categoria: z.string().optional().nullable(),
  
  // empresa_id é opcional por padrão, mas pode ser tornado obrigatório na criação para Super Admin
  empresa_id: z.string().uuid({
    message: "Selecione uma empresa válida.",
  }).or(z.literal("")).optional(), 
});

type ProductFormValues = z.infer<typeof baseFormSchema>;

interface ProductFormProps {
  onSubmit: (values: { 
    nome: string; 
    preco: number; 
    tipo: ProductType; 
    tempo_servico: number | null; 
    estoque_total: number | null;
    fotos: string[] | null;
    marca: string | null;
    categoria: string | null;
    empresa_id?: string;
  }) => void;
  isSubmitting: boolean;
  defaultValues?: Partial<ProductFormValues & { fotos: string[] | null }>;
  isEditing?: boolean;
}

const ProductForm: React.FC<ProductFormProps> = ({ onSubmit, isSubmitting, defaultValues, isEditing = false }) => {
  const { data: currentProfile, isLoading: isLoadingCurrentProfile } = useCurrentUserProfile();
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  
  const isSuperAdmin = currentProfile?.perfil_id === 1;
  const isCheckingPermissions = isLoadingCurrentProfile || (isSuperAdmin && isLoadingCompanies);
  
  const [photos, setPhotos] = useState<string[] | null>(defaultValues?.fotos || null);

  // Ajusta o schema dinamicamente: empresa_id é obrigatório na CRIAÇÃO para Super Admin
  const formSchema = isSuperAdmin && !isEditing
    ? baseFormSchema.extend({
        empresa_id: z.string().uuid({
          message: "Selecione uma empresa válida.",
        }).min(1, { message: "A empresa é obrigatória para o Super Admin." }),
      })
    : baseFormSchema;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: defaultValues?.nome || "",
      preco: defaultValues?.preco ? String(defaultValues.preco) : "",
      tipo: defaultValues?.tipo || 'produto',
      estoque_total: defaultValues?.estoque_total ? String(defaultValues.estoque_total) : "",
      tempo_servico: defaultValues?.tempo_servico ? String(defaultValues.tempo_servico) : "",
      marca: defaultValues?.marca || "",
      categoria: defaultValues?.categoria || "",
      // Garante que o valor inicial seja o ID da empresa do produto/default
      empresa_id: defaultValues?.empresa_id || "", 
    },
  });
  
  const selectedType = form.watch("tipo");

  const handleSubmit = (values: ProductFormValues) => {
    const preco = parseFloat(values.preco);
    
    let tempo_servico: number | null = null;
    let estoque_total: number | null = null;
    
    if (values.tipo === 'servico') {
      tempo_servico = values.tempo_servico ? parseInt(values.tempo_servico) : null;
    } else {
      estoque_total = values.estoque_total ? parseInt(values.estoque_total) : null;
    }
    
    // Se for Super Admin, passamos o ID da empresa (seja na criação ou edição).
    // Se não for Super Admin, passamos undefined, e a função createProduct/updateProduct usará o RPC/RLS.
    const empresa_id = isSuperAdmin && values.empresa_id ? values.empresa_id : undefined;
    
    // Normaliza campos vazios para null
    const marca = values.marca ? values.marca : null;
    const categoria = values.categoria ? values.categoria : null;

    onSubmit({
      nome: values.nome,
      preco: preco,
      tipo: values.tipo as ProductType,
      tempo_servico: tempo_servico,
      estoque_total: estoque_total,
      fotos: photos,
      marca: marca,
      categoria: categoria,
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
        
        {/* O campo Empresa só é visível para Super Admin (criação e edição) */}
        {isSuperAdmin && (
          <FormField
            control={form.control}
            name="empresa_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Empresa</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingCompanies || isSubmitting}>
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
          name="tipo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="produto">Produto</SelectItem>
                  <SelectItem value="servico">Serviço</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Nome do item" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="preco"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preço (R$)</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ex: 50.00" 
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
        
        {/* Categoria (Visível para ambos) */}
        <FormField
          control={form.control}
          name="categoria"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria</FormLabel>
              <FormControl>
                <Input 
                  placeholder={selectedType === 'servico' ? "Ex: Corte de Cabelo" : "Ex: Shampoo"} 
                  {...field} 
                  disabled={isSubmitting}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {selectedType === 'produto' && (
          <>
            {/* Marca (Apenas para Produto) */}
            <FormField
              control={form.control}
              name="marca"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: L'Oréal" 
                      {...field} 
                      disabled={isSubmitting}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Estoque Total (Apenas para Produto) */}
            <FormField
              control={form.control}
              name="estoque_total"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estoque Total</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Quantidade em estoque" 
                      {...field} 
                      disabled={isSubmitting}
                      type="number"
                      step="1"
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
        
        {selectedType === 'servico' && (
          <FormField
            control={form.control}
            name="tempo_servico"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tempo de Serviço (minutos)</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ex: 60" 
                    {...field} 
                    disabled={isSubmitting}
                    type="number"
                    step="1"
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <MultiImageUpload 
          currentUrls={photos}
          onUrlsChange={setPhotos}
          disabled={isSubmitting}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : isEditing ? (
            "Salvar Alterações"
          ) : (
            "Cadastrar Item"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default ProductForm;