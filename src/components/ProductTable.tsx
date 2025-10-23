import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Product, deleteProduct } from "@/integrations/supabase/products";
import { MoreHorizontal, Trash2, Pencil, DollarSign } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showError, showSuccess } from "@/utils/toast";
import EditProductSheet from "./EditProductSheet";

interface ProductTableProps {
  products: Product[];
}

interface ProductActionsProps {
  product: Product;
  onEdit: (product: Product) => void;
}

const ProductActions: React.FC<ProductActionsProps> = ({ product, onEdit }) => {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      showSuccess(`Produto/Serviço ${product.nome} excluído com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => {
      showError("Falha ao excluir produto/serviço: " + error.message);
    },
  });

  const handleDelete = () => {
    if (window.confirm(`Tem certeza que deseja excluir o produto/serviço ${product.nome}?`)) {
      deleteMutation.mutate(product.id);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Abrir menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Ações</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onEdit(product)}>
          <Pencil className="mr-2 h-4 w-4" /> Editar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleDelete} 
          disabled={deleteMutation.isPending}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};


const ProductTable: React.FC<ProductTableProps> = ({ products }) => {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsEditSheetOpen(true);
  };

  const handleCloseEditSheet = (open: boolean) => {
    setIsEditSheetOpen(open);
    if (!open) {
      setEditingProduct(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  {product.nome}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(product.preco)}
                </TableCell>
                <TableCell className="text-right">
                  <ProductActions product={product} onEdit={handleEdit} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {editingProduct && (
        <EditProductSheet 
          product={editingProduct} 
          isOpen={isEditSheetOpen} 
          onOpenChange={handleCloseEditSheet} 
        />
      )}
    </>
  );
};

export default ProductTable;