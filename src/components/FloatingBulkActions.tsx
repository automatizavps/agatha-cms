import React from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from './ui/button';

interface FloatingBulkActionsProps {
  selectedCount: number;
  onDelete: () => void;
  isDeleting: boolean;
}

const FloatingBulkActions: React.FC<FloatingBulkActionsProps> = ({
  selectedCount,
  onDelete,
  isDeleting,
}) => {
  const { t } = useTranslation();

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        // Usando z-[99] para garantir que esteja acima de tudo
        "fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[99]",
        "bg-background/90 backdrop-blur-sm border border-primary/50 rounded-lg shadow-2xl p-3 transition-all duration-300 ease-in-out",
        "flex items-center space-x-4"
      )}
    >
      <span className="text-sm font-medium text-foreground">
        {t("selected_items_count", { count: selectedCount })}
      </span>
      
      <Button 
        onClick={onDelete} 
        disabled={isDeleting}
        variant="destructive"
        className="flex items-center"
      >
        {isDeleting ? (
          <Trash2 className="mr-2 h-4 w-4 animate-pulse" />
        ) : (
          <Trash2 className="mr-2 h-4 w-4" />
        )}
        {t("delete")} ({selectedCount})
      </Button>
    </div>
  );
};

export default FloatingBulkActions;