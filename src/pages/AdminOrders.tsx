import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ShoppingCart, Search, RefreshCw, CheckCircle, XCircle, Trash2, Home, ArrowLeft, Shield, Clock, User, Mail, MessageSquare, Coins, CreditCard, Landmark, Banknote, Tag, Server, Network, Copy } from "lucide-react";

import { apiUrl, apiMutationHeaders, ensureCsrfCookie, getStoredAuthToken } from "@/lib/api-base";
import { useRequireSiteAdmin } from "@/hooks/useRequireSiteAdmin";

export interface OrderRecord {
  id: string;
  order_number: string;
  user_id?: string | null;
  user_name: string;
  user_email: string;
  discord_username: string;
  plan_id: string;
  plan_name: string;
  plan_price: string;
  server_name?: string | null;
  server_ip?: string | null;
  payment_method?: string | null;
  coupon_code?: string | null;
  discount_amount?: number | string | null;
  final_price?: number | string | null;
  redeem_code?: string | null;
  status: "pending" | "approved" | "denied";

  notes?: string | null;
  created_at: string;
  updated_at?: string;
}


export default function AdminOrders() {
  const navigate = useNavigate();
  const { orderNumber: paramOrderNumber } = useParams<{ orderNumber?: string }>();
  const { ok: staffOk, checking: staffChecking } = useRequireSiteAdmin();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "denied">("all");
  const [actionProcessing, setActionProcessing] = useState<string | null>(null);

  const targetedOrder = useMemo(() => {
    if (!paramOrderNumber) return null;
    return orders.find(o => o.order_number.toUpperCase() === paramOrderNumber.toUpperCase()) || null;
  }, [orders, paramOrderNumber]);


  // Modal confirm states
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [confirmModalType, setConfirmModalType] = useState<"approve" | "deny" | "delete" | "receipt" | null>(null);
  const [customApprovePrice, setCustomApprovePrice] = useState<string>("");
  const [receiptData, setReceiptData] = useState<{
    order_number: string;
    plan_name: string;
    original_price: number;
    sale_discount: number;
    final_price: number;
    redeem_code: string;
    customer_email: string;
    payment_method: string;
  } | null>(null);

  useEffect(() => {
    if (staffOk) {
      fetchOrders();
    }
  }, [staffOk]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      await ensureCsrfCookie();
      const token = getStoredAuthToken();
      const headers: Record<string, string> = { Accept: "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const response = await fetch(apiUrl("/api/admin/orders"), {
        credentials: "include",
        headers,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load orders");
      }
      setOrders(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error fetching orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        order.order_number.toLowerCase().includes(q) ||
        order.user_name.toLowerCase().includes(q) ||
        order.user_email.toLowerCase().includes(q) ||
        order.discord_username.toLowerCase().includes(q) ||
        order.plan_name.toLowerCase().includes(q) ||
        (order.server_name && order.server_name.toLowerCase().includes(q)) ||
        (order.server_ip && order.server_ip.toLowerCase().includes(q)) ||
        (order.payment_method && order.payment_method.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, searchTerm]);


  const handleApproveOrder = async (order: OrderRecord) => {
    setActionProcessing(order.id);
    const origPrice = parseFloat(String(order.plan_price).replace(/[^0-9.]/g, "")) || 0;
    const finalPrice = customApprovePrice !== "" ? (parseFloat(customApprovePrice) || 0) : (parseFloat(String(order.final_price || order.plan_price).replace(/[^0-9.]/g, "")) || origPrice);
    const saleDiscount = Math.max(0, origPrice - finalPrice);

    try {
      await ensureCsrfCookie();
      const response = await fetch(apiUrl(`/api/admin/orders/${order.id}/approve`), {
        method: "POST",
        credentials: "include",
        headers: apiMutationHeaders(),
        body: JSON.stringify({
          final_price: finalPrice,
          discount_amount: saleDiscount,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to approve order");
      }
      toast.success(`Order ${data.order_number || order.order_number} approved!`);
      
      // Open Receipt summary modal
      setReceiptData({
        order_number: data.order_number || order.order_number,
        plan_name: order.plan_name,
        original_price: origPrice,
        sale_discount: saleDiscount,
        final_price: finalPrice,
        redeem_code: data.redeem_code || order.redeem_code || "GRANTED",
        customer_email: order.user_email,
        payment_method: order.payment_method || "bank/cashplus",
      });
      setConfirmModalType("receipt");
      fetchOrders();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error approving order");
      setConfirmModalType(null);
      setSelectedOrder(null);
    } finally {
      setActionProcessing(null);
    }
  };

  const handleDenyOrder = async (orderId: string) => {
    setActionProcessing(orderId);
    try {
      await ensureCsrfCookie();
      const response = await fetch(apiUrl(`/api/admin/orders/${orderId}/deny`), {
        method: "POST",
        credentials: "include",
        headers: apiMutationHeaders(),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to deny order");
      }
      toast.success(`Order ${data.order_number || ""} denied.`);
      fetchOrders();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error denying order");
    } finally {
      setActionProcessing(null);
      setConfirmModalType(null);
      setSelectedOrder(null);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    setActionProcessing(orderId);
    try {
      await ensureCsrfCookie();
      const response = await fetch(apiUrl(`/api/admin/orders/${orderId}`), {
        method: "DELETE",
        credentials: "include",
        headers: apiMutationHeaders(),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete order");
      }
      toast.success("Order record deleted");
      fetchOrders();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error deleting order");
    } finally {
      setActionProcessing(null);
      setConfirmModalType(null);
      setSelectedOrder(null);
    }
  };

  if (staffChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Verifying access...
      </div>
    );
  }

  if (!staffOk) return null;

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const approvedCount = orders.filter((o) => o.status === "approved").length;
  const deniedCount = orders.filter((o) => o.status === "denied").length;

  return (
    <div className="min-h-screen p-6 relative bg-[#090d16] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(59,130,246,0.1),transparent_50%)] pointer-events-none" />

      <div className="container mx-auto max-w-7xl relative z-10 space-y-6">
        {/* Header Navigation */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
                <ShoppingCart className="h-6 w-6 text-sky-400" />
                Customer Orders Management
              </h1>
              <p className="text-xs text-slate-400">
                Review, approve, or deny customer pricing plan orders.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
              <Home className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </div>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="bg-slate-900/60 border-slate-800">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs font-semibold text-slate-400">Total Orders</CardDescription>
              <CardTitle className="text-2xl font-black text-white">{orders.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-slate-900/60 border-amber-500/30">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs font-semibold text-amber-400">Pending Review</CardDescription>
              <CardTitle className="text-2xl font-black text-amber-300">{pendingCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-slate-900/60 border-emerald-500/30">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs font-semibold text-emerald-400">Approved & Granted</CardDescription>
              <CardTitle className="text-2xl font-black text-emerald-300">{approvedCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-slate-900/60 border-rose-500/30">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs font-semibold text-rose-400">Denied</CardDescription>
              <CardTitle className="text-2xl font-black text-rose-300">{deniedCount}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Targeted Order Focused Banner */}
        {targetedOrder && (
          <Card className="bg-slate-900 border-sky-500/50 shadow-xl shadow-sky-950/40 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-xs uppercase tracking-wider font-mono">
                    Direct Order Review Page
                  </Badge>
                  <span className="text-xl font-black text-white font-mono">{targetedOrder.order_number}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Full customer details for order review & license dispatch.</p>
              </div>

              <div className="flex gap-2">
                {targetedOrder.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      disabled={actionProcessing === targetedOrder.id}
                      onClick={() => {
                        setSelectedOrder(targetedOrder);
                        setCustomApprovePrice("");
                        setConfirmModalType("approve");
                      }}
                      className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs"
                    >
                      <CheckCircle className="h-4 w-4 mr-1.5" /> Approve & Dispatch DM
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={actionProcessing === targetedOrder.id}
                      onClick={() => handleDenyOrder(targetedOrder.id)}
                      className="font-bold text-xs"
                    >
                      <XCircle className="h-4 w-4 mr-1.5" /> Deny Order
                    </Button>
                  </>
                )}
                <Button size="sm" variant="outline" onClick={() => navigate("/admin/orders")}>
                  View All Orders
                </Button>
              </div>
            </div>

            {/* Full Customer Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1">
                <span className="text-slate-400 block font-semibold">Customer Email:</span>
                <span className="text-white font-medium select-all">{targetedOrder.user_email}</span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1">
                <span className="text-slate-400 block font-semibold">Discord Account:</span>
                <span className="text-sky-300 font-bold font-mono">@{targetedOrder.discord_username}</span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1">
                <span className="text-slate-400 block font-semibold">Purchased Plan:</span>
                <span className="text-emerald-400 font-bold">{targetedOrder.plan_name}</span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1">
                <span className="text-slate-400 block font-semibold">Payment Method:</span>
                <span className="text-white uppercase font-mono">{targetedOrder.payment_method || 'N/A'}</span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1">
                <span className="text-slate-400 block font-semibold">Amount Paid:</span>
                <span className="text-emerald-400 font-black text-sm">€{Number(targetedOrder.final_price || targetedOrder.plan_price || 0).toFixed(2)}</span>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1">
                <span className="text-slate-400 block font-semibold">Coupon Code:</span>
                <span className="text-amber-400 font-mono">{targetedOrder.coupon_code || 'None'}</span>
              </div>
            </div>
          </Card>
        )}


        {/* Search & Status Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search by order #, name, email, discord..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-950/80 border-slate-800 text-sm placeholder:text-slate-500"
            />
          </div>

          <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
            {(["all", "pending", "approved", "denied"] as const).map((status) => (
              <Button
                key={status}
                size="sm"
                variant={statusFilter === status ? "default" : "outline"}
                onClick={() => setStatusFilter(status)}
                className={`capitalize text-xs font-bold ${
                  statusFilter === status
                    ? "bg-sky-500 hover:bg-sky-400 text-white"
                    : "border-slate-800 text-slate-400 hover:bg-slate-800"
                }`}
              >
                {status}
              </Button>
            ))}
          </div>
        </div>

        {/* Orders Table */}
        <Card className="bg-slate-900/60 border-slate-800 overflow-hidden shadow-xl">
          <CardHeader className="p-4 border-b border-slate-800">
            <CardTitle className="text-base font-bold text-white">Orders List</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-slate-500">Loading orders data...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No orders match your filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/70 text-xs font-bold text-slate-400 uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Order #</th>
                      <th className="p-3.5">Customer Info</th>
                      <th className="p-3.5">Payment & Plan</th>
                      <th className="p-3.5">Redeem Code</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-sky-400">
                          {order.order_number}
                        </td>
                        <td className="p-3.5 space-y-1">
                          <div className="flex items-center gap-1.5 text-white font-semibold">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span>{order.user_name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Mail className="h-3 w-3 text-slate-500" />
                            <span>{order.user_email}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-mono">
                            <MessageSquare className="h-3 w-3 text-indigo-400" />
                            <span>{order.discord_username}</span>
                          </div>
                        </td>
                        <td className="p-3.5 space-y-1">
                          <div className="font-bold text-white text-xs">{order.plan_name}</div>
                          <div className="flex items-center gap-2">
                            {(!order.payment_method || order.payment_method === "crypto") && (
                              <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-[10px]">
                                <Coins className="h-3 w-3 mr-1" /> Crypto
                              </Badge>
                            )}
                            {order.payment_method === "paypal" && (
                              <Badge className="bg-sky-500/10 text-sky-300 border-sky-500/30 text-[10px]">
                                <CreditCard className="h-3 w-3 mr-1" /> PayPal
                              </Badge>
                            )}
                            {order.payment_method === "bank" && (
                              <Badge className="bg-indigo-500/10 text-indigo-300 border-indigo-500/30 text-[10px]">
                                <Landmark className="h-3 w-3 mr-1" /> Bank
                              </Badge>
                            )}
                            {order.payment_method === "cashplus" && (
                              <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30 text-[10px]">
                                <Banknote className="h-3 w-3 mr-1" /> CashPlus
                              </Badge>
                            )}

                            <span className="text-xs text-emerald-400 font-bold">
                              €{order.final_price ? Number(order.final_price).toFixed(2) : order.plan_price}
                            </span>
                          </div>

                          {order.coupon_code && (
                            <div className="flex items-center gap-1 text-[11px] text-amber-400 font-mono">
                              <Tag className="h-3 w-3" />
                              <span>{order.coupon_code}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-3.5">
                          {order.redeem_code ? (
                            <div className="flex items-center gap-1.5">
                              <code className="bg-slate-950 px-2 py-1 rounded text-xs font-mono font-bold text-sky-300 border border-slate-800">
                                {order.redeem_code}
                              </code>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                                title="Copy Redeem Code"
                                onClick={() => {
                                  navigator.clipboard.writeText(order.redeem_code || "");
                                  toast.success("Redeem code copied!");
                                }}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 italic">Unapproved / Pending</span>
                          )}
                        </td>


                        <td className="p-3.5">
                          {order.status === "pending" && (
                            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40">
                              <Clock className="h-3 w-3 mr-1" /> Pending
                            </Badge>
                          )}
                          {order.status === "approved" && (
                            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                              <CheckCircle className="h-3 w-3 mr-1" /> Approved
                            </Badge>
                          )}
                          {order.status === "denied" && (
                            <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40">
                              <XCircle className="h-3 w-3 mr-1" /> Denied
                            </Badge>
                          )}
                        </td>
                        <td className="p-3.5 text-xs text-slate-400 whitespace-nowrap">
                          {new Date(order.created_at).toLocaleString()}
                        </td>
                        <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                          {order.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-8 text-xs"
                                disabled={actionProcessing === order.id}
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setCustomApprovePrice("");
                                  setConfirmModalType("approve");
                                }}
                              >
                                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 h-8 text-xs"
                                disabled={actionProcessing === order.id}
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setConfirmModalType("deny");
                                }}
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" /> Deny
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-slate-500 hover:text-rose-400 h-8 w-8 p-0"
                            title="Delete Record"
                            disabled={actionProcessing === order.id}
                            onClick={() => {
                              setSelectedOrder(order);
                              setConfirmModalType("delete");
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <Dialog
        open={!!confirmModalType && !!selectedOrder}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmModalType(null);
            setSelectedOrder(null);
          }
        }}
      >
        <DialogContent className="bg-[#0f172a] border-slate-800 text-white">
          {selectedOrder && confirmModalType === "approve" && (() => {
            const origPrice = parseFloat(String(selectedOrder.plan_price).replace(/[^0-9.]/g, "")) || 0;
            const currentEnteredPrice = customApprovePrice !== "" ? (parseFloat(customApprovePrice) || 0) : (parseFloat(String(selectedOrder.final_price || selectedOrder.plan_price).replace(/[^0-9.]/g, "")) || origPrice);
            const computedSaleDiscount = Math.max(0, origPrice - currentEnteredPrice);

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle className="h-5 w-5" /> Approve Order {selectedOrder.order_number}
                  </DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Specify the payment amount received for <strong className="text-white">{selectedOrder.plan_name}</strong>.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Customer:</span>
                      <strong className="text-white font-mono">{selectedOrder.user_email}</strong>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Plan:</span>
                      <span className="font-bold text-sky-400">{selectedOrder.plan_name}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Plan Base Price:</span>
                      <span className="font-mono text-white font-bold">€{origPrice.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Price Setting Input */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-bold uppercase tracking-wider text-slate-300 text-[11px]">
                        Received / Final Price (€):
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCustomApprovePrice(String(origPrice))}
                        className="h-6 text-[11px] font-bold border-amber-500/40 text-amber-300 hover:bg-amber-500/10 px-2 rounded-md"
                      >
                        Full Price (€{origPrice.toFixed(2)})
                      </Button>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">€</span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder={String(origPrice)}
                        value={customApprovePrice}
                        onChange={(e) => setCustomApprovePrice(e.target.value)}
                        className="pl-7 bg-slate-950 border-slate-700 text-white font-mono font-bold text-base h-10 rounded-xl focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Computed Discount Preview */}
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1.5">
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Original Plan Price:</span>
                      <span className="font-mono">€{origPrice.toFixed(2)}</span>
                    </div>
                    {computedSaleDiscount > 0 && (
                      <div className="flex justify-between items-center text-emerald-400 font-bold">
                        <span>Sale / Discount Applied:</span>
                        <span className="font-mono">-€{computedSaleDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="pt-1.5 border-t border-emerald-500/20 flex justify-between items-center text-sm font-black text-white">
                      <span>Receipt Final Price:</span>
                      <span className="font-mono text-emerald-400">€{currentEnteredPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <DialogFooter className="mt-2 flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setConfirmModalType(null);
                      setCustomApprovePrice("");
                    }}
                    className="border-slate-800 text-slate-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleApproveOrder(selectedOrder)}
                    disabled={actionProcessing === selectedOrder.id}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  >
                    Confirm & Approve Order
                  </Button>
                </DialogFooter>
              </>
            );
          })()}

          {/* Receipt Modal */}
          {confirmModalType === "receipt" && receiptData && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle className="h-5 w-5" /> Official Order Receipt
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  Payment confirmation & discount breakdown.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-3 text-xs">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 shadow-inner">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Order Number:</span>
                    <span className="font-mono font-bold text-sky-400 text-sm">{receiptData.order_number}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Customer:</span>
                    <span className="font-mono text-white">{receiptData.customer_email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Item / Plan:</span>
                    <span className="font-bold text-white">{receiptData.plan_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Payment Mode:</span>
                    <span className="font-mono uppercase text-slate-300">{receiptData.payment_method}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Original Price:</span>
                    <span className={`font-mono ${receiptData.sale_discount > 0 ? "line-through text-slate-500" : "text-white font-bold"}`}>
                      €{receiptData.original_price.toFixed(2)}
                    </span>
                  </div>
                  {receiptData.sale_discount > 0 && (
                    <div className="flex justify-between items-center text-emerald-400 font-bold">
                      <span>Sale Discount:</span>
                      <span className="font-mono">-€{receiptData.sale_discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-black text-white">
                    <span>Total Amount Paid:</span>
                    <span className="font-mono text-amber-400 text-base">€{receiptData.final_price.toFixed(2)}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Generated License / Redeem Code:</span>
                    <span className="font-mono font-bold text-indigo-300 text-xs">{receiptData.redeem_code}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-indigo-500/40 text-indigo-200 hover:bg-indigo-500/20 text-xs h-8"
                    onClick={() => {
                      navigator.clipboard.writeText(receiptData.redeem_code);
                      toast.success("Redeem code copied!");
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <DialogFooter className="mt-2">
                <Button
                  onClick={() => {
                    setConfirmModalType(null);
                    setReceiptData(null);
                    setSelectedOrder(null);
                    setCustomApprovePrice("");
                  }}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold"
                >
                  Close Receipt
                </Button>
              </DialogFooter>
            </>
          )}

          {selectedOrder && confirmModalType === "deny" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-rose-400">
                  <XCircle className="h-5 w-5" /> Deny Order {selectedOrder.order_number}?
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  Denying this order will mark status as denied. No license will be granted.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setConfirmModalType(null)}
                  className="border-slate-800 text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleDenyOrder(selectedOrder.id)}
                  disabled={actionProcessing === selectedOrder.id}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold"
                >
                  Confirm & Deny
                </Button>
              </DialogFooter>
            </>
          )}

          {selectedOrder && confirmModalType === "delete" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-rose-400">
                  <Trash2 className="h-5 w-5" /> Delete Order Record {selectedOrder.order_number}?
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  Are you sure you want to permanently delete this order record? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setConfirmModalType(null)}
                  className="border-slate-800 text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleDeleteOrder(selectedOrder.id)}
                  disabled={actionProcessing === selectedOrder.id}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold"
                >
                  Delete Record
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
