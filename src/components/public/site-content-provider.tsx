"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { defaultPublicSiteContent, PublicSiteContent, SiteContentRecord } from "@/lib/site-content";

const SiteContentContext = createContext<PublicSiteContent>(defaultPublicSiteContent);

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState(defaultPublicSiteContent);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return;

    const supabase = createSupabaseBrowserClient();
    let active = true;

    async function loadContent() {
      const { data, error } = await supabase.from("site_settings").select("*").eq("id", true).maybeSingle();
      if (error) {
        console.error("Website content could not be loaded:", error.message);
        return;
      }
      if (!data) {
        if (active) setContent(defaultPublicSiteContent);
        return;
      }

      const record = data as SiteContentRecord;
      const imagePaths = [
        record.logo_path,
        record.principal_image_path,
        record.home_hero_image_path,
      ];
      const signedImages = await Promise.all(imagePaths.map(async (path) => {
        if (!path) return null;
        const { data: signed, error: imageError } = await supabase.storage.from("school-media").createSignedUrl(path, 3600);
        if (imageError) {
          console.error("A website image could not be loaded:", imageError.message);
          return null;
        }
        return signed.signedUrl;
      }));

      if (!active) return;
      setContent({
        ...record,
        logoUrl: signedImages[0] ?? defaultPublicSiteContent.logoUrl,
        principalImageUrl: signedImages[1] ?? defaultPublicSiteContent.principalImageUrl,
        homeHeroImageUrl: signedImages[2] ?? defaultPublicSiteContent.homeHeroImageUrl,
      });
    }

    void loadContent();
    const channel = supabase.channel("public-site-content")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => { void loadContent(); })
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  return <SiteContentContext.Provider value={content}>{children}</SiteContentContext.Provider>;
}

export function useSiteContent() {
  return useContext(SiteContentContext);
}
