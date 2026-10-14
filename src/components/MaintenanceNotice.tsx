import { useState } from "react";

export function MaintenanceNotice() {
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  const handleAccessCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Check if the access code is correct
    if (accessCode === "A!rC0re#2026$X9m") {
      setUnlocked(true);
      setError("");
    } else {
      setError("Invalid access code");
    }
  };

  if (unlocked) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="max-w-2xl w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-slate-700 shadow-2xl p-8 md:p-12">

        <div className="text-center space-y-6">
          <div className="text-6xl mb-4">🔧</div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            VexShield Maintenance Notice
          </h1>

          <div className="space-y-4 text-slate-300 text-left bg-slate-800/50 rounded-lg p-6 border border-slate-700">
            <p className="text-lg">
              Dear VexShield Community,
            </p>
            
            <p className="text-lg">
              We apologize to everyone, but <strong className="text-white">VexShield is currently offline for a major maintenance and rebuild.</strong>
            </p>
            
            <p className="text-lg">
              This maintenance may take <strong className="text-white">up to one week</strong>, as we're working on rebuilding and improving everything from the ground up to deliver a much better experience.
            </p>
            
            <p className="text-lg">
              We appreciate your patience and support during this period. We'll keep you updated with any progress, and we'll be back stronger than ever.
            </p>
            
            <p className="text-lg">
              Thank you for your understanding. ❤️
            </p>
            
            <div className="pt-4 border-t border-slate-700">
              <p className="text-xl font-semibold text-white">
                See you soon.
              </p>
              <p className="text-slate-400 mt-1">
                — VexShield Team
              </p>
            </div>
            
            <p className="text-sm text-slate-500 italic mt-4">
              And to those who doubted us... we'll let the results speak for themselves. 😉
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-700">
            <form onSubmit={handleAccessCodeSubmit} className="space-y-4">
              <div>
                <label htmlFor="accessCode" className="block text-sm font-medium text-slate-300 mb-2">
                  Access Code
                </label>
                <input
                  type="text"
                  id="accessCode"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="Enter access code to bypass"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}
              <button
                type="submit"
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                Access Site
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
