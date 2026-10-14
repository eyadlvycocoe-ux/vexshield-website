import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Home, ArrowLeft } from "lucide-react";

export default function AdminProducts() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#030712] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Manage Products</h1>
            <p className="text-zinc-400">Select a product to manage</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/")} className="rounded-xl">
              <Home className="h-4 w-4 mr-1.5 text-sky-400" />
              Home
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="rounded-xl">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Admin
            </Button>
          </div>
        </div>

        <div className="max-w-xl mx-auto">
          <Card className="border-primary/20 bg-card/40 backdrop-blur hover:border-primary/60 transition-all hover:translate-y-[-2px] cursor-pointer" onClick={() => navigate('/admin/servers')}>
            <CardHeader className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Manage VexShield</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Manage VexShield servers, licenses, and configurations
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <Button className="w-full">Go to VexShield</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
