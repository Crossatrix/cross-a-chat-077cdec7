import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, ArrowRight, ChevronDown, ChevronRight, Plus, Pencil, Trash2,
  ArrowUp, ArrowDown, Save, X, BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import useSupportPages, { SupportPage } from "@/hooks/useSupportPages";
import SupportContent from "@/components/support/SupportContent";

interface Props { canEdit: boolean; editMode: boolean }

export const SupportBook = ({ canEdit, editMode }: Props) => {
  const { pages, chapters, childrenOf, loading, createPage, updatePage, deletePage, movePage } = useSupportPages();
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SupportPage | null>(null);

  const flat = useMemo(() => {
    const out: SupportPage[] = [];
    for (const c of chapters) {
      out.push(c);
      out.push(...childrenOf(c.id));
    }
    return out;
  }, [pages]);

  const q = search.trim().toLowerCase();
  const matches = (p: SupportPage) =>
    !q || p.title.toLowerCase().includes(q) || (p.content || "").toLowerCase().includes(q);

  const active = flat.find(p => p.id === activeId) || null;
  const activeIdx = active ? flat.findIndex(p => p.id === active.id) : -1;

  const toggle = (id: string) =>
    setOpenIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]));

  const startEdit = (p: SupportPage) => {
    setEditingId(p.id);
    setDraftTitle(p.title);
    setDraftContent(p.content || "");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!draftTitle.trim()) { toast.error("Title is required"); return; }
    const err = await updatePage(editingId, { title: draftTitle.trim(), content: draftContent });
    if (err) { toast.error("Could not save"); return; }
    toast.success("Saved");
    setEditingId(null);
  };

  const addChapter = async () => {
    const err = await createPage(null, "New chapter");
    if (err) toast.error("Could not add chapter"); else toast.success("Chapter added");
  };

  const addSub = async (chapterId: string) => {
    const err = await createPage(chapterId, "New subchapter");
    if (err) toast.error("Could not add subchapter");
    else { setOpenIds(prev => (prev.includes(chapterId) ? prev : [...prev, chapterId])); toast.success("Subchapter added"); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const err = await deletePage(deleteTarget.id);
    if (err) toast.error("Could not delete");
    else {
      toast.success("Deleted");
      if (activeId === deleteTarget.id) setActiveId(null);
    }
    setDeleteTarget(null);
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading support book…</p>;

  // Reader view
  if (active && !editMode) {
    const prev = flat[activeIdx - 1];
    const next = flat[activeIdx + 1];
    return (
      <Card>
        <CardHeader>
          <Button variant="ghost" size="sm" className="w-fit -ml-2" onClick={() => setActiveId(null)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Contents
          </Button>
          <CardTitle className="text-2xl">{active.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {active.content?.trim()
            ? <SupportContent text={active.content} />
            : <p className="text-sm text-muted-foreground">This page is empty.</p>}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Button variant="outline" disabled={!prev} onClick={() => prev && setActiveId(prev.id)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span className="truncate">{prev ? prev.title : "Start"}</span>
            </Button>
            <Button variant="outline" disabled={!next} onClick={() => next && setActiveId(next.id)}>
              <span className="truncate">{next ? next.title : "End"}</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderEditor = (p: SupportPage) => (
    <div className="space-y-2 p-3">
      <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} maxLength={200} />
      <Textarea
        value={draftContent}
        onChange={(e) => setDraftContent(e.target.value)}
        rows={8}
        placeholder="Page content…"
        className="resize-y"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={saveEdit}><Save className="mr-2 h-4 w-4" />Save</Button>
        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="mr-2 h-4 w-4" />Cancel</Button>
      </div>
    </div>
  );

  const adminRow = (p: SupportPage) => (
    <div className="flex shrink-0 items-center gap-1">
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => movePage(p, -1)} aria-label="Move up">
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => movePage(p, 1)} aria-label="Move down">
        <ArrowDown className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(p)} aria-label="Edit">
        <Pencil className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(p)} aria-label="Delete">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  const visibleChapters = chapters.filter(c => matches(c) || childrenOf(c.id).some(matches));

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search the support book…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {canEdit && editMode && (
        <Button variant="outline" onClick={addChapter} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Add chapter
        </Button>
      )}

      {visibleChapters.length === 0 && (
        <p className="text-sm text-muted-foreground">No support pages found.</p>
      )}

      <div className="space-y-2">
        {visibleChapters.map((c) => {
          const subs = childrenOf(c.id).filter(s => !q || matches(s) || matches(c));
          const isOpen = openIds.includes(c.id) || !!q;
          return (
            <Card key={c.id} className="overflow-hidden">
              <div className="flex items-center gap-2 p-3">
                <button
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  onClick={() => (editMode ? toggle(c.id) : setActiveId(c.id))}
                >
                  {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                  <BookOpen className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate font-medium">{c.title}</span>
                </button>
                {!editMode && subs.length > 0 && (
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggle(c.id)} aria-label="Toggle">
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                )}
                {canEdit && editMode && adminRow(c)}
              </div>

              {editingId === c.id && renderEditor(c)}

              {isOpen && (
                <div className="border-t bg-muted/30">
                  {subs.map((s) => (
                    <div key={s.id}>
                      <div className="flex items-center gap-2 px-3 py-2">
                        <button
                          className="min-w-0 flex-1 truncate text-left text-sm"
                          onClick={() => (editMode ? startEdit(s) : setActiveId(s.id))}
                        >
                          {s.title}
                        </button>
                        {canEdit && editMode && adminRow(s)}
                      </div>
                      {editingId === s.id && renderEditor(s)}
                    </div>
                  ))}
                  {canEdit && editMode && (
                    <div className="p-2">
                      <Button size="sm" variant="ghost" onClick={() => addSub(c.id)}>
                        <Plus className="mr-2 h-4 w-4" /> Add subchapter
                      </Button>
                    </div>
                  )}
                  {!editMode && subs.length === 0 && (
                    <p className="px-3 py-2 text-xs text-muted-foreground">No subchapters.</p>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the page and any subchapters under it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SupportBook;
