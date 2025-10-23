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

// Definimos o esquema para SERVIÇO
const formSchema = z.object({
  nome: z.string().min(2, {
    message: "O nome deve ter pelo menos 2 caracteres.",
  }),
  preco: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "O preço deve ser um número positivo.",
  }),
  tempo_servico: z.string().refine(val => val === "" || (val && !isNaN(parseInt(val)) && parseInt(val) > 0), {
    message: "O tempo de serviço deve ser um número inteiro positivo.",
  }).optional().nullable(),
  
  categoria: z.string().optional().nullable(),
  
  empresa_id: z.string().uuid({
    message: "Selecione uma empresa válida.",
  }).or(z.literal("")).optional(), 
});

type ServiceFormValues = z.infer<typeof formSchema>;

interface ServiceOnlyFormProps {
  onSubmit: (values: { 
    nome: string; 
    preco: number; 
    tipo: 'servico'; 
    tempo_servico: number | null; 
    estoque_total: null;
    fotos: string[] | null;
    marca: null;
    categoria: string | null;
    empresa_id?: string;
  }) => void;
  isSubmitting: boolean;
  defaultValues?: Partial<ServiceFormValues & { fotos: string[] | null }>;
  isEditing?: boolean;
}

const ServiceOnlyForm: React.FC<ServiceOnlyFormProps> = ({ onSubmit, isSubmitting, defaultValues, isEditing = false }) => {
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

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(finalFormSchema),
    defaultValues: {
      nome: defaultValues?.nome || "",
      preco: defaultValues?.preco ? String(defaultValues.preco) : "",
      tempo_servico: defaultValues?.tempo_servico ? String(defaultValues.tempo_servico) : "",
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


  const handleSubmit = (values: ServiceFormValues) => {
    const preco = parseFloat(values.preco);
    
    const tempo_servico = values.tempo_servico ? parseInt(values.tempo_servico) : null;
    
    // Se for Super Admin, passamos o ID da empresa.
    const empresa_id = isSuperAdmin && values.empresa_id ? values.empresa_id : undefined;
    
    // Normaliza campos vazios para null
    const categoria = values.categoria ? values.categoria : null;

    onSubmit({
      nome: values.nome,
      preco: preco,
      tipo: 'servico',
      tempo_servico: tempo_servico,
      estoque_total: null, // Sempre null para serviços
      fotos: photos,
      marca: null, // Sempre null para serviços
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
              <FormLabel>Nome do Serviço</FormLabel>
              <FormControl>
                <Input placeholder="Nome do serviço" {...field} disabled={isSubmitting} />
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
                  placeholder="Ex: 120.00" 
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
                  placeholder="Ex: Corte, Manicure" 
                  {...field} 
                  disabled={isSubmitting}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Tempo de Serviço */}
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
            "Cadastrar Serviço"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default ServiceOnlyForm;