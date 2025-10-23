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

const formSchema = z.object({
  nome: z.string().min(2, {
    message: "O nome deve ter pelo menos 2 caracteres.",
  }),
  preco: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
    message: "O preço deve ser um número positivo.",
  }),
});

type ProductFormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
  onSubmit: (values: { nome: string; preco: number }) => void;
  isSubmitting: boolean;
  defaultValues?: Partial<ProductFormValues>;
  isEditing?: boolean;
}

const ProductForm: React.FC<ProductFormProps> = ({ onSubmit, isSubmitting, defaultValues, isEditing = false }) => {
  
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: defaultValues?.nome || "",
      preco: defaultValues?.preco ? String(defaultValues.preco) : "",
    },
  });

  const handleSubmit = (values: ProductFormValues) => {
    onSubmit({
      nome: values.nome,
      preco: parseFloat(values.preco),
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Produto/Serviço</FormLabel>
              <FormControl>
                <Input placeholder="Corte de Cabelo, Massagem, etc." {...field} disabled={isSubmitting} />
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

export default ProductForm;