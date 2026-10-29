// scripts/build_comprehensive_translations.js
// Builds comprehensive dictionaries for en, am, ti, om covering all CMMS modules.

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/i18n/locales');
const enPath = path.join(localesDir, 'en.json');
const amPath = path.join(localesDir, 'am.json');
const tiPath = path.join(localesDir, 'ti.json');
const omPath = path.join(localesDir, 'om.json');

const existingEn = fs.existsSync(enPath) ? JSON.parse(fs.readFileSync(enPath, 'utf8')) : {};
const existingAm = fs.existsSync(amPath) ? JSON.parse(fs.readFileSync(amPath, 'utf8')) : {};
const existingTi = fs.existsSync(tiPath) ? JSON.parse(fs.readFileSync(tiPath, 'utf8')) : {};
const existingOm = fs.existsSync(omPath) ? JSON.parse(fs.readFileSync(omPath, 'utf8')) : {};

// New comprehensive key sets
const translationDatabase = {
  // COMMON / CORE UI
  "common.save": {
    en: "Save Changes",
    am: "ለውጦችን መዝግብ",
    ti: "ለውጥታት ዓቅብ",
    om: "Jijjiirama Olkaa'i"
  },
  "common.cancel": {
    en: "Cancel",
    am: "ሰርዝ",
    ti: "ሰርዝ",
    om: "Dhiisi"
  },
  "common.delete": {
    en: "Delete",
    am: "አስወግድ",
    ti: "ኣወግድ",
    om: "Haqi"
  },
  "common.edit": {
    en: "Edit",
    am: "አስተካክል",
    ti: "ኣመዓራሪ",
    om: "Gulaali"
  },
  "common.view": {
    en: "View Details",
    am: "ዝርዝር እይ",
    ti: "ዝርዝር ርአ",
    om: "Bal'ina Ilaali"
  },
  "common.add": {
    en: "Add New",
    am: "አዲስ ጨምር",
    ti: "ሓድሽ ወስኽ",
    om: "Haaraa Dabali"
  },
  "common.search": {
    en: "Search",
    am: "ፈልግ",
    ti: "ድለ",
    om: "Barbaadi"
  },
  "common.filter": {
    en: "Filter",
    am: "አጣራ",
    ti: "ኣጻሪ",
    om: "Calali"
  },
  "common.reset": {
    en: "Reset",
    am: "ወደ ነበረበት መልስ",
    ti: "ናብ ዝነበሮ ምለስ",
    om: "Deebisi"
  },
  "common.refresh": {
    en: "Refresh",
    am: "አድስ",
    ti: "ሓድሽ",
    om: "Haaromsi"
  },
  "common.export": {
    en: "Export",
    am: "ላክ (ኤክስፖርት)",
    ti: "ኣውጽእ",
    om: "Baasi"
  },
  "common.import": {
    en: "Import",
    am: "አስገባ (ኢምፖርት)",
    ti: "ኣእቱ",
    om: "Galchi"
  },
  "common.status": {
    en: "Status",
    am: "ሁኔታ",
    ti: "ኩነታት",
    om: "Haala"
  },
  "common.actions": {
    en: "Actions",
    am: "ተግባራት",
    ti: "ተግባራት",
    om: "Tarkaanfiiwwan"
  },
  "common.back": {
    en: "Back",
    am: "ተመለስ",
    ti: "ተመለስ",
    om: "Duubatti"
  },
  "common.close": {
    en: "Close",
    am: "ዝጋ",
    ti: "ዕጾ",
    om: "Cufi"
  },
  "common.confirm": {
    en: "Confirm",
    am: "አረጋግጥ",
    ti: "ኣረጋግጽ",
    om: "Mirkaneessi"
  },
  "common.submit": {
    en: "Submit",
    am: "አስገባ",
    ti: "ኣእቱ",
    om: "Galchi"
  },
  "common.loading": {
    en: "Loading...",
    am: "በመጫን ላይ...",
    ti: "ይጽዓን ኣሎ...",
    om: "Fe'aa jira..."
  },
  "common.active": {
    en: "Active",
    am: "ንቁ",
    ti: "ንጡፍ",
    om: "Socho'aa"
  },
  "common.inactive": {
    en: "Inactive",
    am: "ቦዝኗል",
    ti: "ዘይነጡፍ",
    om: "Hin sochoone"
  },
  "common.all": {
    en: "All",
    am: "ሁሉም",
    ti: "ኩሉ",
    om: "Hundumaa"
  },
  "common.total": {
    en: "Total",
    am: "ጠቅላላ",
    ti: "ጠቕላላ",
    om: "Ida'ama"
  },
  "common.name": {
    en: "Name",
    am: "ስም",
    ti: "ስም",
    om: "Maqaa"
  },
  "common.email": {
    en: "Email",
    am: "ኢሜይል",
    ti: "ኢመይል",
    om: "Imeelii"
  },
  "common.phone": {
    en: "Phone",
    am: "ስልክ",
    ti: "ተሌፎን",
    om: "Bilbila"
  },
  "common.date": {
    en: "Date",
    am: "ቀን",
    ti: "ዕለት",
    om: "Guyyaa"
  },
  "common.time": {
    en: "Time",
    am: "ሰዓት",
    ti: "ሰዓት",
    om: "Sa'aatii"
  },
  "common.role": {
    en: "Role",
    am: "ሚና / ኃላፊነት",
    ti: "ተራ / ሓላፍነት",
    om: "Gahee"
  },
  "common.branch": {
    en: "Branch",
    am: "ቅርንጫፍ",
    ti: "ጨንፈር",
    om: "Damee"
  },
  "common.campus": {
    en: "Campus",
    am: "ግቢ / ቅርንጫፍ",
    ti: "ግቢ / ጨንፈር",
    om: "Kaampaasii"
  },
  "common.department": {
    en: "Department",
    am: "የአገልግሎት ክፍል",
    ti: "ክፍሊ ኣገልግሎት",
    om: "Kutaa Tajaajilaa"
  },
  "common.yes": {
    en: "Yes",
    am: "አዎ",
    ti: "እወ",
    om: "Eeyyee"
  },
  "common.no": {
    en: "No",
    am: "አይደለም",
    ti: "ኣይኮነን",
    om: "Lakki"
  },
  "common.success": {
    en: "Success",
    am: "ተሳክቷል",
    ti: "ተዓዊቱ",
    om: "Milkaa'eera"
  },
  "common.error": {
    en: "Error",
    am: "ስህተት",
    ti: "ጌጋ",
    om: "Dogoggora"
  },
  "common.warning": {
    en: "Warning",
    am: "ማስጠንቀቂያ",
    ti: "መጠንቀቕታ",
    om: "Akeekkachiisa"
  },
  "common.no_records": {
    en: "No records found",
    am: "ምንም መረጃ አልተገኘም",
    ti: "ዋላ ሓደ መዝገብ ኣይተረኽበን",
    om: "Galmeen tokkollee hin argamne"
  },

  // LANDING PAGE (ChurchPeopleFrontpage)
  "landing.title": {
    en: "Church Management System",
    am: "የቤተክርስቲያን አስተዳደር ሥርዓት",
    ti: "ናይ ቤተክርስቲያን ምሕደራ ስርዓት",
    om: "Sirna Bulchiinsa Waldaa Kiristaanaa"
  },
  "landing.subtitle": {
    en: "Unified Operations & Ministry Platform",
    am: "የተቀናጀ የቤተክርስቲያን አገልግሎትና አስተዳደር መድረክ",
    ti: "ዝተዋደደ ናይ ኣገልግሎትን ምሕደራን መድረኽ",
    om: "Waltajjii Hojii fi Tajaajila Tokkummaa"
  },
  "landing.nav_home": {
    en: "Home",
    am: "ዋና ገጽ",
    ti: "ቀንዲ ገጽ",
    om: "Fuula Duraa"
  },
  "landing.nav_features": {
    en: "Features",
    am: "አገልግሎቶችና ገጽታዎች",
    ti: "ንጥፈታትን ኣገልግሎታትን",
    om: "Amaloota"
  },
  "landing.nav_about": {
    en: "About",
    am: "ስለ ሲስተሙ",
    ti: "ብዛዕባ ስርዓት",
    om: "Waa'ee Sirnichaa"
  },
  "landing.nav_how_it_works": {
    en: "How It Works",
    am: "እንዴት እንደሚሰራ",
    ti: "ከመይ ይሰርሕ",
    om: "Akkaataa Hojii"
  },
  "landing.nav_security": {
    en: "Security",
    am: "ደህንነትና አስተማማኝነት",
    ti: "ድሕንነትን ውሕስነትን",
    om: "Nageenya"
  },
  "landing.nav_contact": {
    en: "Contact",
    am: "አድራሻና ግንኙነት",
    ti: "ርክብ",
    om: "Qunnamtii"
  },
  "landing.login": {
    en: "Login",
    am: "ግባ",
    ti: "እቶ",
    om: "Seeni"
  },
  "landing.get_started": {
    en: "Get Started",
    am: "ጀምር",
    ti: "ጀምር",
    om: "Jalqabi"
  },
  "landing.launch_app": {
    en: "Launch Portal",
    am: "ፖርታሉን ክፈት",
    ti: "ፖርታል ክፈት",
    om: "Poortaalii Bani"
  },
  "landing.hero_badge": {
    en: "Next-Generation Church Infrastructure",
    am: "ዘመናዊና የተሟላ የቤተክርስቲያን መሠረተ-ልማት",
    ti: "ዘመናዊ መዋቕር ቤተክርስቲያን",
    om: "Bu'uuraalee Misooma Waldaa Ammayyaa"
  },
  "landing.hero_title_1": {
    en: "Equipping Leaders.",
    am: "መሪዎችን ማብቃት፤",
    ti: "መራሕቲ ምዕጣቕ፤",
    om: "Hoggantoota Hidhachiisuu."
  },
  "landing.hero_title_2": {
    en: "Connecting Members.",
    am: "ምዕመናንን ማስተሳሰር።",
    ti: "ምእመናን ምትእስሳር።",
    om: "Miseensota Walqunnamsiisuu."
  },
  "landing.hero_desc": {
    en: "A comprehensive digital governance, membership, and pastoral ministry platform built for multi-campus churches, branches, and fellowship groups.",
    am: "ለበርካታ ካምፓሶች፣ ቅርንጫፎች እና የአገልግሎት ህብረቶች የተዘጋጀ የተሟላ የዲጂታል አባልነት፣ የክህነትና የአስተዳደር መድረክ።",
    ti: "ንብዙሓት ካምፓሳት፣ ጨናፍርን ሕብረታትን ዝተዳለወ ምሉእ ናይ ኣባልነትን ኣገልግሎትን መድረኽ።",
    om: "Waltajjii dijitaalaa bulchiinsa, miseensummaa fi tajaajila tajaajiltootaa kaampaasota, dameewwanii fi gareewwan socho'aniif ijaarame."
  },
  "landing.stat_members": {
    en: "Active Members Managed",
    am: "የሚተዳደሩ ንቁ አባላት",
    ti: "ዝመሓደሩ ንጡፋት ኣባላት",
    om: "Miseensota Socho'an Bulchaman"
  },
  "landing.stat_campuses": {
    en: "Multi-Campus Campuses",
    am: "ቅርንጫፍ አብያተ ክርስቲያናት",
    ti: "ጨናፍር ኣብያተ ክርስቲያናት",
    om: "Kaampaasota Damee"
  },
  "landing.stat_ministries": {
    en: "Ministry Departments",
    am: "የአገልግሎት ክፍሎችና ህብረቶች",
    ti: "ክፍልታት ኣገልግሎትን ሕብረታትን",
    om: "Kutaalee Tajaajilaa"
  },
  "landing.stat_uptime": {
    en: "High Availability & Uptime",
    am: "አስተማማኝ የስርዓት ዝግጁነት",
    ti: "ውሑስ ናይ ስርዓት ድልውነት",
    om: "Qophii Sirnaa Olaanaa"
  },
  "landing.explore_features": {
    en: "Explore Modules",
    am: "ሞጁሎችን ይመልከቱ",
    ti: "ሞጁላት ርአ",
    om: "Kutaalee Ilaali"
  },
  "landing.how_it_works_title": {
    en: "Designed for Smooth Church Operations",
    am: "ቀላልና ቀልጣፋ ለሆነ የቤተክርስቲያን አመራር የተቀየሰ",
    ti: "ንቀሊልን ቅልጡፍን ምሕደራ ቤተክርስቲያን ዝተዳለወ",
    om: "Hojii Waldaa Salphaa fi Qajeelaadhaaf Kan Qophaa'e"
  },
  "landing.step_1_title": {
    en: "1. Secure Onboarding & Setup",
    am: "1. ደህንነቱ የተጠበቀ ምዝገባና ማዋቀር",
    ti: "1. ድሑን ምዝገባን ምድላውን",
    om: "1. Galmee fi Qindaa'ina Nageenya Qabu"
  },
  "landing.step_1_desc": {
    en: "Configure church branches, departments, pastoral roles, and governance policies in minutes.",
    am: "የቤተክርስቲያን ቅርንጫፎችን፣ የአገልግሎት ክፍሎችንና የአመራር ሚናዎችን በጥቂት ደቂቃዎች ውስጥ ያዋቅሩ።",
    ti: "ጨናፍር ቤተክርስቲያን፣ ክፍልታት ኣገልግሎትን ተራ መራሕትን ብሒደት ደቓይቕ ኣዋድዱ።",
    om: "Dameewwan waldaa, kutaalee tajaajilaa fi gaheewwan geggeessitootaa daqiiqaa muraasa keessatti qindeessi."
  },
  "landing.step_2_title": {
    en: "2. Engage Members & Groups",
    am: "2. ምዕመናንንና ህብረቶችን ማስተባበር",
    ti: "2. ምእመናንን ሕብረታትን ምትእስሳር",
    om: "2. Miseensotaa fi Gareewwan Hirmaachisuu"
  },
  "landing.step_2_desc": {
    en: "Run live check-ins, coordinate volunteer rosters, send broadcasts, and track small groups effortlessly.",
    am: "የቀጥታ መገኘትን ይመዝግቡ፣ በጎ ፈቃደኞችን ያሰማሩ፣ ማስታወቂያዎችን ያስተላልፉ እንዲሁም አነስተኛ ህብረቶችን ይከታተሉ።",
    ti: "ቀጥታዊ ምዝገባ ተሳትፎ ምክያድ፣ ወለንተኛታት ምምዳብን ምልክታታት ምልኣኽን።",
    om: "Galmee hirmaannaa gaggeessi, tajaajiltoota fedhii qindeessi, beeksisa ergi."
  },
  "landing.step_3_title": {
    en: "3. Nurture & Grow Congregations",
    am: "3. መንፈሳዊ እድገትንና እንክብካቤን ማሳደግ",
    ti: "3. መንፈሳዊ ዕቤትን ክንክንን ምዕባይ",
    om: "3. Kunuunsa fi Guddina Waldaa Guddisuu"
  },
  "landing.step_3_desc": {
    en: "Follow up absent members, schedule pastoral care visits, track discipleship progress, and analyze health trends.",
    am: "ያልተገኙ አባላትን ይጎብኙ፣ የጸሎትና የምክር ቀጠሮዎችን ያስተዳድሩ፣ የደቀመዝሙርነት ጉዞን ይከታተሉ።",
    ti: "ዝበከሩ ኣባላት ምብጻሕ፣ ቆጸራ ጸሎትን ምኽርን ምምሕዳር፣ ዕቤት ወደመዝሙርነት ምክትታል ።",
    om: "Miseensota hafan hordofi, qophii kadhannaa fi gorsaa qindeessi, guddina bartootaa hordofi."
  },
  "landing.security_title": {
    en: "Bank-Grade Security & Ethiopian Script Compatibility",
    am: "ከፍተኛ የደህንነት ጥበቃና የተሟላ የኢትዮጵያ ቋንቋዎች ድጋፍ",
    ti: "ልዑል ድሕንነትን ምሉእ ደገፍ ቋንቋታት ኢትዮጵያን",
    om: "Nageenya Sadarkaa Ol'aanaa fi Deeggarsa Afaanota Itoophiyaa"
  },
  "landing.security_desc": {
    en: "Enterprise role-based access control, encrypted member records, and native Ethiopic typography for Ge'ez script.",
    am: "ጥብቅ የሚና-ተኮር ፈቃዶች፣ የተመሰጠሩ የአባላት መረጃዎች እና ለግዕዝ ፊደላት ተስማሚ የፊደል ቅርጾች።",
    ti: "ጽኑዕ ናይ ስልጣን ምሕደራ፣ ውሑስ መዛግብቲ ኣባላት ከምኡ'ውን ንግእዝ ፊደላት ዝሰማማዕ ቅርጺ።",
    om: "To'annoo mirga hoggansaa, galmee miseensotaa icciitiin eegame fi qubee sirrii."
  },
  "landing.cta_title": {
    en: "Ready to Transform Your Church Operations?",
    am: "የቤተክርስቲያንዎን አስተዳደር ወደ ዲጂታል ለማሸጋገር ዝግጁ ኖት?",
    ti: "ምሕደራ ቤተክርስቲያንኩም ናብ ዲጂታል ንምቕያር ድሉዋት ዲኹም?",
    om: "Hojii Waldaa Keessanii Dijitaalawaa Gochuuf Qophiidhaa?"
  },
  "landing.cta_desc": {
    en: "Empower your pastoral team with intuitive tools designed specifically for kingdom stewardship.",
    am: "ለመንግሥቱ አገልግሎት የተዘጋጁ ዘመናዊ መሣሪያዎችን ለአመራርዎ በማቅረብ አገልግሎትዎን ያሳልጡ።",
    ti: "ንኣገልግሎት መንግስቲ ኣምላኽ ብዝተዳለዉ ዘመናዊ መሳርሒታት ኣገልግሎትኩም ኣቃሊሉ ።",
    om: "Meeshaalee tajaajila mootummaa Waaqayyootiif qophaa'aniin garee geggeessitootaa jajjabeessi."
  },
  "landing.footer_rights": {
    en: "All rights reserved. Church Management System (CMMS).",
    am: "መብቱ በህግ የተጠበቀ ነው። የቤተክርስቲያን አስተዳደር ሥርዓት (CMMS)።",
    ti: "መሰሉ ብሕጊ ዝተሓለወ እዩ። ስርዓት ምሕደራ ቤተክርስቲያን (CMMS)።",
    om: "Mirgi hunduu seeraan eegamaadha. Sirna Bulchiinsa Waldaa (CMMS)."
  },

  // DASHBOARD
  "dashboard.title": {
    en: "Church Management Dashboard",
    am: "የቤተክርስቲያን አስተዳደር ዳሽቦርድ",
    ti: "ዳሽቦርድ ምሕደራ ቤተክርስቲያን",
    om: "Daashboordii Bulchiinsa Waldaa"
  },
  "dashboard.tailored_view": {
    en: "Tailored Role View",
    am: "የተጠቃሚ ሚና እይታ",
    ti: "ርኢቶ ተራ ተጠቃሚ",
    om: "Ilaalcha Gahee Qofaaf"
  },
  "dashboard.aggregate_view": {
    en: "Aggregate Analytics",
    am: "አጠቃላይ ትንተናዎች",
    ti: "ሓፈሻዊ ትንተናታት",
    om: "Qaaccessa Waliigalaa"
  },
  "dashboard.total_members": {
    en: "Total Registered Members",
    am: "ጠቅላላ የተመዘገቡ አባላት",
    ti: "ጠቕላላ ዝተመዝገቡ ኣባላት",
    om: "Ida'ama Miseensota Galmaa'an"
  },
  "dashboard.active_members": {
    en: "Active Members",
    am: "ንቁ አባላት",
    ti: "ንጡፋት ኣባላት",
    om: "Miseensota Socho'an"
  },
  "dashboard.households": {
    en: "Families & Households",
    am: "ቤተሰቦችና አባወራዎች",
    ti: "ስድራቤታትን ኣባወራታትን",
    om: "Maatiiwwanii fi Abbootii Warraa"
  },
  "dashboard.branches": {
    en: "Campuses & Branches",
    am: "ግቢዎችና ቅርንጫፎች",
    ti: "ግቢታትን ጨናፍርን",
    om: "Kaampaasotaa fi Dameewwan"
  },
  "dashboard.pending_prayers": {
    en: "Pending Prayer Requests",
    am: "ክፍት የጸሎት ማመልከቻዎች",
    ti: "ዘይተመለሱ ሕቶታት ጸሎት",
    om: "Kadhannaa Deebii Eegaa Jiran"
  },
  "dashboard.pending_workflows": {
    en: "Pending Approvals",
    am: "ውሳኔ የሚጠብቁ ማመልከቻዎች",
    ti: "ውሳነ ዝጽበዩ ሕቶታት",
    om: "Raggaasisa Eegaa Jiran"
  },
  "dashboard.sunday_attendance": {
    en: "Average Sunday Attendance",
    am: "አማካይ የእሑድ መገኘት",
    ti: "ማእከላይ ተሳትፎ ሰንበት",
    om: "Giddu-galeessa Hirmaannaa Dilbataa"
  },
  "dashboard.discipleship_stage": {
    en: "Discipleship Growth Stages",
    am: "የደቀመዝሙርነት የእድገት ደረጃዎች",
    ti: "ደረጃታት ዕቤት ወደመዝሙርነት",
    om: "Sadarkaalee Guddina Bartootaa"
  },
  "dashboard.attendance_trends": {
    en: "Attendance Trends",
    am: "የመገኘት ሂደት አዝማሚያ",
    ti: "ናይ ተሳትፎ ከይዲ",
    om: "Haala Hirmaannaa Yeroo"
  },
  "dashboard.export_report": {
    en: "Export Report",
    am: "ሪፖርት ላክ (ኤክስፖርት)",
    ti: "ጸብጻብ ኣውጽእ",
    om: "Gabaasa Baasi"
  },
  "dashboard.quick_actions": {
    en: "Quick Actions",
    am: "ፈጣን እርምጃዎች",
    ti: "ቅልጡፍ ተግባራት",
    om: "Tarkaanfiiwwan Ariifachiisoo"
  },

  // MEMBER MANAGEMENT
  "members.directory": {
    en: "Member Directory",
    am: "የአባላት ማውጫ መዝገብ",
    ti: "ማውጫ ኣባላት",
    om: "Galmee Miseensotaa"
  },
  "members.active_tab": {
    en: "Active Members",
    am: "ንቁ አባላት",
    ti: "ንጡፋት ኣባላት",
    om: "Miseensota Socho'an"
  },
  "members.family_tab": {
    en: "Family & Household",
    am: "ቤተሰብና አባወራ",
    ti: "ስድራቤትን ኣባወራን",
    om: "Maatii fi Abbaa Warraa"
  },
  "members.past_tab": {
    en: "Past & Departure Records",
    am: "የቀድሞና የተሰናበቱ አባላት",
    ti: "ዝሓለፉን ዝተሰናበቱን",
    om: "Galmee Miseensota Duraanii"
  },
  "members.add_new": {
    en: "Add Member",
    am: "አባል መዝግብ",
    ti: "ኣባል መዝግብ",
    om: "Miseensa Galmeessi"
  },
  "members.search_placeholder": {
    en: "Search by name, ID, phone, email, or kebele...",
    am: "በስም፣ መለያ ቁጥር፣ ስልክ፣ ኢሜይል ወይም ቀበሌ ፈልግ...",
    ti: "ብስም፣ ቁጽሪ መለለዪ፣ ተሌፎን፣ ኢመይል ወይ ቐበሌ ድለ...",
    om: "Maqaa, koodii, bilbila, imeelii ykn gandaan barbaadi..."
  },
  "members.digital_id": {
    en: "Digital ID Card",
    am: "ዲጂታል የአባልነት መታወቂያ",
    ti: "ዲጂታል መለለዪ ኣባልነት",
    om: "Waraqaa Eenyummaa Dijitaalaa"
  },
  "members.personal_info": {
    en: "Personal & Demographics",
    am: "የግል መረጃና ማህበራዊ ሁኔታ",
    ti: "ናይ ውልቂ ሓበሬታ",
    om: "Odeeffannoo Dhuunfaa"
  },
  "members.spiritual_info": {
    en: "Spiritual & Faith Journey",
    am: "መንፈሳዊ ህይወትና የጥምቀት ሁኔታ",
    ti: "መንፈሳዊ ህይወትን ጥምቀትን",
    om: "Jireenya Hafuuraa fi Cuuphaa"
  },
  "members.family_info": {
    en: "Family & Household Ties",
    am: "የቤተሰብና የትዳር ትስስር",
    ti: "ናይ ስድራቤትን መርዓን ርክብ",
    om: "Walitti-dhufeenya Maatii"
  },
  "members.professional_info": {
    en: "Professional & Skills",
    am: "የሙያና የክህሎት መረጃ",
    ti: "ናይ ሞያን ክእለትን ሓበሬታ",
    om: "Ogummaa fi Dandeettii"
  },
  "members.medical_info": {
    en: "Medical & Emergency Care",
    am: "የህክምናና የድንገተኛ አደጋ መረጃ",
    ti: "ሕክምናን ህጹጽ ረድኤትን",
    om: "Fayyaa fi Balaa Tasaa"
  },
  "members.departure_record": {
    en: "Record Departure / Status Change",
    am: "የስንብት ወይም የሁኔታ ለውጥ መዝግብ",
    ti: "ስንብት ወይ ምቕያር ኩነታት መዝግብ",
    om: "Galgala / Jijjiirama Haalaa Galmeessi"
  },
  "members.restore_member": {
    en: "Restore to Active Directory",
    am: "ወደ ንቁ አባላት ዝርዝር መልስ",
    ti: "ናብ ንጡፋት ኣባላት ምለስ",
    om: "Gara Miseensota Socho'ootti Deebisi"
  },

  // FAMILIES
  "families.title": {
    en: "Family & Household Management",
    am: "የቤተሰብና የአባወራ አስተዳደር",
    ti: "ምሕደራ ስድራቤትን ኣባወራን",
    om: "Bulchiinsa Maatii fi Abbaa Warraa"
  },
  "families.register_new": {
    en: "Register Household",
    am: "ቤተሰብ መዝግብ",
    ti: "ስድራቤት መዝግብ",
    om: "Maatii Galmeessi"
  },
  "families.head": {
    en: "Head of Household",
    am: "የቤተሰብ ኃላፊ",
    ti: "ሓላፊ ስድራቤት",
    om: "Abbaa Maatii"
  },
  "families.spouse": {
    en: "Spouse",
    am: "የትዳር አጋር",
    ti: "መጻምዲ",
    om: "Haadha/Abbaa Warraa"
  },
  "families.children": {
    en: "Children & Dependents",
    am: "ልጆችና ጥገኞች",
    ti: "ቆልዑን ጥጉያትን",
    om: "Daa'imman fi Hirkattuu"
  },
  "families.propagate_address": {
    en: "Propagate Address to All Members",
    am: "አድራሻውን ለሁሉም የቤተሰብ አባላት አጋራ",
    ti: "ኣድራሻ ንኩሎም ኣባላት ስድራቤት ኣካፍል",
    om: "Teessoo Miseensota Hundumaaf Qoodi"
  },

  // BRANCHES
  "branches.title": {
    en: "Campuses & Multi-Branch Network",
    am: "ቅርንጫፍ አብያተ ክርስቲያናትና ካምፓሶች",
    ti: "ጨናፍር ኣብያተ ክርስቲያናትን ግቢታትን",
    om: "Kaampaasota fi Dameewwan Waldaa"
  },
  "branches.add_new": {
    en: "Add Campus / Branch",
    am: "አዲስ ቅርንጫፍ ጨምር",
    ti: "ሓድሽ ጨንፈር ወስኽ",
    om: "Damee Haaraa Dabali"
  },
  "branches.pastor": {
    en: "Campus Pastor / Leader",
    am: "የቅርንጫፉ መጋቢ / መሪ",
    ti: "ጓሳ / መራሒ ጨንፈር",
    om: "Luba / Geggeessaa Damee"
  },
  "branches.service_times": {
    en: "Worship Service Schedules",
    am: "የአምልኮ ፕሮግራሞች ሰዓታት",
    ti: "መደባት ኣምልኾ",
    om: "Sagantaa Sagadaa"
  },

  // MINISTRIES
  "ministries.title": {
    en: "Ministries, Departments & Small Groups",
    am: "አገልግሎቶች፣ ክፍሎችና አነስተኛ ህብረቶች",
    ti: "ኣገልግሎታት፣ ክፍልታትን ንኣሽቱ ሕብረታትን",
    om: "Tajaajiloota, Kutaalee fi Gareewwan Xixinnoo"
  },
  "ministries.add_new": {
    en: "Add Ministry / Department",
    am: "አዲስ አገልግሎት ጨምር",
    ti: "ሓድሽ ኣገልግሎት ወስኽ",
    om: "Tajaajila Haaraa Dabali"
  },
  "ministries.leader": {
    en: "Ministry Leader",
    am: "የአገልግሎቱ መሪ",
    ti: "መራሒ ኣገልግሎት",
    om: "Geggeessaa Tajaajilaa"
  },

  // ATTENDANCE
  "attendance.title": {
    en: "Attendance Management & Check-in",
    am: "የመገኘት ምዝገባና የኪዮስክ አስተዳደር",
    ti: "ምሕደራ ተሳትፎን ምዝገባን",
    om: "Bulchiinsa Hirmaannaa fi Galmee"
  },
  "attendance.create_session": {
    en: "Create Live QR Session",
    am: "የቀጥታ QR የመገኘት ክፍለ-ጊዜ ክፈት",
    ti: "ቀጥታዊ QR ናይ ተሳትፎ ክፍለ-ጊዜ ክፈት",
    om: "Baniinsa Hirmaannaa Koodii QR"
  },
  "attendance.roster_call": {
    en: "Ministry Roll Call",
    am: "በስም የመጥራት ምዝገባ",
    ti: "ብስም ምጽዋዕ ተሳትፎ",
    om: "Waamicha Maqaa Tajaajilaa"
  },
  "attendance.bulk_import": {
    en: "Bulk Import Attendance",
    am: "መረጃዎችን በጅምላ አስገባ (Excel/CSV)",
    ti: "ብጅምላ ተሳትፎ ኣእቱ",
    om: "Hirmaannaa Hedduu Galchi"
  },
  "attendance.gate_checkin": {
    en: "Sanctuary Gate Desk Check-In",
    am: "የመቅደሱ መግቢያ በር ፈጣን ምዝገባ",
    ti: "ናይ ኣፍደገ ቅልጡፍ ምዝገባ",
    om: "Galmee Balbala Manichaa"
  },
  "attendance.present": {
    en: "Present",
    am: "ተገኝቷል",
    ti: "ተረኺቡ",
    om: "Argameera"
  },
  "attendance.absent": {
    en: "Absent",
    am: "አልተገኘም",
    ti: "ኣይተረኽበን",
    om: "Hin argamne"
  },

  // EVENTS
  "events.title": {
    en: "Events & Calendar Scheduling",
    am: "ዝግጅቶችና የቀን መቁጠሪያ መርሃ ግብሮች",
    ti: "መደባትን መዓልታዊ መደብን",
    om: "Sagantaalee fi Qophiiwwan"
  },
  "events.create_new": {
    en: "Create Church Event",
    am: "አዲስ ዝግጅት ፍጠር",
    ti: "ሓድሽ መደብ ፍጠር",
    om: "Qophii Haaraa Uumi"
  },
  "events.venue": {
    en: "Venue / Sanctuary",
    am: "ቦታ / አዳራሽ",
    ti: "ቦታ / ኣዳራሽ",
    om: "Iddoo / Galma"
  },

  // COMMUNICATIONS
  "comms.title": {
    en: "Multi-Channel Communications",
    am: "ባለብዙ-መስመር ግንኙነትና ማስታወቂያ",
    ti: "ብዙሕ-መስመር ርክብን ምልክታን",
    om: "Qunnamtii fi Beeksisa Karaa Hedduu"
  },
  "comms.send_broadcast": {
    en: "Send Broadcast Message",
    am: "አጠቃላይ መልዕክት አስተላልፍ",
    ti: "ሓፈሻዊ መልእኽቲ ስደድ",
    om: "Ergaa Waliigalaa Ergi"
  },
  "comms.sms": {
    en: "SMS Broadcast",
    am: "የአጭር የጽሑፍ መልዕክት (SMS)",
    ti: "ናይ ጽሑፍ መልእኽቲ (SMS)",
    om: "Ergaa Gabaabaa (SMS)"
  },
  "comms.email": {
    en: "Email Newsletter",
    am: "የኢሜይል መልዕክት",
    ti: "ናይ ኢመይል መልእኽቲ",
    om: "Ergaa Imeelii"
  },

  // PASTORAL CARE
  "pastoral.prayer_requests": {
    en: "Prayer Requests Queue",
    am: "የጸሎት ማመልከቻዎች ዝርዝር",
    ti: "ዝርዝር ሕቶታት ጸሎት",
    om: "Tarree Kadhannaawwanii"
  },
  "pastoral.counseling_sessions": {
    en: "Spiritual Counseling Sessions",
    am: "መንፈሳዊ የምክር አገልግሎት ቀጠሮዎች",
    ti: "ቆጸራታት መንፈሳዊ ምኽሪ",
    om: "Tajaajila Gorsa Hafuuraa"
  },
  "pastoral.visitations_log": {
    en: "Pastoral Visitation Care",
    am: "የምዕመናንና ህመምተኞች ጉብኝት",
    ti: "ምብጻሕ ምእመናንን ሕሙማትን",
    om: "Gaaffii fi Kunuunsa Miseensotaa"
  },
  "pastoral.submit_prayer": {
    en: "Submit Prayer Request",
    am: "የጸሎት ጥያቄ አስገባ",
    ti: "ሕቶ ጸሎት ኣእቱ",
    om: "Kadhannaa Galchi"
  },

  // VOLUNTEERS
  "volunteers.title": {
    en: "Volunteers & Service Rosters",
    am: "በጎ ፈቃደኞችና የተረኞች መርሃ ግብር",
    ti: "ወለንተኛታትን መደብ ተረኛታትን",
    om: "Tajaajiltoota Fedhii fi Sagantaa"
  },
  "volunteers.add_shift": {
    en: "Assign Service Shift",
    am: "የአገልግሎት ተራ መድብ",
    ti: "ተራ ኣገልግሎት መድብ",
    om: "Tajaajila Ramadi"
  },

  // ASSETS
  "assets.title": {
    en: "Asset & Facility Inventory",
    am: "የንብረትና የማይንቀሳቀስ ሀብት መዝገብ",
    ti: "መዝገብ ንብረትን ትካላትን",
    om: "Qabeenyaa fi Meeshaalee Waldaa"
  },
  "assets.add_new": {
    en: "Register New Asset",
    am: "አዲስ ንብረት መዝግብ",
    ti: "ሓድሽ ንብረት መዝግብ",
    om: "Qabeenya Haaraa Galmeessi"
  },

  // DOCUMENTS
  "docs.title": {
    en: "Document Vault & Policies",
    am: "የሰነዶች ማህደርና ደንቦች",
    ti: "መዛግብቲ ሰነዳትን ደንብታትን",
    om: "Kuusaa Galmeewwanii fi Seerota"
  },
  "docs.upload_new": {
    en: "Upload Official Document",
    am: "ሰነድ ወደ ማህደሩ አስገባ",
    ti: "ሰነድ ኣእቱ",
    om: "Galmee Fe'i"
  },

  // LMS
  "lms.title": {
    en: "LMS & Discipleship Academy",
    am: "የትምህርትና የደቀመዝሙርነት አካዳሚ",
    ti: "ትምህርትን ኣካዳሚ ወደመዝሙርነትን",
    om: "Barnoota fi Akkaadaamii Bartootaa"
  },
  "lms.create_course": {
    en: "Create Discipleship Course",
    am: "አዲስ የትምህርት ኮርስ አዘጋጅ",
    ti: "ሓድሽ ኮርስ ኣዳሉ",
    om: "Koorsii Barnootaa Uumi"
  },

  // WORKFLOWS & APPROVALS
  "workflows.title": {
    en: "Governance & Workflow Approvals",
    am: "የቤተክርስቲያን ውሳኔዎችና ማጽደቂያ ሂደቶች",
    ti: "መስርሕ ምጽዳቕን ውሳነታትን",
    om: "Sirna Raggaasisuu fi Murteewwanii"
  },
  "workflows.approve": {
    en: "Approve Request",
    am: "ጥያቄውን አጽድቅ",
    ti: "ሕቶ ኣጽድቕ",
    om: "Gaaffii Raggaasisi"
  },
  "workflows.reject": {
    en: "Reject Request",
    am: "ጥያቄውን ውድቅ አድርግ",
    ti: "ሕቶ ነጽግ",
    om: "Gaaffii Kufisi"
  },

  // REPORTS
  "reports.title": {
    en: "Analytics & Governance Reports",
    am: "የአስተዳደር ሪፖርቶችና ትንተናዎች",
    ti: "ጸብጻባትን ትንተናታትን",
    om: "Gabaasaalee fi Qaaccessa"
  },

  // SECURITY & AUDIT
  "security.title": {
    en: "Security, Sessions & Audit Logs",
    am: "ደህንነት፣ የተጠቃሚዎች እንቅስቃሴና ኦዲት",
    ti: "ድሕንነት፣ ምንቅስቓስ ተጠቀምትን ኦዲትን",
    om: "Nageenya, Seensa fi Ooditii"
  },

  // BACKUP
  "backup.title": {
    en: "Data Backup & Disaster Recovery",
    am: "የመረጃ መጠባበቂያና መልሶ ማግኛ",
    ti: "መዕቀቢ ሓበሬታን ምምላስን",
    om: "Kuusaa Eeggannoo fi Deebisanii Fiduu"
  },

  // SETTINGS
  "settings.title": {
    en: "System & Organization Settings",
    am: "የቤተክርስቲያንና የስርዓት ቅንብሮች",
    ti: "ምትዕርራይ ስርዓትን ቤተክርስቲያንን",
    om: "Qindaa'ina Sirnaa fi Dhaabbataa"
  },
  "settings.branding": {
    en: "Church Identity & Branding",
    am: "የቤተክርስቲያን ስም፣ ዓርማና መለያ",
    ti: "መንነትን ዓርማን ቤተክርስቲያን",
    om: "Eenyummaa fi Mallattoo Waldaa"
  },
  "settings.localization": {
    en: "Language & Localization",
    am: "ቋንቋና አካባቢያዊ ቅንብሮች",
    ti: "ቋንቋን ከባብያዊ ምትዕርራይን",
    om: "Afaanii fi Qindaa'ina Naannoo"
  },
  "settings.security_auth": {
    en: "Authentication & MFA Security",
    am: "የመግቢያና ባለሁለት ደረጃ ደህንነት (2FA)",
    ti: "ናይ ምእታውን ድሕንነትን (2FA)",
    om: "Nageenya Seensaa fi 2FA"
  },

  // NAVBAR & PROFILE
  "navbar.search_placeholder": {
    en: "Search members, ministries, events, and commands...",
    am: "አባላትን፣ አገልግሎቶችን፣ ዝግጅቶችን ፈልግ...",
    ti: "ኣባላት፣ ኣገልግሎታት፣ መደባት ድለ...",
    om: "Miseensota, tajaajiloota, sagantaalee barbaadi..."
  },
  "navbar.notifications_title": {
    en: "Notifications & Alerts",
    am: "ማሳወቂያዎችና ማንቂያዎች",
    ti: "ምልክታታትን መጠንቀቕታታትን",
    om: "Beeksisaalee fi Akeekkachiisa"
  },
  "navbar.mark_all_read": {
    en: "Mark all as read",
    am: "ሁሉንም እንደተነበቡ ምልክት አድርግ",
    ti: "ኩሉ ከምዝተነበበ ግበር",
    om: "Hundumaa akka dubbifametti godhi"
  },
  "navbar.all_caught_up": {
    en: "All caught up!",
    am: "ሁሉም ተጠናቋል!",
    ti: "ኩሉ ተወዲኡ!",
    om: "Hundi xumurameera!"
  },
  "navbar.no_pending": {
    en: "No pending approvals or unread alerts",
    am: "ምንም ያልተነበበ ማሳወቂያ የለም",
    ti: "ዋላ ሓደ ዘይተነበበ ምልክታ የለን",
    om: "Beeksisni hin dubbifamne hin jiru"
  },
  "navbar.my_profile": {
    en: "My Member Profile",
    am: "የግል አባልነት መረጃዬ",
    ti: "ናይ ውልቂ ኣባልነት ሓበሬታይ",
    om: "Eenyummaa Miseensummaa Koo"
  },
  "navbar.quick_settings": {
    en: "Quick Account Settings",
    am: "ፈጣን የመለያ ቅንብሮች",
    ti: "ቅልጡፍ ናይ ሕሳብ ምትዕርራይ",
    om: "Qindaa'ina Herregaa Ariifachiisaa"
  },
  "navbar.change_password": {
    en: "Change Password",
    am: "የይለፍ ቃል ቀይር",
    ti: "መሕለፊ ቃል ቀይር",
    om: "Jejjiirama Jecha Iccitii"
  },
  "navbar.accessibility": {
    en: "Accessibility & Screen Reader",
    am: "ተደራሽነትና የማያ አንባቢ",
    ti: "ተበጻሕነትን ንባብ መርአዪን",
    om: "Dhaqqabummaa fi Dubbisaa Iskirinii"
  },
  "navbar.language": {
    en: "Language",
    am: "ቋንቋ",
    ti: "ቋንቋ",
    om: "Afaan"
  },
  "navbar.appearance": {
    en: "Appearance Theme",
    am: "የገጽታ ቀለም (ቴም)",
    ti: "ቀለም ገጽታ",
    om: "Bifa Iskirinii"
  },
  "navbar.sign_out": {
    en: "Sign Out",
    am: "ውጣ",
    ti: "ውጻእ",
    om: "Ba'i"
  },

  "landing.manage_church": {
    en: "Manage Your Church.",
    am: "ቤተክርስቲያንዎን በዘመናዊ መንገድ ይምሩ።",
    ti: "ቤተክርስቲያንኩም ብዘመናዊ ኣገባብ ምሓድሩ።",
    om: "Waldaa Keessan Karaa Ammayyaatiin Bulchaa."
  },
  "landing.strengthen_community": {
    en: "Strengthen Your Community.",
    am: "ህብረትዎን ያጠናክሩ።",
    ti: "ሕብረትኩም ኣደልድሉ።",
    om: "Hawaasa Keessan Jabeessaa."
  },
  "landing.hero_summary": {
    en: "A unified platform for managing members, ministries, attendance, events, communication, and church administration.",
    am: "አባላትን፣ አገልግሎቶችን፣ መገኘትን፣ ዝግጅቶችን፣ ግንኙነትንና የቤተክርስቲያን አስተዳደርን በአንድ ላይ የሚያስተባብር መድረክ።",
    ti: "ኣባላት፣ ኣገልግሎታት፣ ተሳትፎ፣ መደባት፣ ርክብን ምሕደራ ቤተክርስቲያንን ብሓባር ዘተሓባብር መድረኽ።",
    om: "Miseensota, tajaajiloota, hirmaannaa, sagantaalee, qunnamtii fi bulchiinsa waldaa bakka tokkotti kan qindeessu."
  },
  "landing.explore_features_btn": {
    en: "Explore Features",
    am: "አገልግሎቶችን ይመልከቱ",
    ti: "ንጥፈታት ርአ",
    om: "Amaloota Ilaali"
  },
  "landing.sign_in_btn": {
    en: "Sign In",
    am: "ግባ",
    ti: "እቶ",
    om: "Seeni"
  },
  "landing.feature_multi_branch": {
    en: "Multi-Branch Support",
    am: "የበርካታ ቅርንጫፎች ድጋፍ",
    ti: "ደገፍ ብዙሓት ጨናፍር",
    om: "Deeggarsa Dameewwan Hedduu"
  },
  "landing.feature_rbac": {
    en: "Role-Based Permissions",
    am: "የተደራጀ የሚና-ተኮር ፈቃድ",
    ti: "ተራ-ተኮር ስልጣን",
    om: "Mirga Hoggansaa Gahee Irratti Hundaa'e"
  },
  "landing.feature_multilingual": {
    en: "Multilingual Interface",
    am: "ባለብዙ ቋንቋ በይነገጽ",
    ti: "ብዙሕ-ቋንቋ በይነገጽ",
    om: "Fuula Afaanota Hedduu"
  },
  "landing.admin_operations_badge": {
    en: "Church Administration & Ministry Operations",
    am: "የቤተክርስቲያን አስተዳደርና የአገልግሎት እንቅስቃሴዎች",
    ti: "ምሕደራ ቤተክርስቲያንን ንጥፈታት ኣገልግሎትን",
    om: "Bulchiinsa Waldaa fi Hojii Tajaajilaa"
  },
  "landing.preview_members_title": {
    en: "Members & Households",
    am: "አባላትና አባወራዎች",
    ti: "ኣባላትን ስድራቤታትን",
    om: "Miseensotaa fi Maatiiwwan"
  },
  "landing.preview_branches_title": {
    en: "Branches & Ministries",
    am: "ቅርንጫፎችና አገልግሎቶች",
    ti: "ጨናፍርን ኣገልግሎታትን",
    om: "Dameewwanii fi Tajaajiloota"
  },
  "landing.preview_attendance_title": {
    en: "Attendance Module",
    am: "የመገኘት መከታተያ ሞጁል",
    ti: "ሞጁል ምዝገባ ተሳትፎ",
    om: "Kutaa Hirmaannaa"
  },
  "landing.preview_events_title": {
    en: "Events & Calendar",
    am: "ዝግጅቶችና የቀን መቁጠሪያ",
    ti: "መደባትን መዓልታዊ መደብን",
    om: "Sagantaalee fi Qophiiwwan"
  },
  "landing.preview_comms_title": {
    en: "Communications",
    am: "የግንኙነት መስመር",
    ti: "ናይ ርክብ መስመር",
    om: "Qunnamtii"
  },
  "landing.preview_pastoral_title": {
    en: "Pastoral Care",
    am: "የእረኝነት እንክብካቤ",
    ti: "ክንክን ጓሳ",
    om: "Kunuunsa Tajaajilaa"
  },
  "landing.preview_reports_title": {
    en: "Reports & Analytics",
    am: "ሪፖርቶችና ትንተናዎች",
    ti: "ጸብጻባትን ትንተናታትን",
    om: "Gabaasaalee fi Qaaccessa"
  },
  "landing.preview_bible_title": {
    en: "Bible & Devotions",
    am: "መጽሐፍ ቅዱስና ቃል",
    ti: "መጽሓፍ ቅዱስን ቃልን",
    om: "Macaafa Qulqulluu fi Dubbii Guyyaa"
  },

  // BREADCRUMBS
  "breadcrumb.home": {
    en: "Home",
    am: "መነሻ",
    ti: "መበገሲ",
    om: "Ka'umsa"
  },
  "breadcrumb.dashboard": {
    en: "CMMS Dashboard",
    am: "የአስተዳደር ዳሽቦርድ",
    ti: "ዳሽቦርድ ምሕደራ",
    om: "Daashboordii Bulchiinsaa"
  },
  "breadcrumb.active_role": {
    en: "Active Role",
    am: "ንቁ ሚና",
    ti: "ንጡፍ ተራ",
    om: "Gahee Socho'aa"
  }
};

// Merge into dictionaries
const mergedEn = { ...existingEn };
const mergedAm = { ...existingAm };
const mergedTi = { ...existingTi };
const mergedOm = { ...existingOm };

// Add translationDatabase
for (const [key, trans] of Object.entries(translationDatabase)) {
  mergedEn[key] = trans.en;
  mergedAm[key] = trans.am;
  mergedTi[key] = trans.ti;
  mergedOm[key] = trans.om;

  // Also add direct English text as key if different
  if (!mergedEn[trans.en]) mergedEn[trans.en] = trans.en;
  if (!mergedAm[trans.en]) mergedAm[trans.en] = trans.am;
  if (!mergedTi[trans.en]) mergedTi[trans.en] = trans.ti;
  if (!mergedOm[trans.en]) mergedOm[trans.en] = trans.om;
}

// Fix any untranslated Tigrigna or Afaan Oromoo keys that were identical to English
const tiFixes = {
  "auth.member_password_placeholder": "••••••••",
  "auth.reset_password_modal_title": "መሕለፊ ቃል ኣባል ቀይር",
  "auth.reset_method_email": "ብኢመይል ቀይር",
  "auth.send_reset_code": "ናይ ምርግጋጽ ኮድ ስደድ",
  "auth.enter_reset_code": "ናይ 6-አሃዝ መረጋገጺ ኮድ",
  "auth.verify_code_btn": "ኮድ ኣረጋግጽ",
  "auth.set_new_password": "ሓድሽ መሕለፊ ቃል ኣእቱ",
  "auth.confirm_new_password": "ሓድሽ መሕለፊ ቃል ኣረጋግጽ",
  "auth.save_new_password_btn": "መሕለፊ ቃል ዓቅብ",
  "pastoral.hub": "ማእከል ክንክን ጓሳ",
  "pastoral.counseling": "መንፈሳዊ ምኽሪ",
  "pastoral.prayer": "ሕቶታት ጸሎት",
  "pastoral.visitations": "ምብጻሕ ምእመናን",
  "attendance.kiosk": "ኪዮስክ ምዝገባ ተሳትፎ",
  "attendance.quick_checkin": "ቅልጡፍ QR ምዝገባ"
};

const omFixes = {
  "auth.member_password_placeholder": "••••••••",
  "auth.reset_password_modal_title": "Jecha Iccitii Miseensaa Jijjiiri",
  "auth.reset_method_email": "Karaa Imeeliitiin Jijjiiri",
  "auth.send_reset_code": "Koodii Mirkaneessaa Ergi",
  "auth.enter_reset_code": "Koodii Mirkaneessaa Dijitii 6",
  "auth.verify_code_btn": "Koodii Mirkaneessi",
  "auth.set_new_password": "Jecha Iccitii Haaraa Galchi",
  "auth.confirm_new_password": "Jecha Iccitii Haaraa Mirkaneessi",
  "auth.save_new_password_btn": "Jecha Iccitii Olkaa'i",
  "pastoral.hub": "Wiirtuu Kunuunsa Tajaajilaa",
  "pastoral.counseling": "Gorsa Hafuuraa",
  "pastoral.prayer": "Gaaffii Kadhannaa",
  "pastoral.visitations": "Galmee Daawwannaawwanii",
  "attendance.kiosk": "Kiyooskii Hirmaannaa",
  "attendance.quick_checkin": "Galmee Ariifachiisaa QR"
};

for (const [k, v] of Object.entries(tiFixes)) {
  mergedTi[k] = v;
}
for (const [k, v] of Object.entries(omFixes)) {
  mergedOm[k] = v;
}

// Write back formatted JSON
fs.writeFileSync(enPath, JSON.stringify(mergedEn, null, 2), 'utf8');
fs.writeFileSync(amPath, JSON.stringify(mergedAm, null, 2), 'utf8');
fs.writeFileSync(tiPath, JSON.stringify(mergedTi, null, 2), 'utf8');
fs.writeFileSync(omPath, JSON.stringify(mergedOm, null, 2), 'utf8');

console.log('Successfully written comprehensive locale dictionaries!');
console.log('en keys:', Object.keys(mergedEn).length);
console.log('am keys:', Object.keys(mergedAm).length);
console.log('ti keys:', Object.keys(mergedTi).length);
console.log('om keys:', Object.keys(mergedOm).length);
