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
import { MoreHorizontal, Trash2, Pencil, Clock, Image as ImageIcon } from "lucide-react";
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
import EditServiceSheet from "./EditServiceSheet";

interface ServiceOnlyTableProps {
  services: Product[];
}

interface ServiceActionsProps {
  service: Product;
  onEdit: (service: Product) => void;
}

const ServiceActions: React.FC<ServiceActionsProps> = ({ service, onEdit }) => {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      showSuccess(`Serviço ${service.nome} excluído com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ["services_only"] });
    },
    onError: (error) => {
      showError("Falha ao excluir serviço: " + error.message);
    },
  });

  const handleDelete = () => {
    if (window.confirm(`Tem certeza que deseja excluir o serviço ${service.nome}?`)) {
      deleteMutation.mutate(service.id);
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
        <DropdownMenuItem onClick={() => onEdit(service)}>
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


const ServiceOnlyTable: React.FC<ServiceOnlyTableProps> = ({ services }) => {
  const [editingService, setEditingService] = useState<Product | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

  const handleEdit = (service: Product) => {
    setEditingService(service);
    setIsEditSheetOpen(true);
  };

  const handleCloseEditSheet = (open: boolean) => {
    setIsEditSheetOpen(open);
    if (!open) {
      setEditingService(null);
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
              <TableHead>Serviço</TableHead>
              <TableHead className="hidden sm:table-cell">Categoria</TableHead>
              <TableHead className="text-right">Duração</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => (
              <TableRow key={service.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {service.fotos && service.fotos.length > 0 ? (
                      <img src={service.fotos[0]} alt={service.nome} className="h-8 w-8 object-cover rounded-md" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground p-1 border rounded-md" />
                    )}
                    {service.nome}
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  {service.categoria || 'N/A'}
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  <div className="flex items-center justify-end gap-1">
                    <Clock className="h-3 w-3" />
                    {service.tempo_servico ? `${service.tempo_servico} min` : 'N/A'}
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(service.preco)}
                </TableCell>
                <TableCell className="text-right">
                  <ServiceActions service={service} onEdit={handleEdit} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {editingService && (
        <EditServiceSheet 
          service={editingService} 
          isOpen={isEditSheetOpen} 
          onOpenChange={handleCloseEditSheet} 
        />
      )}
    </>
  );
};

export default ServiceOnlyTable;