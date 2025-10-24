import { Trash2, X } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

interface FloatingBulkActionsProps {
  selectedCount: number;
  onDelete: () => void;
  isDeleting: boolean;
  onCancel?: () => void; // Adicionando onCancel para limpar a seleção
}

const FloatingBulkActions: React.FC<FloatingBulkActionsProps> = ({
  selectedCount,
  onDelete,
  isDeleting,
  onCancel,
}) => {
  const { t } = useTranslation();
  const isVisible = selectedCount > 0;

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 transform -translate-x-1/2 z-30",
        "bg-card border border-destructive/50 shadow-2xl rounded-lg p-3 transition-all duration-300",
        isVisible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-20 pointer-events-none"
      )}
    >
      <div className="flex items-center space-x-4">
        <span className="text-sm font-medium text-muted-foreground">
          {t('selected_items_count', { count: selectedCount })}
        </span>

        <Button
          variant="destructive"
          onClick={onDelete}
          disabled={isDeleting}
          className="flex items-center gap-2"
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          {t('delete')}
        </Button>
        
        {/* Botão de Cancelar/Fechar */}
        {onCancel && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            disabled={isDeleting}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default FloatingBulkActions;