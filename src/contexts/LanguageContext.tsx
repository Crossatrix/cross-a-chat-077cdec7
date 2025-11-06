import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "en" | "de";

interface Translations {
  [key: string]: {
    en: string;
    de: string;
  };
}

const translations: Translations = {
  // Navigation
  "nav.conversations": { en: "Conversations", de: "Unterhaltungen" },
  "nav.newChat": { en: "New Chat", de: "Neuer Chat" },
  "nav.blockedUsers": { en: "Blocked Users", de: "Blockierte Benutzer" },
  "nav.settings": { en: "Settings", de: "Einstellungen" },
  "nav.admin": { en: "Admin Panel", de: "Admin-Panel" },
  "nav.logout": { en: "Logout", de: "Abmelden" },
  
  // Settings
  "settings.title": { en: "Settings", de: "Einstellungen" },
  "settings.profile": { en: "Profile", de: "Profil" },
  "settings.appearance": { en: "Appearance", de: "Aussehen" },
  "settings.language": { en: "Language", de: "Sprache" },
  "settings.username": { en: "Username", de: "Benutzername" },
  "settings.bio": { en: "Bio", de: "Biografie" },
  "settings.bioPlaceholder": { en: "Tell us about yourself...", de: "Erzählen Sie uns von sich..." },
  "settings.avatar": { en: "Profile Picture", de: "Profilbild" },
  "settings.uploadAvatar": { en: "Upload Avatar", de: "Avatar hochladen" },
  "settings.changeAvatar": { en: "Change Avatar", de: "Avatar ändern" },
  "settings.theme": { en: "Theme", de: "Thema" },
  "settings.backgroundColor": { en: "Background Color", de: "Hintergrundfarbe" },
  "settings.buttonColor": { en: "Button Color", de: "Schaltflächenfarbe" },
  "settings.save": { en: "Save Changes", de: "Änderungen speichern" },
  "settings.saved": { en: "Settings saved!", de: "Einstellungen gespeichert!" },
  "settings.error": { en: "Error saving settings", de: "Fehler beim Speichern" },
  "settings.back": { en: "Back to Chat", de: "Zurück zum Chat" },
  
  // Messages
  "message.placeholder": { en: "Type a message...", de: "Nachricht eingeben..." },
  "message.send": { en: "Send", de: "Senden" },
  "message.delete": { en: "Delete", de: "Löschen" },
  
  // Chat
  "chat.selectConversation": { en: "Select a conversation to start chatting", de: "Wählen Sie eine Unterhaltung aus" },
  "chat.newConversation": { en: "Start a new conversation", de: "Neue Unterhaltung starten" },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("language");
    return (saved as Language) || "en";
  });

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};
