import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Company, deleteCompany } from "@/integrations/supabase/companies";
import { MoreHorizontal, Trash2, Pencil, Building } from "lucide-react";
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
import EditCompanySheet from "./EditCompanySheet";
import { useTranslation } from "react-i18next";

interface CompanyTableProps {
  companies: Company[];
}

interface CompanyActionsProps {
  company: Company;
  onEdit: (company: Company) => void;
}

const CompanyActions: React.FC<CompanyActionsProps> = ({ company, onEdit }) => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const deleteMutation = useMutation({
    mutationFn: deleteCompany,
    onSuccess: () => {
      showSuccess(`Empresa ${company.nome} excluída com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (error) => {
      showError(t("error_loading_data") + ": " + error.message);
    },
  });

  const handleDelete = () => {
    if (window.confirm(t('confirm_delete'))) {
      deleteMutation.mutate(company.id);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">{t('actions')}</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onEdit(company)}>
          <Pencil className="mr-2 h-4 w-4" /> {t('edit')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleDelete} 
          disabled={deleteMutation.isPending}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" /> {t('delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};


const CompanyTable: React.FC<CompanyTableProps> = ({ companies }) => {
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const { t } = useTranslation();

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setIsEditSheetOpen(true);
  };

  const handleCloseEditSheet = (open: boolean) => {
    setIsEditSheetOpen(open);
    if (!open) {
      setEditingCompany(null);
    }
  };

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('user_table_header_name')}</TableHead>
              <TableHead className="hidden lg:table-cell">{t('profile_email')}</TableHead>
              <TableHead className="hidden md:table-cell">{t('user_table_header_phone')}</TableHead>
              <TableHead className="hidden sm:table-cell">CNPJ</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => (
              <TableRow key={company.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  {company.nome}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {company.email || 'N/A'}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {company.telefone || 'N/A'}
                </TableCell>
                <TableCell className="hidden sm:table-cell">{company.cnpj || 'N/A'}</TableCell>
                <TableCell className="text-right">
                  <CompanyActions company={company} onEdit={handleEdit} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {editingCompany && (
        <EditCompanySheet 
          company={editingCompany} 
          isOpen={isEditSheetOpen} 
          onOpenChange={handleCloseEditSheet} 
        />
      )}
    </>
  );
};

export default CompanyTable;