const fs = require('fs');
const path = require('path');

// Identify target file relative to this script (now inside website/scratch)
const targetFile = path.resolve(__dirname, '..', 'src', 'i18n_config.ts');

const languages = ['en', 'ar', 'hu', 'nl', 'ko', 'es', 'fr', 'de', 'it', 'pt', 'cs'];

const translations = {
  en: {
    common: { brand: "AirShield", beta: "BETA" },
    nav: { home: "Home", features: "Features", pricing: "Pricing", faqs: "FAQs", api: "Documentation" },
    auth: { logoutSuccess: "Signed out successfully", myServers: "My Servers", logout: "Logout", signIn: "Sign In" },
    sidebar: { dashboard: "Dashboard", download: "Download", players: "Players", search: "Search", map: "Map", liveView: "Live View", warns: "Warns", kicks: "Kicks", bans: "Bans", blacklistDetections: "Blacklist", airscanner: "AirScanner", licenseKeys: "Licenses", checkResults: "Results", console: "Console", resources: "Resources", scheduledTasks: "Tasks", admins: "Admins", activityLog: "Logs", settings: "Settings", moderation: "Moderation", scanner: "Scanner", pcchecker: "PC Checker", management: "Management" },
    footer: { documentation: "Documentation", terms: "Terms", privacy: "Privacy", refund: "Refund", support: "Support/Appeals", legal: "Legal", airEye: "Air Eye System", copyright: " 2023-2025 AirCore. All rights reserved." },
    dashboard: { title: "Management Console", myServers: "My Servers", owner: "Owner", admin: "Admin", expires: "Expires:", never: "Never", status: "Status:", configure: "Configure", buyMore: "Purchase License" },
    profile: { settings: "Profile Settings", displayName: "Display Name", bio: "Bio", save: "Save Changes", saving: "Saving...", wallet: "Wallet", redeem: "Redeem Code", sessions: "Recent Sessions", loggedAt: "Logged in at", device: "Device", location: "Location" },
    support: { title: "Support Center", subtitle: "Technical support and appeals", newTicket: "Create Ticket", category: "Category", subject: "Subject", message: "Message", submit: "Submit", submitting: "Sending...", myTickets: "Your Tickets", noTickets: "No tickets yet.", appealAlert: "Reserved for blacklisted users.", blacklistAppeal: "Appeal", buyInfo: "Payment Help", generalSupport: "Support" },
    addFunds: { title: "Add Funds", subtitle: "Top up your wallet balance", currentBalance: "Current Balance", amount: "Amount", selectAmount: "Select or enter amount", checkout: "Checkout", processing: "Processing...", success: "Funds added!", error: "Payment failed" },
    downloads: { title: "Downloads", subtitle: "Get latest builds", activeVersion: "Active Version", size: "Size", downloaded: "Downloaded", accessDenied: "License required.", downloadNow: "Download Now", noFiles: "No files" },
    pricingPage: { title: "Product Plans", subtitle: "Choose your protection", popular: "Popular", monthly: "Monthly", trimonthly: "3 Months", lifetime: "Lifetime", loading: "Loading...", purchase: "Purchase" },
    toast: { feedbackThanks: "Thanks for your feedback!" }
  },
  fr: {
    common: { brand: "AirShield", beta: "BÃ‰TA" },
    nav: { home: "Accueil", features: "Fonctions", pricing: "Tarifs", faqs: "FAQs", api: "Documentation" },
    auth: { logoutSuccess: "DÃ©connexion rÃ©ussie", myServers: "Mes serveurs", logout: "DÃ©connexion", signIn: "Connexion" },
    sidebar: { dashboard: "Tableau de bord", download: "TÃ©lÃ©charger", players: "Joueurs", search: "Recherche", map: "Carte", liveView: "Vue directe", warns: "Avertissements", kicks: "Expulsions", bans: "Bannissements", blacklistDetections: "Blacklist", airscanner: "AirScanner", licenseKeys: "Licences", checkResults: "RÃ©sultats", console: "Console", resources: "Ressources", scheduledTasks: "TÃ¢ches", admins: "Admins", activityLog: "Logs", settings: "ParamÃ¨tres", moderation: "ModÃ©ration", scanner: "Scanner", pcchecker: "PC Checker", management: "Gestion" },
    footer: { documentation: "Documentation", terms: "Conditions", privacy: "PrivautÃ©", refund: "Remboursement", support: "Support/Appels", legal: "LÃ©gal", airEye: "SystÃ¨me Air Eye", copyright: " 2023-2025 AirCore. Tous droits rÃ©servÃ©s." },
    dashboard: { title: "Console de gestion", myServers: "Mes serveurs", owner: "PropriÃ©taire", admin: "Admin", expires: "Expire le :", never: "Jamais", status: "Statut :", configure: "Configurer", buyMore: "Acheter une licence" },
    profile: { settings: "ParamÃ¨tres du profil", displayName: "Nom dâ€™affichage", bio: "Bio", save: "Enregistrer", saving: "Enregistrement...", wallet: "Portefeuille", redeem: "Utiliser un code", sessions: "Sessions rÃ©centes", loggedAt: "ConnectÃ© Ã ", device: "Appareil", location: "Localisation" },
    support: { title: "Centre de support", subtitle: "Support technique et appels", newTicket: "CrÃ©er un ticket", category: "CatÃ©gorie", subject: "Sujet", message: "Message", submit: "Envoyer", submitting: "Envoi...", myTickets: "Vos tickets", noTickets: "Aucun ticket.", appealAlert: "RÃ©servÃ© aux bannis.", blacklistAppeal: "Appel", buyInfo: "Aide achat", generalSupport: "Support" },
    addFunds: { title: "Ajouter des fonds", subtitle: "Rechargez votre portefeuille", currentBalance: "Solde actuel", amount: "Montant", selectAmount: "Saisissez le montant", checkout: "Payer", processing: "Traitement...", success: "Fonds ajoutÃ©s !", error: "Ã‰chec" },
    downloads: { title: "TÃ©lÃ©chargements", subtitle: "DerniÃ¨res versions", activeVersion: "Version active", size: "Taille", downloaded: "TÃ©lÃ©chargÃ©", accessDenied: "Licence requise.", downloadNow: "TÃ©lÃ©charger", noFiles: "Aucun fichier" },
    pricingPage: { title: "Offres produits", subtitle: "Choisissez votre protection", popular: "Populaire", monthly: "Mensuel", trimonthly: "3 Mois", lifetime: "Ã€ vie", loading: "Chargement...", purchase: "Acheter" },
    toast: { feedbackThanks: "Merci pour votre retour !" }
  },
  es: {
    common: { brand: "AirShield", beta: "BETA" },
    nav: { home: "Inicio", features: "Funciones", pricing: "Precios", faqs: "FAQs", api: "DocumentaciÃ³n" },
    auth: { logoutSuccess: "Cerrado correctamente", myServers: "Mis Servidores", logout: "Cerrar SesiÃ³n", signIn: "Entrar" },
    sidebar: { dashboard: "Panel", download: "Descargar", players: "Jugadores", search: "Buscar", map: "Mapa", liveView: "Vista en vivo", warns: "Avisos", kicks: "Expulsiones", bans: "Baneos", blacklistDetections: "Lista Negra", airscanner: "AirScanner", licenseKeys: "Licencias", checkResults: "Resultados", console: "Consola", resources: "Recursos", scheduledTasks: "Tareas", admins: "Admins", activityLog: "Logs", settings: "Ajustes", moderation: "ModeraciÃ³n", scanner: "Scanner", pcchecker: "PC Checker", management: "GestiÃ³n" },
    footer: { documentation: "DocumentaciÃ³n", terms: "TÃ©rminos", privacy: "Privacidad", refund: "Reembolso", support: "Soporte", legal: "Legal", airEye: "Air Eye", copyright: " 2023-2025 AirCore. Todos los derechos reservados." },
    dashboard: { title: "Consola de GestiÃ³n", myServers: "Mis Servidores", owner: "Propietario", admin: "Admin", expires: "Expira:", never: "Nunca", status: "Estado:", configure: "Configurar", buyMore: "Comprar Licencia" },
    profile: { settings: "Ajustes del Perfil", displayName: "Nombre", bio: "Bio", save: "Guardar", saving: "Guardando...", wallet: "Cartera", redeem: "Canjear", sessions: "Sesiones", loggedAt: "Conectado el", device: "Dispositivo", location: "UbicaciÃ³n" },
    support: { title: "Soporte", subtitle: "Ayuda y Apelaciones", newTicket: "Nuevo Ticket", category: "CategorÃ­a", subject: "Asunto", message: "Message", submit: "Submit", submitting: "Sending...", myTickets: "Your Tickets", noTickets: "No tickets yet.", appealAlert: "Reserved for blacklisted users.", blacklistAppeal: "Appeal", buyInfo: "Payment Help", generalSupport: "Support" },
    addFunds: { title: "AÃ±adir Fondos", subtitle: "Recarga tu saldo", currentBalance: "Saldo Actual", amount: "Cantidad", selectAmount: "Selecciona cantidad", checkout: "Comprar", processing: "Procesando...", success: "Recargado!", error: "Fallo" },
    downloads: { title: "Descargas", subtitle: "Versiones de software", activeVersion: "Activa", size: "TamaÃ±o", downloaded: "Descargado", accessDenied: "Falta licencia.", downloadNow: "Descargar", noFiles: "Sin archivos" },
    pricingPage: { title: "Planes", subtitle: "Mejor protecciÃ³n", popular: "Popular", monthly: "Mensuel", trimonthly: "3 Meses", lifetime: "Vitalicio", loading: "Cargando...", purchase: "Comprar" },
    toast: { feedbackThanks: "Â¡Gracias por tu opiniÃ³n!" }
  },
  de: {
    common: { brand: "AirShield", beta: "BETA" },
    nav: { home: "Start", features: "Funktionen", pricing: "Preise", faqs: "Häufige Fragen", api: "Doku" },
    auth: { logoutSuccess: "Abgemeldet", myServers: "Meine Server", logout: "Logout", signIn: "Login" },
    sidebar: { dashboard: "Dashboard", download: "Download", players: "Spieler", search: "Suche", map: "Karte", liveView: "Live-Ansicht", warns: "Warnungen", kicks: "Kicks", bans: "Banns", blacklistDetections: "Blacklist", airscanner: "AirScanner", licenseKeys: "Lizenzen", checkResults: "Ergebnisse", console: "Konsole", resources: "Ressourcen", scheduledTasks: "Aufgaben", admins: "Admins", activityLog: "Logs", settings: "Einstellungen", moderation: "Moderation", scanner: "Scanner", pcchecker: "PC Checker", management: "Management" },
    footer: { documentation: "Dokumentation", terms: "AGB", privacy: "Datenschutz", refund: "Erstattung", support: "Support", legal: "Rechtliches", airEye: "Air Eye", copyright: " 2023-2025 AirCore. Alle Rechte vorbehalten." },
    dashboard: { title: "Verwaltung", myServers: "Meine Server", owner: "Besitzer", admin: "Admin", expires: "Läuft ab:", never: "Nie", status: "Status:", configure: "Config", buyMore: "Lizenz" },
    profile: { settings: "Profil", displayName: "Name", bio: "Bio", save: "Speichern", saving: "Sp.", wallet: "Wallet", redeem: "Einlösen", sessions: "Sitzungen", loggedAt: "Login am", device: "Gerät", location: "Ort" },
    support: { title: "Support", subtitle: "Hilfe", newTicket: "Ticket", category: "Kat.", subject: "Titel", message: "Text", submit: "Senden", submitting: "Sdt...", myTickets: "Tickets", noTickets: "Keine.", appealAlert: "Gesperrte.", blacklistAppeal: "Einspruch", buyInfo: "Zahlung", generalSupport: "Support" },
    addFunds: { title: "Aufladen", subtitle: "Wallet", currentBalance: "Saldo", amount: "Betrag", selectAmount: "Betrag wählen", checkout: "Bezahlen", processing: "Läuft...", success: "Fertig!", error: "Fehler" },
    downloads: { title: "Downloads", subtitle: "Software", activeVersion: "Version", size: "Größe", downloaded: "Geladen", accessDenied: "Lizenz!", downloadNow: "Laden", noFiles: "Keine" },
    pricingPage: { title: "Pläne", subtitle: "Schutz", popular: "Beliebt", monthly: "Monat", trimonthly: "3 Mon.", lifetime: "Lifetime", loading: "Lade...", purchase: "Kaufen" },
    toast: { feedbackThanks: "Danke für dein Feedback!" }
  },
  ar: {
    common: { brand: "AirShield", beta: "??????" },
    nav: { home: "????????", features: "???????", pricing: "???????", faqs: "???????", api: "???????" },
    auth: { logoutSuccess: "?? ?????? ?????", myServers: "??????", logout: "????", signIn: "????" },
    sidebar: { dashboard: "???? ??????", download: "?????", players: "????????", search: "???", map: "???????", liveView: "?? ?????", warns: "???????", kicks: "???", bans: "???", blacklistDetections: "??????? ???????", airscanner: "??????", licenseKeys: "????????", checkResults: "???????", console: "????????", resources: "???????", scheduledTasks: "??????", admins: "???????", activityLog: "???????", settings: "?????????", moderation: "???????", scanner: "?????", pcchecker: "???? ??????", management: "???????" },
    footer: { documentation: "???????", terms: "??????", privacy: "????????", refund: "?????????", support: "?????", legal: "??????", airEye: "???? ??? ??", copyright: " 2023-2025 AirCore. ???? ?????? ??????." },
    dashboard: { title: "??????", myServers: "??????", owner: "??????", admin: "????", expires: "?????:", never: "?????", status: "??????:", configure: "?????", buyMore: "????" },
    profile: { settings: "?????", displayName: "?????", bio: "????", save: "???", saving: "???..", wallet: "???????", redeem: "???????", sessions: "???????", loggedAt: "??????", device: "??????", location: "??????" },
    support: { title: "?????", subtitle: "????????", newTicket: "?????", category: "?????", subject: "???????", message: "???????", submit: "?????", submitting: "?????..", myTickets: "??????", noTickets: "?? ????.", appealAlert: "?????????.", blacklistAppeal: "??????", buyInfo: "??????", generalSupport: "???" },
    addFunds: { title: "???", subtitle: "???????", currentBalance: "??????", amount: "??????", selectAmount: "????", checkout: "???", processing: "??????..", success: "??!", error: "???" },
    downloads: { title: "?????", subtitle: "???????", activeVersion: "???????", size: "?????", downloaded: "????", accessDenied: "?????!", downloadNow: "?????", noFiles: "?? ????" },
    pricingPage: { title: "?????", subtitle: "???????", popular: "????", monthly: "????", trimonthly: "3 ????", lifetime: "????", loading: "?????..", purchase: "????" },
    toast: { feedbackThanks: "????? ???????!" }
  },
  it: {
    common: { brand: "AirShield", beta: "BETA" },
    nav: { home: "Home", features: "Funzionalità", pricing: "Prezzi", faqs: "FAQs", api: "Documentazione" },
    auth: { logoutSuccess: "Disconnesso", myServers: "I miei Server", logout: "Logout", signIn: "Accedi" },
    sidebar: { dashboard: "Dashboard", download: "Download", players: "Giocatori", search: "Cerca", map: "Mappa", liveView: "Live View", warns: "Avvisi", kicks: "Espulsioni", bans: "Ban", blacklistDetections: "Blacklist", airscanner: "AirScanner", licenseKeys: "Licenze", checkResults: "Risultati", console: "Console", resources: "Risorse", scheduledTasks: "Attività", admins: "Admin", activityLog: "Log", settings: "Impostazioni", moderation: "Moderazione", scanner: "Scanner", pcchecker: "PC Checker", management: "Gestione" },
    footer: { documentation: "Documentazione", terms: "Termini", privacy: "Privacy", refund: "Rimborsi", support: "Supporto", legal: "Legale", airEye: "Air Eye", copyright: " 2023-2025 AirCore. Tutti i diritti riservati." },
    dashboard: { title: "Manifold", myServers: "Miei Server", owner: "Prop.", admin: "Admin", expires: "Scade:", never: "Mai", status: "Stato:", configure: "Config", buyMore: "Licenza" },
    profile: { settings: "Profilo", displayName: "Nome", bio: "Bio", save: "Salva", saving: "Salvataggio", wallet: "Wallet", redeem: "Riscatta", sessions: "Sessioni", loggedAt: "Log al", device: "Disp.", location: "Posto" },
    support: { title: "Supporto", subtitle: "Aiuto", newTicket: "Ticket", category: "Cat.", subject: "Oggetto", message: "Testo", submit: "Invia", submitting: "Invio", myTickets: "Tickets", noTickets: "Nessuno.", appealAlert: "Bannati.", blacklistAppeal: "Ricorso", buyInfo: "Pagamento", generalSupport: "Supporto" },
    addFunds: { title: "Ricarica", subtitle: "Wallet", currentBalance: "Saldo", amount: "Somma", selectAmount: "Scegli", checkout: "Paga", processing: "In corso", success: "Fatto!", error: "Errore" },
    downloads: { title: "Download", subtitle: "Software", activeVersion: "Versione", size: "Peso", downloaded: "Scaricato", accessDenied: "Licenza!", downloadNow: "Scarica", noFiles: "Nessuno" },
    pricingPage: { title: "Piani", subtitle: "Protezione", popular: "Popolare", monthly: "Mensile", trimonthly: "3 Mesi", lifetime: "Vitalizio", loading: "Caricamento", purchase: "Compra" },
    toast: { feedbackThanks: "Grazie per il feedback!" }
  },
  pt: {
    common: { brand: "AirShield", beta: "BETA" },
    nav: { home: "Início", features: "Funções", pricing: "Preços", faqs: "FAQs", api: "Docs" },
    auth: { logoutSuccess: "Desconectado", myServers: "Meus Servidores", logout: "Sair", signIn: "Entrar" },
    sidebar: { dashboard: "Painel", download: "Download", players: "Jogadores", search: "Busca", map: "Mapa", liveView: "Live View", warns: "Avisos", kicks: "Kicks", bans: "Bans", blacklistDetections: "Blacklist", airscanner: "AirScanner", licenseKeys: "Licenças", checkResults: "Resultados", console: "Console", resources: "Recursos", scheduledTasks: "Tarefas", admins: "Admins", activityLog: "Logs", settings: "Ajustes", moderation: "Moderação", scanner: "Scanner", pcchecker: "PC Checker", management: "Gestão" },
    footer: { documentation: "Documentação", terms: "Termos", privacy: "Privacidade", refund: "Reembolso", support: "Suporte", legal: "Legal", airEye: "Air Eye", copyright: " 2023-2025 AirCore. Todos los derechos reservados." },
    dashboard: { title: "Gestão", myServers: "Meus Servers", owner: "Dono", admin: "Admin", expires: "Expira:", never: "Nunca", status: "Status:", configure: "Config", buyMore: "Licença" },
    profile: { settings: "Perfil", displayName: "Nome", bio: "Bio", save: "Salvar", saving: "Salvando", wallet: "Carteira", redeem: "Resgatar", sessions: "Sessões", loggedAt: "Logado em", device: "Disp.", location: "Local" },
    support: { title: "Suporte", subtitle: "Ajuda", newTicket: "Ticket", category: "Cat.", subject: "Assunto", message: "Texto", submit: "Enviar", submitting: "Enviando", myTickets: "Tickets", noTickets: "Nenhum.", appealAlert: "Banidos.", blacklistAppeal: "Apelo", buyInfo: "Pagamento", generalSupport: "Suporte" },
    addFunds: { title: "Ricarregar", subtitle: "Carteira", currentBalance: "Saldo", amount: "Valor", selectAmount: "Escolha", checkout: "Pagar", processing: "Processando", success: "Feito!", error: "Erro" },
    downloads: { title: "Download", subtitle: "Software", activeVersion: "Versão", size: "Tam.", downloaded: "Baixado", accessDenied: "Licença!", downloadNow: "Baixar", noFiles: "Nenhum" },
    pricingPage: { title: "Planos", subtitle: "Proteção", popular: "Pop.", monthly: "Mensal", trimonthly: "3 Meses", lifetime: "Vitalício", loading: "Carregando", purchase: "Comprar" },
    toast: { feedbackThanks: "Obrigado pelo feedback!" }
  },
  nl: {
    common: { brand: "AirShield", beta: "BETA" },
    nav: { home: "Home", features: "Kenmerken", pricing: "Prijzen", faqs: "Vragen", api: "Doku" },
    auth: { logoutSuccess: "Afgemeld", myServers: "Mijn Servers", logout: "Logout", signIn: "Login" },
    sidebar: { dashboard: "Dashboard", download: "Download", players: "Spelers", search: "Zoeken", map: "Kaart", liveView: "Live View", warns: "Waarschuwing", kicks: "Kicks", bans: "Banns", blacklistDetections: "Blacklist", airscanner: "AirScanner", licenseKeys: "Licenties", checkResults: "Resultaten", console: "Console", resources: "Middelen", scheduledTasks: "Taken", admins: "Admins", activityLog: "Logs", settings: "Instellingen", moderation: "Moderatie", scanner: "Scanner", pcchecker: "PC Checker", management: "Beheer" },
    footer: { documentation: "Documentatie", terms: "Voorwaarden", privacy: "Privacy", refund: "Teruggave", support: "Support", legal: "Recht", airEye: "Air Eye", copyright: " 2023-2025 AirCore. Alle rechten voorbehouden." },
    dashboard: { title: "Beheer", myServers: "Mijn Servers", owner: "Eigenaar", admin: "Admin", expires: "Verloopt:", never: "Nooit", status: "Status:", configure: "Config", buyMore: "Licentie" },
    profile: { settings: "Profiel", displayName: "Naam", bio: "Bio", save: "Opslaan", saving: "Sparen", wallet: "Beurs", redeem: "Inwisselen", sessions: "Sessies", loggedAt: "Log op", device: "App.", location: "Plaats" },
    support: { title: "Support", subtitle: "Help", newTicket: "Ticket", category: "Cat.", subject: "Onderwerp", message: "Bericht", submit: "Versturen", submitting: "Sturen", myTickets: "Tickets", noTickets: "Geen.", appealAlert: "Gesperrt.", blacklistAppeal: "Bezwaar", buyInfo: "Betaling", generalSupport: "Support" },
    addFunds: { title: "Opladen", subtitle: "Beurs", currentBalance: "Saldo", amount: "Bedrag", selectAmount: "Kies", checkout: "Betalen", processing: "Lopen", success: "Klaar!", error: "Fout" },
    downloads: { title: "Download", subtitle: "Software", activeVersion: "Versie", size: "Grootte", downloaded: "Gladen", accessDenied: "Licentie!", downloadNow: "Laden", noFiles: "Geen" },
    pricingPage: { title: "Plannen", subtitle: "Bescherming", popular: "Pop.", monthly: "Maand", trimonthly: "3 Maanden", lifetime: "Lifetime", loading: "Laden", purchase: "Kopen" },
    toast: { feedbackThanks: "Bedankt voor je feedback!" }
  },
  ko: {
    common: { brand: "AirShield", beta: "??" },
    nav: { home: "?", features: "??", pricing: "??", faqs: "??", api: "??" },
    auth: { logoutSuccess: "???? ??", myServers: "? ??", logout: "????", signIn: "???" },
    sidebar: { dashboard: "????", download: "????", players: "????", search: "??", map: "??", liveView: "??? ?", warns: "??", kicks: "??", bans: "??", blacklistDetections: "?????", airscanner: "?????", licenseKeys: "????", checkResults: "??", console: "??", resources: "???", scheduledTasks: "??", admins: "???", activityLog: "??", settings: "??", moderation: "??", scanner: "???", pcchecker: "PC ??", management: "??" },
    footer: { documentation: "??", terms: "??", privacy: "????", refund: "??", support: "??", legal: "??", airEye: "?? ??", copyright: " 2023-2025 AirCore. ?? ?? ??." },
    dashboard: { title: "??", myServers: "? ??", owner: "???", admin: "???", expires: "??:", never: "???", status: "??:", configure: "??", buyMore: "??" },
    profile: { settings: "???", displayName: "??", bio: "??", save: "??", saving: "???", wallet: "??", redeem: "??", sessions: "??", loggedAt: "???", device: "??", location: "??" },
    support: { title: "??", subtitle: "???", newTicket: "??", category: "??", subject: "??", message: "??", submit: "??", submitting: "???", myTickets: "?? ??", noTickets: "??.", appealAlert: "???.", blacklistAppeal: "??", buyInfo: "??", generalSupport: "??" },
    addFunds: { title: "??", subtitle: "??", currentBalance: "??", amount: "??", selectAmount: "??", checkout: "??", processing: "???", success: "??!", error: "??" },
    downloads: { title: "????", subtitle: "?????", activeVersion: "??", size: "??", downloaded: "??", accessDenied: "????!", downloadNow: "??", noFiles: "??" },
    pricingPage: { title: "??", subtitle: "??", popular: "??", monthly: "??", trimonthly: "3??", lifetime: "??", loading: "??", purchase: "??" },
    toast: { feedbackThanks: "??? ?????!" }
  },
  hu: {
    common: { brand: "AirShield", beta: "BÃ‰TA" },
    nav: { home: "Kezdolap", features: "Funkciók", pricing: "Árak", faqs: "FAQs", api: "Doku" },
    auth: { logoutSuccess: "Kijelentkezve", myServers: "Saját szerverek", logout: "Kijelentkezés", signIn: "Belépés" },
    sidebar: { dashboard: "Irányítópult", download: "Letöltés", players: "Játékosok", search: "Keresés", map: "Térkép", liveView: "Élo nézet", warns: "Figyelmeztetés", kicks: "Kirúgás", bans: "Kitiltás", blacklistDetections: "Tiltólista", airscanner: "AirScanner", licenseKeys: "Licencek", checkResults: "Eredmények", console: "Konzol", resources: "Eroforrások", scheduledTasks: "Feladatok", admins: "Adminok", activityLog: "Naplók", settings: "Beállítások", moderation: "Moderáció", scanner: "Szkenner", pcchecker: "PC Checker", management: "Kezelés" },
    footer: { documentation: "Dokumentáció", terms: "Feltételek", privacy: "Adatvédelem", refund: "Visszatérítés", support: "Támogatás", legal: "Jogi", airEye: "Air Eye", copyright: " 2023-2025 AirCore. Minden jog fenntartva." },
    dashboard: { title: "Kezelés", myServers: "Saját szerverek", owner: "Tulaj", admin: "Admin", expires: "Lejárat:", never: "Soha", status: "Állapot:", configure: "Beáll.", buyMore: "Vásárlás" },
    profile: { settings: "Profil", displayName: "Név", bio: "Bio", save: "Mentés", saving: "Mentés..", wallet: "Tárca", redeem: "Beváltás", sessions: "Munkamenetek", loggedAt: "Belépve", device: "Eszköz", location: "Hely" },
    support: { title: "Támogatás", subtitle: "Segítség", newTicket: "Jegy", category: "Kat.", subject: "Téma", message: "Üzenet", submit: "Küldés", submitting: "Küldés..", myTickets: "Jegyeid", noTickets: "Nincs.", appealAlert: "Tiltottak.", blacklistAppeal: "Fellebbezés", buyInfo: "Fizetés", generalSupport: "Támogatás" },
    addFunds: { title: "Feltöltés", subtitle: "Tárca", currentBalance: "Egyenleg", amount: "Összeg", selectAmount: "Válassz", checkout: "Fizetés", processing: "Feldolgozás..", success: "Kész!", error: "Hiba" },
    downloads: { title: "Letöltés", subtitle: "Szoftver", activeVersion: "Verzió", size: "Méret", downloaded: "Letöltve", accessDenied: "Licenc!", downloadNow: "Letöltés", noFiles: "Nincs" },
    pricingPage: { title: "Csomagok", subtitle: "Védelem", popular: "Pop.", monthly: "Havi", trimonthly: "3 Hónap", lifetime: "Örökös", loading: "Betöltés..", purchase: "Megvétel" },
    toast: { feedbackThanks: "Köszönjük a visszajelzést!" }
  },
  cs: {
    common: { brand: "AirShield", beta: "BETA" },
    nav: { home: "Domu", features: "Funkce", pricing: "Ceník", faqs: "Casté dotazy", api: "Dokumentace" },
    auth: { logoutSuccess: "Odhlášení úspešné", myServers: "Moje servery", logout: "Odhlásit", signIn: "Prihlásit" },
    sidebar: { dashboard: "Nástenka", download: "Stáhnout", players: "Hráci", search: "Hledat", map: "Mapa", liveView: "Živý náhled", warns: "Varování", kicks: "Vyhození", bans: "Zákazy", blacklistDetections: "Blacklist", airscanner: "AirScanner", licenseKeys: "Licence", checkResults: "Výsledky", console: "Konzole", resources: "Zdroje", scheduledTasks: "Úkoly", admins: "Admini", activityLog: "Záznamy", settings: "Nastavení", moderation: "Moderace", scanner: "Skener", pcchecker: "PC Checker", management: "Správa" },
    footer: { documentation: "Dokumentace", terms: "Podmínky", privacy: "Soukromí", refund: "Vrácení", support: "Podpora", legal: "Právní", airEye: "Air Eye", copyright: " 2023-2025 AirCore. Všechna práva vyhrazena." },
    dashboard: { title: "Správa", myServers: "Moje servery", owner: "Majitel", admin: "Admin", expires: "Vyprší:", never: "Nikdy", status: "Stav:", configure: "Konf.", buyMore: "Koupit" },
    profile: { settings: "Profil", displayName: "Jméno", bio: "Bio", save: "Uložit", saving: "Ukládám", wallet: "Peneženka", redeem: "Uplatnit", sessions: "Relace", loggedAt: "V", device: "Zár.", location: "Místo" },
    support: { title: "Podpora", subtitle: "Pomoc", newTicket: "Ticket", category: "Kat.", subject: "Predmet", message: "Text", submit: "Odeslat", submitting: "Posílám", myTickets: "Tickety", noTickets: "Žádné.", appealAlert: "Zabl.", blacklistAppeal: "Odvolání", buyInfo: "Platba", generalSupport: "Podpora" },
    addFunds: { title: "Dobít", subtitle: "Kredity", currentBalance: "Zustatek", amount: "Cástka", selectAmount: "Vyber", checkout: "Platba", processing: "Beží", success: "Hotovo!", error: "Chyba" },
    downloads: { title: "Download", subtitle: "Software", activeVersion: "Verzió", size: "Velikost", downloaded: "Staženo", accessDenied: "Licence!", downloadNow: "Stáhnout", noFiles: "Žádné" },
    pricingPage: { title: "Plány", subtitle: "Ochrana", popular: "Pop.", monthly: "Mes.", trimonthly: "3 Mes.", lifetime: "Doživ.", loading: "Nacítám", purchase: "Koupit" },
    toast: { feedbackThanks: "Dekujeme za zpetnou vazbu!" }
  }
};

const initContent = `
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const STORAGE_KEY = "airshield_i18n_lang";
const ALLOWED_LANGS = new Set(${JSON.stringify(languages)});

const resources = {
${languages.map(lang => `  ${lang}: { translation: ${JSON.stringify(translations[lang] || translations.en, null, 2).split('\n').join('\n  ')} },`).join('\n')}
};

function getInitialLanguage(): string {
  if (typeof window === "undefined") return "en";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && ALLOWED_LANGS.has(stored)) return stored;
  } catch {
    /* ignore */
  }
  return "en";
}

void i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (lng) => {
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    /* ignore */
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = lng;
    document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
  }
});

if (typeof document !== "undefined") {
  document.documentElement.lang = i18n.language;
  document.documentElement.dir = i18n.language === "ar" ? "rtl" : "ltr";
}

export default i18n;
`;

fs.writeFileSync(targetFile, initContent, 'utf8');
console.log('Successfully generated i18n_config.ts in src/');
