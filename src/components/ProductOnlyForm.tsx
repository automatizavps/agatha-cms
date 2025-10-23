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
import { Product } from "@/integrations/supabase/products";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MultiImageUpload from "./MultiImageUpload";
import { useState } from "react";
import { useCurrentUserProfile } from "@/integrations/supabase/user-profile";
import { useCompanies } from "@/integrations/supabase/companies";

// Definimos o esquema para PRODUTO
const formSchema = z.object({
  nome: z.string().min(2, {
    message: "O nome deve ter pelo menos 2 caracteres.",
  }),
  preco: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "O preço deve ser um número positivo.",
  }),
  estoque_total: z.string().refine(val => val === "" || (val && !isNaN(parseInt(val)) && parseInt(val) >= 0), {
    message: "O estoque deve ser um número inteiro positivo.",
  }).optional().nullable(),
  
  marca: z.string().optional().nullable(),
  categoria: z.string().optional().nullable(),
  
  empresa_id: z.string().uuid({
    message: "Selecione uma empresa válida.",
  }).or(z.literal("")).optional(), 
});

type ProductFormValues = z.infer<typeof formSchema>;

interface ProductOnlyFormProps {
  onSubmit: (values: { 
    nome: string; 
    preco: number; 
    tipo: 'produto'; 
    tempo_servico: null; 
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

const ProductOnlyForm: React.FC<ProductOnlyFormProps> = ({ onSubmit, isSubmitting, defaultValues, isEditing = false }) => {
  const { data: currentProfile, isLoading: isLoadingCurrentProfile } = useCurrentUserProfile();
  const { data: companies, isLoading: isLoadingCompanies } = useCompanies();
  
  const isSuperAdmin = currentProfile?.perfil_id === 1;
  const isCheckingPermissions = isLoadingCurrentProfile || (isSuperAdmin && isLoadingCompanies);
  
  const [photos, setPhotos] = useState<string[] | null>(defaultValues?.fotos || null);

  // Ajusta o schema dinamicamente: empresa_id é obrigatório na CRIAÇÃO para Super Admin
  const finalFormSchema = isSuperAdmin && !isEditing
    ? formSchema.extend({
        empresa_id: z.string().uuid({
          message: "Selecione uma empresa válida.",
        }).min(1, { message: "A empresa é obrigatória para o Super Admin." }),
      })
    : formSchema;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(finalFormSchema),
    defaultValues: {
      nome: defaultValues?.nome || "",
      preco: defaultValues?.preco ? String(defaultValues.preco) : "",
      estoque_total: defaultValues?.estoque_total ? String(defaultValues.estoque_total) : "",
      marca: defaultValues?.marca || "",
      categoria: defaultValues?.categoria || "",
      empresa_id: defaultValues?.empresa_id || "", 
    },
  });
  
  // Determina se o campo empresa deve ser exibido
  const shouldShowCompanyField = isSuperAdmin || (isEditing && defaultValues?.empresa_id);
  
  // Determina se o campo empresa deve ser editável
  const isCompanyFieldEditable = isSuperAdmin && !isSubmitting;
  
  // Encontra o nome da empresa para exibição desabilitada (se não for Super Admin)
  const companyName = companies?.find(c => c.id === defaultValues?.empresa_id)?.nome;


  const handleSubmit = (values: ProductFormValues) => {
    const preco = parseFloat(values.preco);
    
    const estoque_total = values.estoque_total ? parseInt(values.estoque_total) : null;
    
    // Se for Super Admin, passamos o ID da empresa.
    const empresa_id = isSuperAdmin && values.empresa_id ? values.empresa_id : undefined;
    
    // Normaliza campos vazios para null
    const marca = values.marca ? values.marca : null;
    const categoria = values.categoria ? values.categoria : null;

    onSubmit({
      nome: values.nome,
      preco: preco,
      tipo: 'produto',
      tempo_servico: null, // Sempre null para produtos
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
        
        {/* Campo Empresa */}
        {shouldShowCompanyField && (
          <FormField
            control={form.control}
            name="empresa_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Empresa</FormLabel>
                {isCompanyFieldEditable ? (
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
                ) : (
                  <FormControl>
                    <Input 
                      value={companyName || "Empresa não encontrada"} 
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
        
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Produto</FormLabel>
              <FormControl>
                <Input placeholder="Nome do produto" {...field} disabled={isSubmitting} />
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
        
        {/* Categoria */}
        <FormField
          control={form.control}
          name="categoria"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ex: Shampoo, Maquiagem" 
                  {...field} 
                  disabled={isSubmitting}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Marca */}
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
        
        {/* Estoque Total */}
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
            "Cadastrar Produto"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default ProductOnlyForm;