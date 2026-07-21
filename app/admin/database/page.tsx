"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/features/admin/components/sidebar";
import { format } from "date-fns";
import { RefreshCw, Search, Filter } from "lucide-react";

interface EventLog {
  id: string;
  interviewId: string | null;
  userId: string | null;
  eventType: string;
  details: any;
  createdAt: string;
}

export default function DatabaseAdminPage() {
  const [events, setEvents] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("ALL");
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: "50",
      });
      if (eventTypeFilter !== "ALL") {
        query.append("eventType", eventTypeFilter);
      }
      const res = await fetch(`/api/admin/events?${query}`);
      const data = await res.json();
      setEvents(data.events);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error("Failed to fetch events", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [page, eventTypeFilter]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Database Logs</h1>
              <p className="text-muted-foreground mt-2">
                Monitor system events, user actions, tab switches, and camera tracking.
              </p>
            </div>
            <button
              onClick={fetchEvents}
              disabled={loading}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            {/* Filters */}
            <div className="p-4 border-b border-border bg-muted/20 flex gap-4 items-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="w-4 h-4" />
                <span>Filter by Type:</span>
              </div>
              <select
                value={eventTypeFilter}
                onChange={(e) => {
                  setEventTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-background border border-input rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="ALL">All Events</option>
                <option value="TAB_SWITCH">Tab Switch</option>
                <option value="CAMERA_OUT_OF_FRAME">Out of Frame</option>
                <option value="MULTIPLE_PERSONS_DETECTED">Multiple Persons Detected</option>
                <option value="INTERVIEW_STARTED">Interview Started</option>
                <option value="INTERVIEW_COMPLETED">Interview Completed</option>
              </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-medium">Timestamp</th>
                    <th className="px-6 py-4 font-medium">Event Type</th>
                    <th className="px-6 py-4 font-medium">User ID</th>
                    <th className="px-6 py-4 font-medium">Interview ID</th>
                    <th className="px-6 py-4 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                        Loading events...
                      </td>
                    </tr>
                  ) : events.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                        No events found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    events.map((event) => (
                      <tr key={event.id} className="border-b border-border/50 hover:bg-muted/10">
                        <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                          {format(new Date(event.createdAt), "MMM d, yyyy HH:mm:ss")}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide ${
                              event.eventType.includes("TAB_SWITCH") || event.eventType.includes("OUT_OF_FRAME") || event.eventType.includes("TALKING")
                                ? "bg-red-500/10 text-red-500"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {event.eventType}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-muted-foreground truncate max-w-[120px]">
                          {event.userId || "-"}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-muted-foreground truncate max-w-[120px]">
                          {event.interviewId || "-"}
                        </td>
                        <td className="px-6 py-4">
                          <pre className="text-[10px] bg-muted/30 p-2 rounded border border-border/50 overflow-x-auto max-w-[300px]">
                            {JSON.stringify(event.details, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-border flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 border border-input rounded-md hover:bg-muted/50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 border border-input rounded-md hover:bg-muted/50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
