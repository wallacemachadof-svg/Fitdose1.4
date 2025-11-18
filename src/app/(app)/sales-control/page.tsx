import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSales } from "@/lib/data";
import { formatDate, formatCurrency, getPaymentStatusVariant, getDeliveryStatusVariant } from "@/lib/utils";
import { PlusCircle, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


export default async function SalesControlPage() {
  const sales = await getSales();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Controle de Vendas</CardTitle>
          <CardDescription>Gerencie as doses vendidas.</CardDescription>
        </div>
        <Button asChild>
          <Link href="/sales-control/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Venda
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Data da Venda</TableHead>
              <TableHead>Dose</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status Pag.</TableHead>
              <TableHead>Status Entrega</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.length > 0 ? (
              sales.map((sale) => {
                const paymentStatus = getPaymentStatusVariant(sale.paymentStatus);
                const deliveryStatus = getDeliveryStatusVariant(sale.deliveryStatus);
                return (
                  <TableRow key={sale.id}>
                    <TableCell>
                      <Link href={`/patients/${sale.patientId}`} className="font-medium text-primary-foreground hover:underline">
                        {sale.patientName}
                      </Link>
                    </TableCell>
                    <TableCell>{formatDate(sale.saleDate)}</TableCell>
                    <TableCell>{sale.soldDose} mg</TableCell>
                    <TableCell>{formatCurrency(sale.price)}</TableCell>
                    <TableCell>
                      <Badge variant={'default'} className={`${paymentStatus.color} ${paymentStatus.textColor} border-none`}>
                        {paymentStatus.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={'default'} className={`${deliveryStatus.color} ${deliveryStatus.textColor} border-none`}>
                        {deliveryStatus.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Ver Detalhes</DropdownMenuItem>
                          <DropdownMenuItem>Editar</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Nenhuma venda encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
