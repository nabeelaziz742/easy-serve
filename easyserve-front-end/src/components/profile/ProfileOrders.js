"use client";

import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetMyOrdersQuery } from "@/services/private/me";

export default function ProfileOrders() {
  const { data, isLoading } = useGetMyOrdersQuery();

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!data?.length) {
    return (
      <Card className="p-6 text-center text-gray-500">
        No orders found
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <Table>
        <thead>
          <tr>
            <th>#</th>
            <th>Order Type</th>
            <th>Status</th>
            <th>Total</th>
            <th>Date</th>
          </tr>
        </thead>

        <tbody>
          {data.map((order) => (
            <tr key={order.id}>
              <td>#{order.id}</td>
              <td>{order.order_type}</td>
              <td>
                <Badge variant="outline">
                  {order.order_status}
                </Badge>
              </td>
              <td>Rs. {order.total}</td>
              <td>
                {new Date(order.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
