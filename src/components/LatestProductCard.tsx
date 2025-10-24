import React from 'react';
import { Product } from '@/integrations/supabase/products';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Factory, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ProductImageCarousel from './ProductImageCarousel'; // Importando o novo componente

interface LatestProductCardProps {
  product: Product;
}

const LatestProductCard: React.FC<LatestProductCardProps> = ({ product }) => {
  const { t } = useTranslation();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card className="w-full flex flex-col overflow-hidden h-full">
      
      {/* Área da Imagem/Carrossel */}
      <ProductImageCarousel photos={product.fotos} alt={product.nome} />
      
      <CardHeader className="p-3 pb-1 flex-1">
        <CardTitle className="text-base truncate">{product.nome}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-1 space-y-1 text-sm">
        <div className="flex items-center text-muted-foreground">
          <span>{formatCurrency(product.preco)}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Factory className="h-4 w-4" />
          <span>{product.marca || t('none')}</span>
        </div>
      </CardContent>
      <CardFooter className="p-3 pt-0">
        {/* Link para a página de produtos, passando o ID para abrir a edição */}
        <Link to={`/products?editId=${product.id}`} className="w-full">
          <Button variant="secondary" size="sm" className="w-full">
            <Pencil className="h-4 w-4 mr-2" />
            {t('edit')}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};

export default LatestProductCard;