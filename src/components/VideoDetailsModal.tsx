import React from "react";
import { 
  X, Calendar, Clock, Eye, Play, Bookmark, Share2, 
  ExternalLink, Check, Copy, Tag, BookOpen, User, ThumbsUp, Folder 
} from "lucide-react";
import { useToast } from "./ToastContext";

export interface VideoDetailsData {
  id: string;
  title: string;
  channelName: string;
  duration?: string;
  description?: string;
  publishDate?: string;
  viewCount?: string;
  likeCount?: string;
  tags?: string[];
  thumbnail?: string;
}

interface VideoDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: VideoDetailsData | null;
  onStartStudy?: (videoId: string) => void;
  onOpenSaveModal?: (video: VideoDetailsData) => void;
  onSeekTo?: (seconds: number) => void;
}

export const VideoDetailsModal: React.FC<VideoDetailsModalProps> = ({
  isOpen,
  onClose,
  video,
  onStartStudy,
  onOpenSaveModal,
  onSeekTo
}) => {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !video) return null;

  const handleCopyLink = () => {
    const url = `https://www.youtube.com/watch?v=${video.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link Copied", "YouTube link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Convert raw text into text with clickable timestamp links
  const renderDescriptionWithLinks = (text: string) => {
    if (!text) return <p className="text-slate-500 italic">No description available for this lecture.</p>;

    const timeRegex = /\b(\d{1,2}:(?:\d{2}:)?\d{2})\b/g;
    const parts = text.split(timeRegex);

    return parts.map((part, i) => {
      if (timeRegex.test(part)) {
        // Parse time to seconds
        const timeParts = part.split(":").map(Number);
        let seconds = 0;
        if (timeParts.length === 3) {
          seconds = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
        } else if (timeParts.length === 2) {
          seconds = timeParts[0] * 60 + timeParts[1];
        }

        return (
          <button
            key={i}
            type="button"
            onClick={() => {
              if (onSeekTo) onSeekTo(seconds);
              toast.info("Timestamp Selected", `Jumping to ${part}`);
            }}
            className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-mono font-bold text-xs hover:bg-blue-100 dark:hover:bg-blue-900/60 transition cursor-pointer mx-0.5"
          >
            ⏱ {part}
          </button>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Hero Banner */}
        <div className="relative aspect-video w-full max-h-56 bg-slate-900 overflow-hidden">
          <img 
            src={video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`} 
            alt={video.title} 
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-sm transition"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Top badges */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white bg-blue-600/90 backdrop-blur-sm shadow-sm">
              Lecture Details
            </span>
            {video.duration && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white bg-black/60 backdrop-blur-sm">
                ⏱ {video.duration}
              </span>
            )}
          </div>

          {/* Bottom title & channel */}
          <div className="absolute bottom-4 left-4 right-4 space-y-1">
            <h2 className="text-base sm:text-lg font-black text-white leading-snug line-clamp-2" title={video.title}>
              {video.title}
            </h2>
            <p className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span>{video.channelName || "YouTube Creator"}</span>
            </p>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4 bg-slate-50 dark:bg-zinc-950/60 border-b border-slate-200/80 dark:border-zinc-800/80 text-xs">
          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Duration</span>
              <span className="font-bold text-slate-800 dark:text-zinc-200 truncate">{video.duration || "10:00"}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-500 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Published</span>
              <span className="font-bold text-slate-800 dark:text-zinc-200 truncate">{video.publishDate || "Recent"}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Views</span>
              <span className="font-bold text-slate-800 dark:text-zinc-200 truncate">{video.viewCount || "Standard"}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 flex items-center gap-2">
            <ThumbsUp className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Engagement</span>
              <span className="font-bold text-slate-800 dark:text-zinc-200 truncate">{video.likeCount ? `${video.likeCount} likes` : "High"}</span>
            </div>
          </div>
        </div>

        {/* Scrollable Content: Syllabus Description & Tags */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-zinc-800">
          
          {/* Action Buttons Row */}
          <div className="flex flex-wrap items-center gap-2.5">
            {onStartStudy && (
              <button
                onClick={() => {
                  onStartStudy(video.id);
                  onClose();
                }}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Studying Lecture</span>
              </button>
            )}

            {onOpenSaveModal && (
              <button
                onClick={() => {
                  onOpenSaveModal(video);
                  onClose();
                }}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-300 font-extrabold text-xs py-2.5 px-4 rounded-xl transition flex items-center gap-2 cursor-pointer"
              >
                <Folder className="w-4 h-4" />
                <span>Save to Folder</span>
              </button>
            )}

            <button
              onClick={handleCopyLink}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-300 font-bold text-xs py-2.5 px-3.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              title="Copy YouTube Link"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "Copied" : "Share"}</span>
            </button>
          </div>

          {/* Curriculum Tags */}
          {video.tags && video.tags.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                Academic Curriculum Topics
              </span>
              <div className="flex flex-wrap gap-1.5">
                {video.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                  >
                    <Tag className="w-3 h-3 text-slate-400" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description & Syllabus */}
          <div className="space-y-2">
            <span className="text-[11px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-wider block flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-blue-500" />
              Lecture Syllabus & Description
            </span>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200/80 dark:border-zinc-800/80 text-xs text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap select-text font-normal max-h-72 overflow-y-auto">
              {renderDescriptionWithLinks(video.description || "")}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200/80 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-950/40 flex items-center justify-between">
          <a
            href={`https://www.youtube.com/watch?v=${video.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>Open on YouTube</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-black transition cursor-pointer shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
