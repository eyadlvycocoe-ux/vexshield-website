import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { getAuthUserAvatar, getAuthUserName } from "@/lib/discord-avatar";
import { User  } from "lucide-react";

interface UserAvatarProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  showName?: boolean;
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-10 h-10", 
  lg: "w-12 h-12"
};

export function UserAvatar({ size = "md", className = "", showName = false }: UserAvatarProps) {
  const { user } = useUserAuth();
  
  const avatarUrl = getAuthUserAvatar(user);
  const userName = getAuthUserName(user);
  const safeUserName = typeof userName === "string" ? userName : userName != null ? String(userName) : "";
  const safeEmail = typeof user?.email === "string" ? user.email : "";
  const initials = safeUserName.charAt(0).toUpperCase() || safeEmail.charAt(0).toUpperCase() || "?";
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={avatarUrl || undefined} alt={safeUserName || "User"} />
        <AvatarFallback className="bg-primary/20 text-primary">
          {initials || <User className="w-4 h-4" />}
        </AvatarFallback>
      </Avatar>
      {showName && safeUserName && (
        <span className="text-sm font-medium text-foreground truncate max-w-[120px]">
          {safeUserName}
        </span>
      )}
    </div>
  );
}
