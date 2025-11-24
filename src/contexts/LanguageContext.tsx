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
  
  // Group Chats
  "group.create": { en: "Create Group", de: "Gruppe erstellen" },
  "group.name": { en: "Group Name", de: "Gruppenname" },
  "group.namePlaceholder": { en: "Enter group name", de: "Gruppenname eingeben" },
  "group.selectMembers": { en: "Select Members", de: "Mitglieder auswählen" },
  "group.minMembers": { en: "minimum 2", de: "mindestens 2" },
  "group.created": { en: "Group created successfully", de: "Gruppe erfolgreich erstellt" },
  "group.createFailed": { en: "Failed to create group", de: "Gruppe konnte nicht erstellt werden" },
  "group.enterName": { en: "Please enter a group name", de: "Bitte Gruppenname eingeben" },
  "group.selectTwoMembers": { en: "Please select at least 2 members", de: "Bitte mindestens 2 Mitglieder auswählen" },
  "group.callsNotSupported": { en: "Group calls are not supported yet", de: "Gruppenanrufe werden noch nicht unterstützt" },
  "group.members": { en: "members", de: "Mitglieder" },
  
  // Calls
  "call.start": { en: "Start Call", de: "Anruf starten" },
  "call.end": { en: "End Call", de: "Anruf beenden" },
  "call.connecting": { en: "Connecting...", de: "Verbinde..." },
  "call.cannotCallAI": { en: "Cannot call AI bot", de: "AI-Bot kann nicht angerufen werden" },
  "call.failed": { en: "Failed to start call", de: "Anruf konnte nicht gestartet werden" },
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
