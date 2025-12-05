import { useState } from "react";
import { Folder, FolderOpen, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FileItem {
  id: string;
  name: string;
  type: "file" | "folder";
  extension?: string;
  data?: any;
  children?: FileItem[];
}

interface FileExplorerProps {
  items: FileItem[];
  onFileSelect: (file: FileItem) => void;
  selectedFile: FileItem | null;
}

const FileExplorer = ({ items, onFileSelect, selectedFile }: FileExplorerProps) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

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

  const renderItem = (item: FileItem, depth: number = 0) => {
    const isExpanded = expandedFolders.has(item.id);
    const isSelected = selectedFile?.id === item.id;

    if (item.type === "folder") {
      return (
        <div key={item.id}>
          <button
            onClick={() => toggleFolder(item.id)}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 hover:bg-secondary/50 rounded-md transition-colors text-left",
              "text-foreground"
            )}
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
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
    <div className="bg-card border border-border rounded-lg p-2 h-full overflow-auto">
      <div className="space-y-0.5">
        {items.map((item) => renderItem(item))}
      </div>
    </div>
  );
};

export default FileExplorer;
