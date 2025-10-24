import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface FloatingBulkActionsProps {
  selectedCount: number;
  onDelete: () => void;
  isDeleting: boolean;
}

const FloatingBulkActions: React.FC<FloatingBulkActionsProps> = ({ selectedCount, onDelete, isDeleting }) => {
  const { t } = useTranslation();

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div 
      className={cn(
        // Usando z-[99] para garantir que esteja acima de tudo
        "fixed bottom-4 left-1/2 transform -translate-x-1/2 z-[99]", 
        "bg-card border border-destructive/50 shadow-2xl rounded-lg p-3 transition-all duration-300",
        "flex items-center gap-4"
      )}
    >
      <span className="text-sm font-medium text-foreground">
        {t('selected_items_count', { count: selectedCount })}
      </span>
      
      <Button 
        variant="destructive" 
        onClick={onDelete}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="mr-2 h-4 w-4" />
        )}
        {t('delete')} ({selectedCount})
      </Button>
    </div>
  );
};

export default FloatingBulkActions;