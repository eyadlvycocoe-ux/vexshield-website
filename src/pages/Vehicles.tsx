import { Car, Trash2, AlertTriangle  } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { ActionCard } from "@/components/dashboard/ActionCard";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface Vehicle {
  id: number;
  model: string;
  owner: string;
  location: string;
  status: "spawned" | "abandoned" | "suspicious";
}

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([
    { id: 1, model: "Adder", owner: "PlayerOne", location: "Downtown LS", status: "spawned" },
    { id: 2, model: "T20", owner: "Unknown", location: "Sandy Shores", status: "abandoned" },
    { id: 3, model: "Zentorno", owner: "SuspiciousPlayer", location: "Airport", status: "suspicious" },
    { id: 4, model: "Kuruma", owner: "RegularGamer", location: "Vinewood", status: "spawned" },
  ]);

  const totalVehicles = vehicles.length;
  const abandonedCount = vehicles.filter(v => v.status === "abandoned").length;
  const suspiciousCount = vehicles.filter(v => v.status === "suspicious").length;

  const handleDeleteAll = () => {
    setVehicles([]);
  };

  const handleDeleteAbandoned = () => {
    setVehicles(prev => prev.filter(v => v.status !== "abandoned"));
  };

  const handleDeleteSuspicious = () => {
    setVehicles(prev => prev.filter(v => v.status !== "suspicious"));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "spawned": return "text-success";
      case "abandoned": return "text-warning";
      case "suspicious": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "suspicious": return AlertTriangle;
      default: return Car;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Vehicle Management</h1>
        <p className="text-muted-foreground mt-2">
          Monitor and manage spawned vehicles
        </p>
      </div>

      {/* Vehicle Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title="Active Vehicles"
          value={totalVehicles}
          icon={Car}
          trend="128 max capacity"
          trendUp={true}
        />
        <StatsCard
          title="Abandoned"
          value={abandonedCount}
          icon={AlertTriangle}
          trend="Auto-cleanup: 30min"
          trendUp={false}
        />
        <StatsCard
          title="Suspicious"
          value={suspiciousCount}
          icon={AlertTriangle}
          trend="Flagged by AC"
          trendUp={false}
        />
      </div>

      {/* Vehicle Actions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <ActionCard
          title="Delete All Vehicles"
          description="Remove all spawned vehicles from the server"
          icon={Trash2}
          buttonText="Delete All"
          buttonVariant="destructive"
          onAction={handleDeleteAll}
          dangerous={true}
        />
        <ActionCard
          title="Delete Abandoned"
          description="Remove vehicles left unattended"
          icon={Trash2}
          buttonText="Clear Abandoned"
          buttonVariant="secondary"
          onAction={handleDeleteAbandoned}
        />
        <ActionCard
          title="Delete Suspicious"
          description="Remove vehicles flagged by anticheat"
          icon={Trash2}
          buttonText="Clear Flagged"
          buttonVariant="destructive"
          onAction={handleDeleteSuspicious}
          dangerous={true}
        />
      </div>

      {/* Vehicle List */}
      <div className="gaming-card">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold">Active Vehicles</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {vehicles.map((vehicle) => {
              const StatusIcon = getStatusIcon(vehicle.status);
              return (
                <div key={vehicle.id} className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <StatusIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{vehicle.model}</h3>
                      <p className="text-sm text-muted-foreground">Owner: {vehicle.owner}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{vehicle.location}</p>
                      <p className={`text-xs capitalize ${getStatusColor(vehicle.status)}`}>
                        {vehicle.status}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        Teleport
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => setVehicles(prev => prev.filter(v => v.id !== vehicle.id))}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {vehicles.length === 0 && (
            <div className="text-center py-12">
              <Car className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No vehicles currently spawned</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}