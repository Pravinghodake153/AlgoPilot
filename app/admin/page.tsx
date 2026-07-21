"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";

export default function AdminPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [provider, setProvider] = useState("gemini");
  const [model, setModel] = useState("gemini-2.5-flash");

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/admin");
        if (!res.ok) {
          throw new Error("Unauthorized or server error");
        }
        const data = await res.json();
        setSettings(data.settings);
        setFeedbacks(data.feedbacks || []);
        
        if (data.settings.DEFAULT_AI_PROVIDER) setProvider(data.settings.DEFAULT_AI_PROVIDER);
        if (data.settings.DEFAULT_AI_MODEL) setModel(data.settings.DEFAULT_AI_MODEL);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model }),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      alert("Settings saved successfully!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading Admin Panel...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <p className="text-red-500 font-medium">Access Denied: {error}</p>
        <Link href="/dashboard" className="text-primary hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-8 md:p-12 max-w-6xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage system settings and view user feedback.</p>
        </div>
        <Link href="/dashboard" className="text-sm text-primary hover:underline">
          &larr; Back to Dashboard
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Settings Column */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">AI Model Settings</h2>
            
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Active Provider</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="gemini">Gemini (Google)</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="deepseek">DeepSeek (Official)</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Active Model</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. gemini-2.5-flash"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-xs text-muted-foreground">
                  Make sure the model matches the selected provider.
                </p>
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isSaving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        </div>

        {/* Feedback Column */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              User Feedback
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-foreground font-medium">
                {feedbacks.length}
              </span>
            </h2>

            {feedbacks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-lg">
                No feedback received yet.
              </p>
            ) : (
              <div className="space-y-4 overflow-y-auto max-h-[600px] pr-2">
                {feedbacks.map((fb) => (
                  <div key={fb.id} className="flex flex-col p-4 rounded-lg border border-border bg-background">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {fb.user?.name || "Unknown User"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {fb.user?.email || ""}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(fb.createdAt), "MMM d, yyyy • h:mm a")}
                      </span>
                    </div>
                    
                    <div className="mb-2 flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill={star <= fb.rating ? "currentColor" : "none"}
                          stroke="currentColor"
                          strokeWidth="2"
                          className={star <= fb.rating ? "text-yellow-400" : "text-muted-foreground/30"}
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      ))}
                    </div>
                    
                    <p className="text-sm text-foreground/80 mt-1 whitespace-pre-wrap">
                      {fb.comment}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
