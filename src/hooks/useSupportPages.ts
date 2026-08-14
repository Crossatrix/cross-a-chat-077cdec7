import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SupportPage {
  id: string;
  parent_id: string | null;
  title: string;
  content: string;
  sort_order: number;
}

export function useSupportPages() {
  const [pages, setPages] = useState<SupportPage[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("support_pages")
      .select("id,parent_id,title,content,sort_order")
      .order("sort_order", { ascending: true });
    setPages((data || []) as SupportPage[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const chapters = pages.filter(p => !p.parent_id);
  const childrenOf = (id: string) => pages.filter(p => p.parent_id === id);

  const createPage = async (parent_id: string | null, title: string) => {
    const siblings = parent_id ? childrenOf(parent_id) : chapters;
    const sort_order = siblings.length ? Math.max(...siblings.map(s => s.sort_order)) + 1 : 0;
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("support_pages").insert({
      parent_id, title, content: "", sort_order, created_by: auth.user?.id ?? null,
    });
    await load();
    return error;
  };

  const updatePage = async (id: string, patch: Partial<Pick<SupportPage, "title" | "content" | "sort_order">>) => {
    const { error } = await supabase.from("support_pages").update(patch).eq("id", id);
    await load();
    return error;
  };

  const deletePage = async (id: string) => {
    const kids = childrenOf(id);
    if (kids.length) await supabase.from("support_pages").delete().in("id", kids.map(k => k.id));
    const { error } = await supabase.from("support_pages").delete().eq("id", id);
    await load();
    return error;
  };

  const movePage = async (page: SupportPage, dir: -1 | 1) => {
    const siblings = (page.parent_id ? childrenOf(page.parent_id) : chapters)
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order);
    const idx = siblings.findIndex(s => s.id === page.id);
    const target = siblings[idx + dir];
    if (!target) return;
    await supabase.from("support_pages").update({ sort_order: target.sort_order }).eq("id", page.id);
    await supabase.from("support_pages").update({ sort_order: page.sort_order }).eq("id", target.id);
    await load();
  };

  return { pages, chapters, childrenOf, loading, reload: load, createPage, updatePage, deletePage, movePage };
}

export default useSupportPages;
