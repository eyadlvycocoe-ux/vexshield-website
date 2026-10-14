export type HelpAction = {
  label: string;
  href?: string;
  prompt?: string;
};

export type LocalHelpReply = {
  title?: string;
  content: string;
  language?: HelpLanguage;
  actions?: HelpAction[];
  related?: HelpAction[];
};

type KnowledgeEntry = {
  id: string;
  title: string;
  keywords: string[];
  answer: string;
  actions?: HelpAction[];
  related?: HelpAction[];
};

export type HelpLanguage = "en" | "ar" | "fr" | "es" | "de" | "it" | "pt" | "nl" | "hu" | "cs" | "ko";

export const quickHelpPrompts: HelpAction[] = [
  { label: "Reset IP", prompt: "I need to reset my server IP" },
  { label: "Installation", prompt: "Help me install VexShield" },
  { label: "Products", prompt: "Explain VexShield" },
  { label: "Buying", prompt: "I need help buying a plan" },
];

const supportAction = { label: "Open Help Center", href: "/help-center" };
const docsAction = { label: "Open Documentation", href: "/documentation" };
const serversAction = { label: "Open My Servers", href: "/my-servers" };
const pricingAction = { label: "View Pricing", href: "/pricing" };
const profileAction = { label: "Open Profile Settings", href: "/profile-settings" };
const addFundsAction = { label: "Add Funds", href: "/add-funds" };
const partnersAction = { label: "Open Partners", href: "/partners" };
const faqsAction = { label: "Open FAQs", href: "/faqs" };

const supportedHelpLanguages: HelpLanguage[] = ["en", "ar", "fr", "es", "de", "it", "pt", "nl", "hu", "cs", "ko"];

const localizedUi: Record<HelpLanguage, { welcomeTitle: string; welcome: string; noMatchTitle: string; noMatch: string; fallbackLabel: string }> = {
  en: {
    welcomeTitle: "Welcome",
    welcome:
      "Welcome. I am the local VexShield website assistant. I can explain the website, VexShield anticheat, installation, Reset IP, buying, license setup, dashboard pages, search/blacklist, and support options.",
    noMatchTitle: "I can help locally",
    noMatch:
      "I could not find an exact local answer yet. Ask me about VexShield, installation, Reset IP, pricing, licenses, dashboard pages, search/blacklist, or support options.",
    fallbackLabel: "local fallback",
  },
  ar: {
    welcomeTitle: "?????",
    welcome:
      "?????? ??? ????? VexShield ???? ??????. ???? ???? ?? ??????? ????????? ??? VexShield? Reset IP? ??????? ???? ??????? ??? ??????? ?????.",
    noMatchTitle: "???? ?????? ?????",
    noMatch:
      "?? ??? ????? ?????? ????? ?? ????? ??????? ???????. ?????? ?? VexShield? Reset IP? ???????? ?????? ???? ??????? ?????/?????? ????? ?? ?????? ?????.",
    fallbackLabel: "?? ????",
  },
  fr: {
    welcomeTitle: "Bienvenue",
    welcome:
      "Bienvenue. Je suis l'assistant VexShield du site. Je peux expliquer le site, l'anticheat VexShield, l'installation, Reset IP, l'achat, les licences, le tableau de bord, la recherche/blacklist et les options de support.",
    noMatchTitle: "Je peux aider localement",
    noMatch:
      "Je n'ai pas trouv de rponse locale exacte. Demandez-moi VexShield, l'installation, Reset IP, les prix, les licences, le tableau de bord, la recherche/blacklist ou le support.",
    fallbackLabel: "rponse locale",
  },
  es: {
    welcomeTitle: "Bienvenido",
    welcome:
      "Bienvenido. Soy el asistente de VexShield del sitio. Puedo explicar el sitio, el anticheat VexShield, instalacin, Reset IP, compras, licencias, panel y opciones de soporte.",
    noMatchTitle: "Puedo ayudar localmente",
    noMatch:
      "No encontr una respuesta local exacta. Pregntame sobre VexShield, instalacin, Reset IP, precios, licencias, panel, bsqueda/blacklist o soporte.",
    fallbackLabel: "respuesta local",
  },
  de: {
    welcomeTitle: "Willkommen",
    welcome:
      "Willkommen. Ich bin der VexShield-Assistent dieser Website. Ich kann die Website, VexShield-Anticheat, Installation, Reset IP, Kauf, Lizenzen, Dashboard und Support-Optionen erklren.",
    noMatchTitle: "Ich kann lokal helfen",
    noMatch:
      "Ich habe keine genaue lokale Antwort gefunden. Frag mich zu VexShield, Installation, Reset IP, Preisen, Lizenzen, Dashboard, Suche/Blacklist oder Support.",
    fallbackLabel: "lokale Antwort",
  },
  it: {
    welcomeTitle: "Benvenuto",
    welcome:
      "Benvenuto. Sono l'assistente VexShield del sito. Posso spiegare sito, anticheat VexShield, installazione, Reset IP, acquisto, licenze, dashboard e opzioni di supporto.",
    noMatchTitle: "Posso aiutare localmente",
    noMatch:
      "Non ho trovato una risposta locale esatta. Chiedimi di VexShield, installazione, Reset IP, prezzi, licenze, dashboard, ricerca/blacklist o supporto.",
    fallbackLabel: "risposta locale",
  },
  pt: {
    welcomeTitle: "Bem-vindo",
    welcome:
      "Bem-vindo. Sou o assistente VexShield do site. Posso explicar o site, anticheat VexShield, instalao, Reset IP, compra, licenas, painel e opes de suporte.",
    noMatchTitle: "Posso ajudar localmente",
    noMatch:
      "No encontrei uma resposta local exata. Pergunte sobre VexShield, instalao, Reset IP, preos, licenas, painel, pesquisa/blacklist ou suporte.",
    fallbackLabel: "resposta local",
  },
  nl: {
    welcomeTitle: "Welkom",
    welcome:
      "Welkom. Ik ben de VexShield-assistent van de website. Ik kan de website, VexShield-anticheat, installatie, Reset IP, aankoop, licenties, dashboard en supportopties uitleggen.",
    noMatchTitle: "Ik kan lokaal helpen",
    noMatch:
      "Ik vond geen exacte lokale reactie. Vraag mij over VexShield, installatie, Reset IP, prijzen, licenties, dashboard, zoeken/blacklist of support.",
    fallbackLabel: "lokaal antwoord",
  },
  hu: {
    welcomeTitle: "dvzlm",
    welcome:
      "dvzlm. n vagyok az VexShield webhely asszisztense. El tudom magyarzni a webhelyet, az VexShield anticheatet, teleptst, Reset IP-t, vsrlst, licenceket, dashboardot s support lehetosgeket.",
    noMatchTitle: "Helyben is tudok segteni",
    noMatch:
      "Nem talltam pontos helyi vlaszt. Krdezzen VexShield-rol, teleptsrol, Reset IP-rol, rakrl, licencekrol, dashboardrl, keress/blacklist vagy support tmrl.",
    fallbackLabel: "helyi vlasz",
  },
  cs: {
    welcomeTitle: "Vtejte",
    welcome:
      "Vtejte. Jsem asistent VexShield na tomto webu. Umm vysvetlit web, anticheat VexShield, instalaci, Reset IP, nkup, licence, dashboard a monosti podpory.",
    noMatchTitle: "Mohu pomoci loklne",
    noMatch:
      "Nenael jsem presnou lokln odpoved. Zeptejte se na VexShield, instalaci, Reset IP, ceny, licence, dashboard, vyhledvn/blacklist nebo support.",
    fallbackLabel: "lokln odpoved",
  },
  ko: {
    welcomeTitle: "?????",
    welcome:
      "?????. ?? VexShield ???? ??????. ????, ??, ??, Reset IP, ??, ????, ????, ?? ??? ??? ? ????.",
    noMatchTitle: "??? ???? ? ????",
    noMatch:
      "??? ?? ??? ?? ?????. VexShield, ??, Reset IP, ??, ????, ????, ??/????? ?? ?? ??? ?? ??? ???.",
    fallbackLabel: "?? ??",
  },
};

const localizedActionLabels: Partial<Record<HelpLanguage, Record<string, string>>> = {
  ar: {
    "Reset IP": "????? IP",
    Installation: "???????",
    Products: "????????",
    Buying: "??????",
    "Open Help Center": "??? ???? ?????",
    "Open Documentation": "??? ???????",
    "Open My Servers": "??? ????????",
    "View Pricing": "??? ???????",
    "Explain installation": "??? ???????",
    "Explain products": "??? ????????",
    "VexShield setup": "????? VexShield",
    "PCChecker help": "?????? PCChecker",
    Requirements: "?????????",
    "License setup": "????? ??????",
    "Buying help": "?????? ??????",
    "Which product?": "?? ???? ??????",
    "Payment issue": "????? ???",
    "License key help": "?????? ??????",
    "Install steps": "????? ???????",
    "Download scripts": "????? ?????????",
    "VexShield products": "?????? VexShield",
    "Blacklist appeal": "??????? ?????? ????",
    "Open Search": "??? ?????",
    "Open Profile Settings": "??? ??????? ??????",
    "Add Funds": "????? ????",
    "Open API Keys": "??? API Keys",
    "Open Partners": "??? ???????",
    "Open FAQs": "??? ??????? ???????",
    "Account help": "?????? ??????",
    "Payment help": "?????? ?????",
    "Dashboard help": "??? ???? ??????",
    "Settings help": "??? ?????????",
    "Developer API": "API ????????",
    "Partner program": "?????? ???????",
  },
  fr: { "Reset IP": "Changer IP", Installation: "Installation", Products: "Produits", Buying: "Achat" },
  es: { "Reset IP": "Cambiar IP", Installation: "Instalacin", Products: "Productos", Buying: "Compra" },
  de: { "Reset IP": "IP ndern", Installation: "Installation", Products: "Produkte", Buying: "Kaufen" },
  it: { "Reset IP": "Cambia IP", Installation: "Installazione", Products: "Prodotti", Buying: "Acquisto" },
  pt: { "Reset IP": "Alterar IP", Installation: "Instalao", Products: "Produtos", Buying: "Compra" },
  nl: { "Reset IP": "IP wijzigen", Installation: "Installatie", Products: "Producten", Buying: "Kopen" },
  hu: { "Reset IP": "IP csere", Installation: "Telepts", Products: "Termkek", Buying: "Vsrls" },
  cs: { "Reset IP": "Zmenit IP", Installation: "Instalace", Products: "Produkty", Buying: "Nkup" },
  ko: { "Reset IP": "IP ??", Installation: "??", Products: "??", Buying: "??" },
};

const localizedAnswers: Record<string, Partial<Record<HelpLanguage, string>>> = {
  overview: {
    ar: "VexShield ?? ???? ?????? ????? FiveM. ?? ?????? ???? ????? ????????? ???? ?????????? ???? ?????????? ???? ?????? ?????? ?? ?????? ??????? ???? ??????.",
    fr: "VexShield est une protection FiveM avec un tableau de bord client. Le site permet d'acheter VexShield, connecter les serveurs, tlcharger les scripts, grer les licences et utiliser le dashboard.",
    es: "VexShield es una suite de proteccin para FiveM con panel de cliente. El sitio permite comprar VexShield, conectar servidores, descargar scripts, gestionar licencias y usar el dashboard.",
    de: "VexShield ist eine FiveM-Schutzsuite mit Kunden-Dashboard. ber die Website kauft man VexShield, verbindet Server, ldt Skripte herunter, verwaltet Lizenzen und nutzt das Dashboard.",
    it: "VexShield - una suite di protezione FiveM con dashboard cliente. Il sito permette di acquistare VexShield, collegare server, scaricare script, gestire licenze e usare la dashboard.",
    pt: "VexShield - uma sute de proteo FiveM com painel de cliente. O site permite comprar VexShield, conectar servidores, baixar scripts, gerenciar licenas e usar o painel.",
    nl: "VexShield is een FiveM-beveiligingssuite met klantendashboard. Via de site kun je VexShield kopen, servers koppelen, scripts downloaden, licenties beheren en het dashboard gebruiken.",
    hu: "Az VexShield egy FiveM vdelmi csomag gyfl dashboarddal. A webhelyen VexShieldet vsrolhat, szervereket kapcsolhat, scripteket tlthet le s licenceket kezelhet.",
    cs: "VexShield je sada ochrany pro FiveM s klientskm dashboardem. Web slou k nkupu VexShieldu, pripojen serveru, stahovn skriptu a sprve licenc.",
    ko: "VexShield? FiveM ?? ???? ?? ???????. ????? VexShield ??, ?? ??, ???? ????, ???? ?? ? ???? ??? ?????.",
  },
  products: {
    ar: "????????: VexShield ?? ???? ???? ??????? ??? ????????? ?????? ??????? ????????? ??????? ??? ?????",
    fr: "VexShield est l'anticheat FiveM principal avec dtections, bans, whitelist et menu admin.",
    es: "VexShield es el anticheat FiveM principal con detecciones, bans, whitelist y men admin.",
    de: "VexShield ist der Haupt-FiveM-Anticheat mit Erkennung, Bans, Whitelist und Admin-Men.",
    it: "VexShield - l'anticheat FiveM principale con rilevamenti, ban, whitelist e men admin.",
    pt: "VexShield - o anticheat FiveM principal com deteces, bans, whitelist e menu admin.",
    nl: "VexShield is de hoofd-FiveM-anticheat met detecties, bans, whitelist en admin-menu.",
    hu: "Az VexShield a fo FiveM anticheat szlelssel, banokkal, whitelisttel s admin menvel.",
    cs: "VexShield je hlavn FiveM anticheat s detekcemi, bany, whitelistem a admin menu.",
    ko: "VexShield? FiveM ?? ???????. ????, ??, ???????, ?????? ??? ?????.",
  },
  installation: {
    ar: "????? ???????: ???? My Servers ????? ???????? ?? ???? ???? Download ??????? ???? ??????. ???? ?????? ???? resources? ??? IP ??????? ?? server.cfg? ?? ??? ensure airshield ???? ????? ???????.",
    fr: "Installation: ouvrez My Servers, connectez le serveur, tlchargez le produit depuis Download, placez le dossier dans resources, ajoutez l'IP et la licence dans server.cfg, puis ensure airshield et redmarrez.",
    es: "Instalacin: abre My Servers, conecta el servidor, descarga el producto, sube la carpeta a resources, aade IP y licencia en server.cfg, luego ensure airshield y reinicia.",
    de: "Installation: My Servers ffnen, Server verbinden, Produkt herunterladen, Ordner in resources legen, IP und Lizenz in server.cfg eintragen, dann ensure airshield und Server neu starten.",
    it: "Installazione: apri My Servers, collega il server, scarica il prodotto, carica la cartella in resources, aggiungi IP e licenza in server.cfg, poi ensure airshield e riavvia.",
    pt: "Instalao: abra My Servers, conecte o servidor, baixe o produto, envie a pasta para resources, adicione IP e licena no server.cfg, depois ensure airshield e reinicie.",
    nl: "Installatie: open My Servers, koppel de server, download het product, plaats de map in resources, voeg IP en licentie toe in server.cfg, daarna ensure airshield en herstart.",
    hu: "Telepts: nyissa meg a My Servers oldalt, kapcsolja a szervert, tltse le a termket, tegye a mappt a resources al, adja hozz az IP-t s licencet a server.cfg-ben, majd ensure airshield s jraindts.",
    cs: "Instalace: otevrete My Servers, pripojte server, sthnete produkt, vlote sloku do resources, pridejte IP a licenci do server.cfg, pot ensure airshield a restart.",
    ko: "??: My Servers?? ??? ???? Download?? ??? ????. ??? resources? ?? server.cfg? IP? ????? ??? ? ensure airshield ? ??? ??????.",
  },
  "reset-ip": {
    ar: "?????? IP: ???? My Servers? ???? ???????? ???? Dashboard? ??? ??? Server IP ???? Reset IP ?? ???? IP ?????? ?????. ??? ???? ??? ????? ????? ?? ????? ??? Discord ?? ??????? ?Server ID ???? IP ?????? ???????.",
    fr: "Reset IP: ouvrez My Servers, choisissez le serveur, ouvrez Dashboard, puis Server IP > Reset IP. Entrez la nouvelle IP et sauvegardez. Si le bouton manque, contactez le support Discord avec email, server ID, ancienne et nouvelle IP.",
    es: "Reset IP: abre My Servers, elige el servidor, entra al Dashboard y usa Server IP > Reset IP. Escribe la nueva IP y guarda. Si no aparece, contacta soporte por Discord con email, server ID, IP antigua y nueva.",
    de: "Reset IP: My Servers ffnen, Server whlen, Dashboard ffnen und Server IP > Reset IP nutzen. Neue IP speichern. Falls der Button fehlt, kontaktiere den Discord-Support mit E-Mail, Server ID, alter und neuer IP.",
    it: "Reset IP: apri My Servers, scegli il server, entra nel Dashboard e usa Server IP > Reset IP. Inserisci la nuova IP e salva. Se manca il pulsante, contatta il supporto Discord con email, server ID, vecchio e nuovo IP.",
    pt: "Reset IP: abra My Servers, escolha o servidor, entre no Dashboard e use Server IP > Reset IP. Digite o novo IP e salve. Se o boto no aparecer, contacte o suporte no Discord com email, server ID, IP antigo e novo.",
    nl: "Reset IP: open My Servers, kies de server, open Dashboard en gebruik Server IP > Reset IP. Vul het nieuwe IP in en sla op. Geen knop? Contacteer Discord support met e-mail, server ID, oud en nieuw IP.",
    hu: "Reset IP: My Servers, szerver kivlasztsa, Dashboard, majd Server IP > Reset IP. rja be az j IP-t s mentse. Ha nincs gomb, keresse a Discord supportot emaillel, server ID-val, rgi s j IP-vel.",
    cs: "Reset IP: otevrete My Servers, vyberte server, otevrete Dashboard a pouijte Server IP > Reset IP. Zadejte novou IP a ulote. Pokud tlactko chyb, kontaktujte Discord podporu s emailem, server ID, starou a novou IP.",
    ko: "Reset IP: My Servers?? ??? ???? Dashboard? ??? ? Server IP > Reset IP? ?????. ? IP? ?????. ??? ??? ???, server ID, ??/? IP? Help Center ??? ???.",
  },
  pricing: {
    ar: "??????: ???? Pricing? ???? ???????? ??????? ??? ????? ??? ????? ?? ???? ???????? ?? PayPal. ??? ?????? ???? My Servers ????? ?????? ???????? ??????.",
    fr: "Achat: ouvrez Pricing, choisissez les produits et la dure, ajoutez un coupon si disponible, payez par wallet ou PayPal, puis connectez la licence au bon serveur dans My Servers.",
    es: "Compra: abre Pricing, elige productos y duracin, aplica cupn si tienes, paga con wallet o PayPal y conecta la licencia al servidor correcto en My Servers.",
    de: "Kauf: Pricing ffnen, Produkte und Dauer whlen, ggf. Coupon nutzen, mit Wallet oder PayPal zahlen und die Lizenz in My Servers mit dem richtigen Server verbinden.",
    it: "Acquisto: apri Pricing, scegli prodotti e durata, applica un coupon se disponibile, paga con wallet o PayPal e collega la licenza al server corretto in My Servers.",
    pt: "Compra: abra Pricing, escolha produtos e durao, aplique cupom se tiver, pague com wallet ou PayPal e conecte a licena ao servidor correto em My Servers.",
    nl: "Kopen: open Pricing, kies producten en duur, gebruik eventueel een coupon, betaal met wallet of PayPal en koppel de licentie aan de juiste server in My Servers.",
    hu: "Vsrls: nyissa meg a Pricing oldalt, vlasszon termkeket s idotartamot, hasznljon kupont, fizessen wallet/PayPal mdon, majd ksse a licencet a megfelelo szerverhez a My Servers oldalon.",
    cs: "Nkup: otevrete Pricing, vyberte produkty a dobu, prpadne pouijte kupn, zaplatte wallet/PayPal a pripojte licenci ke sprvnmu serveru v My Servers.",
    ko: "??: Pricing?? ??? ??? ???? ??? ??? ??? ? wallet ?? PayPal? ?????. ?? My Servers?? ????? ??? ??? ?????.",
  },
  account: {
    ar: "??????: ??? ?????? ??? Discord ?? Sign In. ??? ?????? ???? ???? Profile Settings ?????? ????????? My Servers ?????? ?????????? Add Funds ?????? ????? ?API Keys ???????? ?????? ??????????. ??? ???? ????? ????? ???? ?? ???? ????? ?? ????? ??? Discord.",
  },
  wallet: {
    ar: "?????? ??????: ???? Add Funds ?????? ???? ???????? ?? ?????? ?????? ?? ???? Pricing ????? ??????. ??? ????? ???? ?????? ?? ????? ?? ???? ????? PayPal? ???? Help Center ????? ???????? ??????? ??? ?????? ????? ???? ?? ??? ???????.",
  },
  dashboard: {
    ar: "???? ???????: ?? My Servers ???? ???????. ?? Dashboard ???? ???? ???? ???????? IP? ??????? ??????????? ????????? ?????????? ?????? ????????? ?????????? ?????????? ???????? ???????? ????????? ???????? ?????????? ??? ????????.",
  },
  settings: {
    ar: "?????????: ???? Settings ???? ?? ?????? ??????? VexShield ??? ????????? ?????? ??? ?????? ???????? ???????? ?????? ??????? Discord webhooks? ??????? ??????? ????????/peds/weapons/commands/triggers/resources? ???????? config.lua.",
  },
  moderation: {
    ar: "Moderation tools: Players/Search/Bans/Warns/Kicks/Logs/Activity allow reviewing players and managing server enforcement.",
  },
  partners: {
    ar: "???????: ???? Official Partners ????? ???????? ?????? ??????? ???? ??????? ????????. ??? ???? ???? ????? ?? ????? ?????? ??? ??????? ???? ???? Partners ?? ????? ??? Help Center.",
  },
  docsfaq: {
    ar: "??????? ????????: Documentation ???? ??? ???????? ?????????? ????????? ???????? ?????????? ????????? ????????. FAQs ??????? ???????. ??? ?? ??? ??????? ???? Help Center.",
  },
  legal: {
    ar: "??????? ?????????: Terms ???? ???? ?????????? Privacy ???? ???????? ?????????? ?Refund ???? ????? ?????????. ??? ???? ??? ?? ??????? ???? ????? ?? ????? ?? ?????? ?????.",
  },
  admin: {
    ar: "?????? ???????: ????? Staff/Admin ????? ?????? ?????? ??????????? ?????????? ?????????? ??????? ???????? ????????? ????? ????????? ???????. ??? ?? ???? ?? ??? ??????? ??????? ??? ???? ??????.",
  },
};

const knowledgeBase: KnowledgeEntry[] = [
  {
    id: "overview",
    title: "VexShield Overview",
    keywords: [
      "aircore",
      "airshield",
      "website",
      "platform",
      "what is this",
      "what can you do",
      "help me",
      "everything",
      "all website",
      "products",
      "??????",
      "??????",
      "???? ??????",
      "???? ??????",
      "??? ????",
      "?? ??????",
      "?? ???",
      "?? ??",
      "??????",
      "??? ??????",
    ],
    answer:
      "VexShield is your FiveM protection suite. The website lets customers buy VexShield, connect servers, download scripts, manage licenses, contact support, and use the dashboard. VexShield is the core FiveM anticheat with real-time detections, automated bans, in-game admin menu, and dashboard management.",
    actions: [docsAction, pricingAction],
    related: [
      { label: "Explain installation", prompt: "Help me install VexShield" },
      { label: "Explain products", prompt: "Explain VexShield products" },
    ],
  },
  {
    id: "products",
    title: "Products",
    keywords: [
      "products",
      "product",
      "airshield",
      "anticheat",
      "??????",
      "????????",
      "???????",
      "???",
    ],
    answer:
      "VexShield is the core FiveM anticheat for real-time detections, automated bans, whitelist management, an in-game admin menu, and a web dashboard. It is the only product we offer.",
    actions: [pricingAction, docsAction],
    related: [
      { label: "VexShield setup", prompt: "How do I install VexShield?" },
    ],
  },
  {
    id: "installation",
    title: "Installation",
    keywords: [
      "install",
      "installation",
      "setup",
      "server.cfg",
      "ensure",
      "resource",
      "download",
      "resources",
      "?????",
      "?????",
      "?????",
      "???????",
      "???",
      "?????",
    ],
    answer:
      'Installation flow: 1) Open My Servers and connect or add your server. 2) Open the server Download page and download the product. 3) Extract the folder into resources/[local]/airshield or the correct product folder. 4) Add the server IP and license key to server.cfg. 5) Add "ensure airshield" and restart the FiveM server. Keep your license key private.',
    actions: [docsAction, serversAction],
    related: [
      { label: "Requirements", prompt: "What are the requirements?" },
      { label: "License setup", prompt: "How do I use my license key?" },
    ],
  },
  {
    id: "requirements",
    title: "Requirements",
    keywords: [
      "requirements",
      "required",
      "fivem artifacts",
      "onesync",
      "txadmin",
      "rcon",
      "https",
      "???????",
      "?????????",
      "????",
      "?????",
    ],
    answer:
      "Before installing, use recent recommended FiveM artifacts, enable OneSync, allow outbound HTTPS so the resource can reach aircore.xyz, and keep console access through txAdmin or RCON. You also need an VexShield account, a connected server, and an active entitlement for each product.",
    actions: [docsAction],
    related: [{ label: "Install steps", prompt: "Help me install VexShield" }],
  },
  {
    id: "reset-ip",
    title: "Reset IP",
    keywords: [
      "reset ip",
      "rest ip",
      "server ip",
      "change ip",
      "new ip",
      "vps ip",
      "ip reset",
      "????? ip",
      "????? ??????",
      "??? ip",
      "??? ??????",
      "???? ip",
      "???? ip",
      "???? ????",
      "????? ????",
      "?????",
      "????",
      "?? ??",
      "?? ??",
      "??????",
    ],
    answer:
      "To reset a server IP, open My Servers, choose the server, then open Dashboard. In the Server IP card press Reset IP, enter the new VPS/server IP, and save. If the button is not visible or ownership must be checked, contact support on Discord with your account email, server ID, old IP, and new IP.",
    actions: [serversAction, supportAction],
    related: [
      { label: "Contact support", prompt: "How do I contact support?" },
      { label: "License key help", prompt: "How do I set my license key?" },
    ],
  },
  {
    id: "pricing",
    title: "Buying And Pricing",
    keywords: [
      "buy",
      "purchase",
      "pricing",
      "price",
      "plan",
      "checkout",
      "paypal",
      "subscription",
      "one time",
      "lifetime",
      "wallet",
      "coupon",
      "????",
      "??????",
      "???",
      "???????",
      "???????",
      "?????",
      "??????",
      "?????",
      "?????",
    ],
    answer:
      "To buy, open Pricing, select the products you need, choose the duration, apply a coupon if you have one, then pay with wallet funds, PayPal, or both depending on the checkout. After purchase, go to My Servers and connect the license to the correct server. Licenses are per server unless staff gives written approval.",
    actions: [pricingAction, serversAction],
    related: [
      { label: "Which product?", prompt: "Explain VexShield products" },
      { label: "Payment issue", prompt: "I have a payment problem" },
    ],
  },
  {
    id: "license",
    title: "License Keys",
    keywords: [
      "license",
      "license key",
      "key",
      "entitlement",
      "activate",
      "????",
      "??????",
      "?????",
      "?????",
    ],
    answer:
      'License keys are tied to your account and server. In server.cfg add your real server IP and license key, for example: set airshield_server_ip "your_host/vps_ip" and set airshield_license_key "AIRSHIELD-XXXXXX-XXXXXX". Never share the key publicly.',
    actions: [serversAction, docsAction],
    related: [{ label: "Install steps", prompt: "Help me install VexShield" }],
  },
  {
    id: "support",
    title: "Support",
    keywords: [
      "support",
      "help center",
      "staff",
      "problem",
      "issue",
      "payment problem",
      "blacklist appeal",
      "appeal",
      "???",
      "??????",
      "?????",
      "????",
      "???????",
      "???? ????",
    ],
    answer:
      "Use the Help Center, documentation, FAQs, or Discord support when the question needs staff action, such as payment issues, manual Reset IP, blacklist appeal, or account/server ownership checks. Include useful details like email, server ID, order/payment info, screenshots, old IP, and new IP when needed.",
    actions: [supportAction],
    related: [
      { label: "Reset IP help", prompt: "I need to reset my server IP" },
      { label: "Buying help", prompt: "I need help buying a plan" },
    ],
  },
  {
    id: "my-servers",
    title: "My Servers",
    keywords: [
      "my servers",
      "server dashboard",
      "dashboard",
      "connect server",
      "add server",
      "download page",
      "downloads",
      "????????",
      "???????",
      "????",
      "??? ???????",
      "????? ???????",
    ],
    answer:
      "My Servers is where customers open the dashboard for each connected server. From there they can view status, manage the server IP, copy or hide the license key, open downloads, and manage server tools depending on their access role.",
    actions: [serversAction],
    related: [
      { label: "Reset IP", prompt: "I need to reset my server IP" },
      { label: "Download scripts", prompt: "Where do I download the scripts?" },
    ],
  },

  {
    id: "blacklist-search",
    title: "Search And Blacklist",
    keywords: [
      "search",
      "lookup",
      "blacklist",
      "ban",
      "discord id",
      "player lookup",
      "cheat discord",
      "???",
      "???? ????",
      "???",
      "??????? ????",
      "??? ????",
    ],
    answer:
      "The search tools help look up players and Discord IDs, show blacklist status, proofs, bot bans, server ban hits, and related intelligence when available. Use exact identifiers such as Discord IDs for the best results.",
    actions: [{ label: "Open Search", href: "/search" }],
    related: [{ label: "Blacklist appeal", prompt: "How do I open a blacklist appeal?" }],
  },
  {
    id: "account",
    title: "Account And Profile",
    keywords: [
      "account",
      "profile",
      "sign in",
      "login",
      "discord login",
      "auth",
      "reset password",
      "settings account",
      "????",
      "????? ??????",
      "????",
      "???????",
      "??????? ??????",
      "??????? ??????",
      "???????",
    ],
    answer:
      "Use Sign In to log in with Discord. After login, Profile Settings is where you manage account details and post-purchase setup. My Servers shows connected servers, and Add Funds manages wallet balance. For login/account issues, open Help Center.",
    actions: [profileAction, serversAction, supportAction],
    related: [
      { label: "Payment help", prompt: "I have a payment or wallet problem" },
    ],
  },
  {
    id: "wallet",
    title: "Wallet And Payments",
    keywords: [
      "wallet",
      "funds",
      "add funds",
      "balance",
      "payment",
      "paypal",
      "checkout",
      "refund",
      "transaction",
      "????",
      "?????",
      "????? ????",
      "????? ????",
      "???",
      "??????",
      "???????",
      "????",
    ],
    answer:
      "Open Add Funds to add wallet balance, then use wallet balance during checkout on Pricing. If payment fails, balance does not appear, PayPal has an issue, or you need a refund review, open Help Center with your email, amount, time, transaction/order info, and screenshots.",
    actions: [addFundsAction, pricingAction, supportAction],
    related: [
      { label: "Buying help", prompt: "I need help buying a plan" },
      { label: "Open FAQs", href: "/faqs" },
    ],
  },
  {
    id: "dashboard",
    title: "Server Dashboard",
    keywords: [
      "dashboard",
      "analytics",
      "map",
      "live view",
      "monitoring",
      "server status",
      "license key",
      "players",
      "???? ??????",
      "???????",
      "????????",
      "????????",
      "???????",
      "??????",
      "???? ???????",
      "??????",
    ],
    answer:
      "Open My Servers and choose a server. The dashboard shows server status, server IP, license key, statistics, players, detections, analytics, map/live monitoring, warnings, kicks, bans, logs, console, resources, scheduled tasks, admins, activity, and settings depending on your permissions.",
    actions: [serversAction],
    related: [
      { label: "Settings help", prompt: "Explain server settings" },
      { label: "Reset IP", prompt: "I need to reset my server IP" },
    ],
  },
  {
    id: "settings",
    title: "Server Settings",
    keywords: [
      "settings",
      "config",
      "config.lua",
      "webhook",
      "discord webhook",
      "blacklisted",
      "whitelist",
      "admin groups",
      "exempt groups",
      "triggers",
      "vehicles",
      "weapons",
      "???????",
      "???????",
      "?????",
      "??????",
      "??????",
      "???? ????",
      "???? ????",
      "?????",
    ],
    answer:
      "Server Settings lets you tune VexShield configuration: detections, actions, Discord webhooks, admin/exempt groups, allowed/blacklisted resources, vehicles, peds, weapons, commands, triggers, menu words, and config.lua import. Save after changes and restart/reload the resource if needed.",
    actions: [serversAction, docsAction],
    related: [
      { label: "Install steps", prompt: "Help me install VexShield" },
      { label: "Requirements", prompt: "What are the requirements?" },
    ],
  },
  {
    id: "moderation",
    title: "Moderation And Logs",
    keywords: [
      "bans",
      "warns",
      "kicks",
      "logs",
      "activity",
      "moderation",
      "evidence",
      "proof",
      "players",
      "users",
      "????",
      "???",
      "?????",
      "??",
      "???",
      "???",
      "???",
      "????",
      "????",
      "????",
    ],
    answer:
      "Moderation pages help you review and manage players, bans, warns, kicks, logs, evidence, activity history, and search results. Use exact identifiers such as Discord ID/license/player identifiers when possible. If a ban needs appeal or staff review, open Help Center.",
    actions: [{ label: "Open Search", href: "/search" }, serversAction, supportAction],
    related: [{ label: "Blacklist appeal", prompt: "How do I open a blacklist appeal?" }],
  },
  {
    id: "partners",
    title: "Official Partners",
    keywords: [
      "partners",
      "partner",
      "partner program",
      "official partner",
      "affiliate",
      "????",
      "?????",
      "?????? ???????",
      "??????",
    ],
    answer:
      "The Official Partners page shows partner program information and official partners. If you want to join or need custom partnership details, open Partners first, then contact staff through Help Center if the information is not enough.",
    actions: [partnersAction, supportAction],
    related: [{ label: "Payment help", prompt: "I have a payment problem" }],
  },
  {
    id: "docsfaq",
    title: "Documentation And FAQs",
    keywords: [
      "documentation",
      "docs",
      "faq",
      "faqs",
      "guide",
      "commands",
      "permissions",
      "examples",
      "?????",
      "???",
      "????",
      "?????",
      "?????",
      "?????",
      "?????",
      "???????",
    ],
    answer:
      "Documentation is the best place for installation, requirements, products, commands, permissions, configuration, screenshots, and examples. FAQs answer common account, licensing, download, and support questions. If the docs do not answer it, open Help Center.",
    actions: [docsAction, faqsAction, supportAction],
    related: [{ label: "Install steps", prompt: "Help me install VexShield" }],
  },
  {
    id: "legal",
    title: "Terms Privacy Refund",
    keywords: [
      "terms",
      "privacy",
      "refund",
      "policy",

      "legal",
      "????",
      "??????",
      "???????",
      "???????",
      "?????",
      "?????",
    ],
    answer:
      "Use Terms for service rules, Privacy for data handling, and Refund for refund policy. For a specific refund, payment dispute, or account case, open Help Center and include order/payment details.",
    actions: [
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
      { label: "Refund", href: "/refund" },
      supportAction,
    ],
    related: [{ label: "Payment help", prompt: "I have a payment problem" }],
  },
  {
    id: "admin",
    title: "Staff And Admin Pages",
    keywords: [
      "admin",
      "staff",
      "support panel",
      "staff panel",
      "admin dashboard",
      "coupons",
      "promotions",
      "backups",
      "????",
      "????",
      "????",
      "???? ???????",
      "???? ???????",
      "?????",
      "????",
      "??? ???????",
    ],
    answer:
      "Staff/Admin pages are only for authorized users. They include user/server management, coupons, redeem codes, promotions, global bans, backups, blocked users/servers, AirEye admin, and activity logs. If the page is missing, your account probably does not have permission.",
    actions: [supportAction],
    related: [{ label: "Account help", prompt: "Help me with my account permissions" }],
  },
];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[إأآ]/g, "ا")
    .replace(/[^\p{L}\p{N}\s./_-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length >= 3);
}

function scoreEntry(query: string, entry: KnowledgeEntry) {
  const normalizedQuery = normalizeText(query);
  const queryTokens = tokenize(query);
  let score = 0;

  for (const keyword of entry.keywords) {
    const normalizedKeyword = normalizeText(keyword);
    if (!normalizedKeyword) continue;

    if (normalizedQuery.includes(normalizedKeyword)) {
      score += normalizedKeyword.includes(" ") ? 7 : 4;
      continue;
    }

    const keywordTokens = tokenize(keyword);
    const matchingTokens = keywordTokens.filter((token) => queryTokens.includes(token));
    if (matchingTokens.length > 0) score += matchingTokens.length * 2;
  }

  return score;
}

function isGreeting(query: string) {
  const normalized = normalizeText(query);
  return ["hello", "hi", "hey", "salam", "salaam", "????", "??????", "????", "?????"].some((word) =>
    normalized.includes(normalizeText(word)),
  );
}

function readSiteLanguage(): HelpLanguage {
  if (typeof window === "undefined") return "en";
  try {
    const stored = window.localStorage.getItem("airshield_i18n_lang");
    if (stored && supportedHelpLanguages.includes(stored as HelpLanguage)) return stored as HelpLanguage;
  } catch {
    /* ignore */
  }
  const htmlLang = document.documentElement.lang?.slice(0, 2);
  if (htmlLang && supportedHelpLanguages.includes(htmlLang as HelpLanguage)) return htmlLang as HelpLanguage;
  const browserLang = navigator.language?.slice(0, 2);
  if (browserLang && supportedHelpLanguages.includes(browserLang as HelpLanguage)) return browserLang as HelpLanguage;
  return "en";
}

function detectHelpLanguage(input: string): HelpLanguage {
  if (/[\u0600-\u06FF]/.test(input)) return "ar";
  if (/[\uAC00-\uD7AF]/.test(input)) return "ko";

  const normalized = normalizeText(input);
  const wordHints: Array<[HelpLanguage, string[]]> = [
    ["fr", ["bonjour", "merci", "acheter", "aide", "prix", "licence", "serveur"]],
    ["es", ["hola", "gracias", "comprar", "ayuda", "precio", "licencia", "servidor"]],
    ["de", ["hallo", "danke", "kaufen", "hilfe", "preis", "lizenz", "server"]],
    ["it", ["ciao", "grazie", "comprare", "aiuto", "prezzo", "licenza", "server"]],
    ["pt", ["ola", "ol", "obrigado", "comprar", "ajuda", "preo", "licena", "servidor"]],
    ["nl", ["hallo", "bedankt", "kopen", "hulp", "prijs", "licentie", "server"]],
    ["hu", ["szia", "koszonom", "ksznm", "vasarlas", "vsrls", "segitseg", "segtsg", "licenc"]],
    ["cs", ["ahoj", "dekuji", "dekuji", "koupit", "pomoc", "cena", "licence", "server"]],
  ];

  for (const [language, hints] of wordHints) {
    if (hints.some((hint) => normalized.includes(normalizeText(hint)))) return language;
  }

  return readSiteLanguage();
}

function localizeEntry(entry: KnowledgeEntry, language: HelpLanguage) {
  return localizedAnswers[entry.id]?.[language] || entry.answer;
}

function localizeActions(actions: HelpAction[] | undefined, language: HelpLanguage) {
  if (!actions || language === "en") return actions;
  const localizedLabels = localizedActionLabels[language];
  if (!localizedLabels) return actions;
  return actions.map((action) => ({ ...action, label: localizedLabels[action.label] || action.label }));
}

function localizeQuickPrompts(language: HelpLanguage) {
  return localizeActions(quickHelpPrompts, language) || quickHelpPrompts;
}

export function getLocalHelpReply(input: string): LocalHelpReply {
  const prompt = input.trim();
  const language = detectHelpLanguage(prompt);
  const ui = localizedUi[language] || localizedUi.en;

  if (!prompt || isGreeting(prompt)) {
    return {
      title: ui.welcomeTitle,
      content: ui.welcome,
      language,
      actions: localizeQuickPrompts(language),
    };
  }

  const rankedEntries = knowledgeBase
    .map((entry) => ({ entry, score: scoreEntry(prompt, entry) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const best = rankedEntries[0]?.entry;

  if (!best) {
    return {
      title: ui.noMatchTitle,
      content: ui.noMatch,
      language,
      actions: localizeQuickPrompts(language),
      related: localizeActions([supportAction, docsAction], language),
    };
  }

  const secondary = rankedEntries
    .slice(1, 3)
    .map(({ entry }) => ({ label: entry.title, prompt: `Explain ${entry.title}` }));

  return {
    title: language === "en" ? best.title : `${best.title} (${ui.fallbackLabel})`,
    content: localizeEntry(best, language),
    language,
    actions: localizeActions(best.actions, language),
    related: localizeActions(best.related || secondary, language),
  };
}

