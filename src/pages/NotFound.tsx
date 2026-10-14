import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft  } from "lucide-react";
const BRAND_IMAGE = "/logo.png";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid opacity-5 pointer-events-none"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-accent/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 text-center max-w-2xl mx-auto">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <img 
            src={BRAND_IMAGE} 
            alt="VexShield" 
            className="h-32 w-32 object-contain animate-float"
          />
        </div>

        {/* Error Code */}
        <h1 className="text-9xl font-bold text-wave mb-4 animate-fade-in-up">
          404
        </h1>

        {/* Error Message */}
        <h2 className="text-3xl font-bold mb-4 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          Page Not Found
        </h2>
        
        <p className="text-xl text-muted-foreground mb-8 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          The page you're looking for doesn't exist or you need to connect to a server first.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          <Button
            size="lg"
            onClick={() => navigate('/')}
            className="gaming-button group"
          >
            <Home className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
            Go to Home
          </Button>
          
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate(-1)}
            className="group"
          >
            <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            Go Back
          </Button>
        </div>

        {/* Additional Info */}
        <div className="mt-12 p-6 bg-card/50 backdrop-blur rounded-lg border border-border animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
          <p className="text-sm text-muted-foreground">
            <strong>Common reasons for this error:</strong>
          </p>
          <ul className="text-sm text-muted-foreground mt-2 space-y-1">
            <li>• You tried to access a server page directly without connecting first</li>
            <li>• The page URL is incorrect or has been moved</li>
            <li>• Your session has expired - please reconnect to your server</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
