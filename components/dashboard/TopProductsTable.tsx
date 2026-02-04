'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type {
  Product,
  ProductStatus,
  TimeHorizon,
  ModelType,
} from '@/lib/types/dashboard';
import { useRouter } from 'next/navigation';

interface TopProductsTableProps {
  products: Product[];
  title: string;
  type: 'best' | 'worst';
  period: TimeHorizon;
  /** Analysis ID for linking to analysis detail (optional) */
  analysisId?: string;
}

export function TopProductsTable({
  products,
  title,
  type,
  period,
  analysisId,
}: TopProductsTableProps) {
  const router = useRouter();
  const detailHref = analysisId
    ? `/dashboard/analysis/${analysisId}?period=${period}`
    : undefined;

  const getStatusBadge = (status: ProductStatus) => {
    const config: Record<
      ProductStatus,
      { icon: string; variant: 'destructive' | 'secondary' | 'default' | 'outline'; label: string }
    > = {
      critical: { icon: '🔴', variant: 'destructive', label: 'Crítico' },
      attention: { icon: '🟡', variant: 'secondary', label: 'Atenção' },
      ok: { icon: '🟢', variant: 'default', label: 'OK' },
      unknown: { icon: '⚪', variant: 'outline', label: 'Desconhecido' },
    };
    const { icon, variant, label } = config[status] ?? config.unknown;
    return (
      <Badge
        variant={variant}
        className={status === 'attention' ? 'bg-yellow-500 text-white dark:bg-yellow-600' : ''}
      >
        {icon} {label}
      </Badge>
    );
  };

  const getModelBadge = (model: string) => {
    const colors: Record<string, string> = {
      xgboost: 'bg-green-600 text-white',
      prophet: 'bg-blue-600 text-white',
      ensemble: 'bg-purple-600 text-white',
    };
    return (
      <Badge
        variant="outline"
        className={colors[model] ?? ''}
      >
        {model}
      </Badge>
    );
  };

  if (!products || products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-muted-foreground">
            Nenhum produto disponível
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Prev.{period}d</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead>MAPE</TableHead>
              {type === 'worst' && <TableHead>Score</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product, index) => (
              <TableRow
                key={product.id}
                className={detailHref ? 'cursor-pointer transition-colors hover:bg-muted/50' : ''}
                onClick={() => detailHref && router.push(detailHref)}
              >
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell>
                  <div className="font-medium">{product.name}</div>
                  {product.sku && (
                    <div className="text-xs text-muted-foreground">{product.sku}</div>
                  )}
                </TableCell>
                <TableCell className="font-mono">
                  {product.forecast_total?.toLocaleString('pt-BR') ?? 0} un
                </TableCell>
                <TableCell>{getStatusBadge(product.status)}</TableCell>
                <TableCell>
                  {getModelBadge(product.forecast_model as string)}
                </TableCell>
                <TableCell>
                  <span
                    className={
                      (product.displayed_mape ?? 0) < 25
                        ? 'font-semibold text-green-600'
                        : (product.displayed_mape ?? 0) < 60
                          ? 'text-yellow-600'
                          : 'text-red-600'
                    }
                  >
                    {product.displayed_mape?.toFixed(1) ?? 'N/A'}%
                  </span>
                </TableCell>
                {type === 'worst' && (
                  <TableCell>
                    <Badge variant="destructive">
                      {product.worst_score?.toFixed(0) ?? 0}
                    </Badge>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
