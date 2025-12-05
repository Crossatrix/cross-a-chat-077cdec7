import { useState } from "react";
import { Folder, FolderOpen, ChevronRight, ChevronDown, FolderPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface FileItem {
  id: string;
  name: string;
  type: "file" | "folder";
  extension?: string;
  data?: any;
  children?: FileItem[];
  allowCreateFolder?: boolean;
  category?: string;
}

interface FileExplorerProps {
  items: FileItem[];
  onFileSelect: (file: FileItem) => void;
  selectedFile: FileItem | null;
  onCreateFolder?: (parentId: string, folderName: string) => void;
}

const FileExplorer = ({ items, onFileSelect, selectedFile, onCreateFolder }: FileExplorerProps) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["emojis"]));
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const getFileIcon = (extension?: string) => {
    switch (extension) {
      case "png":
      case "gif":
      case "webp":
        return "🖼️";
      case "txt":
        return "📄";
      default:
        return "📄";
    }
  };

  const handleCreateFolderClick = (e: React.MouseEvent, parentId: string) => {
    e.stopPropagation();
    setNewFolderParentId(parentId);
    setNewFolderDialogOpen(true);
  };

  const handleCreateFolder = () => {
    if (newFolderParentId && newFolderName.trim() && onCreateFolder) {
      onCreateFolder(newFolderParentId, newFolderName.trim());
      setNewFolderDialogOpen(false);
      setNewFolderName("");
      setNewFolderParentId(null);
    }
  };

  const renderItem = (item: FileItem, depth: number = 0) => {
    const isExpanded = expandedFolders.has(item.id);
    const isSelected = selectedFile?.id === item.id;

    if (item.type === "folder") {
      return (
        <div key={item.id}>
          <div
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 hover:bg-secondary/50 rounded-md transition-colors text-left group",
              "text-foreground"
            )}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            <button
              onClick={() => toggleFolder(item.id)}
              className="flex items-center gap-2 flex-1"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              {isExpanded ? (
                <FolderOpen className="h-5 w-5 text-yellow-500 shrink-0" />
              ) : (
                <Folder className="h-5 w-5 text-yellow-500 shrink-0" />
              )}
              <span className="truncate font-medium">{item.name}</span>
              {item.children && (
                <span className="text-xs text-muted-foreground ml-auto">
                  ({item.children.length})
                </span>
              )}
            </button>
            {item.allowCreateFolder && onCreateFolder && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={(e) => handleCreateFolderClick(e, item.id)}
              >
                <FolderPlus className="h-4 w-4" />
              </Button>
            )}
          </div>
          {isExpanded && item.children && (
            <div className="border-l border-border/50 ml-4">
              {item.children.map((child) => renderItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        key={item.id}
        onClick={() => onFileSelect(item)}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1.5 hover:bg-secondary/50 rounded-md transition-colors text-left",
          isSelected && "bg-primary/20 border border-primary/30"
        )}
        style={{ paddingLeft: `${depth * 16 + 28}px` }}
      >
        <span className="text-base shrink-0">{getFileIcon(item.extension)}</span>
        <span className="truncate text-sm text-foreground">
          {item.name}
          {item.extension && <span className="text-muted-foreground">.{item.extension}</span>}
        </span>
      </button>
    );
  };

  return (
    <>
      <div className="bg-card border border-border rounded-lg p-2 h-full overflow-auto">
        <div className="space-y-0.5">
          {items.map((item) => renderItem(item))}
        </div>
      </div>

      <Dialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
            <DialogDescription>Enter a name for the new emoji category folder.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Category name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FileExplorer;
