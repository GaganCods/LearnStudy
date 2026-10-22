import React, { useState, useEffect } from "react";
import { 
  MessageSquare, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Star, 
  Filter, 
  Laptop, 
  RefreshCw, 
  ChevronRight, 
  Send,
  User,
  X
} from "lucide-react";
import { SupportTicketItem } from "../../types";
import { AdminService } from "../../services/adminService";
import { useAdmin } from "../AdminContext";
import { useToast } from "../../components/ToastContext";

export const FeedbackView: React.FC = () => {
  const { logAuditAction } = useAdmin();
  const { toast } = useToast();

  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketItem | null>(null);

  // Edit resolution state
  const [resolutionText, setResolutionText] = useState("");
  const [assignedToInput, setAssignedToInput] = useState("");

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await AdminService.getSupportTickets();
      setTickets(data);
    } catch (e: any) {
      toast.error("Failed to load feedback", e?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleUpdateStatus = async (ticket: SupportTicketItem, newStatus: "open" | "in_progress" | "resolved" | "dismissed") => {
    try {
      const updated = await AdminService.updateSupportTicket(ticket.id, {
        status: newStatus,
        resolutionNotes: resolutionText || ticket.resolutionNotes,
        assignedTo: assignedToInput || ticket.assignedTo
      }, {
        adminUid: "admin",
        adminEmail: "admin@learnstudy.app",
        adminName: "Admin"
      });
      setTickets(prev => prev.map(t => t.id === ticket.id ? updated : t));
      setSelectedTicket(updated);
      toast.success("Ticket Updated", `Ticket #${ticket.id} marked as ${newStatus}.`);
      await logAuditAction("UPDATE_SUPPORT_TICKET", "support", ticket.id, `Ticket #${ticket.id}`, { status: newStatus });
    } catch (err: any) {
      toast.error("Failed to update status", err?.message);
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (statusFilter === "all") return true;
    return t.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-purple-500" />
            Feedback & Student Support Inbox
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Review user feedback, technical telemetry, bug reports, and track issue resolution.
          </p>
        </div>

        <button
          onClick={loadTickets}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 transition-colors flex items-center gap-2 text-xs font-semibold self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-purple-500" : ""}`} />
          Refresh Inbox
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {["all", "open", "in_progress", "resolved", "dismissed"].map(st => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 py-1.5 rounded-xl text-xs capitalize transition-all ${
              statusFilter === st
                ? "bg-purple-600 text-white font-bold shadow-xs"
                : "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-50"
            }`}
          >
            {st.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Tickets List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-1 space-y-2.5 max-h-[70vh] overflow-y-auto">
          {filteredTickets.map(ticket => (
            <div
              key={ticket.id}
              onClick={() => {
                setSelectedTicket(ticket);
                setResolutionText(ticket.resolutionNotes || "");
                setAssignedToInput(ticket.assignedTo || "");
              }}
              className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                selectedTicket?.id === ticket.id
                  ? "bg-purple-500/10 border-purple-500/40 shadow-xs"
                  : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-slate-900 dark:text-white capitalize">
                  {ticket.category}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  ticket.status === "open" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                  ticket.status === "in_progress" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                  ticket.status === "resolved" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                  "bg-slate-100 dark:bg-zinc-800 text-slate-500 border-slate-200"
                }`}>
                  {ticket.status.replace("_", " ")}
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-zinc-300 line-clamp-2 leading-relaxed">
                {ticket.message}
              </p>

              <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500 mt-3 pt-2 border-t border-slate-100 dark:border-zinc-800">
                <span>{ticket.userName || ticket.userEmail}</span>
                <div className="flex items-center text-amber-500">
                  {Array.from({ length: ticket.rating }).map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-amber-500" />
                  ))}
                </div>
              </div>
            </div>
          ))}

          {filteredTickets.length === 0 && !loading && (
            <div className="p-8 text-center text-xs text-slate-400 dark:text-zinc-500 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl">
              No support tickets found in this view.
            </div>
          )}
        </div>

        {/* Selected Ticket Detail Panel */}
        <div className="md:col-span-2">
          {selectedTicket ? (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex items-start justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white capitalize">
                      {selectedTicket.category} Inquiry
                    </h2>
                    <span className="text-xs text-slate-400 font-mono">#{selectedTicket.id}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    From <strong>{selectedTicket.userName || "Student"}</strong> ({selectedTicket.userEmail}) • {new Date(selectedTicket.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {(["open", "in_progress", "resolved", "dismissed"] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => handleUpdateStatus(selectedTicket, st)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                        selectedTicket.status === st
                          ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                          : "bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-100"
                      }`}
                    >
                      {st.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Student Feedback Message</h3>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-850 border border-slate-100 dark:border-zinc-800 text-xs text-slate-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                  {selectedTicket.message}
                </div>
              </div>

              {/* Technical Telemetry Metadata */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Device & Environment Telemetry</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-850 border border-slate-100 dark:border-zinc-800">
                    <span className="text-[10px] text-slate-400 block">Browser</span>
                    <span className="font-semibold text-slate-800 dark:text-zinc-200 mt-0.5 block">{selectedTicket.browser || "Unknown"}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-850 border border-slate-100 dark:border-zinc-800">
                    <span className="text-[10px] text-slate-400 block">Platform</span>
                    <span className="font-semibold text-slate-800 dark:text-zinc-200 mt-0.5 block">{selectedTicket.platform || "Web"}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-850 border border-slate-100 dark:border-zinc-800">
                    <span className="text-[10px] text-slate-400 block">Page Context</span>
                    <span className="font-semibold text-slate-800 dark:text-zinc-200 mt-0.5 block">{selectedTicket.page || "/app/home"}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-850 border border-slate-100 dark:border-zinc-800">
                    <span className="text-[10px] text-slate-400 block">Resolution Screen</span>
                    <span className="font-semibold text-slate-800 dark:text-zinc-200 mt-0.5 block">{selectedTicket.screen || "1920x1080"}</span>
                  </div>
                </div>
              </div>

              {/* Admin Resolution & Assignment */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
                      Assign Ticket To:
                    </label>
                    <input
                      type="text"
                      value={assignedToInput}
                      onChange={(e) => setAssignedToInput(e.target.value)}
                      placeholder="e.g. Frontend Engineer, Product Lead..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => handleUpdateStatus(selectedTicket, selectedTicket.status)}
                      className="w-full py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors"
                    >
                      Save Resolution Notes
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block mb-1">
                    Internal Resolution & Follow-Up Notes:
                  </label>
                  <textarea
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    placeholder="Document investigation steps, bug fixes, or responses sent to student..."
                    rows={3}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl text-slate-400 p-8 text-center text-xs">
              <MessageSquare className="w-8 h-8 text-slate-300 dark:text-zinc-700 mb-2" />
              Select a feedback ticket from the left column to view technical details, telemetry, and resolution status.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
