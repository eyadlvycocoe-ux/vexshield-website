import { Panel2faPromptModal } from "@/components/Panel2faPromptModal";
import { useNavigate } from "react-router-dom";

export default function Support2faVerify() {
  const navigate = useNavigate();

  return (
    <Panel2faPromptModal
      panelTitle="Support Panel"
      onSuccess={() => navigate("/staff-panel")}
    />
  );
}
