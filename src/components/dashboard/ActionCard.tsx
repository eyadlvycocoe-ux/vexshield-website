import { LucideIcon  } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  buttonText: string;
  buttonVariant?: "default" | "destructive" | "secondary";
  onAction: () => void;
  dangerous?: boolean;
}

export function ActionCard({
  title,
  description,
  icon: Icon,
  buttonText,
  buttonVariant = "default",
  onAction,
  dangerous = false
}: ActionCardProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAction = async () => {
    if (dangerous) {
      // In a real app, you'd show a confirmation dialog
      const confirmed = window.confirm(`Are you sure you want to ${title.toLowerCase()}?`);
      if (!confirmed) return;
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      onAction();
      toast({
        title: "Success",
        description: `${title} completed successfully`,
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: `Failed to ${title.toLowerCase()}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cardClass = dangerous ? 'gaming-card-danger' : 'gaming-card-glow';
  const buttonVariantEnhanced = dangerous ? 'danger' : 'cyber';

  return (
    <div className={`${cardClass} p-6 slide-in-right relative overflow-hidden`}>
      <div className="flex items-start justify-between relative z-10">
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center border-2 ${
            dangerous 
              ? 'bg-gradient-to-br from-destructive/20 to-neon-red/20 border-destructive/30' 
              : 'bg-gradient-to-br from-primary/20 to-accent/20 border-primary/30'
          }`}>
            <Icon className={`w-7 h-7 ${dangerous ? 'text-destructive' : 'text-primary'}`} />
          </div>
          <div>
            <h3 className="font-bold text-xl mb-1">{title}</h3>
            <p className="text-muted-foreground text-sm">{description}</p>
          </div>
        </div>
        <Button
          variant={buttonVariantEnhanced}
          onClick={handleAction}
          disabled={loading}
          className="min-w-[120px] relative z-10"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              Processing
            </div>
          ) : buttonText}
        </Button>
      </div>
      {dangerous && (
        <div className="absolute inset-0 bg-gradient-to-r from-destructive/10 to-transparent rounded-lg pointer-events-none"></div>
      )}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-xl pointer-events-none"></div>
    </div>
  );
}