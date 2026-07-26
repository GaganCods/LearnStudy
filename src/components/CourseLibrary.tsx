import React, { useState, useEffect } from "react";
import { 
  Folder, Plus, Search, BookOpen, CheckCircle2, 
  Trash2, Edit2, Play, FolderPlus, X, AlertTriangle,
  ChevronRight, ChevronDown, ListVideo, Sparkles, Check, ArrowLeft,
  ArrowUpDown, FileText, ExternalLink, Layers, GraduationCap, Video,
  Loader2, RefreshCw, ArrowUp, ArrowDown, Palette, Film, Download, Link2,
  Scissors, CheckSquare, Square, MoreVertical
} from "lucide-react";
import { Storage } from "../utils/storage";
import { CustomSubjectFolder, CourseChapter, ChapterLecture } from "../types";
import { useToast } from "./ToastContext";
import { parseYoutubeUrl, fetchPlaylistWithFallback } from "../utils/youtubeParser";

const YoutubeBrandIcon = ({ className = "w-4 h-4 shrink-0" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#FF0000"
      d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
    />
    <polygon fill="#FFFFFF" points="9.545,15.568 15.818,12 9.545,8.432" />
  </svg>
);

export interface PlaylistVideoItem {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
  progress: number;
  channelName: string;
  thumbnail: string;
  lectureNumber?: number;
}

export interface PlaylistInfoPackage {
  id: string;
  title: string;
  videos: PlaylistVideoItem[];
}

interface CourseLibraryProps {
  onSelectLecture?: (
    videoId: string, 
    title: string, 
    channelName?: string, 
    playlistInfo?: PlaylistInfoPackage,
    switchToStudyTab?: boolean
  ) => void;
  onOpenImportUrl?: () => void;
}

// Sample starter subject for first-time user experience if library is completely empty
const DEFAULT_STARTER_SUBJECT: CustomSubjectFolder = {
  id: "subject-sample-101",
  subjectName: "Computer Science & Data Structures",
  category: "Computer Science",
  color: "blue",
  description: "Core algorithms, data structures, and time complexity chapter-wise lecture series.",
  createdAt: new Date().toISOString(),
  chapters: [
    {
      id: "ch-101-1",
      chapterNumber: 1,
      title: "Chapter 1: Asymptotic Analysis & Time Complexity",
      description: "Big-O notation, space-time tradeoffs, and recursion bounds.",
      lectures: [
        {
          id: "lec-101-1-1",
          title: "1.1 Introduction to Big-O Notation & Time Bounds",
          youtubeVideoId: "g2o22C3CRfU",
          videoUrl: "https://www.youtube.com/watch?v=g2o22C3CRfU",
          duration: "18:40",
          completed: false,
          progress: 0,
          lectureNumber: 1
        },
        {
          id: "lec-101-1-2",
          title: "1.2 Space Complexity & Worst Case Analysis",
          youtubeVideoId: "8hly31xKLI0",
          videoUrl: "https://www.youtube.com/watch?v=8hly31xKLI0",
          duration: "22:15",
          completed: false,
          progress: 0,
          lectureNumber: 2
        }
      ]
    },
    {
      id: "ch-101-2",
      chapterNumber: 2,
      title: "Chapter 2: Linear Data Structures (Arrays & Linked Lists)",
      description: "Singly linked lists, doubly linked lists, and stack allocation.",
      lectures: [
        {
          id: "lec-101-2-1",
          title: "2.1 Linked Lists Implementation & Operations",
          youtubeVideoId: "R9PTBwOzceo",
          videoUrl: "https://www.youtube.com/watch?v=R9PTBwOzceo",
          duration: "25:10",
          completed: false,
          progress: 0,
          lectureNumber: 3
        },
        {
          id: "lec-101-2-2",
          title: "2.2 Stacks, Queues, and Priority Queues",
          youtubeVideoId: "A3ZUpyrnToM",
          videoUrl: "https://www.youtube.com/watch?v=A3ZUpyrnToM",
          duration: "19:50",
          completed: false,
          progress: 0,
          lectureNumber: 4
        }
      ]
    }
  ]
};

export const CourseLibrary: React.FC<CourseLibraryProps> = ({ onSelectLecture, onOpenImportUrl }) => {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<CustomSubjectFolder[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("All Subjects");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Active Detail Views
  const [selectedSubject, setSelectedSubject] = useState<CustomSubjectFolder | null>(null);
  const [playlistPlayerSubject, setPlaylistPlayerSubject] = useState<CustomSubjectFolder | null>(null);
  const [activeLecture, setActiveLecture] = useState<ChapterLecture | null>(null);
  const [activeChapterIdFilter, setActiveChapterIdFilter] = useState<string | "ALL">("ALL");

  // Subject Creation Modal State
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubjectColor, setNewSubjectColor] = useState("blue");
  const [newSubjectDesc, setNewSubjectDesc] = useState("");
  const [newSubjectPlaylistUrl, setNewSubjectPlaylistUrl] = useState("");
  const [isFetchingSubjectPlaylist, setIsFetchingSubjectPlaylist] = useState(false);
  const [subjectPlaylistPreview, setSubjectPlaylistPreview] = useState<{
    title: string;
    channelName: string;
    videosCount: number;
    videos: any[];
  } | null>(null);
  const [subjectPlaylistError, setSubjectPlaylistError] = useState<string | null>(null);

  // Standalone Playlist Import Modal State (Import Whole Playlist as Chapter)
  const [showImportPlaylistModal, setShowImportPlaylistModal] = useState(false);
  const [importTargetSubjectId, setImportTargetSubjectId] = useState<string>("");
  const [importTargetChapterId, setImportTargetChapterId] = useState<string | null>(null);
  const [importPlaylistUrl, setImportPlaylistUrl] = useState("");
  const [importChapterTitle, setImportChapterTitle] = useState("");
  const [importChapterDesc, setImportChapterDesc] = useState("");
  const [isFetchingImportPlaylist, setIsFetchingImportPlaylist] = useState(false);
  const [importPlaylistPreview, setImportPlaylistPreview] = useState<{
    title: string;
    channelName: string;
    thumbnail: string;
    videosCount: number;
    videos: any[];
  } | null>(null);
  const [importPlaylistError, setImportPlaylistError] = useState<string | null>(null);

  // Subject Edit Modal State
  const [showEditSubjectModal, setShowEditSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<CustomSubjectFolder | null>(null);
  const [editSubjectName, setEditSubjectName] = useState("");
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editSubjectColor, setEditSubjectColor] = useState("blue");
  const [editSubjectDesc, setEditSubjectDesc] = useState("");

  // Category selection modes
  const [categorySelectionMode, setCategorySelectionMode] = useState<"select" | "new">("select");
  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [editCategorySelectionMode, setEditCategorySelectionMode] = useState<"select" | "new">("select");
  const [selectedEditCategoryName, setSelectedEditCategoryName] = useState("");

  // Category management state
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [showManageCategoriesModal, setShowManageCategoriesModal] = useState(false);
  const [newManageCatName, setNewManageCatName] = useState("");
  const [editingCatOldName, setEditingCatOldName] = useState<string | null>(null);
  const [editingCatNewName, setEditingCatNewName] = useState("");

  // Chapter Creation Modal State
  const [showChapterModal, setShowChapterModal] = useState(false);

  // Split Chapter State
  const [splittingChapterId, setSplittingChapterId] = useState<string | null>(null);
  const [openChapterMenuId, setOpenChapterMenuId] = useState<string | null>(null);
  const [showSubjectHeaderMenu, setShowSubjectHeaderMenu] = useState(false);
  const [openSubjectCardMenuId, setOpenSubjectCardMenuId] = useState<string | null>(null);
  const [selectedSplitLectureIds, setSelectedSplitLectureIds] = useState<string[]>([]);
  const [showSplitChapterModal, setShowSplitChapterModal] = useState(false);
  const [splitDestinationType, setSplitDestinationType] = useState<"NEW" | "EXISTING">("NEW");
  const [splitNewChapterTitle, setSplitNewChapterTitle] = useState("");
  const [splitNewChapterDesc, setSplitNewChapterDesc] = useState("");
  const [splitExistingChapterId, setSplitExistingChapterId] = useState<string>("");
  const [chapterModalTab, setChapterModalTab] = useState<"manual" | "playlist">("manual");
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newChapterDesc, setNewChapterDesc] = useState("");
  const [chapterPlaylistUrl, setChapterPlaylistUrl] = useState("");
  const [isFetchingChapterPlaylist, setIsFetchingChapterPlaylist] = useState(false);
  const [chapterPlaylistPreview, setChapterPlaylistPreview] = useState<{
    title: string;
    channelName: string;
    videosCount: number;
    videos: any[];
  } | null>(null);
  const [chapterPlaylistError, setChapterPlaylistError] = useState<string | null>(null);

  // Chapter Edit Modal State
  const [showEditChapterModal, setShowEditChapterModal] = useState(false);
  const [editingChapter, setEditingChapter] = useState<CourseChapter | null>(null);
  const [editChapterTitle, setEditChapterTitle] = useState("");
  const [editChapterDesc, setEditChapterDesc] = useState("");
  const [editChapterNumber, setEditChapterNumber] = useState<number>(1);

  // Lecture Creation Modal State
  const [showLectureModal, setShowLectureModal] = useState(false);
  const [targetChapterId, setTargetChapterId] = useState<string | null>(null);
  const [newLectureTitle, setNewLectureTitle] = useState("");
  const [newLectureUrl, setNewLectureUrl] = useState("");
  const [newLectureDuration, setNewLectureDuration] = useState("15:00");
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);
  const [autoFetchedStatus, setAutoFetchedStatus] = useState<string | null>(null);

  // Lecture Edit Modal State
  const [showEditLectureModal, setShowEditLectureModal] = useState(false);
  const [editingLecture, setEditingLecture] = useState<ChapterLecture | null>(null);
  const [targetEditChapterId, setTargetEditChapterId] = useState<string | null>(null);
  const [editLectureTitle, setEditLectureTitle] = useState("");
  const [editLectureUrl, setEditLectureUrl] = useState("");
  const [editLectureDuration, setEditLectureDuration] = useState("15:00");
  const [isFetchingEditMetadata, setIsFetchingEditMetadata] = useState(false);
  const [autoFetchedEditStatus, setAutoFetchedEditStatus] = useState<string | null>(null);

  // Chapter Manage Mode State
  const [managingChapterIds, setManagingChapterIds] = useState<Record<string, boolean>>({});

  const toggleChapterManageMode = (chapterId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setManagingChapterIds(prev => ({
      ...prev,
      [chapterId]: !prev[chapterId]
    }));
  };

  // Custom Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'lecture' | 'chapter' | 'subject' | 'category';
    title: string;
    itemTitle: string;
    subjectId?: string;
    chapterId?: string;
    lectureId?: string;
    categoryName?: string;
  } | null>(null);

  const onRequestDeleteSubject = (subjectId: string, subjectName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteModal({
      isOpen: true,
      type: 'subject',
      title: 'Delete Subject Folder?',
      itemTitle: subjectName,
      subjectId
    });
  };

  const onRequestDeleteChapter = (subjectId: string, chapterId: string, chapterTitle: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteModal({
      isOpen: true,
      type: 'chapter',
      title: 'Delete Chapter Playlist?',
      itemTitle: chapterTitle,
      subjectId,
      chapterId
    });
  };

  const onRequestDeleteLecture = (subjectId: string, chapterId: string, lectureId: string, lectureTitle: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteModal({
      isOpen: true,
      type: 'lecture',
      title: 'Delete Lecture?',
      itemTitle: lectureTitle,
      subjectId,
      chapterId,
      lectureId
    });
  };

  const onRequestDeleteCategory = (categoryName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteModal({
      isOpen: true,
      type: 'category',
      title: 'Delete Category?',
      itemTitle: categoryName,
      categoryName
    });
  };

  const confirmDeleteAction = () => {
    if (!deleteModal) return;

    if (deleteModal.type === 'lecture' && deleteModal.chapterId && deleteModal.lectureId && deleteModal.subjectId) {
      executeDeleteLecture(deleteModal.subjectId, deleteModal.chapterId, deleteModal.lectureId);
    } else if (deleteModal.type === 'chapter' && deleteModal.chapterId && deleteModal.subjectId) {
      executeDeleteChapter(deleteModal.subjectId, deleteModal.chapterId);
    } else if (deleteModal.type === 'subject' && deleteModal.subjectId) {
      executeDeleteSubject(deleteModal.subjectId);
    } else if (deleteModal.type === 'category' && deleteModal.categoryName) {
      handleDeleteCategory(deleteModal.categoryName);
    }

    setDeleteModal(null);
  };

  // Expanded chapters in accordion
  const [expandedChapterIds, setExpandedChapterIds] = useState<Record<string, boolean>>({});

  // Load subjects on mount
  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = () => {
    const stored = Storage.getCustomSubjects() || [];
    // Remove the dummy starter subject if present
    const filtered = stored.filter(s => s.id !== "subject-sample-101");
    if (filtered.length !== stored.length) {
      Storage.saveCustomSubjects(filtered);
    }
    
    setSubjects(filtered);
    if (filtered[0]?.chapters?.[0]?.id) {
      setExpandedChapterIds({ [filtered[0].chapters[0].id]: true });
    }

    // Load custom categories based on actual remaining subjects
    const storedCats = localStorage.getItem("studyai_custom_categories");
    let catsList: string[] = [];
    if (storedCats) {
      try {
        catsList = JSON.parse(storedCats).filter((c: string) => c !== "Computer Science");
      } catch (e) {
        catsList = [];
      }
    }
    
    // Merge with actual categories from stored subjects
    const actualCats = Array.from(new Set(filtered.map(s => s.category).filter(Boolean)));
    const mergedCats = Array.from(new Set([...catsList, ...actualCats]));
    setCustomCategories(mergedCats);
    localStorage.setItem("studyai_custom_categories", JSON.stringify(mergedCats));
  };

  // Helper to extract YouTube ID from video link
  const extractYoutubeId = (url: string): string => {
    if (!url) return "";
    const cleaned = url.trim();
    if (cleaned.length === 11 && !cleaned.includes("/") && !cleaned.includes(".")) return cleaned;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = cleaned.match(regExp);
    return (match && match[2].length === 11) ? match[2] : cleaned;
  };

  // Auto-fetch video details from YouTube endpoint as user enters URL
  const handleLectureUrlChange = async (urlVal: string) => {
    setNewLectureUrl(urlVal);
    setAutoFetchedStatus(null);
    const ytId = extractYoutubeId(urlVal);

    if (ytId && ytId.length === 11) {
      setIsFetchingMetadata(true);
      try {
        const res = await fetch(`/api/video-metadata?id=${ytId}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.title) {
            setNewLectureTitle(data.title);
            if (data.duration) setNewLectureDuration(data.duration);
            setAutoFetchedStatus(`✨ Auto-fetched: "${data.title}" (${data.duration || "Video"})`);
          }
        }
      } catch (err) {
        console.warn("Could not auto-fetch video details:", err);
      } finally {
        setIsFetchingMetadata(false);
      }
    }
  };

  // Derived categories from user's actual subjects and custom lists
  const categories = Array.from(
    new Set([
      "All Subjects",
      ...customCategories,
      ...subjects.map((s) => s.category).filter(Boolean)
    ])
  );

  const existingCategories = categories.filter(c => c !== "All Subjects");

  // Filtered Subjects list
  const filteredSubjects = subjects.filter((s) => {
    const matchesCat = activeCategory === "All Subjects" || s.category === activeCategory;
    const matchesSearch = 
      s.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.chapters.some(c => 
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.lectures.some(l => l.title.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    return matchesCat && matchesSearch;
  });

  // Calculate progress for a subject
  const getSubjectProgress = (subj: CustomSubjectFolder) => {
    let total = 0;
    let completed = 0;
    subj.chapters.forEach((ch) => {
      ch.lectures.forEach((lec) => {
        total++;
        if (lec.completed) completed++;
      });
    });
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  };

  // Calculate progress for a single chapter
  const getChapterProgress = (chapter: CourseChapter) => {
    const total = chapter.lectures.length;
    const completed = chapter.lectures.filter(l => l.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  };

  const handleOpenCreateSubject = () => {
    const existing = Array.from(new Set(subjects.map(s => s.category).filter(Boolean)));
    if (existing.length > 0) {
      setCategorySelectionMode("select");
      setSelectedCategoryName(existing[0]);
    } else {
      setCategorySelectionMode("new");
      setSelectedCategoryName("");
    }
    setNewCategoryName("");
    setNewSubjectName("");
    setNewSubjectDesc("");
    setShowSubjectModal(true);
  };

  // Helper to fetch playlist for Subject Creation
  const handleFetchSubjectPlaylist = async (urlVal: string, isExplicitClick = false) => {
    setNewSubjectPlaylistUrl(urlVal);
    setSubjectPlaylistError(null);

    const trimmed = urlVal.trim();
    if (!trimmed) {
      setSubjectPlaylistPreview(null);
      return;
    }

    const parsed = parseYoutubeUrl(trimmed);
    if (!parsed) {
      if (isExplicitClick) {
        setSubjectPlaylistError("Please enter a valid YouTube playlist link or ID.");
      }
      setSubjectPlaylistPreview(null);
      return;
    }

    const playlistId = parsed.id;
    if (!playlistId) return;

    setIsFetchingSubjectPlaylist(true);
    try {
      const data = await fetchPlaylistWithFallback(playlistId);
      if (!data || !data.videos || data.videos.length === 0) {
        throw new Error("No videos found in this playlist.");
      }
      setSubjectPlaylistPreview({
        title: data.title || "Imported Playlist",
        channelName: data.channelName || "YouTube Channel",
        videosCount: data.videos.length,
        videos: data.videos
      });
      if (!newSubjectName.trim() && data.title) {
        setNewSubjectName(data.title);
      }
    } catch (err: any) {
      setSubjectPlaylistError(err.message || "Failed to fetch YouTube playlist.");
      setSubjectPlaylistPreview(null);
    } finally {
      setIsFetchingSubjectPlaylist(false);
    }
  };

  // Create Custom Subject Folder
  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    const finalCategory = categorySelectionMode === "select" 
      ? (selectedCategoryName || "General Studies")
      : (newCategoryName.trim() || "General Studies");

    if (categorySelectionMode === "new" && finalCategory && !customCategories.includes(finalCategory)) {
      const updatedCats = [...customCategories, finalCategory];
      setCustomCategories(updatedCats);
      localStorage.setItem("studyai_custom_categories", JSON.stringify(updatedCats));
    }

    let initialChapters: CourseChapter[] = [];

    if (subjectPlaylistPreview && subjectPlaylistPreview.videos.length > 0) {
      const convertedLectures: ChapterLecture[] = subjectPlaylistPreview.videos.map((vid: any, idx: number) => ({
        id: `lec-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        title: vid.title || `Lecture ${idx + 1}`,
        videoUrl: `https://www.youtube.com/watch?v=${vid.id}`,
        youtubeVideoId: vid.id,
        duration: vid.duration || "15:00",
        completed: false,
        progress: 0,
        lectureNumber: idx + 1
      }));

      initialChapters = [
        {
          id: `ch-${Date.now()}-1`,
          chapterNumber: 1,
          title: `Chapter 1: ${subjectPlaylistPreview.title || "Overview"}`,
          description: `Imported playlist from ${subjectPlaylistPreview.channelName} (${subjectPlaylistPreview.videosCount} lectures)`,
          lectures: convertedLectures
        }
      ];
    } else {
      initialChapters = [
        {
          id: `ch-${Date.now()}-1`,
          chapterNumber: 1,
          title: "Chapter 1: Foundations & Overview",
          description: "Introduction to fundamental concepts.",
          lectures: []
        }
      ];
    }

    const newSubj: CustomSubjectFolder = {
      id: `subj-${Date.now()}`,
      subjectName: newSubjectName.trim(),
      category: finalCategory,
      color: newSubjectColor || "blue",
      description: newSubjectDesc.trim(),
      createdAt: new Date().toISOString(),
      chapters: initialChapters
    };

    const updated = [newSubj, ...subjects];
    Storage.saveCustomSubjects(updated);
    setSubjects(updated);
    
    // Reset form
    setNewSubjectName("");
    setNewCategoryName("");
    setSelectedCategoryName("");
    setNewSubjectDesc("");
    setNewSubjectPlaylistUrl("");
    setSubjectPlaylistPreview(null);
    setSubjectPlaylistError(null);
    setShowSubjectModal(false);
    setSelectedSubject(newSubj);

    if (subjectPlaylistPreview) {
      toast.success("Subject Created with Playlist", `Imported "${newSubj.subjectName}" with Chapter 1 containing ${initialChapters[0].lectures.length} lectures.`);
    } else {
      toast.success("Subject Created", `Created "${newSubj.subjectName}". You can now add chapters or import playlists.`);
    }
  };

  // Execute Delete Subject
  const executeDeleteSubject = (id: string) => {
    Storage.deleteCustomSubject(id);
    const updated = subjects.filter((s) => s.id !== id);
    setSubjects(updated);
    if (selectedSubject?.id === id) setSelectedSubject(null);
    if (playlistPlayerSubject?.id === id) setPlaylistPlayerSubject(null);
  };

  // Open Edit Subject Modal
  const handleOpenEditSubject = (subj: CustomSubjectFolder, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSubject(subj);
    setEditSubjectName(subj.subjectName);

    const existing = Array.from(new Set(subjects.map(s => s.category).filter(Boolean)));
    if (existing.includes(subj.category)) {
      setEditCategorySelectionMode("select");
      setSelectedEditCategoryName(subj.category);
      setEditCategoryName("");
    } else {
      setEditCategorySelectionMode("new");
      setEditCategoryName(subj.category);
      setSelectedEditCategoryName(existing[0] || "");
    }

    setEditSubjectColor(subj.color || "blue");
    setEditSubjectDesc(subj.description || "");
    setShowEditSubjectModal(true);
  };

  // Update Subject
  const handleUpdateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject || !editSubjectName.trim()) return;

    const finalCategory = editCategorySelectionMode === "select"
      ? (selectedEditCategoryName || "General Studies")
      : (editCategoryName.trim() || "General Studies");

    if (editCategorySelectionMode === "new" && finalCategory && !customCategories.includes(finalCategory)) {
      const updatedCats = [...customCategories, finalCategory];
      setCustomCategories(updatedCats);
      localStorage.setItem("studyai_custom_categories", JSON.stringify(updatedCats));
    }

    const updatedSubj: CustomSubjectFolder = {
      ...editingSubject,
      subjectName: editSubjectName.trim(),
      category: finalCategory,
      color: editSubjectColor || "blue",
      description: editSubjectDesc.trim()
    };

    Storage.saveCustomSubject(updatedSubj);
    setSubjects(subjects.map((s) => s.id === updatedSubj.id ? updatedSubj : s));
    if (selectedSubject?.id === updatedSubj.id) setSelectedSubject(updatedSubj);
    if (playlistPlayerSubject?.id === updatedSubj.id) setPlaylistPlayerSubject(updatedSubj);

    setShowEditSubjectModal(false);
    setEditingSubject(null);
  };

  // Category management functions
  const handleRenameCategory = (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) return;
    const cleanNewName = newName.trim();
    
    // Update customCategories list
    const updatedCats = customCategories.map(c => c === oldName ? cleanNewName : c);
    setCustomCategories(updatedCats);
    localStorage.setItem("studyai_custom_categories", JSON.stringify(updatedCats));

    // Update subjects using this category
    const updatedSubjects = subjects.map(s => {
      if (s.category === oldName) {
        const updatedSubj = { ...s, category: cleanNewName };
        Storage.saveCustomSubject(updatedSubj);
        return updatedSubj;
      }
      return s;
    });
    setSubjects(updatedSubjects);

    // Update active filters/detail views
    if (activeCategory === oldName) {
      setActiveCategory(cleanNewName);
    }
    if (selectedSubject && selectedSubject.category === oldName) {
      setSelectedSubject({ ...selectedSubject, category: cleanNewName });
    }
    if (playlistPlayerSubject && playlistPlayerSubject.category === oldName) {
      setPlaylistPlayerSubject({ ...playlistPlayerSubject, category: cleanNewName });
    }
  };

  const handleDeleteCategory = (catName: string) => {
    // Remove from customCategories list
    const updatedCats = customCategories.filter(c => c !== catName);
    setCustomCategories(updatedCats);
    localStorage.setItem("studyai_custom_categories", JSON.stringify(updatedCats));

    // Update subjects using this category to "General Studies"
    const updatedSubjects = subjects.map(s => {
      if (s.category === catName) {
        const updatedSubj = { ...s, category: "General Studies" };
        Storage.saveCustomSubject(updatedSubj);
        return updatedSubj;
      }
      return s;
    });
    setSubjects(updatedSubjects);

    // Revert active filter if it was the deleted category
    if (activeCategory === catName) {
      setActiveCategory("All Subjects");
    }
    if (selectedSubject && selectedSubject.category === catName) {
      setSelectedSubject({ ...selectedSubject, category: "General Studies" });
    }
    if (playlistPlayerSubject && playlistPlayerSubject.category === catName) {
      setPlaylistPlayerSubject({ ...playlistPlayerSubject, category: "General Studies" });
    }
  };

  const handleAddCategory = (newCat: string) => {
    const cleanNew = newCat.trim();
    if (!cleanNew || customCategories.includes(cleanNew)) return;
    const updatedCats = [...customCategories, cleanNew];
    setCustomCategories(updatedCats);
    localStorage.setItem("studyai_custom_categories", JSON.stringify(updatedCats));
  };

  // Open standalone Import Playlist Modal
  const handleOpenImportPlaylistModal = (targetSubj?: CustomSubjectFolder | null, targetChapter?: CourseChapter | null) => {
    if (targetSubj) {
      setImportTargetSubjectId(targetSubj.id);
    } else if (selectedSubject) {
      setImportTargetSubjectId(selectedSubject.id);
    } else if (subjects.length > 0) {
      setImportTargetSubjectId(subjects[0].id);
    } else {
      setImportTargetSubjectId("NEW");
    }

    setImportTargetChapterId(targetChapter ? targetChapter.id : null);
    setImportPlaylistUrl("");
    setImportChapterTitle("");
    setImportChapterDesc("");
    setImportPlaylistPreview(null);
    setImportPlaylistError(null);
    setShowImportPlaylistModal(true);
  };

  // Helper to fetch playlist details for standalone import modal
  const handleFetchImportPlaylist = async (urlVal: string, isExplicitClick = false) => {
    setImportPlaylistUrl(urlVal);
    setImportPlaylistError(null);

    const trimmed = urlVal.trim();
    if (!trimmed) {
      setImportPlaylistPreview(null);
      return;
    }

    const parsed = parseYoutubeUrl(trimmed);
    if (!parsed) {
      if (isExplicitClick) {
        setImportPlaylistError("Please enter a valid YouTube playlist link or ID.");
      }
      setImportPlaylistPreview(null);
      return;
    }

    const playlistId = parsed.id;
    if (!playlistId) return;

    setIsFetchingImportPlaylist(true);
    try {
      const data = await fetchPlaylistWithFallback(playlistId);
      if (!data || !data.videos || data.videos.length === 0) {
        throw new Error("No videos found in this playlist or playlist is private.");
      }
      setImportPlaylistPreview({
        title: data.title || "Imported Playlist",
        channelName: data.channelName || "YouTube Channel",
        thumbnail: data.thumbnail || (data.videos[0] ? `https://i.ytimg.com/vi/${data.videos[0].id}/hqdefault.jpg` : ""),
        videosCount: data.videos.length,
        videos: data.videos
      });
      if (!importChapterTitle.trim()) {
        setImportChapterTitle(data.title || "Playlist Chapter");
      }
    } catch (err: any) {
      setImportPlaylistError(err.message || "Failed to parse YouTube playlist.");
      setImportPlaylistPreview(null);
    } finally {
      setIsFetchingImportPlaylist(false);
    }
  };

  // Execute standalone Import Playlist as Chapter or directly into existing Chapter
  const handleExecuteImportPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();

    let preview = importPlaylistPreview;

    if (!preview || preview.videos.length === 0) {
      const urlVal = importPlaylistUrl.trim();
      if (!urlVal) {
        toast.error("Missing Link", "Please paste a YouTube playlist URL.");
        return;
      }
      const parsed = parseYoutubeUrl(urlVal);
      if (!parsed || !parsed.id) {
        setImportPlaylistError("Please enter a valid YouTube playlist link or ID.");
        toast.error("Invalid Link", "Please enter a valid YouTube playlist link.");
        return;
      }
      setIsFetchingImportPlaylist(true);
      try {
        const data = await fetchPlaylistWithFallback(parsed.id);
        if (!data || !data.videos || data.videos.length === 0) {
          throw new Error("No videos found in this YouTube playlist.");
        }
        preview = {
          title: data.title || "Imported Playlist",
          channelName: data.channelName || "YouTube Channel",
          thumbnail: data.thumbnail || (data.videos[0] ? `https://i.ytimg.com/vi/${data.videos[0].id}/hqdefault.jpg` : ""),
          videosCount: data.videos.length,
          videos: data.videos
        };
        setImportPlaylistPreview(preview);
        if (!importChapterTitle.trim()) {
          setImportChapterTitle(data.title || "Playlist Chapter");
        }
      } catch (err: any) {
        const errorMsg = err.message || "Failed to fetch playlist.";
        setImportPlaylistError(errorMsg);
        toast.error("Import Failed", errorMsg);
        return;
      } finally {
        setIsFetchingImportPlaylist(false);
      }
    }

    if (!preview || preview.videos.length === 0) {
      toast.error("Invalid Playlist", "Could not load videos from this YouTube playlist.");
      return;
    }

    let targetSubj: CustomSubjectFolder | null = null;

    if (importTargetSubjectId === "NEW" || subjects.length === 0) {
      // Create a brand new subject for this playlist
      const newSubjectNameVal = importChapterTitle.trim() || preview.title || "New Course Subject";
      targetSubj = {
        id: `subj-${Date.now()}`,
        subjectName: newSubjectNameVal,
        category: "General Studies",
        color: "blue",
        description: `Imported subject for ${preview.title}`,
        createdAt: new Date().toISOString(),
        chapters: []
      };
    } else {
      targetSubj = subjects.find(s => s.id === importTargetSubjectId) || selectedSubject || subjects[0];
    }

    if (!targetSubj) return;

    // SCENARIO 1: Import playlist directly into an EXISTING chapter
    if (importTargetChapterId) {
      const existingChapter = targetSubj.chapters.find(c => c.id === importTargetChapterId);
      if (existingChapter) {
        const existingCount = existingChapter.lectures.length;
        const convertedLectures: ChapterLecture[] = preview.videos.map((vid: any, idx: number) => ({
          id: `lec-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          title: vid.title || `Lecture ${existingCount + idx + 1}`,
          videoUrl: `https://www.youtube.com/watch?v=${vid.id}`,
          youtubeVideoId: vid.id,
          duration: vid.duration || "15:00",
          completed: false,
          progress: 0,
          lectureNumber: existingCount + idx + 1
        }));

        const updatedChapter: CourseChapter = {
          ...existingChapter,
          lectures: [...existingChapter.lectures, ...convertedLectures]
        };

        const updatedSubj: CustomSubjectFolder = {
          ...targetSubj,
          chapters: targetSubj.chapters.map(c => c.id === importTargetChapterId ? updatedChapter : c)
        };

        const exists = subjects.some(s => s.id === updatedSubj.id);
        const updatedSubjects = exists
          ? subjects.map(s => s.id === updatedSubj.id ? updatedSubj : s)
          : [updatedSubj, ...subjects];

        Storage.saveCustomSubjects(updatedSubjects);
        setSubjects(updatedSubjects);
        setSelectedSubject(updatedSubj);
        setExpandedChapterIds(prev => ({ ...prev, [importTargetChapterId]: true }));

        setShowImportPlaylistModal(false);
        setImportPlaylistUrl("");
        setImportChapterTitle("");
        setImportChapterDesc("");
        setImportPlaylistPreview(null);
        setImportPlaylistError(null);
        setImportTargetChapterId(null);

        toast.success(
          "Playlist Imported into Chapter",
          `Added ${convertedLectures.length} lectures directly into "${existingChapter.title}".`
        );
        return;
      }
    }

    // SCENARIO 2: Import playlist as a NEW Chapter inside targetSubj
    const nextChapterNum = targetSubj.chapters.length + 1;
    const rawTitle = importChapterTitle.trim() || preview.title || `Chapter ${nextChapterNum}`;
    const finalChapterTitle = rawTitle.startsWith("Chapter") ? rawTitle : `Chapter ${nextChapterNum}: ${rawTitle}`;
    const finalChapterDesc = importChapterDesc.trim() || `Imported playlist from ${preview.channelName} (${preview.videosCount} lectures)`;

    const convertedLectures: ChapterLecture[] = preview.videos.map((vid: any, idx: number) => ({
      id: `lec-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      title: vid.title || `Lecture ${idx + 1}`,
      videoUrl: `https://www.youtube.com/watch?v=${vid.id}`,
      youtubeVideoId: vid.id,
      duration: vid.duration || "15:00",
      completed: false,
      progress: 0,
      lectureNumber: idx + 1
    }));

    const newChapter: CourseChapter = {
      id: `ch-${Date.now()}`,
      chapterNumber: nextChapterNum,
      title: finalChapterTitle,
      description: finalChapterDesc,
      lectures: convertedLectures
    };

    const updatedSubj: CustomSubjectFolder = {
      ...targetSubj,
      chapters: [...targetSubj.chapters, newChapter]
    };

    const exists = subjects.some(s => s.id === updatedSubj.id);
    const updatedSubjects = exists
      ? subjects.map(s => s.id === updatedSubj.id ? updatedSubj : s)
      : [updatedSubj, ...subjects];

    Storage.saveCustomSubjects(updatedSubjects);
    setSubjects(updatedSubjects);
    setSelectedSubject(updatedSubj);
    setExpandedChapterIds(prev => ({ ...prev, [newChapter.id]: true }));

    setShowImportPlaylistModal(false);
    setImportPlaylistUrl("");
    setImportChapterTitle("");
    setImportChapterDesc("");
    setImportPlaylistPreview(null);
    setImportPlaylistError(null);
    setImportTargetChapterId(null);

    toast.success(
      "Playlist Imported as Chapter",
      `Added "${newChapter.title}" with ${convertedLectures.length} lectures into "${updatedSubj.subjectName}".`
    );
  };

  // Helper to fetch playlist in Chapter Creation modal
  const handleFetchChapterPlaylist = async (urlVal: string, isExplicitClick = false) => {
    setChapterPlaylistUrl(urlVal);
    setChapterPlaylistError(null);

    const trimmed = urlVal.trim();
    if (!trimmed) {
      setChapterPlaylistPreview(null);
      return;
    }

    const parsed = parseYoutubeUrl(trimmed);
    if (!parsed) {
      if (isExplicitClick) {
        setChapterPlaylistError("Please enter a valid YouTube playlist link or ID.");
      }
      setChapterPlaylistPreview(null);
      return;
    }

    const playlistId = parsed.id;
    if (!playlistId) return;

    setIsFetchingChapterPlaylist(true);
    try {
      const data = await fetchPlaylistWithFallback(playlistId);
      if (!data || !data.videos || data.videos.length === 0) {
        throw new Error("No videos found in this playlist.");
      }
      setChapterPlaylistPreview({
        title: data.title || "Imported Playlist",
        channelName: data.channelName || "YouTube",
        videosCount: data.videos.length,
        videos: data.videos
      });
      if (!newChapterTitle.trim() && data.title) {
        setNewChapterTitle(data.title);
      }
    } catch (err: any) {
      setChapterPlaylistError(err.message || "Failed to fetch playlist.");
      setChapterPlaylistPreview(null);
    } finally {
      setIsFetchingChapterPlaylist(false);
    }
  };

  // Create Chapter inside active subject
  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject) return;

    let newLectures: ChapterLecture[] = [];
    let finalTitle = newChapterTitle.trim();
    let finalDesc = newChapterDesc.trim();
    const nextChapterNum = selectedSubject.chapters.length + 1;

    if (chapterModalTab === "playlist") {
      let preview = chapterPlaylistPreview;

      if (!preview || preview.videos.length === 0) {
        const urlVal = chapterPlaylistUrl.trim();
        if (!urlVal) {
          setChapterPlaylistError("Please enter a YouTube playlist URL.");
          toast.error("Missing Link", "Please enter a YouTube playlist URL.");
          return;
        }
        const parsed = parseYoutubeUrl(urlVal);
        if (!parsed || !parsed.id) {
          setChapterPlaylistError("Please enter a valid YouTube playlist link or ID.");
          toast.error("Invalid Link", "Please enter a valid YouTube playlist URL.");
          return;
        }
        setIsFetchingChapterPlaylist(true);
        try {
          const data = await fetchPlaylistWithFallback(parsed.id);
          if (!data || !data.videos || data.videos.length === 0) {
            throw new Error("No videos found in this YouTube playlist.");
          }
          preview = {
            title: data.title || "Imported Playlist",
            channelName: data.channelName || "YouTube",
            videosCount: data.videos.length,
            videos: data.videos
          };
          setChapterPlaylistPreview(preview);
          if (!finalTitle && data.title) {
            finalTitle = data.title;
          }
        } catch (err: any) {
          const msg = err.message || "Failed to fetch YouTube playlist.";
          setChapterPlaylistError(msg);
          toast.error("Import Failed", msg);
          return;
        } finally {
          setIsFetchingChapterPlaylist(false);
        }
      }

      if (!preview || preview.videos.length === 0) {
        setChapterPlaylistError("No videos found in YouTube playlist.");
        return;
      }

      if (!finalTitle) finalTitle = preview.title || `Chapter ${nextChapterNum}`;
      if (!finalDesc) finalDesc = `Imported playlist from ${preview.channelName} (${preview.videosCount} lectures)`;

      newLectures = preview.videos.map((vid: any, idx: number) => ({
        id: `lec-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        title: vid.title || `Lecture ${idx + 1}`,
        videoUrl: `https://www.youtube.com/watch?v=${vid.id}`,
        youtubeVideoId: vid.id,
        duration: vid.duration || "15:00",
        completed: false,
        progress: 0,
        lectureNumber: idx + 1
      }));
    } else {
      if (!finalTitle) return;
    }

    const newCh: CourseChapter = {
      id: `ch-${Date.now()}`,
      chapterNumber: nextChapterNum,
      title: finalTitle.startsWith("Chapter") ? finalTitle : `Chapter ${nextChapterNum}: ${finalTitle}`,
      description: finalDesc,
      lectures: newLectures
    };

    const updatedSubject: CustomSubjectFolder = {
      ...selectedSubject,
      chapters: [...selectedSubject.chapters, newCh]
    };

    Storage.saveCustomSubject(updatedSubject);
    setSelectedSubject(updatedSubject);
    setSubjects(subjects.map((s) => s.id === updatedSubject.id ? updatedSubject : s));

    setNewChapterTitle("");
    setNewChapterDesc("");
    setChapterPlaylistUrl("");
    setChapterPlaylistPreview(null);
    setChapterPlaylistError(null);
    setShowChapterModal(false);
    setExpandedChapterIds(prev => ({ ...prev, [newCh.id]: true }));

    if (newLectures.length > 0) {
      toast.success("Playlist Chapter Imported", `Created "${newCh.title}" with ${newLectures.length} lectures.`);
    } else {
      toast.success("Chapter Created", `Created "${newCh.title}".`);
    }
  };

  // Open Edit Chapter Modal
  const handleOpenEditChapter = (ch: CourseChapter, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChapter(ch);
    setEditChapterTitle(ch.title);
    setEditChapterDesc(ch.description || "");
    setEditChapterNumber(ch.chapterNumber);
    setShowEditChapterModal(true);
  };

  // Save Edit Chapter Name & Details
  const handleUpdateChapter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject || !editingChapter || !editChapterTitle.trim()) return;

    const updatedChapters = selectedSubject.chapters.map(ch => {
      if (ch.id === editingChapter.id) {
        return {
          ...ch,
          title: editChapterTitle.trim(),
          description: editChapterDesc.trim(),
          chapterNumber: Number(editChapterNumber) || ch.chapterNumber
        };
      }
      return ch;
    });

    const updatedSubj: CustomSubjectFolder = {
      ...selectedSubject,
      chapters: updatedChapters
    };

    Storage.saveCustomSubject(updatedSubj);
    setSelectedSubject(updatedSubj);
    setSubjects(subjects.map((s) => s.id === updatedSubj.id ? updatedSubj : s));
    if (playlistPlayerSubject?.id === updatedSubj.id) setPlaylistPlayerSubject(updatedSubj);

    setShowEditChapterModal(false);
    setEditingChapter(null);
  };

  // Execute Delete Chapter
  const executeDeleteChapter = (subjectId: string, chapterId: string) => {
    const targetSubj = subjects.find(s => s.id === subjectId) || (selectedSubject?.id === subjectId ? selectedSubject : null) || (playlistPlayerSubject?.id === subjectId ? playlistPlayerSubject : null);
    if (!targetSubj) return;

    const updatedChapters = targetSubj.chapters.filter(c => c.id !== chapterId);
    const updatedSubj: CustomSubjectFolder = { ...targetSubj, chapters: updatedChapters };

    Storage.saveCustomSubject(updatedSubj);
    setSubjects(subjects.map((s) => s.id === updatedSubj.id ? updatedSubj : s));
    if (selectedSubject?.id === updatedSubj.id) setSelectedSubject(updatedSubj);
    if (playlistPlayerSubject?.id === updatedSubj.id) setPlaylistPlayerSubject(updatedSubj);
  };

  // Add Lecture to Chapter (with Playlist URL auto-import support)
  const handleCreateLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject || !targetChapterId) return;

    const trimmedUrl = newLectureUrl.trim();
    if (!trimmedUrl) return;

    // Check if the link is a YouTube playlist link or ID
    const parsed = parseYoutubeUrl(trimmedUrl);
    if (parsed && parsed.type === "playlist" && parsed.id) {
      setIsFetchingMetadata(true);
      try {
        const playlistData = await fetchPlaylistWithFallback(parsed.id);
        if (playlistData && playlistData.videos && playlistData.videos.length > 0) {
          const targetChapter = selectedSubject.chapters.find(c => c.id === targetChapterId);
          const existingCount = targetChapter?.lectures.length || 0;

          const importedLectures: ChapterLecture[] = playlistData.videos.map((vid: any, idx: number) => ({
            id: `lec-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            title: vid.title || `Lecture ${existingCount + idx + 1}`,
            videoUrl: `https://www.youtube.com/watch?v=${vid.id}`,
            youtubeVideoId: vid.id,
            duration: vid.duration || "15:00",
            completed: false,
            progress: 0,
            lectureNumber: existingCount + idx + 1
          }));

          const updatedChapters = selectedSubject.chapters.map(ch => {
            if (ch.id === targetChapterId) {
              return {
                ...ch,
                lectures: [...ch.lectures, ...importedLectures]
              };
            }
            return ch;
          });

          const updatedSubj: CustomSubjectFolder = {
            ...selectedSubject,
            chapters: updatedChapters
          };

          Storage.saveCustomSubject(updatedSubj);
          setSelectedSubject(updatedSubj);
          setSubjects(subjects.map(s => s.id === updatedSubj.id ? updatedSubj : s));

          setNewLectureTitle("");
          setNewLectureUrl("");
          setNewLectureDuration("");
          setAutoFetchedStatus(null);
          setShowLectureModal(false);

          toast.success("Playlist Imported", `Added ${importedLectures.length} lectures from playlist into chapter.`);
          return;
        }
      } catch (err: any) {
        console.warn("[Add Lecture] Playlist fetch failed, falling back to single video...", err);
      } finally {
        setIsFetchingMetadata(false);
      }
    }

    const ytId = extractYoutubeId(trimmedUrl);
    if (!trimmedUrl && !ytId) return;

    const targetChapter = selectedSubject.chapters.find(c => c.id === targetChapterId);
    const lectureIndex = (targetChapter?.lectures.length || 0) + 1;

    let finalTitle = newLectureTitle.trim();
    let finalDuration = newLectureDuration.trim();

    if (ytId && ytId.length === 11 && (!finalTitle || !finalDuration || finalTitle.startsWith("Lecture") || finalDuration === "15:00")) {
      try {
        const metaRes = await fetch(`/api/video-metadata?id=${ytId}`);
        if (metaRes.ok) {
          const metaData = await metaRes.json();
          if (metaData.title && (!finalTitle || finalTitle.startsWith("Lecture"))) {
            finalTitle = metaData.title;
          }
          if (metaData.duration && (!finalDuration || finalDuration === "15:00")) {
            finalDuration = metaData.duration;
          }
        }
      } catch (e) {}
    }

    if (!finalTitle) finalTitle = ytId ? `Lecture (${ytId})` : `Lecture ${lectureIndex}`;
    if (!finalDuration) finalDuration = "10:00";

    const newLec: ChapterLecture = {
      id: `lec-${Date.now()}`,
      title: finalTitle,
      videoUrl: trimmedUrl,
      youtubeVideoId: ytId || "dQw4w9WgXcQ",
      duration: finalDuration,
      completed: false,
      progress: 0,
      lectureNumber: lectureIndex
    };

    const updatedChapters = selectedSubject.chapters.map(ch => {
      if (ch.id === targetChapterId) {
        return {
          ...ch,
          lectures: [...ch.lectures, newLec]
        };
      }
      return ch;
    });

    const updatedSubj: CustomSubjectFolder = {
      ...selectedSubject,
      chapters: updatedChapters
    };

    Storage.saveCustomSubject(updatedSubj);
    setSelectedSubject(updatedSubj);
    setSubjects(subjects.map(s => s.id === updatedSubj.id ? updatedSubj : s));

    setNewLectureTitle("");
    setNewLectureUrl("");
    setNewLectureDuration("");
    setAutoFetchedStatus(null);
    setShowLectureModal(false);
    toast.success("Lecture Added", `Added "${finalTitle}" to chapter.`);
  };

  // Toggle Lecture Completed Status
  const handleToggleLectureCompleted = (subjectId: string, chapterId: string, lectureId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetSubj = subjects.find(s => s.id === subjectId);
    if (!targetSubj) return;

    const updatedChapters = targetSubj.chapters.map(ch => {
      if (ch.id === chapterId) {
        return {
          ...ch,
          lectures: ch.lectures.map(l => {
            if (l.id === lectureId) {
              return { ...l, completed: !l.completed, progress: !l.completed ? 100 : 0 };
            }
            return l;
          })
        };
      }
      return ch;
    });

    const updatedSubj: CustomSubjectFolder = { ...targetSubj, chapters: updatedChapters };
    Storage.saveCustomSubject(updatedSubj);
    setSubjects(subjects.map(s => s.id === updatedSubj.id ? updatedSubj : s));
    if (selectedSubject?.id === updatedSubj.id) setSelectedSubject(updatedSubj);
    if (playlistPlayerSubject?.id === updatedSubj.id) setPlaylistPlayerSubject(updatedSubj);
  };

  // Open Edit Lecture Modal
  const handleOpenEditLecture = (chId: string, lec: ChapterLecture, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTargetEditChapterId(chId);
    setEditingLecture(lec);
    setEditLectureTitle(lec.title);
    setEditLectureUrl(lec.videoUrl || (lec.youtubeVideoId ? `https://www.youtube.com/watch?v=${lec.youtubeVideoId}` : ""));
    setEditLectureDuration(lec.duration || "15:00");
    setAutoFetchedEditStatus(null);
    setShowEditLectureModal(true);
  };

  // Auto-fetch video details for Edit Lecture modal
  const handleLectureEditUrlChange = async (urlVal: string) => {
    setEditLectureUrl(urlVal);
    setAutoFetchedEditStatus(null);
    const ytId = extractYoutubeId(urlVal);

    if (ytId && ytId.length === 11) {
      setIsFetchingEditMetadata(true);
      try {
        const res = await fetch(`/api/video-metadata?id=${ytId}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.title) {
            setEditLectureTitle(data.title);
            if (data.duration) setEditLectureDuration(data.duration);
            setAutoFetchedEditStatus(`✨ Auto-fetched: "${data.title}" (${data.duration || "Video"})`);
          }
        }
      } catch (err) {
        console.warn("Could not auto-fetch video details:", err);
      } finally {
        setIsFetchingEditMetadata(false);
      }
    }
  };

  // Save Edit Lecture Changes
  const handleUpdateLecture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject || !targetEditChapterId || !editingLecture || !editLectureTitle.trim()) return;

    const ytId = extractYoutubeId(editLectureUrl);

    const updatedChapters = selectedSubject.chapters.map(ch => {
      if (ch.id === targetEditChapterId) {
        return {
          ...ch,
          lectures: ch.lectures.map(l => {
            if (l.id === editingLecture.id) {
              return {
                ...l,
                title: editLectureTitle.trim(),
                videoUrl: editLectureUrl.trim(),
                youtubeVideoId: ytId || l.youtubeVideoId || "dQw4w9WgXcQ",
                duration: editLectureDuration.trim() || "15:00"
              };
            }
            return l;
          })
        };
      }
      return ch;
    });

    const updatedSubj: CustomSubjectFolder = {
      ...selectedSubject,
      chapters: updatedChapters
    };

    Storage.saveCustomSubject(updatedSubj);
    setSelectedSubject(updatedSubj);
    setSubjects(subjects.map(s => s.id === updatedSubj.id ? updatedSubj : s));
    if (playlistPlayerSubject?.id === updatedSubj.id) setPlaylistPlayerSubject(updatedSubj);

    if (activeLecture?.id === editingLecture.id) {
      setActiveLecture({
        ...activeLecture,
        title: editLectureTitle.trim(),
        videoUrl: editLectureUrl.trim(),
        youtubeVideoId: ytId || activeLecture.youtubeVideoId,
        duration: editLectureDuration.trim() || "15:00"
      });
    }

    setShowEditLectureModal(false);
    setEditingLecture(null);
  };

  // Execute Delete Lecture from Chapter
  const executeDeleteLecture = (subjectId: string, chapterId: string, lectureId: string) => {
    const targetSubj = subjects.find(s => s.id === subjectId) || (selectedSubject?.id === subjectId ? selectedSubject : null) || (playlistPlayerSubject?.id === subjectId ? playlistPlayerSubject : null);
    if (!targetSubj) return;

    const updatedChapters = targetSubj.chapters.map(ch => {
      if (ch.id === chapterId) {
        return {
          ...ch,
          lectures: ch.lectures.filter(l => l.id !== lectureId)
        };
      }
      return ch;
    });

    const updatedSubj: CustomSubjectFolder = { ...targetSubj, chapters: updatedChapters };
    Storage.saveCustomSubject(updatedSubj);
    setSubjects(subjects.map(s => s.id === updatedSubj.id ? updatedSubj : s));
    if (selectedSubject?.id === updatedSubj.id) setSelectedSubject(updatedSubj);
    if (playlistPlayerSubject?.id === updatedSubj.id) setPlaylistPlayerSubject(updatedSubj);

    if (activeLecture?.id === lectureId) {
      const remainingLectures = updatedSubj.chapters.flatMap(c => c.lectures);
      setActiveLecture(remainingLectures[0] || null);
    }
  };

  // Move / Reorder Lecture within a Chapter
  const handleMoveLecture = (subjectId: string, chapterId: string, lectureId: string, direction: 'up' | 'down', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetSubj = subjects.find(s => s.id === subjectId);
    if (!targetSubj) return;

    const updatedChapters = targetSubj.chapters.map(ch => {
      if (ch.id === chapterId) {
        const idx = ch.lectures.findIndex(l => l.id === lectureId);
        if (idx < 0) return ch;
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= ch.lectures.length) return ch;

        const newLecs = [...ch.lectures];
        const temp = newLecs[idx];
        newLecs[idx] = newLecs[targetIdx];
        newLecs[targetIdx] = temp;

        const renumbered = newLecs.map((l, i) => ({ ...l, lectureNumber: i + 1 }));

        return { ...ch, lectures: renumbered };
      }
      return ch;
    });

    const updatedSubj: CustomSubjectFolder = { ...targetSubj, chapters: updatedChapters };
    Storage.saveCustomSubject(updatedSubj);
    setSubjects(subjects.map(s => s.id === updatedSubj.id ? updatedSubj : s));
    if (selectedSubject?.id === updatedSubj.id) setSelectedSubject(updatedSubj);
    if (playlistPlayerSubject?.id === updatedSubj.id) setPlaylistPlayerSubject(updatedSubj);
  };

  // Build playlist info package for a chapter
  const buildPlaylistFromChapter = (subj: CustomSubjectFolder, ch: CourseChapter): PlaylistInfoPackage => {
    const videos: PlaylistVideoItem[] = (ch.lectures || [])
      .filter(l => !!l.youtubeVideoId)
      .map((l, index) => ({
        id: l.youtubeVideoId!,
        title: l.title,
        duration: l.duration || "15:00",
        completed: !!l.completed,
        progress: l.progress || 0,
        channelName: `${subj.subjectName} • ${ch.title}`,
        thumbnail: `https://i.ytimg.com/vi/${l.youtubeVideoId}/hqdefault.jpg`,
        lectureNumber: l.lectureNumber || index + 1
      }));

    return {
      id: `course-ch-${ch.id}`,
      title: `${subj.subjectName}: ${ch.title}`,
      videos
    };
  };

  // Build playlist info package for an entire subject
  const buildPlaylistFromSubject = (subj: CustomSubjectFolder): PlaylistInfoPackage => {
    const videos: PlaylistVideoItem[] = [];
    let globalIdx = 1;
    (subj.chapters || []).forEach(ch => {
      (ch.lectures || []).forEach(l => {
        if (l.youtubeVideoId) {
          videos.push({
            id: l.youtubeVideoId,
            title: l.title,
            duration: l.duration || "15:00",
            completed: !!l.completed,
            progress: l.progress || 0,
            channelName: `${subj.subjectName} • Ch.${ch.chapterNumber}`,
            thumbnail: `https://i.ytimg.com/vi/${l.youtubeVideoId}/hqdefault.jpg`,
            lectureNumber: l.lectureNumber || globalIdx++
          });
        }
      });
    });

    return {
      id: `course-subj-${subj.id}`,
      title: `${subj.subjectName} (Full Course)`,
      videos
    };
  };

  // Play Lecture in Player
  const handleStartPlayingLecture = (subj: CustomSubjectFolder, lec: ChapterLecture, chapterId?: string, switchToStudy = true) => {
    setPlaylistPlayerSubject(subj);
    setActiveLecture(lec);
    if (chapterId) setActiveChapterIdFilter(chapterId);

    if (onSelectLecture && lec.youtubeVideoId) {
      const targetChapter = subj.chapters.find(c => c.lectures.some(l => l.id === lec.id)) || 
        (chapterId ? subj.chapters.find(c => c.id === chapterId) : undefined);
      
      const playlistPackage = targetChapter 
        ? buildPlaylistFromChapter(subj, targetChapter)
        : buildPlaylistFromSubject(subj);

      onSelectLecture(
        lec.youtubeVideoId,
        lec.title,
        `${subj.subjectName}${targetChapter ? ` • ${targetChapter.title}` : ""}`,
        playlistPackage,
        switchToStudy
      );
    }
  };

  // Play a particular chapter as a standalone playlist
  const handlePlayChapterPlaylist = (subj: CustomSubjectFolder, ch: CourseChapter, e?: React.MouseEvent, switchToStudy = true) => {
    if (e) e.stopPropagation();
    if (!ch.lectures || ch.lectures.length === 0) {
      alert(`Chapter "${ch.title}" has no lectures added yet. Add a lecture first!`);
      return;
    }
    const firstLec = ch.lectures.find(l => !!l.youtubeVideoId) || ch.lectures[0];
    setPlaylistPlayerSubject(subj);
    setActiveChapterIdFilter(ch.id);
    setActiveLecture(firstLec);

    if (onSelectLecture && firstLec.youtubeVideoId) {
      const playlistPackage = buildPlaylistFromChapter(subj, ch);
      onSelectLecture(
        firstLec.youtubeVideoId,
        firstLec.title,
        `${subj.subjectName} • ${ch.title}`,
        playlistPackage,
        switchToStudy
      );
    }
  };

  // Play full subject as a complete playlist
  const handlePlaySubjectPlaylist = (subj: CustomSubjectFolder, switchToStudy = true) => {
    const allLectures: ChapterLecture[] = [];
    subj.chapters.forEach(ch => {
      ch.lectures.forEach(l => {
        if (l.youtubeVideoId) allLectures.push(l);
      });
    });

    if (allLectures.length === 0) {
      alert("Add at least one lecture with a YouTube video link to a chapter to play.");
      return;
    }

    const firstLec = allLectures[0];
    setPlaylistPlayerSubject(subj);
    setActiveChapterIdFilter("ALL");
    setActiveLecture(firstLec);

    if (onSelectLecture && firstLec.youtubeVideoId) {
      const playlistPackage = buildPlaylistFromSubject(subj);
      onSelectLecture(
        firstLec.youtubeVideoId,
        firstLec.title,
        `${subj.subjectName} (Full Course)`,
        playlistPackage,
        switchToStudy
      );
    }
  };

  // Toggle chapter accordion
  const toggleChapterExpand = (chId: string) => {
    setExpandedChapterIds(prev => ({ ...prev, [chId]: !prev[chId] }));
  };

  const renderEditSubjectModal = () => {
    if (!showEditSubjectModal || !editingSubject) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-blue-500" />
              Edit Subject Folder
            </h3>
            <button 
              onClick={() => setShowEditSubjectModal(false)}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleUpdateSubject} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                Subject Name
              </label>
              <input
                type="text"
                required
                value={editSubjectName}
                onChange={(e) => setEditSubjectName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                Category Name
              </label>
              {existingCategories.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-slate-200/50 dark:border-zinc-700/50">
                    <button
                      type="button"
                      onClick={() => setEditCategorySelectionMode("select")}
                      className={`flex-1 text-center py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        editCategorySelectionMode === "select"
                          ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-50 shadow-sm"
                          : "text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300"
                      }`}
                    >
                      Select Existing
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditCategorySelectionMode("new")}
                      className={`flex-1 text-center py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        editCategorySelectionMode === "new"
                          ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-50 shadow-sm"
                          : "text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300"
                      }`}
                    >
                      + Create New
                    </button>
                  </div>

                  {editCategorySelectionMode === "select" ? (
                    <select
                      value={selectedEditCategoryName}
                      onChange={(e) => setSelectedEditCategoryName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      {existingCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="e.g. Semester 1, Medical Prep, Competitive Exams"
                      value={editCategoryName}
                      onChange={(e) => setEditCategoryName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  required
                  placeholder="e.g. Semester 1, Medical Prep, Competitive Exams"
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                Subject Description
              </label>
              <textarea
                rows={2}
                value={editSubjectDesc}
                onChange={(e) => setEditSubjectDesc(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs p-3 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={(e) => {
                  if (editingSubject) {
                    setShowEditSubjectModal(false);
                    onRequestDeleteSubject(editingSubject.id, editingSubject.subjectName, e);
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/35 text-red-600 dark:text-red-400 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-red-100 dark:border-red-950"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Subject</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditSubjectModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold transition shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Save Subject
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderDeleteModal = () => {
    if (!deleteModal || !deleteModal.isOpen) return null;
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span>{deleteModal.title}</span>
            </h3>
            <button 
              onClick={() => setDeleteModal(null)}
              className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 py-1">
            <p className="text-xs text-slate-600 dark:text-zinc-300">
              Are you sure you want to delete <strong className="text-slate-900 dark:text-zinc-100">"{deleteModal.itemTitle}"</strong>?
            </p>
            <p className="text-[11px] text-red-500 dark:text-red-400 font-medium">
              This action cannot be undone.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setDeleteModal(null)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDeleteAction}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold transition shadow-md shadow-red-500/20 cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Split Chapter Handlers
  const handleToggleSplitChapterMode = (chapterId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (splittingChapterId === chapterId) {
      setSplittingChapterId(null);
      setSelectedSplitLectureIds([]);
    } else {
      setSplittingChapterId(chapterId);
      setSelectedSplitLectureIds([]);
    }
  };

  const handleToggleLectureSplitSelect = (lecId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedSplitLectureIds(prev => 
      prev.includes(lecId) ? prev.filter(id => id !== lecId) : [...prev, lecId]
    );
  };

  const handleSelectAllSplitLectures = (chapterLectures: ChapterLecture[]) => {
    setSelectedSplitLectureIds(chapterLectures.map(l => l.id));
  };

  const handleSelectLecturesFromHereOnwards = (chapterLectures: ChapterLecture[], startIndex: number) => {
    const idsFromHere = chapterLectures.slice(startIndex).map(l => l.id);
    setSelectedSplitLectureIds(prev => Array.from(new Set([...prev, ...idsFromHere])));
  };

  const handleClearSplitSelection = () => {
    setSelectedSplitLectureIds([]);
  };

  const handleOpenSplitChapterModal = (chapter: CourseChapter) => {
    if (selectedSplitLectureIds.length === 0) return;
    const nextChapterNum = (selectedSubject?.chapters.length || 0) + 1;
    setSplitDestinationType("NEW");
    
    const baseTitle = chapter.title.replace(/^Chapter \d+:\s*/i, '');
    setSplitNewChapterTitle(`Chapter ${nextChapterNum}: ${baseTitle} (Part 2)`);
    setSplitNewChapterDesc(`Split ${selectedSplitLectureIds.length} lectures from Chapter ${chapter.chapterNumber}.`);
    
    const otherChapters = selectedSubject?.chapters.filter(c => c.id !== chapter.id) || [];
    setSplitExistingChapterId(otherChapters[0]?.id || "");
    setShowSplitChapterModal(true);
  };

  const handleExecuteSplitChapter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject || !splittingChapterId || selectedSplitLectureIds.length === 0) return;

    const sourceChapter = selectedSubject.chapters.find(c => c.id === splittingChapterId);
    if (!sourceChapter) return;

    const lecturesToMove = sourceChapter.lectures.filter(l => selectedSplitLectureIds.includes(l.id));
    const remainingLectures = sourceChapter.lectures
      .filter(l => !selectedSplitLectureIds.includes(l.id))
      .map((lec, idx) => ({ ...lec, lectureNumber: idx + 1 }));

    let updatedChapters: CourseChapter[] = [];

    if (splitDestinationType === "NEW") {
      const newTitle = splitNewChapterTitle.trim() || `New Chapter`;
      const nextChapterNum = selectedSubject.chapters.length + 1;

      const newChapter: CourseChapter = {
        id: `ch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        chapterNumber: nextChapterNum,
        title: newTitle,
        description: splitNewChapterDesc.trim(),
        lectures: lecturesToMove.map((lec, idx) => ({ ...lec, lectureNumber: idx + 1 }))
      };

      const updatedSourceChapter: CourseChapter = {
        ...sourceChapter,
        lectures: remainingLectures
      };

      const sourceIndex = selectedSubject.chapters.findIndex(c => c.id === splittingChapterId);
      const tempChapters = [...selectedSubject.chapters];
      tempChapters[sourceIndex] = updatedSourceChapter;
      tempChapters.splice(sourceIndex + 1, 0, newChapter);

      updatedChapters = tempChapters.map((ch, idx) => ({
        ...ch,
        chapterNumber: idx + 1
      }));

      toast.success("Chapter Split Successfully", `Created "${newChapter.title}" with ${lecturesToMove.length} lectures.`);
    } else {
      if (!splitExistingChapterId) {
        toast.error("Target Chapter Required", "Please select an existing chapter destination.");
        return;
      }

      const targetChapter = selectedSubject.chapters.find(c => c.id === splitExistingChapterId);
      if (!targetChapter) return;

      const updatedTargetLectures = [
        ...targetChapter.lectures,
        ...lecturesToMove
      ].map((lec, idx) => ({ ...lec, lectureNumber: idx + 1 }));

      const updatedSourceChapter: CourseChapter = {
        ...sourceChapter,
        lectures: remainingLectures
      };

      const updatedTargetChapter: CourseChapter = {
        ...targetChapter,
        lectures: updatedTargetLectures
      };

      updatedChapters = selectedSubject.chapters.map(c => {
        if (c.id === sourceChapter.id) return updatedSourceChapter;
        if (c.id === targetChapter.id) return updatedTargetChapter;
        return c;
      });

      toast.success("Lectures Transferred", `Moved ${lecturesToMove.length} lectures into "${targetChapter.title}".`);
    }

    const updatedSubject: CustomSubjectFolder = {
      ...selectedSubject,
      chapters: updatedChapters
    };

    Storage.saveCustomSubject(updatedSubject);
    setSubjects(subjects.map(s => s.id === updatedSubject.id ? updatedSubject : s));
    setSelectedSubject(updatedSubject);
    if (playlistPlayerSubject?.id === updatedSubject.id) setPlaylistPlayerSubject(updatedSubject);

    setSplittingChapterId(null);
    setSelectedSplitLectureIds([]);
    setShowSplitChapterModal(false);
  };

  const renderSplitChapterModal = () => {
    if (!showSplitChapterModal || !selectedSubject || !splittingChapterId) return null;

    const sourceChapter = selectedSubject.chapters.find(c => c.id === splittingChapterId);
    if (!sourceChapter) return null;

    const selectedLectures = sourceChapter.lectures.filter(l => selectedSplitLectureIds.includes(l.id));

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto scrollbar-thin">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
              <Scissors className="w-5 h-5 text-purple-600" />
              <span>Split Chapter Lectures</span>
            </h3>
            <button 
              type="button"
              onClick={() => setShowSplitChapterModal(false)}
              className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Source Chapter Info */}
          <div className="p-3.5 bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50 rounded-2xl space-y-1">
            <div className="text-[10px] text-purple-600 dark:text-purple-400 font-extrabold uppercase tracking-wider">Source Chapter</div>
            <div className="text-xs font-extrabold text-slate-900 dark:text-zinc-100">
              Ch.{sourceChapter.chapterNumber}: {sourceChapter.title}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400">
              Extracting <strong className="text-purple-600 dark:text-purple-400">{selectedLectures.length}</strong> of {sourceChapter.lectures.length} total lectures.
            </div>
          </div>

          {/* List Preview of Selected Lectures */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 block">
              Lectures to be Split Out ({selectedLectures.length}):
            </label>
            <div className="bg-slate-50 dark:bg-zinc-950 rounded-2xl p-2.5 border border-slate-200 dark:border-zinc-800 max-h-36 overflow-y-auto space-y-1.5 scrollbar-thin">
              {selectedLectures.map((lec, idx) => (
                <div key={lec.id} className="flex items-center gap-2 text-xs bg-white dark:bg-zinc-900 p-2 rounded-xl border border-slate-100 dark:border-zinc-800/60">
                  <span className="w-5 h-5 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-extrabold text-[10px] flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-zinc-200 truncate flex-1">{lec.title}</span>
                  <span className="text-[10px] font-mono text-slate-400">{lec.duration || "15:00"}</span>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleExecuteSplitChapter} className="space-y-4 pt-1">
            {/* Destination Type Toggle */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block">
                Split Destination Option
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSplitDestinationType("NEW")}
                  className={`p-3 rounded-2xl border text-xs font-extrabold transition cursor-pointer flex flex-col items-center gap-1 ${
                    splitDestinationType === "NEW"
                      ? "bg-purple-50 dark:bg-purple-950/60 border-purple-500 text-purple-900 dark:text-purple-200 shadow-xs"
                      : "bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100"
                  }`}
                >
                  <FolderPlus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>✨ Create New Chapter</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSplitDestinationType("EXISTING")}
                  disabled={selectedSubject.chapters.length <= 1}
                  className={`p-3 rounded-2xl border text-xs font-extrabold transition cursor-pointer flex flex-col items-center gap-1 disabled:opacity-40 ${
                    splitDestinationType === "EXISTING"
                      ? "bg-purple-50 dark:bg-purple-950/60 border-purple-500 text-purple-900 dark:text-purple-200 shadow-xs"
                      : "bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-100"
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>📖 Move to Existing</span>
                </button>
              </div>
            </div>

            {/* Form Fields for NEW Chapter */}
            {splitDestinationType === "NEW" ? (
              <div className="space-y-3 bg-slate-50/50 dark:bg-zinc-950/30 p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                    New Chapter Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chapter 2: Advanced Topics"
                    value={splitNewChapterTitle}
                    onChange={(e) => setSplitNewChapterTitle(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                    New Chapter Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Summary of lectures in this split chapter..."
                    value={splitNewChapterDesc}
                    onChange={(e) => setSplitNewChapterDesc(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs p-3 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2 bg-slate-50/50 dark:bg-zinc-950/30 p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                  Select Destination Chapter
                </label>
                <select
                  value={splitExistingChapterId}
                  onChange={(e) => setSplitExistingChapterId(e.target.value)}
                  required
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold cursor-pointer"
                >
                  {selectedSubject.chapters
                    .filter(c => c.id !== sourceChapter.id)
                    .map(ch => (
                      <option key={ch.id} value={ch.id}>
                        📖 Ch.{ch.chapterNumber}: {ch.title} ({ch.lectures.length} existing lectures)
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setShowSplitChapterModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-extrabold shadow-md shadow-purple-500/20 transition cursor-pointer flex items-center gap-1.5"
              >
                <Scissors className="w-4 h-4" />
                <span>
                  {splitDestinationType === "NEW" ? "Confirm & Create Split Chapter" : "Move Lectures to Chapter"}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Helper to render standalone Import Playlist modal in any view
  const renderImportPlaylistModal = () => {
    if (!showImportPlaylistModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto scrollbar-thin">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
              <YoutubeBrandIcon className="w-5 h-5" />
              <span>
                {importTargetChapterId
                  ? "Import Playlist into Existing Chapter"
                  : selectedSubject && importTargetSubjectId === selectedSubject.id
                  ? `Import Playlist into ${selectedSubject.subjectName}`
                  : "Import Playlist as Chapter"}
              </span>
            </h3>
            <button 
              onClick={() => {
                setShowImportPlaylistModal(false);
                setImportTargetChapterId(null);
              }}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-normal">
            {importTargetChapterId
              ? "Paste any YouTube Playlist URL to convert and append all its videos directly as lectures into this chapter."
              : "Paste any YouTube Playlist URL to convert all its videos into a structured chapter inside your chosen subject folder."}
          </p>

          <form onSubmit={handleExecuteImportPlaylist} className="space-y-4">
            {/* Target Location / Subject Selection */}
            {selectedSubject ? (
              <div className="p-3.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-blue-500 shrink-0" />
                    <div>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold uppercase tracking-wider block">Target Course / Subject</span>
                      <span className="font-extrabold text-slate-900 dark:text-zinc-100">{selectedSubject.subjectName}</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-lg text-[10px] font-extrabold shrink-0">
                    Current Subject
                  </span>
                </div>

                {/* Chapter Destination selection inside current subject */}
                <div className="pt-2 border-t border-blue-200/60 dark:border-blue-900/40">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                    Chapter Destination inside {selectedSubject.subjectName}:
                  </label>
                  <select
                    value={importTargetChapterId || "NEW_CHAPTER"}
                    onChange={(e) => {
                      if (e.target.value === "NEW_CHAPTER") {
                        setImportTargetChapterId(null);
                      } else {
                        setImportTargetChapterId(e.target.value);
                      }
                    }}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs px-3 py-2 rounded-xl text-slate-800 dark:text-zinc-200 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="NEW_CHAPTER">✨ Create as New Chapter in {selectedSubject.subjectName}</option>
                    {selectedSubject.chapters.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        📖 Append Lectures directly to: {ch.title} ({ch.lectures.length} lectures)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : importTargetChapterId ? (
              (() => {
                const activeSubj = subjects.find(s => s.id === importTargetSubjectId) || selectedSubject;
                const activeCh = activeSubj?.chapters.find(c => c.id === importTargetChapterId);
                return (
                  <div className="p-3.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-2xl flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-blue-600 dark:text-blue-400 block text-[10px] font-extrabold uppercase tracking-wider">Target Chapter</span>
                      <span className="font-extrabold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5 mt-0.5">
                        <Folder className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="truncate max-w-[120px]">{activeSubj?.subjectName}</span>
                        <span className="text-slate-400">➔</span>
                        <BookOpen className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        <span className="truncate max-w-[140px]">{activeCh?.title}</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImportTargetChapterId(null)}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer shrink-0"
                    >
                      Create New Chapter
                    </button>
                  </div>
                );
              })()
            ) : (
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                  Target Subject Folder
                </label>
                <select
                  value={importTargetSubjectId}
                  onChange={(e) => setImportTargetSubjectId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-bold"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      📁 {s.subjectName} ({s.chapters.length} existing chapters)
                    </option>
                  ))}
                  <option value="NEW">+ Create New Subject Folder for this Playlist</option>
                </select>
              </div>
            )}

            {/* YouTube Playlist URL Input */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                YouTube Playlist Link or ID
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    required
                    placeholder="e.g. https://www.youtube.com/playlist?list=PL123..."
                    value={importPlaylistUrl}
                    onChange={(e) => handleFetchImportPlaylist(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  {isFetchingImportPlaylist && (
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin absolute right-3 top-3" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleFetchImportPlaylist(importPlaylistUrl, true)}
                  disabled={isFetchingImportPlaylist || !importPlaylistUrl.trim()}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition cursor-pointer shrink-0 flex items-center gap-1.5"
                >
                  {isFetchingImportPlaylist ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>Fetch</span>
                </button>
              </div>
            </div>

            {/* Error Alert */}
            {importPlaylistError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{importPlaylistError}</span>
              </div>
            )}

            {/* Live Playlist Preview Card */}
            {importPlaylistPreview && (
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-start gap-3">
                  {importPlaylistPreview.thumbnail ? (
                    <img
                      src={importPlaylistPreview.thumbnail}
                      alt="Playlist Preview"
                      referrerPolicy="no-referrer"
                      className="w-20 h-14 object-cover rounded-xl border border-emerald-300/50 dark:border-emerald-700 shrink-0 shadow-xs"
                    />
                  ) : (
                    <div className="w-20 h-14 bg-emerald-100 dark:bg-emerald-900 rounded-xl flex items-center justify-center shrink-0">
                      <YoutubeBrandIcon className="w-6 h-6" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-[10px] font-extrabold uppercase mb-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Ready to Import • {importPlaylistPreview.videosCount} Videos</span>
                    </div>
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-zinc-50 line-clamp-1">
                      {importPlaylistPreview.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-semibold mt-0.5">
                      Channel: {importPlaylistPreview.channelName}
                    </p>
                  </div>
                </div>

                {/* Sample Video Titles List */}
                <div className="bg-white/80 dark:bg-zinc-900/80 rounded-xl p-2.5 border border-emerald-200/50 dark:border-emerald-900/40 text-[11px] space-y-1 max-h-28 overflow-y-auto scrollbar-thin">
                  <p className="font-extrabold text-slate-700 dark:text-zinc-300 text-[10px] uppercase tracking-wide">
                    Playlist Videos Preview:
                  </p>
                  {importPlaylistPreview.videos.slice(0, 5).map((vid: any, idx: number) => (
                    <div key={vid.id || idx} className="text-slate-600 dark:text-zinc-400 truncate flex items-center gap-1.5">
                      <span className="text-emerald-600 font-bold shrink-0">{idx + 1}.</span>
                      <span className="truncate">{vid.title}</span>
                    </div>
                  ))}
                  {importPlaylistPreview.videos.length > 5 && (
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 italic pt-1">
                      + {importPlaylistPreview.videos.length - 5} more videos
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Editable Chapter Title & Description (Only for New Chapters) */}
            {!importTargetChapterId && (
              <>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                    Chapter Name / Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chapter 2: Advanced React Patterns"
                    value={importChapterTitle}
                    onChange={(e) => setImportChapterTitle(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                    Chapter Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Summary of playlist content..."
                    value={importChapterDesc}
                    onChange={(e) => setImportChapterDesc(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs p-3 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setShowImportPlaylistModal(false);
                  setImportTargetChapterId(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isFetchingImportPlaylist || !importPlaylistPreview}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 text-white text-xs font-extrabold shadow-md shadow-red-500/20 transition cursor-pointer flex items-center gap-1.5"
              >
                <YoutubeBrandIcon className="w-4 h-4" />
                <span>
                  {importTargetChapterId ? "Import Lectures into Chapter" : "Import Playlist as Chapter"}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // =========================================================================
  // RENDER VIEW 1: CHAPTER PLAYLIST PLAYER (When watching lectures chapter-wise)
  // =========================================================================
  if (playlistPlayerSubject && activeLecture) {
    const { total, completed, percentage } = getSubjectProgress(playlistPlayerSubject);
    
    // Determine list of chapters to render in the queue
    const chaptersToDisplay = activeChapterIdFilter === "ALL" 
      ? playlistPlayerSubject.chapters 
      : playlistPlayerSubject.chapters.filter(ch => ch.id === activeChapterIdFilter);

    // Find all lectures in order for current queue scope
    const queueLecturesInOrder: { chapter: CourseChapter; lecture: ChapterLecture }[] = [];
    chaptersToDisplay.forEach(ch => {
      ch.lectures.forEach(l => {
        queueLecturesInOrder.push({ chapter: ch, lecture: l });
      });
    });

    const currentIdx = queueLecturesInOrder.findIndex(item => item.lecture.id === activeLecture.id);
    const prevItem = currentIdx > 0 ? queueLecturesInOrder[currentIdx - 1] : null;
    const nextItem = currentIdx < queueLecturesInOrder.length - 1 ? queueLecturesInOrder[currentIdx + 1] : null;

    const currentChapter = playlistPlayerSubject.chapters.find(ch => 
      ch.lectures.some(l => l.id === activeLecture.id)
    );

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Navigation Top Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => {
                setPlaylistPlayerSubject(null);
                setActiveLecture(null);
              }}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-bold text-xs px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-700 transition flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-blue-500" />
              Back to Course Library
            </button>

            {/* Scope Filter Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-zinc-950 p-1 rounded-2xl border border-slate-200 dark:border-zinc-800 text-xs">
              <button
                onClick={() => setActiveChapterIdFilter("ALL")}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  activeChapterIdFilter === "ALL"
                    ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-500 dark:text-zinc-400 hover:text-slate-800"
                }`}
              >
                All Chapters ({playlistPlayerSubject.chapters.length})
              </button>
              {currentChapter && (
                <button
                  onClick={() => setActiveChapterIdFilter(currentChapter.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                    activeChapterIdFilter === currentChapter.id
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-500 dark:text-zinc-400 hover:text-slate-800"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Ch. {currentChapter.chapterNumber} Only
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end flex-wrap">
            <button
              onClick={() => {
                if (activeLecture && activeLecture.youtubeVideoId && playlistPlayerSubject) {
                  const currentChapter = playlistPlayerSubject.chapters.find(ch => 
                    ch.lectures.some(l => l.id === activeLecture.id)
                  );
                  const pkg = activeChapterIdFilter === "ALL" 
                    ? buildPlaylistFromSubject(playlistPlayerSubject) 
                    : (currentChapter ? buildPlaylistFromChapter(playlistPlayerSubject, currentChapter) : buildPlaylistFromSubject(playlistPlayerSubject));

                  if (onSelectLecture) {
                    onSelectLecture(
                      activeLecture.youtubeVideoId,
                      activeLecture.title,
                      `${playlistPlayerSubject.subjectName}`,
                      pkg,
                      true
                    );
                  }
                }
              }}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-md shadow-blue-500/20 transition flex items-center gap-1.5 cursor-pointer"
              title="Open in Main Study Space with AI Notes & Pomodoro"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-200 animate-pulse" />
              <span>Open in Main Study Workspace</span>
            </button>

            <span className="text-xs font-bold text-slate-600 dark:text-zinc-400 hidden sm:inline">
              Subject Progress:
            </span>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800">
              <div className="w-20 bg-slate-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div style={{ width: `${percentage}%` }} className="bg-emerald-500 h-full rounded-full transition-all duration-300" />
              </div>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                {completed}/{total} ({percentage}%)
              </span>
            </div>
          </div>
        </div>

        {/* Player + Chapter Playlist Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Video Screen */}
          <div className="lg:col-span-8 space-y-4">
            <div className="relative aspect-video rounded-3xl overflow-hidden bg-black shadow-2xl border border-slate-800">
              {activeLecture.youtubeVideoId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${activeLecture.youtubeVideoId}?autoplay=1&rel=0`}
                  title={activeLecture.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-zinc-400 space-y-3">
                  <Video className="w-12 h-12 text-zinc-600" />
                  <p className="text-sm font-bold text-zinc-300">No YouTube Video Link Assigned</p>
                  <p className="text-xs text-zinc-500 max-w-sm">
                    Enter a YouTube video URL for this lecture in the chapter organizer to play it directly here.
                  </p>
                </div>
              )}
            </div>

            {/* Lecture Controls & Header */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 pb-4">
                <div>
                  <div className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-blue-500" />
                    {playlistPlayerSubject.subjectName} {currentChapter ? `• ${currentChapter.title}` : ""}
                  </div>
                  <h1 className="text-lg font-extrabold text-slate-900 dark:text-zinc-50 mt-1">
                    {activeLecture.title}
                  </h1>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      if (currentChapter) {
                        handleToggleLectureCompleted(playlistPlayerSubject.id, currentChapter.id, activeLecture.id, e);
                      }
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer ${
                      activeLecture.completed
                        ? "bg-emerald-500 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {activeLecture.completed ? "Marked Done" : "Mark Complete"}
                  </button>
                </div>
              </div>

              {/* Prev / Next Lecture Jump Buttons */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  disabled={!prevItem}
                  onClick={() => prevItem && handleStartPlayingLecture(playlistPlayerSubject, prevItem.lecture, prevItem.chapter.id)}
                  className="flex-1 bg-slate-50 dark:bg-zinc-950 hover:bg-slate-100 dark:hover:bg-zinc-850 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200 dark:border-zinc-800 p-3 rounded-2xl text-left transition"
                >
                  <div className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase">Previous Lecture</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-zinc-200 line-clamp-1 mt-0.5">
                    {prevItem ? prevItem.lecture.title : "Beginning of syllabus"}
                  </div>
                </button>

                <button
                  disabled={!nextItem}
                  onClick={() => nextItem && handleStartPlayingLecture(playlistPlayerSubject, nextItem.lecture, nextItem.chapter.id)}
                  className="flex-1 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/60 disabled:opacity-40 disabled:cursor-not-allowed border border-blue-200 dark:border-blue-900/40 p-3 rounded-2xl text-right transition"
                >
                  <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">Next Lecture</div>
                  <div className="text-xs font-bold text-blue-950 dark:text-blue-200 line-clamp-1 mt-0.5">
                    {nextItem ? nextItem.lecture.title : "End of syllabus"}
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Chapter Playlist Sidebar */}
          <div className="lg:col-span-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col h-[650px]">
            <div className="border-b border-slate-100 dark:border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-zinc-50 uppercase tracking-wide flex items-center gap-1.5">
                  <ListVideo className="w-4.5 h-4.5 text-blue-500" />
                  {activeChapterIdFilter === "ALL" ? "Subject Lectures Queue" : "Chapter Playlist Queue"}
                </h2>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
                  {queueLecturesInOrder.length} lectures in current playlist
                </p>
              </div>
              
              {activeChapterIdFilter !== "ALL" && (
                <button
                  onClick={() => setActiveChapterIdFilter("ALL")}
                  className="text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-600 dark:text-zinc-300 px-2.5 py-1 rounded-xl transition"
                >
                  View All
                </button>
              )}
            </div>

            {/* Chapters Accordion List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {chaptersToDisplay.map((ch) => {
                const isExpanded = expandedChapterIds[ch.id] !== false;
                const { total: chTotal, completed: chCompleted } = getChapterProgress(ch);

                return (
                  <div key={ch.id} className="border border-slate-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-zinc-950/30">
                    <div className="p-3 bg-slate-100/60 dark:bg-zinc-900/80 flex items-center justify-between">
                      <button
                        onClick={() => toggleChapterExpand(ch.id)}
                        className="flex items-center gap-2 min-w-0 pr-2 text-left hover:text-blue-600 transition cursor-pointer"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-blue-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
                        <div className="min-w-0">
                          <div className="text-xs font-extrabold text-slate-900 dark:text-zinc-100 truncate">
                            {ch.title}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-semibold">
                            {chCompleted}/{chTotal} lectures completed
                          </div>
                        </div>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md">
                          Ch.{ch.chapterNumber}
                        </span>
                      </div>
                    </div>

                    {/* Chapter Lectures */}
                    {isExpanded && (
                      <div className="p-2 pt-1 space-y-1.5 border-t border-slate-200/40 dark:border-zinc-850">
                        {ch.lectures.length === 0 ? (
                          <div className="p-3 text-center text-[11px] text-slate-400 dark:text-zinc-500">
                            No lectures inside this chapter yet.
                          </div>
                        ) : (
                          ch.lectures.map((lec) => {
                            const isPlaying = activeLecture.id === lec.id;
                            return (
                              <div
                                key={lec.id}
                                onClick={() => handleStartPlayingLecture(playlistPlayerSubject, lec, ch.id)}
                                className={`group p-2 rounded-xl cursor-pointer transition flex items-center justify-between gap-2.5 border ${
                                  isPlaying
                                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                                    : lec.completed
                                      ? "bg-emerald-500/10 dark:bg-emerald-950/20 text-slate-800 dark:text-zinc-200 border-emerald-500/30"
                                      : "bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 border-slate-200/60 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-zinc-700"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <button
                                    onClick={(e) => handleToggleLectureCompleted(playlistPlayerSubject.id, ch.id, lec.id, e)}
                                    className="shrink-0 p-0.5 hover:scale-110 transition cursor-pointer"
                                    title={lec.completed ? "Mark uncompleted" : "Mark completed"}
                                  >
                                    <CheckCircle2 className={`w-4 h-4 ${
                                      isPlaying
                                        ? "text-white fill-white/20"
                                        : lec.completed
                                          ? "text-emerald-500 fill-emerald-500/20"
                                          : "text-slate-300 dark:text-zinc-700"
                                    }`} />
                                  </button>

                                  {/* Lecture Mini Thumbnail */}
                                  <div className="relative w-12 h-8 rounded-lg overflow-hidden bg-black shrink-0 border border-slate-200/50 dark:border-zinc-700">
                                    {lec.youtubeVideoId ? (
                                      <img
                                        src={`https://i.ytimg.com/vi/${lec.youtubeVideoId}/hqdefault.jpg`}
                                        alt={lec.title}
                                        referrerPolicy="no-referrer"
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-zinc-500">
                                        <Video className="w-3.5 h-3.5" />
                                      </div>
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className={`text-xs font-bold line-clamp-1 ${isPlaying ? "text-white" : ""}`}>
                                      {lec.title}
                                    </div>
                                    <div className={`text-[10px] ${isPlaying ? "text-blue-100" : "text-slate-400 dark:text-zinc-500"}`}>
                                      {lec.duration || "15:00"}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    {isPlaying ? (
                                      <span className="text-[9px] font-black uppercase bg-white/20 text-white px-2 py-0.5 rounded animate-pulse">
                                        Playing
                                      </span>
                                    ) : (
                                      <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                                        <button
                                          onClick={(e) => handleOpenEditLecture(ch.id, lec, e)}
                                          className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-blue-500 rounded cursor-pointer"
                                          title="Edit lecture"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={(e) => onRequestDeleteLecture(playlistPlayerSubject.id, ch.id, lec.id, lec.title, e)}
                                          className="p-1 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-500 rounded cursor-pointer"
                                          title="Delete lecture"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
        {renderDeleteModal()}
        {renderImportPlaylistModal()}
      </div>
    );
  }

  // =========================================================================
  // RENDER VIEW 2: SUBJECT CHAPTER ORGANIZER VIEW (When user opens a Subject)
  // =========================================================================
  if (selectedSubject) {
    const { total, completed, percentage } = getSubjectProgress(selectedSubject);

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Header Breadcrumb & Control Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
          <div>
            <button
              onClick={() => setSelectedSubject(null)}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to All Subjects
            </button>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                {selectedSubject.category}
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-zinc-50">
                {selectedSubject.subjectName}
              </h1>
            </div>
            {selectedSubject.description && (
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-2xl">
                {selectedSubject.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {total > 0 && (
              <button
                onClick={() => handlePlaySubjectPlaylist(selectedSubject, true)}
                className="bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 font-bold text-xs px-3.5 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800/60 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Play full subject playlist"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play Subject</span>
              </button>
            )}

            <button
              onClick={() => {
                setChapterModalTab("manual");
                setShowChapterModal(true);
              }}
              className="bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 font-bold text-xs px-3.5 py-2 rounded-xl border border-blue-200/60 dark:border-blue-900/40 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Add a new chapter to this subject"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Chapter</span>
            </button>

            {/* Subject Header Three Dots Options Menu */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSubjectHeaderMenu(!showSubjectHeaderMenu);
                }}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  showSubjectHeaderMenu
                    ? "bg-slate-200 dark:bg-zinc-700 border-slate-300 dark:border-zinc-600 text-slate-900 dark:text-zinc-100"
                    : "bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300"
                }`}
                title="More options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showSubjectHeaderMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-20" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSubjectHeaderMenu(false);
                    }} 
                  />
                  <div className="absolute right-0 top-full mt-1.5 z-30 w-48 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSubjectHeaderMenu(false);
                        handleOpenEditSubject(selectedSubject, e);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                      <span>Edit Subject</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSubjectHeaderMenu(false);
                        handleOpenImportPlaylistModal(selectedSubject);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <YoutubeBrandIcon className="w-3.5 h-3.5" />
                      <span>Import Playlist</span>
                    </button>

                    <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSubjectHeaderMenu(false);
                        onRequestDeleteSubject(selectedSubject.id, selectedSubject.subjectName, e);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Subject</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Progress Tracker Banner */}
        <div className="bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-blue-500/20 dark:border-blue-500/30 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-zinc-50">
                Chapter Syllabus Completion
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Organized across {selectedSubject.chapters.length} chapter folders
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-base font-black text-slate-900 dark:text-zinc-50">
                {completed} / {total} Lectures
              </div>
              <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                {percentage}% Completed
              </div>
            </div>
            <div className="w-24 bg-slate-200 dark:bg-zinc-800 h-3 rounded-full overflow-hidden border border-slate-300 dark:border-zinc-700">
              <div style={{ width: `${percentage}%` }} className="bg-emerald-500 h-full rounded-full transition-all duration-300" />
            </div>
          </div>
        </div>

        {/* Chapters Folders & Lectures List */}
        <div className="space-y-4">
          {selectedSubject.chapters.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-12 text-center space-y-3">
              <Folder className="w-12 h-12 text-slate-300 dark:text-zinc-700 mx-auto" />
              <h3 className="text-base font-extrabold text-slate-800 dark:text-zinc-200">No Chapters Created Yet</h3>
              <p className="text-xs text-slate-400 dark:text-zinc-500 max-w-sm mx-auto">
                Create custom chapters for this subject (e.g. Chapter 1: Kinematics, Chapter 2: Dynamics) and add lectures to them.
              </p>
              <button
                onClick={() => setShowChapterModal(true)}
                className="bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow"
              >
                Create Chapter 1
              </button>
            </div>
          ) : (
            selectedSubject.chapters.map((ch) => {
              const { total: chTotal, completed: chDone, percentage: chPct } = getChapterProgress(ch);

              return (
                <div 
                  key={ch.id} 
                  className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4"
                >
                  {/* Chapter Header Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800/80 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-extrabold text-sm flex items-center justify-center border border-blue-200/50 dark:border-blue-900/40 shrink-0">
                        Ch.{ch.chapterNumber}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-50">
                            {ch.title}
                          </h3>
                        </div>
                        {ch.description && (
                          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                            {ch.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                      <span className="text-xs font-bold text-slate-500 dark:text-zinc-400 mr-1">
                        {chDone}/{chTotal} ({chPct}%)
                      </span>

                      {ch.lectures.length > 0 && (
                        <button
                          onClick={(e) => handlePlayChapterPlaylist(selectedSubject, ch, e)}
                          className="bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 font-bold text-xs px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                          title="Play this chapter"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Play Chapter</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setTargetChapterId(ch.id);
                          setShowLectureModal(true);
                        }}
                        className="bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 font-bold text-xs px-3 py-1.5 rounded-xl border border-blue-200/60 dark:border-blue-900/40 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        title="Add a new lecture to this chapter"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Lecture</span>
                      </button>

                      {/* Chapter Three Dots Options Menu */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenChapterMenuId(openChapterMenuId === ch.id ? null : ch.id);
                          }}
                          className={`p-1.5 rounded-xl border transition cursor-pointer ${
                            openChapterMenuId === ch.id
                              ? "bg-slate-200 dark:bg-zinc-700 border-slate-300 dark:border-zinc-600 text-slate-900 dark:text-zinc-100"
                              : "bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300"
                          }`}
                          title="More options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openChapterMenuId === ch.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-20" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenChapterMenuId(null);
                              }} 
                            />
                            <div className="absolute right-0 top-full mt-1.5 z-30 w-48 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenChapterMenuId(null);
                                  toggleChapterManageMode(ch.id, e);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                                <span>{managingChapterIds[ch.id] ? "Done Editing" : "Edit Chapter"}</span>
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenChapterMenuId(null);
                                  handleToggleSplitChapterMode(ch.id, e);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                <Scissors className="w-3.5 h-3.5 text-purple-500" />
                                <span>{splittingChapterId === ch.id ? "Cancel Split" : "Split Chapter"}</span>
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenChapterMenuId(null);
                                  handleOpenImportPlaylistModal(selectedSubject, ch);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                <YoutubeBrandIcon className="w-3.5 h-3.5" />
                                <span>Import Playlist</span>
                              </button>

                              <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenChapterMenuId(null);
                                  onRequestDeleteChapter(selectedSubject.id, ch.id, ch.title, e);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Chapter</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Chapter Edit Mode Active Banner */}
                  {managingChapterIds[ch.id] && (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border border-amber-200/80 dark:border-amber-900/50 text-amber-950 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-semibold animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>
                          <strong>Editing Chapter {ch.chapterNumber}:</strong> Reorder, edit, or delete lectures are now active on the cards below.
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <button
                          onClick={(e) => handleOpenEditChapter(ch, e)}
                          className="px-3 py-1.5 bg-amber-200/80 dark:bg-amber-800/80 hover:bg-amber-300 text-amber-950 dark:text-amber-100 font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                          Edit Chapter Title & Number
                        </button>
                        <button
                          onClick={(e) => toggleChapterManageMode(ch.id, e)}
                          className="px-3.5 py-1.5 bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold rounded-xl transition cursor-pointer shadow-2xs"
                        >
                          Done Editing
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Chapter Split Mode Active Banner */}
                  {splittingChapterId === ch.id && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-blue-950/30 border border-purple-200/80 dark:border-purple-900/50 text-purple-950 dark:text-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold animate-in fade-in">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-purple-600 text-white rounded-xl shadow-xs">
                          <Scissors className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900 dark:text-zinc-50">
                            Split Chapter Mode Active (Ch. {ch.chapterNumber})
                          </h4>
                          <p className="text-[11px] text-slate-600 dark:text-zinc-400">
                            Select lectures below to split away into a new chapter folder or transfer.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleSelectAllSplitLectures(ch.lectures)}
                          className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-purple-200 dark:border-purple-800/60 hover:bg-purple-100 text-purple-900 dark:text-purple-200 font-bold rounded-xl transition cursor-pointer text-[11px]"
                        >
                          Select All ({ch.lectures.length})
                        </button>

                        {selectedSplitLectureIds.length > 0 && (
                          <button
                            type="button"
                            onClick={handleClearSplitSelection}
                            className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 font-bold rounded-xl transition cursor-pointer text-[11px]"
                          >
                            Clear Selection
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={selectedSplitLectureIds.length === 0}
                          onClick={() => handleOpenSplitChapterModal(ch)}
                          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white font-extrabold rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5 text-xs"
                        >
                          <Scissors className="w-3.5 h-3.5" />
                          <span>Split {selectedSplitLectureIds.length} Selected into New Chapter</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleSplitChapterMode(ch.id)}
                          className="px-3 py-1.5 bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold rounded-xl transition cursor-pointer text-[11px]"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Chapter Lectures Cards */}
                  {ch.lectures.length === 0 ? (
                    <div className="p-6 bg-slate-50/50 dark:bg-zinc-950/30 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl text-center space-y-3">
                      <p className="text-xs text-slate-400 dark:text-zinc-500">No lectures inside this chapter yet.</p>
                      <div className="flex items-center justify-center gap-2.5 flex-wrap">
                        <button
                          onClick={() => {
                            setTargetChapterId(ch.id);
                            setShowLectureModal(true);
                          }}
                          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 px-3.5 py-2 rounded-xl border border-blue-200/60 dark:border-blue-900/30 transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Add Single Lecture</span>
                        </button>
                        <button
                          onClick={() => handleOpenImportPlaylistModal(selectedSubject, ch)}
                          className="text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 px-3.5 py-2 rounded-xl border border-red-200/60 dark:border-red-900/30 transition cursor-pointer flex items-center gap-1.5"
                        >
                          <YoutubeBrandIcon className="w-3.5 h-3.5" />
                          <span>+ Import YouTube Playlist</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {ch.lectures.map((lec, index) => {
                        const isSelectedForSplit = splittingChapterId === ch.id && selectedSplitLectureIds.includes(lec.id);

                        return (
                          <div
                            key={lec.id}
                            onClick={splittingChapterId === ch.id ? (e) => handleToggleLectureSplitSelect(lec.id, e) : undefined}
                            className={`group rounded-2xl border transition overflow-hidden flex flex-col justify-between shadow-xs ${
                              splittingChapterId === ch.id
                                ? isSelectedForSplit
                                  ? "ring-2 ring-purple-500 border-purple-500 bg-purple-50/50 dark:bg-purple-950/30 cursor-pointer"
                                  : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-purple-300 cursor-pointer"
                                : lec.completed
                                  ? "bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-500/30"
                                  : "bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-zinc-700"
                            }`}
                          >
                          {/* Lecture Thumbnail Header */}
                          <div className="relative aspect-video bg-zinc-950 overflow-hidden group/thumb">
                            {lec.youtubeVideoId ? (
                              <img
                                src={`https://i.ytimg.com/vi/${lec.youtubeVideoId}/hqdefault.jpg`}
                                alt={lec.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover/thumb:scale-105 transition duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 space-y-1 p-2">
                                <Video className="w-8 h-8 text-zinc-600" />
                                <span className="text-[10px] font-bold">No Thumbnail</span>
                              </div>
                            )}

                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90" />

                            {/* Split Mode Checkbox Pill */}
                            {splittingChapterId === ch.id && (
                              <button
                                type="button"
                                onClick={(e) => handleToggleLectureSplitSelect(lec.id, e)}
                                className={`absolute top-2.5 left-2.5 z-20 px-2.5 py-1 rounded-xl text-[11px] font-black uppercase flex items-center gap-1.5 shadow-md border transition cursor-pointer ${
                                  isSelectedForSplit
                                    ? "bg-purple-600 text-white border-purple-400"
                                    : "bg-black/70 backdrop-blur-md text-white/90 border-white/20 hover:bg-black/90"
                                }`}
                              >
                                {isSelectedForSplit ? (
                                  <>
                                    <CheckSquare className="w-3.5 h-3.5 text-white" />
                                    <span>Selected</span>
                                  </>
                                ) : (
                                  <>
                                    <Square className="w-3.5 h-3.5 text-zinc-400" />
                                    <span>Select</span>
                                  </>
                                )}
                              </button>
                            )}

                            {/* Lecture Number Pill */}
                            {splittingChapterId !== ch.id && (
                              <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider border border-white/20">
                                Lec {lec.lectureNumber || index + 1}
                              </div>
                            )}

                            {/* Duration Badge */}
                            <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-white text-[10px] font-bold font-mono border border-white/10">
                              {lec.duration || "15:00"}
                            </div>

                            {/* Completed Badge */}
                            {lec.completed && splittingChapterId !== ch.id && (
                              <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-emerald-500 text-white text-[10px] font-extrabold flex items-center gap-1 shadow-sm">
                                <CheckCircle2 className="w-3 h-3" />
                                Done
                              </div>
                            )}

                            {/* Hover Play Button Overlay */}
                            {splittingChapterId !== ch.id && (
                              <button
                                onClick={() => handleStartPlayingLecture(selectedSubject, lec, ch.id)}
                                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition duration-200 cursor-pointer"
                                title="Play Lecture"
                              >
                                <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg transform group-hover/thumb:scale-110 transition">
                                  <Play className="w-5 h-5 fill-current ml-0.5" />
                                </div>
                              </button>
                            )}
                          </div>

                          {/* Card Content & Title */}
                          <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                            <div>
                              <h4 className="text-xs font-extrabold text-slate-900 dark:text-zinc-100 line-clamp-2 leading-snug">
                                {lec.title}
                              </h4>
                            </div>

                            {/* Bottom Action Toolbar */}
                            <div className="pt-2.5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-1.5">
                              {/* Mark Completed Toggle / Split quick helper */}
                              {splittingChapterId === ch.id ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectLecturesFromHereOnwards(ch.lectures, index);
                                  }}
                                  className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline px-2 py-1 bg-purple-50 dark:bg-purple-950/50 rounded-lg cursor-pointer flex items-center gap-1"
                                  title="Select this lecture and all lectures following it"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                  <span>Select From Here Onwards</span>
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => handleToggleLectureCompleted(selectedSubject.id, ch.id, lec.id, e)}
                                  className={`flex items-center gap-1 text-[11px] font-extrabold transition px-2 py-1 rounded-lg ${
                                    lec.completed 
                                      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40" 
                                      : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-zinc-800"
                                  }`}
                                  title={lec.completed ? "Mark as uncompleted" : "Mark as completed"}
                                >
                                  <CheckCircle2 className={`w-3.5 h-3.5 ${lec.completed ? "text-emerald-500 fill-emerald-500/20" : ""}`} />
                                  <span>{lec.completed ? "Done" : "Mark Done"}</span>
                                </button>
                              )}

                              {/* Buttons Row: Reorder, Edit, Delete (Visible ONLY when Chapter Edit Mode is active) */}
                              <div className="flex items-center gap-1">
                                {managingChapterIds[ch.id] && (
                                  <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-slate-200 dark:border-zinc-700 animate-in fade-in duration-150">
                                    <button
                                      onClick={(e) => handleMoveLecture(selectedSubject.id, ch.id, lec.id, 'up', e)}
                                      className="p-1 text-slate-500 hover:text-blue-600 hover:bg-white dark:hover:bg-zinc-700 rounded-lg transition cursor-pointer"
                                      title="Move Up"
                                    >
                                      <ArrowUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={(e) => handleMoveLecture(selectedSubject.id, ch.id, lec.id, 'down', e)}
                                      className="p-1 text-slate-500 hover:text-blue-600 hover:bg-white dark:hover:bg-zinc-700 rounded-lg transition cursor-pointer"
                                      title="Move Down"
                                    >
                                      <ArrowDown className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      onClick={(e) => handleOpenEditLecture(ch.id, lec, e)}
                                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition cursor-pointer"
                                      title="Edit Lecture Details"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      onClick={(e) => onRequestDeleteLecture(selectedSubject.id, ch.id, lec.id, lec.title, e)}
                                      className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition cursor-pointer"
                                      title="Delete Lecture"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}

                                {splittingChapterId !== ch.id && (
                                  <button
                                    onClick={() => handleStartPlayingLecture(selectedSubject, lec, ch.id)}
                                    className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition shadow-xs cursor-pointer ml-0.5"
                                    title="Play Lecture"
                                  >
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal: Edit Chapter Name & Details */}
        {showEditChapterModal && editingChapter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-blue-500" />
                  Edit Chapter Details
                </h3>
                <button onClick={() => setShowEditChapterModal(false)} className="p-1 rounded-lg text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateChapter} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                    Chapter Number
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editChapterNumber}
                    onChange={(e) => setEditChapterNumber(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                    Chapter Name / Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chapter 2: Electrostatics & Potential"
                    value={editChapterTitle}
                    onChange={(e) => setEditChapterTitle(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                    Description / Overview
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Key concepts covered in this chapter..."
                    value={editChapterDesc}
                    onChange={(e) => setEditChapterDesc(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs p-3 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditChapterModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold shadow"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Chapter */}
        {showChapterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto scrollbar-thin">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
                  <FolderPlus className="w-5 h-5 text-blue-500" />
                  Add Chapter to {selectedSubject?.subjectName}
                </h3>
                <button onClick={() => setShowChapterModal(false)} className="p-1 rounded-lg text-slate-400 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mode Tabs */}
              <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setChapterModalTab("manual")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    chapterModalTab === "manual"
                      ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-50 shadow-xs"
                      : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
                  }`}
                >
                  <FolderPlus className="w-3.5 h-3.5 text-blue-500" />
                  <span>Custom Chapter</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChapterModalTab("playlist")}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    chapterModalTab === "playlist"
                      ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-50 shadow-xs"
                      : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
                  }`}
                >
                  <YoutubeBrandIcon className="w-3.5 h-3.5" />
                  <span>Import Playlist</span>
                </button>
              </div>

              {chapterModalTab === "playlist" && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                      YouTube Playlist Link or ID
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="e.g. https://www.youtube.com/playlist?list=PL123..."
                          value={chapterPlaylistUrl}
                          onChange={(e) => handleFetchChapterPlaylist(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        />
                        {isFetchingChapterPlaylist && (
                          <Loader2 className="w-4 h-4 text-blue-500 animate-spin absolute right-3 top-3" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFetchChapterPlaylist(chapterPlaylistUrl, true)}
                        disabled={isFetchingChapterPlaylist || !chapterPlaylistUrl.trim()}
                        className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                      >
                        Fetch
                      </button>
                    </div>
                  </div>

                  {chapterPlaylistError && (
                    <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 font-bold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                      <span>{chapterPlaylistError}</span>
                    </div>
                  )}

                  {chapterPlaylistPreview && (
                    <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-800 dark:text-emerald-300">
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span>Found Playlist: {chapterPlaylistPreview.videosCount} Lectures</span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 line-clamp-1">
                        {chapterPlaylistPreview.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                        Channel: {chapterPlaylistPreview.channelName}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleCreateChapter} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                    Chapter Title
                  </label>
                  <input
                    type="text"
                    required={chapterModalTab === "manual"}
                    placeholder="e.g. Chapter 2: Electrostatics & Potential"
                    value={newChapterTitle}
                    onChange={(e) => setNewChapterTitle(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                    Description / Overview (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Key concepts covered in this chapter..."
                    value={newChapterDesc}
                    onChange={(e) => setNewChapterDesc(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs p-3 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowChapterModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={chapterModalTab === "playlist" && (!chapterPlaylistPreview || isFetchingChapterPlaylist)}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-extrabold shadow cursor-pointer flex items-center gap-1.5"
                  >
                    {chapterModalTab === "playlist" && <YoutubeBrandIcon className="w-3.5 h-3.5" />}
                    <span>{chapterModalTab === "playlist" ? "Import Playlist Chapter" : "Create Chapter"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Lecture with Auto-Fetch */}
        {showLectureModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
                  <Video className="w-5 h-5 text-blue-500" />
                  Add Lecture via URL
                </h3>
                <button 
                  onClick={() => {
                    setNewLectureUrl("");
                    setNewLectureTitle("");
                    setNewLectureDuration("");
                    setAutoFetchedStatus(null);
                    setShowLectureModal(false);
                  }} 
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Live Thumbnail Preview */}
              {extractYoutubeId(newLectureUrl) && (
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-slate-200 dark:border-zinc-800 shadow-sm">
                  <img
                    src={`https://i.ytimg.com/vi/${extractYoutubeId(newLectureUrl)}/hqdefault.jpg`}
                    alt="Lecture thumbnail preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-2.5">
                    <span className="text-[10px] font-extrabold text-white bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-xs">
                      ✨ Thumbnail Preview Detected
                    </span>
                  </div>
                </div>
              )}

              <form onSubmit={handleCreateLecture} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                    YouTube Video URL
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Paste YouTube link (e.g. https://www.youtube.com/watch?v=...)"
                      value={newLectureUrl}
                      onChange={(e) => handleLectureUrlChange(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs pl-3.5 pr-9 py-2.5 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    {isFetchingMetadata && (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin absolute right-3 top-3" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                    Paste the YouTube link — lecture title, duration & thumbnail will be auto-fetched!
                  </p>
                </div>

                {autoFetchedStatus && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-2 animate-in fade-in">
                    <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="line-clamp-2">{autoFetchedStatus}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      setNewLectureUrl("");
                      setNewLectureTitle("");
                      setNewLectureDuration("");
                      setAutoFetchedStatus(null);
                      setShowLectureModal(false);
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isFetchingMetadata || !newLectureUrl.trim()}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-extrabold shadow transition cursor-pointer flex items-center gap-1.5"
                  >
                    {isFetchingMetadata ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Fetching Details...</span>
                      </>
                    ) : (
                      <span>Add Lecture</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Lecture */}
        {showEditLectureModal && editingLecture && targetEditChapterId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-blue-500" />
                  Edit Lecture Details
                </h3>
                <button onClick={() => setShowEditLectureModal(false)} className="p-1 rounded-lg text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Live Thumbnail Preview */}
              {extractYoutubeId(editLectureUrl) && (
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-slate-200 dark:border-zinc-800 shadow-sm">
                  <img
                    src={`https://i.ytimg.com/vi/${extractYoutubeId(editLectureUrl)}/hqdefault.jpg`}
                    alt="Lecture thumbnail preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-2.5">
                    <span className="text-[10px] font-extrabold text-white bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-xs">
                      Thumbnail Preview
                    </span>
                  </div>
                </div>
              )}

              <form onSubmit={handleUpdateLecture} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                    YouTube Video URL or Video ID
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Paste YouTube link (e.g. https://www.youtube.com/watch?v=...)"
                      value={editLectureUrl}
                      onChange={(e) => handleLectureEditUrlChange(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs pl-3.5 pr-9 py-2.5 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    {isFetchingEditMetadata && (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin absolute right-3 top-3" />
                    )}
                  </div>
                </div>

                {autoFetchedEditStatus && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-2 animate-in fade-in">
                    <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="line-clamp-1">{autoFetchedEditStatus}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                    Lecture Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Lecture Title"
                    value={editLectureTitle}
                    onChange={(e) => setEditLectureTitle(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                    Duration (e.g. 18:30)
                  </label>
                  <input
                    type="text"
                    placeholder="18:30"
                    value={editLectureDuration}
                    onChange={(e) => setEditLectureDuration(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditLectureModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold shadow"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Global Confirmation Delete Modal & Modals */}
        {renderEditSubjectModal()}
        {renderDeleteModal()}
        {renderImportPlaylistModal()}
        {renderSplitChapterModal()}
      </div>
    );
  }

  // =========================================================================
  // RENDER VIEW 3: MAIN COURSE & SUBJECT LIBRARY GRID (All Custom Subject Folders)
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* Library Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50/80 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wide mb-2">
            <Folder className="w-4 h-4 text-blue-500" />
            Custom Subject Workspace
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-zinc-50">
            Course & Subject Library
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Organize lectures into custom subjects and chapters, and watch them chapter-wise as playlists.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => handleOpenImportPlaylistModal(null)}
            className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs px-4.5 py-3 rounded-2xl shadow-md shadow-red-500/20 transition-all duration-150 flex items-center gap-2 cursor-pointer shrink-0 hover:scale-[1.02] active:scale-[0.98]"
            title="Import a YouTube playlist directly as a chapter into any subject"
          >
            <YoutubeBrandIcon className="w-4 h-4" />
            <span>+ Import Playlist as Chapter</span>
          </button>

          <button 
            onClick={handleOpenCreateSubject}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs px-5 py-3 rounded-2xl shadow-md shadow-blue-500/25 transition-all duration-150 flex items-center gap-2 cursor-pointer shrink-0 hover:scale-[1.02] active:scale-[0.98]"
          >
            <FolderPlus className="w-4.5 h-4.5 text-blue-100" />
            <span>+ Create Custom Subject</span>
          </button>
        </div>
      </div>

      {/* Dynamic Category Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeCategory === cat
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800"
              }`}
            >
              {cat}
            </button>
          ))}
          
          <button
            onClick={() => setShowManageCategoriesModal(true)}
            className="px-3 py-2 rounded-xl text-xs font-bold transition bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-750 flex items-center gap-1.5 cursor-pointer shrink-0 border border-slate-200 dark:border-zinc-700"
            title="Manage Categories (Add, Edit, Delete)"
          >
            <Palette className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>Manage Categories</span>
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search subject or chapter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs pl-9 pr-4 py-2 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Subject Cards Grid */}
      {filteredSubjects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubjects.map((subj) => {
            const { total, completed, percentage } = getSubjectProgress(subj);

            return (
              <div 
                key={subj.id}
                onClick={() => setSelectedSubject(subj)}
                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between group relative"
              >
                <div>
                  <div className="flex items-center justify-between mb-3 pr-8">
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold uppercase border border-blue-100 dark:border-blue-900/40">
                      {subj.category}
                    </span>
                  </div>

                  {/* Three dots menu for Subject card anchored at top right corner */}
                  <div className="absolute top-4 right-4 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenSubjectCardMenuId(openSubjectCardMenuId === subj.id ? null : subj.id);
                      }}
                      className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition cursor-pointer"
                      title="Subject options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {openSubjectCardMenuId === subj.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-20" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenSubjectCardMenuId(null);
                          }} 
                        />
                        <div className="absolute right-0 top-full mt-1.5 z-30 w-48 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenSubjectCardMenuId(null);
                              handleOpenEditSubject(subj, e);
                            }}
                            className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                            <span>Edit Subject</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenSubjectCardMenuId(null);
                              handleOpenImportPlaylistModal(subj);
                            }}
                            className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer transition-colors"
                          >
                            <YoutubeBrandIcon className="w-3.5 h-3.5" />
                            <span>Import Playlist</span>
                          </button>

                          <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenSubjectCardMenuId(null);
                              onRequestDeleteSubject(subj.id, subj.subjectName, e);
                            }}
                            className="w-full text-left px-3.5 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Subject</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <h3 className="font-extrabold text-base text-slate-900 dark:text-zinc-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                    {subj.subjectName}
                  </h3>

                  {subj.description && (
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 line-clamp-2">
                      {subj.description}
                    </p>
                  )}

                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-400 font-semibold">
                    <Folder className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>{subj.chapters.length} Chapter Folders</span>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div style={{ width: `${percentage}%` }} className="bg-emerald-500 h-full rounded-full" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-400">
                      {completed}/{total} ({percentage}%)
                    </span>
                  </div>

                  <button className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-sm">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-50">No Subjects Found</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
              Create your custom subject folder to start building chapter-wise lecture playlists.
            </p>
          </div>

          <button
            onClick={handleOpenCreateSubject}
            className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-5 py-3 rounded-2xl transition shadow-md inline-flex items-center gap-2 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            Create Custom Subject Folder
          </button>
        </div>
      )}

      {/* Modal: Create Custom Subject Folder */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-blue-500" />
                Create Custom Subject Folder
              </h3>
              <button 
                onClick={() => setShowSubjectModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                  Subject Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Organic Chemistry, Algorithms, Macroeconomics"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                  Subject Category
                </label>
                {existingCategories.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-slate-200/50 dark:border-zinc-700/50">
                      <button
                        type="button"
                        onClick={() => setCategorySelectionMode("select")}
                        className={`flex-1 text-center py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                          categorySelectionMode === "select"
                            ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-50 shadow-sm"
                            : "text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300"
                        }`}
                      >
                        Select Existing
                      </button>
                      <button
                        type="button"
                        onClick={() => setCategorySelectionMode("new")}
                        className={`flex-1 text-center py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                          categorySelectionMode === "new"
                            ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-50 shadow-sm"
                            : "text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300"
                        }`}
                      >
                        + Create New
                      </button>
                    </div>

                    {categorySelectionMode === "select" ? (
                      <select
                        value={selectedCategoryName}
                        onChange={(e) => setSelectedCategoryName(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        {existingCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        required
                        placeholder="e.g. Semester 1, Medical Prep, Competitive Exams"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="e.g. Semester 1, Medical Prep, Competitive Exams"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                  Subject Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief summary of syllabus or exam objectives..."
                  value={newSubjectDesc}
                  onChange={(e) => setNewSubjectDesc(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs p-3 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Optional Initial Playlist Import */}
              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <YoutubeBrandIcon className="w-4 h-4" />
                    Import YouTube Playlist as Chapter 1 (Optional)
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Paste YouTube Playlist URL..."
                      value={newSubjectPlaylistUrl}
                      onChange={(e) => handleFetchSubjectPlaylist(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs px-3.5 py-2 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    {isFetchingSubjectPlaylist && (
                      <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin absolute right-3 top-2.5" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFetchSubjectPlaylist(newSubjectPlaylistUrl, true)}
                    disabled={isFetchingSubjectPlaylist || !newSubjectPlaylistUrl.trim()}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition cursor-pointer shrink-0"
                  >
                    Fetch
                  </button>
                </div>

                {subjectPlaylistError && (
                  <p className="text-[11px] text-red-500 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {subjectPlaylistError}
                  </p>
                )}

                {subjectPlaylistPreview && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="truncate">Found "{subjectPlaylistPreview.title}" ({subjectPlaylistPreview.videosCount} lectures)</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isFetchingSubjectPlaylist}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold transition shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Create Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {renderImportPlaylistModal()}

      {/* Modal: Manage Categories */}
      {showManageCategoriesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-50 flex items-center gap-2">
                <Palette className="w-5 h-5 text-blue-500" />
                <span>Manage Categories</span>
              </h3>
              <button 
                onClick={() => {
                  setShowManageCategoriesModal(false);
                  setEditingCatOldName(null);
                }} 
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-normal">
              Create new categories or rename/delete existing ones. Renaming a category updates all subjects in it. Deleting a category moves its subjects to <strong>General Studies</strong>.
            </p>

            {/* Form: Add New Category */}
            <div>
              <label className="text-[11px] font-black uppercase text-slate-400 dark:text-zinc-500 block mb-1">
                + Add Category
              </label>
              <form 
                onSubmit={(e) => { 
                  e.preventDefault(); 
                  if (newManageCatName.trim()) {
                    handleAddCategory(newManageCatName); 
                    setNewManageCatName(""); 
                  }
                }} 
                className="flex gap-2"
              >
                <input
                  type="text"
                  required
                  placeholder="e.g. Competitive Exams, Semester 2"
                  value={newManageCatName}
                  onChange={(e) => setNewManageCatName(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs px-3.5 py-2.5 rounded-xl text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs px-4 rounded-xl transition shadow-xs cursor-pointer"
                >
                  Add
                </button>
              </form>
            </div>

            {/* List: Categories */}
            <div>
              <label className="text-[11px] font-black uppercase text-slate-400 dark:text-zinc-500 block mb-1.5">
                Existing Categories ({customCategories.length})
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                {customCategories.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400 dark:text-zinc-500">
                    No custom categories added. Create one above!
                  </div>
                ) : (
                  customCategories.map((cat) => (
                    <div 
                      key={cat} 
                      className="flex items-center justify-between gap-3 p-2 bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-850/60 rounded-xl"
                    >
                      {editingCatOldName === cat ? (
                        <form 
                          onSubmit={(e) => { 
                            e.preventDefault(); 
                            if (editingCatNewName.trim()) {
                              handleRenameCategory(cat, editingCatNewName); 
                              setEditingCatOldName(null); 
                            }
                          }} 
                          className="flex items-center gap-1.5 flex-1"
                        >
                          <input
                            type="text"
                            required
                            value={editingCatNewName}
                            onChange={(e) => setEditingCatNewName(e.target.value)}
                            className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs px-2.5 py-1.5 rounded-lg text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                          <button 
                            type="submit" 
                            className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition cursor-pointer shrink-0"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setEditingCatOldName(null)} 
                            className="p-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 rounded-lg transition cursor-pointer shrink-0"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      ) : (
                        <>
                          <span className="text-xs font-bold text-slate-800 dark:text-zinc-100 pl-1">
                            {cat}
                          </span>
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => { 
                                setEditingCatOldName(cat); 
                                setEditingCatNewName(cat); 
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                              title="Rename Category"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onRequestDeleteCategory(cat)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                              title="Delete Category"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-zinc-800/80">
              <button
                type="button"
                onClick={() => {
                  setShowManageCategoriesModal(false);
                  setEditingCatOldName(null);
                }}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-extrabold transition cursor-pointer shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Modals */}
      {renderEditSubjectModal()}
      {renderDeleteModal()}
      {renderImportPlaylistModal()}
      {renderSplitChapterModal()}
    </div>
  );
};
