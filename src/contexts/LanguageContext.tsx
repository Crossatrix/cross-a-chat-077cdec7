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
  
  // Common
  "common.loading": { en: "Loading...", de: "Lädt..." },
  "common.cancel": { en: "Cancel", de: "Abbrechen" },
  "common.back": { en: "Back", de: "Zurück" },
  "common.next": { en: "Next", de: "Weiter" },
  "common.submit": { en: "Submit", de: "Absenden" },
  "common.delete": { en: "Delete", de: "Löschen" },
  "common.save": { en: "Save", de: "Speichern" },
  "common.creating": { en: "Creating...", de: "Erstelle..." },
  "common.submitting": { en: "Submitting...", de: "Sende..." },
  "common.selected": { en: "selected", de: "ausgewählt" },
  "common.recent": { en: "Recent", de: "Kürzlich" },
  "common.searched": { en: "searched", de: "gesucht" },
  
  // Messages
  "message.placeholder": { en: "Type a message...", de: "Nachricht eingeben..." },
  "message.send": { en: "Send", de: "Senden" },
  "message.delete": { en: "Delete", de: "Löschen" },
  
  // Chat
  "chat.selectConversation": { en: "Select a conversation to start chatting", de: "Wählen Sie eine Unterhaltung aus" },
  "chat.newConversation": { en: "Start a new conversation", de: "Neue Unterhaltung starten" },
  "chat.groupChat": { en: "Group chat", de: "Gruppenchat" },
  "chat.startChat": { en: "Start Chat", de: "Chat starten" },
  "chat.clearChat": { en: "Clear Chat", de: "Chat leeren" },
  "chat.deleteChat": { en: "Delete Chat", de: "Chat löschen" },
  
  // New Chat Dialog
  "newChat.title": { en: "New Chat", de: "Neuer Chat" },
  "newChat.description": { en: "Select one person for direct chat, or multiple for a group", de: "Eine Person für Direktchat oder mehrere für Gruppe wählen" },
  "newChat.searchUsername": { en: "Search by username", de: "Nach Benutzername suchen" },
  "newChat.enterUsername": { en: "Enter username", de: "Benutzername eingeben" },
  "newChat.find": { en: "Find", de: "Finden" },
  "newChat.selectOne": { en: "Please select at least one person", de: "Bitte mindestens eine Person auswählen" },
  "newChat.userNotFound": { en: "User not found", de: "Benutzer nicht gefunden" },
  "newChat.userBlocked": { en: "This user is blocked", de: "Dieser Benutzer ist blockiert" },
  "newChat.found": { en: "Found", de: "Gefunden" },
  "newChat.searchFailed": { en: "Failed to search username", de: "Suche fehlgeschlagen" },
  "newChat.noContacts": { en: "No contacts yet", de: "Noch keine Kontakte" },
  "newChat.searchToFind": { en: "Search by username to find someone new", de: "Suche nach Benutzername, um jemanden zu finden" },
  
  // AI Chat
  "ai.nameChat": { en: "Name Your AI Chat", de: "AI-Chat benennen" },
  "ai.nameDescription": { en: "Give your AI conversation a unique name", de: "Geben Sie Ihrer AI-Unterhaltung einen Namen" },
  "ai.chatName": { en: "AI Chat Name", de: "AI-Chat Name" },
  "ai.enterName": { en: "Enter AI chat name", de: "AI-Chat Name eingeben" },
  "ai.createChat": { en: "Create AI Chat", de: "AI-Chat erstellen" },
  "ai.chatCreated": { en: "AI chat created successfully", de: "AI-Chat erfolgreich erstellt" },
  "ai.createFailed": { en: "Failed to create AI chat", de: "AI-Chat konnte nicht erstellt werden" },
  "ai.enterChatName": { en: "Please enter a name for your AI chat", de: "Bitte Namen für AI-Chat eingeben" },
  "ai.limitReached": { en: "You can only have up to 5 AI chat conversations", de: "Sie können maximal 5 AI-Chats haben" },
  "ai.checkFailed": { en: "Failed to check AI chat limit", de: "Prüfung des AI-Chat-Limits fehlgeschlagen" },
  
  // Group Chats
  "group.create": { en: "Create Group", de: "Gruppe erstellen" },
  "group.name": { en: "Group Name", de: "Gruppenname" },
  "group.namePlaceholder": { en: "Enter group name", de: "Gruppenname eingeben" },
  "group.nameYourGroup": { en: "Name Your Group", de: "Gruppe benennen" },
  "group.creatingWith": { en: "Creating group with", de: "Erstelle Gruppe mit" },
  "group.selectMembers": { en: "Select Members", de: "Mitglieder auswählen" },
  "group.minMembers": { en: "minimum 2", de: "mindestens 2" },
  "group.created": { en: "Group created successfully", de: "Gruppe erfolgreich erstellt" },
  "group.createFailed": { en: "Failed to create group", de: "Gruppe konnte nicht erstellt werden" },
  "group.enterName": { en: "Please enter a group name", de: "Bitte Gruppenname eingeben" },
  "group.selectTwoMembers": { en: "Please select at least 2 members", de: "Bitte mindestens 2 Mitglieder auswählen" },
  "group.callsNotSupported": { en: "Group calls are not supported yet", de: "Gruppenanrufe werden noch nicht unterstützt" },
  "group.members": { en: "members", de: "Mitglieder" },
  "group.settings": { en: "Group Settings", de: "Gruppeneinstellungen" },
  "group.manageMembers": { en: "Manage group members and settings", de: "Gruppenmitglieder und Einstellungen verwalten" },
  "group.addMember": { en: "Add Member", de: "Mitglied hinzufügen" },
  "group.removeMember": { en: "Remove Member", de: "Mitglied entfernen" },
  "group.leave": { en: "Leave Group", de: "Gruppe verlassen" },
  "group.delete": { en: "Delete Group", de: "Gruppe löschen" },
  "group.admin": { en: "Admin", de: "Admin" },
  "group.moderator": { en: "Moderator", de: "Moderator" },
  "group.member": { en: "Member", de: "Mitglied" },
  "group.changeRole": { en: "Change Role", de: "Rolle ändern" },
  "group.roleUpdated": { en: "Role updated", de: "Rolle aktualisiert" },
  "group.memberAdded": { en: "Member added", de: "Mitglied hinzugefügt" },
  "group.memberRemoved": { en: "Member removed", de: "Mitglied entfernt" },
  "group.leftGroup": { en: "You left the group", de: "Du hast die Gruppe verlassen" },
  "group.deleted": { en: "Group deleted", de: "Gruppe gelöscht" },
  "group.nameUpdated": { en: "Group name updated", de: "Gruppenname aktualisiert" },
  "group.pictureUpdated": { en: "Group picture updated", de: "Gruppenbild aktualisiert" },
  "group.cannotLeave": { en: "Cannot leave. You're the only admin - promote someone else first.", de: "Kann nicht verlassen. Du bist der einzige Admin - befördere erst jemand anderen." },
  
  // Blocked Users
  "blocked.title": { en: "Blocked Users", de: "Blockierte Benutzer" },
  "blocked.description": { en: "Manage users you've blocked", de: "Blockierte Benutzer verwalten" },
  "blocked.none": { en: "No blocked users", de: "Keine blockierten Benutzer" },
  "blocked.on": { en: "Blocked", de: "Blockiert am" },
  "blocked.unblock": { en: "Unblock", de: "Entblocken" },
  "blocked.unblocked": { en: "Unblocked", de: "Entblockt" },
  "blocked.unblockFailed": { en: "Failed to unblock user", de: "Entsperren fehlgeschlagen" },
  
  // User Actions
  "user.block": { en: "Block User", de: "Benutzer blockieren" },
  "user.report": { en: "Report User", de: "Benutzer melden" },
  "user.blocked": { en: "Blocked", de: "Blockiert" },
  "user.alreadyBlocked": { en: "User already blocked", de: "Benutzer bereits blockiert" },
  "user.blockFailed": { en: "Failed to block user", de: "Blockieren fehlgeschlagen" },
  "user.reportTitle": { en: "Report", de: "Melden" },
  "user.reportDescription": { en: "Please describe why you're reporting this user", de: "Bitte beschreiben Sie, warum Sie diesen Benutzer melden" },
  "user.reportReason": { en: "Reason", de: "Grund" },
  "user.reportPlaceholder": { en: "Describe the issue...", de: "Problem beschreiben..." },
  "user.reportMinChars": { en: "minimum 10 characters", de: "mindestens 10 Zeichen" },
  "user.reportSubmit": { en: "Submit Report", de: "Meldung absenden" },
  "user.reportSubmitted": { en: "Report submitted", de: "Meldung abgeschickt" },
  "user.reportFailed": { en: "Failed to submit report", de: "Meldung fehlgeschlagen" },
  
  // User Info
  "userInfo.title": { en: "User Info", de: "Benutzerinfo" },
  "userInfo.bio": { en: "Bio", de: "Biografie" },
  "userInfo.noBio": { en: "No bio provided", de: "Keine Biografie angegeben" },
  "userInfo.joined": { en: "Joined", de: "Beigetreten" },
  "userInfo.loadFailed": { en: "Failed to load profile", de: "Profil konnte nicht geladen werden" },
  "userInfo.blockConfirmTitle": { en: "Block User?", de: "Benutzer blockieren?" },
  "userInfo.blockConfirmDescription": { en: "Are you sure you want to block", de: "Möchten Sie wirklich blockieren" },
  
  // Feedback
  "feedback.title": { en: "Feedback", de: "Feedback" },
  "feedback.send": { en: "Send Feedback", de: "Feedback senden" },
  "feedback.description": { en: "Share your thoughts, report issues, or suggest improvements.", de: "Teilen Sie Ihre Gedanken, melden Sie Probleme oder schlagen Sie Verbesserungen vor." },
  "feedback.rate": { en: "Rate your experience (optional)", de: "Bewerten Sie Ihre Erfahrung (optional)" },
  "feedback.placeholder": { en: "Enter your feedback here...", de: "Geben Sie hier Ihr Feedback ein..." },
  "feedback.submitted": { en: "Feedback submitted successfully!", de: "Feedback erfolgreich gesendet!" },
  "feedback.failed": { en: "Failed to submit feedback", de: "Feedback senden fehlgeschlagen" },
  "feedback.enterFeedback": { en: "Please enter your feedback", de: "Bitte geben Sie Ihr Feedback ein" },
  "feedback.tooLong": { en: "Feedback too long (max 5000 characters)", de: "Feedback zu lang (max. 5000 Zeichen)" },
  
  // Admin Panel
  "admin.title": { en: "Admin Dashboard", de: "Admin-Dashboard" },
  "admin.backToChat": { en: "Back to Chat", de: "Zurück zum Chat" },
  "admin.reports": { en: "Reports", de: "Meldungen" },
  "admin.users": { en: "Users", de: "Benutzer" },
  "admin.feedback": { en: "Feedback", de: "Feedback" },
  "admin.emojis": { en: "Emojis", de: "Emojis" },
  "admin.accessDenied": { en: "Access denied: Admin only", de: "Zugriff verweigert: Nur für Admins" },
  
  // Custom Emojis
  "emoji.custom": { en: "Custom Emojis", de: "Eigene Emojis" },
  "emoji.manage": { en: "Manage Custom Emojis", de: "Eigene Emojis verwalten" },
  "emoji.manageDescription": { en: "Add or remove custom emojis for all users", de: "Eigene Emojis für alle Benutzer hinzufügen oder entfernen" },
  "emoji.none": { en: "No custom emojis yet", de: "Noch keine eigenen Emojis" },
  "emoji.add": { en: "Add Emoji", de: "Emoji hinzufügen" },
  "emoji.added": { en: "Emoji added successfully", de: "Emoji erfolgreich hinzugefügt" },
  "emoji.addFailed": { en: "Failed to add emoji", de: "Emoji konnte nicht hinzugefügt werden" },
  "emoji.deleted": { en: "Emoji deleted", de: "Emoji gelöscht" },
  "emoji.deleteFailed": { en: "Failed to delete emoji", de: "Emoji konnte nicht gelöscht werden" },
  "emoji.loadFailed": { en: "Failed to load emojis", de: "Emojis konnten nicht geladen werden" },
  "emoji.namePlaceholder": { en: "Emoji name (e.g. happy)", de: "Emoji-Name (z.B. happy)" },
  "emoji.selectImage": { en: "Select Image", de: "Bild auswählen" },
  "emoji.enterName": { en: "Please enter an emoji name and select an image", de: "Bitte Emoji-Namen eingeben und Bild auswählen" },
  "emoji.invalidFormat": { en: "Please select PNG, GIF, JPG or WEBP image", de: "Bitte PNG, GIF, JPG oder WEBP Bild auswählen" },
  "emoji.tooLarge": { en: "Image must be less than 2MB", de: "Bild muss kleiner als 2MB sein" },
  "emoji.compressionFailed": { en: "Failed to compress image", de: "Bild konnte nicht komprimiert werden" },
  
  // Reports
  "reports.loading": { en: "Loading reports...", de: "Lade Meldungen..." },
  "reports.none": { en: "No reports found", de: "Keine Meldungen gefunden" },
  "reports.by": { en: "Report by", de: "Meldung von" },
  "reports.against": { en: "Against", de: "Gegen" },
  "reports.pending": { en: "pending", de: "ausstehend" },
  "reports.resolved": { en: "resolved", de: "gelöst" },
  "reports.resolve": { en: "Resolve", de: "Lösen" },
  "reports.resolveFailed": { en: "Failed to resolve report", de: "Lösen fehlgeschlagen" },
  "reports.delete": { en: "Delete Report", de: "Meldung löschen" },
  "reports.deleteConfirm": { en: "Are you sure you want to delete this report? This action cannot be undone.", de: "Möchten Sie diese Meldung wirklich löschen? Dies kann nicht rückgängig gemacht werden." },
  "reports.deleted": { en: "Report deleted", de: "Meldung gelöscht" },
  "reports.deleteFailed": { en: "Failed to delete report", de: "Löschen fehlgeschlagen" },
  
  // Ban/Suspend
  "ban.user": { en: "Ban User", de: "Benutzer sperren" },
  "ban.temp": { en: "Temp Ban", de: "Temporäre Sperre" },
  "ban.permanent": { en: "Permanently Ban", de: "Dauerhaft sperren" },
  "ban.temporarily": { en: "Temporarily Ban", de: "Temporär sperren" },
  "ban.confirmPermanent": { en: "This will permanently ban the user from accessing the chat.", de: "Dies sperrt den Benutzer dauerhaft vom Chat." },
  "ban.confirmTemp": { en: "This will temporarily prevent the user from accessing the chat.", de: "Dies hindert den Benutzer vorübergehend am Zugriff auf den Chat." },
  "ban.duration": { en: "Ban Duration (days)", de: "Sperrdauer (Tage)" },
  "ban.bannedPermanently": { en: "User banned permanently", de: "Benutzer dauerhaft gesperrt" },
  "ban.bannedTemp": { en: "User temporarily banned for", de: "Benutzer temporär gesperrt für" },
  "ban.days": { en: "days", de: "Tage" },
  "ban.failed": { en: "Failed to ban user", de: "Sperren fehlgeschlagen" },
  "ban.failedTemp": { en: "Failed to temporarily ban user", de: "Temporäres Sperren fehlgeschlagen" },
  
  // AI Moderation
  "ai.reviewing": { en: "AI is reviewing report...", de: "KI überprüft Meldung..." },
  "ai.reviewComplete": { en: "AI review complete", de: "KI-Überprüfung abgeschlossen" },
  "ai.reviewFailed": { en: "AI review failed", de: "KI-Überprüfung fehlgeschlagen" },
  "ai.violation": { en: "Violation", de: "Verstoß" },
  "ai.noViolation": { en: "No Violation", de: "Kein Verstoß" },
  "ai.verdict": { en: "AI Verdict", de: "KI-Urteil" },
  "ai.reason": { en: "AI Reason", de: "KI-Begründung" },
  "ai.autoBanned": { en: "Auto-banned for", de: "Automatisch gesperrt für" },
  "ai.reviewed": { en: "AI Reviewed", de: "KI geprüft" },
  "ai.pending": { en: "Pending AI Review", de: "Ausstehende KI-Prüfung" },
  "ai.review": { en: "AI Review", de: "KI-Überprüfung" },
  "ai.severity": { en: "Severity", de: "Schweregrad" },
  "ai.low": { en: "Low", de: "Niedrig" },
  "ai.medium": { en: "Medium", de: "Mittel" },
  "ai.high": { en: "High", de: "Hoch" },
  "ai.severe": { en: "Severe", de: "Schwer" },
  "ai.falseReport": { en: "False Report", de: "Falscher Bericht" },
  "ai.reporterWarned": { en: "Reporter warned for false report", de: "Melder wurde für falschen Bericht verwarnt" },
  "ai.reporterBanned": { en: "Reporter banned for repeated false reports", de: "Melder wurde für wiederholte falsche Berichte gesperrt" },
  "ai.warningIssued": { en: "Warning issued to reporter", de: "Verwarnung an Melder ausgestellt" },
  "ai.threeWarnings": { en: "3 warnings = 2 day ban", de: "3 Verwarnungen = 2 Tage Sperre" },
  
  // Banned Page
  "banned.account": { en: "Account", de: "Konto" },
  "banned.banned": { en: "Banned", de: "Gesperrt" },
  "banned.suspended": { en: "Temporarily Suspended", de: "Vorübergehend gesperrt" },
  "banned.permanently": { en: "permanently banned", de: "dauerhaft gesperrt" },
  "banned.temporarily": { en: "temporarily suspended", de: "vorübergehend gesperrt" },
  "banned.from": { en: "from Cross Chat", de: "von Cross Chat" },
  "banned.until": { en: "Until", de: "Bis" },
  "banned.expired": { en: "Expired", de: "Abgelaufen" },
  "banned.reasonFor": { en: "Reason for", de: "Grund für" },
  "banned.suspensionDetails": { en: "Suspension Details", de: "Details zur Sperrung" },
  "banned.suspendedOn": { en: "Suspended On", de: "Gesperrt am" },
  "banned.expiresOn": { en: "Expires On", de: "Läuft ab am" },
  "banned.daysRemaining": { en: "days remaining", de: "Tage verbleibend" },
  "banned.whatYouCanDo": { en: "What You Can Do", de: "Was Sie tun können" },
  "banned.autoExpire": { en: "Your suspension will automatically expire on", de: "Ihre Sperrung läuft automatisch ab am" },
  "banned.regainAccess": { en: "You'll regain full access to your account after the suspension period", de: "Sie erhalten nach Ablauf der Sperrfrist vollen Zugriff auf Ihr Konto" },
  "banned.permanentNote": { en: "This is a permanent ban and will not expire automatically", de: "Dies ist eine dauerhafte Sperre und läuft nicht automatisch ab" },
  "banned.contactSupport": { en: "If you believe this", de: "Wenn Sie glauben, dass diese" },
  "banned.isError": { en: "is an error, contact support", de: "ein Fehler ist, kontaktieren Sie den Support" },
  "banned.reviewGuidelines": { en: "Review our community guidelines to understand our policies", de: "Lesen Sie unsere Community-Richtlinien, um unsere Richtlinien zu verstehen" },
  "banned.signOut": { en: "Sign Out", de: "Abmelden" },
  "banned.contactSupportBtn": { en: "Contact Support", de: "Support kontaktieren" },
  
  // Calls
  "call.start": { en: "Start Call", de: "Anruf starten" },
  "call.end": { en: "End Call", de: "Anruf beenden" },
"call.connecting": { en: "Connecting...", de: "Verbinde..." },
  "call.cannotCallAI": { en: "Cannot call AI bot", de: "AI-Bot kann nicht angerufen werden" },
  "call.failed": { en: "Failed to start call", de: "Anruf konnte nicht gestartet werden" },
  "incomingCall": { en: "Incoming call...", de: "Eingehender Anruf..." },
  "call.accept": { en: "Accept", de: "Annehmen" },
  "call.decline": { en: "Decline", de: "Ablehnen" },
  
  // User Info - Online Status & Media
  "userInfo.online": { en: "Online", de: "Online" },
  "userInfo.offline": { en: "Offline", de: "Offline" },
  "userInfo.lastSeen": { en: "Last seen", de: "Zuletzt gesehen" },
  "userInfo.justNow": { en: "Just now", de: "Gerade eben" },
  "userInfo.minutesAgo": { en: "min ago", de: "Min. her" },
  "userInfo.hoursAgo": { en: "hours ago", de: "Std. her" },
  "userInfo.daysAgo": { en: "days ago", de: "Tage her" },
  "userInfo.neverSeen": { en: "Never", de: "Nie" },
  "userInfo.images": { en: "Images", de: "Bilder" },
  "userInfo.videos": { en: "Videos", de: "Videos" },
  "userInfo.noImages": { en: "No shared images", de: "Keine geteilten Bilder" },
  "userInfo.noVideos": { en: "No shared videos", de: "Keine geteilten Videos" },
  
  // Privacy Settings
  "settings.privacy": { en: "Privacy", de: "Datenschutz" },
  "privacy.description": { en: "Control who can see your status and add you to groups", de: "Kontrollieren Sie, wer Ihren Status sehen und Sie zu Gruppen hinzufügen kann" },
  "privacy.showOnlineStatus": { en: "Show Online Status", de: "Online-Status anzeigen" },
  "privacy.showOnlineStatusDescription": { en: "Allow others to see when you're online", de: "Anderen erlauben zu sehen, wenn Sie online sind" },
  "privacy.allowGroupInvites": { en: "Allow Group Invites from Strangers", de: "Gruppeneinladungen von Fremden erlauben" },
  "privacy.allowGroupInvitesDescription": { en: "People you haven't chatted with can add you directly to groups", de: "Personen, mit denen Sie nicht gechattet haben, können Sie direkt zu Gruppen hinzufügen" },
  "privacy.blockFromGroups": { en: "Block from Groups", de: "Von Gruppen blockieren" },
  "privacy.unblockFromGroups": { en: "Unblock from Groups", de: "Von Gruppen entsperren" },
  "privacy.blockFromGroupsConfirm": { en: "Block from adding to groups?", de: "Vom Hinzufügen zu Gruppen blockieren?" },
  "privacy.unblockFromGroupsConfirm": { en: "Unblock from groups?", de: "Von Gruppen entsperren?" },
  "privacy.blockFromGroupsDescription": { en: "This user won't be able to directly add you to groups. They'll need to send an invite instead.", de: "Dieser Benutzer kann Sie nicht direkt zu Gruppen hinzufügen. Stattdessen muss er eine Einladung senden." },
  "privacy.unblockFromGroupsDescription": { en: "This user will be able to add you directly to groups again.", de: "Dieser Benutzer kann Sie wieder direkt zu Gruppen hinzufügen." },
  "privacy.groupBlocked": { en: "Blocked from adding you to groups:", de: "Blockiert vom Hinzufügen zu Gruppen:" },
  "privacy.groupUnblocked": { en: "Can now add you to groups:", de: "Kann Sie jetzt zu Gruppen hinzufügen:" },
  "privacy.alreadyGroupBlocked": { en: "User already blocked from groups", de: "Benutzer bereits von Gruppen blockiert" },
  "privacy.groupBlockFailed": { en: "Failed to block from groups", de: "Blockieren von Gruppen fehlgeschlagen" },
  "privacy.groupUnblockFailed": { en: "Failed to unblock from groups", de: "Entsperren von Gruppen fehlgeschlagen" },
  "privacy.groupBlockedUsers": { en: "Blocked from Groups", de: "Von Gruppen blockiert" },
  "privacy.groupBlockedUsersDescription": { en: "Users who can't directly add you to groups", de: "Benutzer, die Sie nicht direkt zu Gruppen hinzufügen können" },
  "privacy.noGroupBlockedUsers": { en: "No users blocked from groups", de: "Keine Benutzer von Gruppen blockiert" },
  
  // Group Invites
  "invites.title": { en: "Group Invites", de: "Gruppeneinladungen" },
  "invites.description": { en: "Manage your pending group invitations", de: "Verwalten Sie Ihre ausstehenden Gruppeneinladungen" },
  "invites.pending": { en: "Pending Invites", de: "Ausstehende Einladungen" },
  "invites.pendingDescription": { en: "Groups you've been invited to join", de: "Gruppen, zu denen Sie eingeladen wurden" },
  "invites.noInvites": { en: "No pending invites", de: "Keine ausstehenden Einladungen" },
  "invites.invitedBy": { en: "Invited by", de: "Eingeladen von" },
  "invites.accept": { en: "Accept", de: "Annehmen" },
  "invites.decline": { en: "Decline", de: "Ablehnen" },
  "invites.accepted": { en: "Invite accepted! You joined the group.", de: "Einladung angenommen! Sie sind der Gruppe beigetreten." },
  "invites.declined": { en: "Invite declined", de: "Einladung abgelehnt" },
  "invites.acceptFailed": { en: "Failed to accept invite", de: "Einladung konnte nicht angenommen werden" },
  "invites.declineFailed": { en: "Failed to decline invite", de: "Einladung konnte nicht abgelehnt werden" },
  "invites.alreadyMember": { en: "You're already a member of this group", de: "Sie sind bereits Mitglied dieser Gruppe" },
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
