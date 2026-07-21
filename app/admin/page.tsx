"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";

export default function AdminPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [provider, setProvider] = useState("gemini");
  const [model, setModel] = useState("gemini-2.5-flash");
  const [geminiApiKey, setGeminiApiKey] = useState("");

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
        setUsers(data.users || []);
        
        if (data.settings.DEFAULT_AI_PROVIDER) setProvider(data.settings.DEFAULT_AI_PROVIDER);
        if (data.settings.DEFAULT_AI_MODEL) setModel(data.settings.DEFAULT_AI_MODEL);
        if (data.settings.GEMINI_API_KEY) setGeminiApiKey(data.settings.GEMINI_API_KEY);
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
        body: JSON.stringify({ provider, model, geminiApiKey }),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      alert("Settings saved successfully!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to completely delete ${name || "this user"} and all their interview data? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin?userId=${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete user");
      
      setUsers(users.filter(u => u.id !== userId));
      alert("User deleted successfully.");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleUserExpansion = (userId: string) => {
    setExpandedUsers(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
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

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Gemini API Key</label>
                <input
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="Enter custom Gemini API key..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Overrides default environment key when set.
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

      {/* Users & Interviews Table */}
      <div className="mt-8 rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          Registered Users
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-foreground font-medium">
            {users.length}
          </span>
        </h2>

        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center border border-dashed border-border rounded-lg">
            No users registered yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 rounded-t-lg">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">User</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3 text-center">Interviews</th>
                  <th className="px-4 py-3 rounded-tr-lg text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <React.Fragment key={user.id}>
                    <tr className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => toggleUserExpansion(user.id)}
                            className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${expandedUsers[user.id] ? "rotate-90" : ""}`}>
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          </button>
                          <div>
                            <div className="font-medium text-foreground">{user.name || "Unknown"}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {format(new Date(user.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-4 text-center font-medium">
                        {user._count?.interviews || 0}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10 px-3 py-1.5 rounded-md transition-colors text-xs font-medium cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                    {expandedUsers[user.id] && user.interviews && user.interviews.length > 0 && (
                      <tr className="bg-secondary/10">
                        <td colSpan={4} className="p-4">
                          <div className="pl-6 border-l-2 border-primary/20 ml-2">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Interview History</h4>
                            <div className="grid gap-2">
                              {user.interviews.map((interview: any) => (
                                <div key={interview.id} className="flex items-center justify-between p-3 rounded-md bg-background border border-border/50">
                                  <div className="flex flex-col">
                                    <span className="font-medium text-sm">{interview.problemTitle}</span>
                                    <span className="text-xs text-muted-foreground">{format(new Date(interview.createdAt), "MMM d, yyyy • h:mm a")}</span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <span className="text-xs capitalize px-2 py-1 bg-secondary rounded-md">{interview.difficulty}</span>
                                    <span className={`text-xs px-2 py-1 rounded-md ${interview.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                      {interview.status}
                                    </span>
                                    {interview.report ? (
                                      <div className="flex flex-col items-end">
                                        <span className="text-sm font-bold">{interview.report.overallScore}/100</span>
                                        <span className={`text-[10px] ${interview.report.isSolved ? 'text-emerald-500' : 'text-amber-500'}`}>
                                          {interview.report.isSolved ? 'Solved' : 'Not Solved'}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">No report</span>
                                    )}
                                    <Link href={`/report/${interview.id}`} target="_blank" className="text-primary hover:underline text-xs ml-2">
                                      View &rarr;
                                    </Link>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
