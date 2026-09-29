import { school, schoolContent } from "@/config/school";

export type SiteContentRecord = {
  id: boolean;
  school_name: string;
  session: string;
  address: string;
  phone: string;
  email: string;
  logo_path: string | null;
  principal_name: string;
  principal_message: string;
  principal_image_path: string | null;
  home_hero_title: string;
  home_hero_text: string;
  home_hero_image_path: string | null;
  about_vision: string;
  about_mission: string;
  about_history: string;
  about_facilities: string[];
  contact_heading: string;
  contact_description: string;
  google_maps_url: string;
  map_embed_url: string;
  admission_title: string;
  admission_description: string;
  updated_at: string;
};

export type PublicSiteContent = SiteContentRecord & {
  logoUrl: string;
  principalImageUrl: string;
  homeHeroImageUrl: string;
};

export const defaultSiteContent: SiteContentRecord = {
  id: true,
  school_name: school.name,
  session: school.session,
  address: school.address,
  phone: school.phone,
  email: school.email,
  logo_path: null,
  principal_name: school.principal.name,
  principal_message: school.principal.message,
  principal_image_path: null,
  home_hero_title: schoolContent.home.heroTitle,
  home_hero_text: schoolContent.home.heroText,
  home_hero_image_path: null,
  about_vision: schoolContent.about.vision,
  about_mission: schoolContent.about.mission,
  about_history: schoolContent.about.history,
  about_facilities: [...schoolContent.about.facilities],
  contact_heading: schoolContent.contact.heading,
  contact_description: schoolContent.contact.description,
  google_maps_url: school.map.googleMapsUrl,
  map_embed_url: school.map.embedUrl,
  admission_title: schoolContent.admission.title,
  admission_description: schoolContent.admission.description,
  updated_at: "",
};

export const defaultPublicSiteContent: PublicSiteContent = {
  ...defaultSiteContent,
  logoUrl: school.logoPath,
  principalImageUrl: schoolContent.home.principalImage,
  homeHeroImageUrl: schoolContent.home.heroImage,
};
