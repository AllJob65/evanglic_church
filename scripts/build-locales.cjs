const fs = require('fs');
const path = require('path');

// 1. Read existing translation files
const localesDir = path.join(__dirname, '../src/i18n/locales');
const existingEn = JSON.parse(fs.readFileSync(path.join(localesDir, 'en.json'), 'utf8'));
const existingAm = JSON.parse(fs.readFileSync(path.join(localesDir, 'am.json'), 'utf8'));
const existingTi = JSON.parse(fs.readFileSync(path.join(localesDir, 'ti.json'), 'utf8'));
const existingOm = JSON.parse(fs.readFileSync(path.join(localesDir, 'om.json'), 'utf8'));
const amOverride = JSON.parse(fs.readFileSync(path.join(localesDir, 'overrides/am.override.json'), 'utf8'));

// 2. Read i18n.ts
let i18nContent = fs.readFileSync(path.join(__dirname, '../src/utils/i18n.ts'), 'utf8');
i18nContent = i18nContent.replace(/export type [^;]+;/g, '');
i18nContent = i18nContent.replace(/export const translations: Record<Language, Record<string, string>> =/g, 'const translations =');
i18nContent = i18nContent.replace(/export function[\s\S]*$/, '');
const vm = require('vm');
const sandbox = {};
vm.runInNewContext(i18nContent + '\nsandbox_trans = translations;', sandbox);

const oldEnglish = sandbox.sandbox_trans.English || {};
const oldAmharic = sandbox.sandbox_trans.Amharic || {};
const oldTigrigna = sandbox.sandbox_trans.Tigrigna || {};
const oldOromo = sandbox.sandbox_trans['Afaan Oromoo'] || {};

// 3. Define master translation dictionary mapping
const masterData = {
  // App Branding
  'app.title': { en: 'Grace Cathedral', am: 'የጸጋ ካቴድራል', ti: 'ናይ ጸጋ ካቴድራል', om: 'Kaateediraalii Ayyaanaa' },
  'app.subtitle': { en: 'Enterprise Church & Multi-Campus Management System', am: 'ዘመናዊ የቤተ ክርስቲያንና የካምፓሶች አስተዳደር ሥርዓት', ti: 'ዘመናዊ ናይ ቤተ ክርስቲያንን ካምፓሳትን ምምሕዳር ስርዓት', om: 'Sirna Bulchiinsa Waldaa fi Dameewwanii' },
  'Grace Cathedral': { en: 'Grace Cathedral', am: 'የጸጋ ካቴድራል', ti: 'ናይ ጸጋ ካቴድራል', om: 'Kaateediraalii Ayyaanaa' },
  'Enterprise Church Governance': { en: 'Enterprise Church Governance', am: 'የቤተ ክርስቲያን ቀኖናዊ አመራርና አስተዳደር', ti: 'ስርዓተ ምምሕዳር ቤተ ክርስቲያን', om: 'Bulchiinsa Waldaa Amanamaa' },

  // Common UI Actions
  'common.save': { en: 'Save', am: 'አስቀምጥ', ti: 'ኣቀምጥ', om: 'Olkaa' },
  'common.saved': { en: 'Saved', am: 'ተቀምጧል', ti: 'ተቐሚጡ', om: 'Olkaawameera' },
  'common.cancel': { en: 'Cancel', am: 'ሰርዝ', ti: 'ሰርዝ', om: 'Haqi' },
  'common.delete': { en: 'Delete', am: 'አጥፋ', ti: 'ደምስስ', om: 'Balleessi' },
  'common.edit': { en: 'Edit', am: 'አርትዕ', ti: 'ኣርም', om: 'Gulaali' },
  'common.add': { en: 'Add', am: 'አክል', ti: 'ወስኽ', om: 'Dabali' },
  'common.addNew': { en: 'Add New', am: 'አዲስ አክል', ti: 'ሓድሽ ወስኽ', om: 'Haaraa Dabali' },
  'common.search': { en: 'Search', am: 'ፈልግ', ti: 'ድለ', om: 'Barbaadi' },
  'common.searchPlaceholder': { en: 'Search...', am: 'ፈልግ...', ti: 'ድለ...', om: 'Barbaadi...' },
  'common.close': { en: 'Close', am: 'ዝጋ', ti: 'ዕጸው', om: 'Cufi' },
  'common.submit': { en: 'Submit', am: 'አስገባ', ti: 'ኣእቱ', om: 'Galchi' },
  'common.back': { en: 'Back', am: 'ተመለስ', ti: 'ተመለስ', om: 'Duubatti' },
  'common.next': { en: 'Next', am: 'ቀጣይ', ti: 'ዝቕጽል', om: 'Itti aanaa' },
  'common.previous': { en: 'Previous', am: 'ቀዳሚ', ti: 'ዝሓለፈ', om: 'Kan duraa' },
  'common.loading': { en: 'Loading...', am: 'በመጫን ላይ...', ti: 'ይጽዓን ኣሎ...', om: 'Fe\'amaa jira...' },
  'common.noData': { en: 'No data found', am: 'ምንም መረጃ አልተገኘም', ti: 'ዋላ ሓደ ሓበሬታ ኣይተረኽበን', om: 'Daataan hin argamne' },
  'common.refresh': { en: 'Refresh', am: 'አድስ', ti: 'ሓድሽ', om: 'Haaromsi' },
  'common.export': { en: 'Export', am: 'ላክ (ኤክስፖርት)', ti: 'ኤክስፖርት ግበር', om: 'Baasi' },
  'common.import': { en: 'Import', am: 'አስገባ (ኢምፖርት)', ti: 'ኣእቱ', om: 'Galchi' },
  'common.print': { en: 'Print', am: 'አትም', ti: 'ሕተም', om: 'Maxxansi' },
  'common.filter': { en: 'Filter', am: 'አጣራ', ti: 'ኣጻሪ', om: 'Calali' },
  'common.reset': { en: 'Reset', am: 'ወደ ነበረበት መልስ', ti: 'ናብ ዝነበሮ ምለስ', om: 'Deebisi' },
  'common.view': { en: 'View', am: 'ተመልከት', ti: 'ርአ', om: 'Ilaali' },
  'common.viewDetails': { en: 'View Details', am: 'ዝርዝሩን ተመልከት', ti: 'ዝርዝር ርአ', om: 'Bal\'ina Ilaali' },
  'common.status': { en: 'Status', am: 'ሁኔታ', ti: 'ኩነታት', om: 'Haala' },
  'common.active': { en: 'Active', am: 'ንቁ', ti: 'ንጡፍ', om: 'Socho\'aa' },
  'common.inactive': { en: 'Inactive', am: 'ቦዝኗል', ti: 'ዘይነጡፍ', om: 'Hin sochoone' },
  'common.pending': { en: 'Pending', am: 'በመጠባበቅ ላይ', ti: 'ኣብ ምጽባይ', om: 'Eeggachaa jira' },
  'common.approved': { en: 'Approved', am: 'ጸድቋል', ti: 'ጸዲቑ', om: 'Ragga\'eera' },
  'common.rejected': { en: 'Rejected', am: 'ውድቅ ተደርጓል', ti: 'ተነጺጉ', om: 'Kufaa ta\'eera' },
  'common.present': { en: 'Present', am: 'ተገኝቷል', ti: 'ተረኺቡ', om: 'Argameera' },
  'common.absent': { en: 'Absent', am: 'አልተገኘም', ti: 'ኣይተረኸበን', om: 'Hin argamne' },
  'common.excused': { en: 'Excused', am: 'ይቅርታ የተደረገለት', ti: 'ፍቓድ ዘለዎ', om: 'Eeyyamameef' },
  'common.late': { en: 'Late', am: 'አርፍዷል', ti: 'ደንጒዩ', om: 'Barfateera' },
  'common.confirmed': { en: 'Confirmed', am: 'ተረጋግጧል', ti: 'ተረጋጊጹ', om: 'Mirkanaa\'eera' },
  'common.all': { en: 'All', am: 'ሁሉም', ti: 'ኩሉ', om: 'Hundumaa' },
  'common.actions': { en: 'Actions', am: 'ተግባራት', ti: 'ስጉምትታት', om: 'Gochoota' },
  'common.options': { en: 'Options', am: 'አማራጮች', ti: 'መማረጺታት', om: 'Filannoowwan' },
  'common.details': { en: 'Details', am: 'ዝርዝሮች', ti: 'ዝርዝራት', om: 'Bal\'ina' },
  'common.name': { en: 'Name', am: 'ስም', ti: 'ስም', om: 'Maqaa' },
  'common.firstName': { en: 'First Name', am: 'ስም', ti: 'ስም', om: 'Maqaa' },
  'common.lastName': { en: 'Last Name', am: 'የአባት ስም', ti: 'ስም ኣቦ', om: 'Maqaa Abbaa' },
  'common.fullName': { en: 'Full Name', am: 'ሙሉ ስም', ti: 'ምሉእ ስም', om: 'Maqaa Guutuu' },
  'common.date': { en: 'Date', am: 'ቀን', ti: 'ዕለት', om: 'Guyyaa' },
  'common.time': { en: 'Time', am: 'ሰዓት', ti: 'ሰዓት', om: 'Sa\'aatii' },
  'common.notes': { en: 'Notes', am: 'ማስታወሻዎች', ti: 'መዘኻኸሪታት', om: 'Yaadannoo' },
  'common.description': { en: 'Description', am: 'መግለጫ', ti: 'መግለጺ', om: 'Ibsa' },
  'common.phone': { en: 'Phone', am: 'ስልክ', ti: 'ተሌፎን', om: 'Bilbila' },
  'common.phoneNumber': { en: 'Phone Number', am: 'ስልክ ቁጥር', ti: 'ቁጽሪ ተሌፎን', om: 'Lakkoofsa Bilbilaa' },
  'common.email': { en: 'Email', am: 'ኢሜይል', ti: 'ኢመይል', om: 'Imeelii' },
  'common.emailAddress': { en: 'Email Address', am: 'የኢሜይል አድራሻ', ti: 'ኣድራሻ ኢመይል', om: 'Teessoo Imeelii' },
  'common.address': { en: 'Address', am: 'አድራሻ', ti: 'ኣድራሻ', om: 'Teessoo' },
  'common.role': { en: 'Role', am: 'ሚና', ti: 'ግደ', om: 'Gahee' },
  'common.branch': { en: 'Campus', am: 'ቅርንጫፍ ግቢ', ti: 'ጨንፈር ግቢ', om: 'Damee' },
  'common.campus': { en: 'Campus', am: 'ካምፓስ', ti: 'ካምፓስ', om: 'Kaampaasii' },
  'common.category': { en: 'Category', am: 'ምድብ', ti: 'ምድብ', om: 'Ramaddii' },
  'common.yes': { en: 'Yes', am: 'አዎ', ti: 'እወ', om: 'Eeyyee' },
  'common.no': { en: 'No', am: 'አይደለም', ti: 'ኣይኮነን', om: 'Lakki' },
  'common.confirm': { en: 'Confirm', am: 'አረጋግጥ', ti: 'ኣረጋግጽ', om: 'Mirkaneessi' },
  'common.areYouSure': { en: 'Are you sure?', am: 'እርግጠኛ ነዎት?', ti: 'ርግጸኛ ዲኻ?', om: 'Mirkaneeffatteettaa?' },
  'common.cannotBeUndone': { en: 'This action cannot be undone.', am: 'ይህ እርምጃ ሊመለስ አይችልም።', ti: 'እዚ ስጉምቲ ክምለስ ኣይክእልን።', om: 'Gochi kun duubatti hin deebi\'u.' },
  'common.success': { en: 'Success', am: 'ተሳክቷል', ti: 'ተዓዊቱ', om: 'Milkaa\'eera' },
  'common.error': { en: 'Error', am: 'ስህተት', ti: 'ጌጋ', om: 'Dogoggora' },
  'common.warning': { en: 'Warning', am: 'ማስጠንቀቂያ', ti: 'መጠንቀቕታ', om: 'Akeekkachiisa' },
  'common.info': { en: 'Information', am: 'መረጃ', ti: 'ሓበሬታ', om: 'Odeeffannoo' },
  'common.savedSuccessfully': { en: 'Successfully saved', am: 'በተሳካ ሁኔታ ተቀምጧል', ti: 'ብዓወት ተቐሚጡ', om: 'Milkaa\'inaan olkaawameera' },
  'common.updatedSuccessfully': { en: 'Successfully updated', am: 'በተሳካ ሁኔታ ተሻሽሏል', ti: 'ብዓወት ተመሓይሹ', om: 'Milkaa\'inaan haaromsameera' },
  'common.deletedSuccessfully': { en: 'Successfully deleted', am: 'በተሳካ ሁኔታ ተሰርዟል', ti: 'ብዓወት ተደምሲሱ', om: 'Milkaa\'inaan haqameera' },
  'common.operationFailed': { en: 'Operation failed', am: 'ክንውኑ አልተሳካም', ti: 'እቲ ስርሒት ኣይተዓወተን', om: 'Hojiin hin milkoofne' },
  'common.accessDenied': { en: 'Access Denied', am: 'ፈቃድ የለዎትም', ti: 'ፍቓድ የብልካን', om: 'Eeyyamni dhowwameera' },
  'common.sessionExpired': { en: 'Session expired', am: 'ክፍለ-ጊዜው አልቋል', ti: 'ናይ ስራሕ ግዜ ኣብቂዑ', om: 'Yeroon darbeera' },
  'common.networkError': { en: 'Network connection error', am: 'የግንኙነት ስህተት', ti: 'ናይ መርበብ ጌጋ', om: 'Dogoggora Netwoorkii' },
  'common.requiredField': { en: 'This field is required', am: 'ይህ ቦታ መሞላት አለበት', ti: 'እዚ ክምላእ ኣለዎ', om: 'Bakki kun barbaachisaadha' },
  'common.invalidEmail': { en: 'Invalid email address', am: 'ልክ ያልሆነ ኢሜይል', ti: 'ቅኑዕ ዘይኮነ ኢመይል', om: 'Imeelii dogoggoraa' },
  'common.invalidPhone': { en: 'Invalid phone number', am: 'ልክ ያልሆነ ስልክ ቁጥር', ti: 'ቅኑዕ ዘይኮነ ቁጽሪ ተሌፎን', om: 'Lakkoofsa bilbilaa dogoggoraa' },
  'common.signIn': { en: 'Sign In', am: 'ግባ', ti: 'እቶ', om: 'Seeni' },
  'common.signOut': { en: 'Sign Out', am: 'ውጣ', ti: 'ውጻእ', om: 'Ba\'i' },
  'common.register': { en: 'Register', am: 'ተመዝገብ', ti: 'ተመዝገብ', om: 'Galmaa\'i' },
  'common.logout': { en: 'Logout', am: 'ውጣ', ti: 'ውጻእ', om: 'Ba\'i' },

  // Direct string fallbacks for common buttons
  'Save': { en: 'Save', am: 'አስቀምጥ', ti: 'ኣቀምጥ', om: 'Olkaa' },
  'Save Changes': { en: 'Save Changes', am: 'ለውጦችን አስቀምጥ', ti: 'ለውጥታት ኣቀምጥ', om: 'Jijjiirama Olkaa' },
  'Cancel': { en: 'Cancel', am: 'ሰርዝ', ti: 'ሰርዝ', om: 'Haqi' },
  'Delete': { en: 'Delete', am: 'አጥፋ', ti: 'ደምስስ', om: 'Balleessi' },
  'Edit': { en: 'Edit', am: 'አርትዕ', ti: 'ኣርም', om: 'Gulaali' },
  'Add': { en: 'Add', am: 'አክል', ti: 'ወስኽ', om: 'Dabali' },
  'Add New': { en: 'Add New', am: 'አዲስ አክል', ti: 'ሓድሽ ወስኽ', om: 'Haaraa Dabali' },
  'Search': { en: 'Search', am: 'ፈልግ', ti: 'ድለ', om: 'Barbaadi' },
  'Close': { en: 'Close', am: 'ዝጋ', ti: 'ዕጸው', om: 'Cufi' },
  'Submit': { en: 'Submit', am: 'አስገባ', ti: 'ኣእቱ', om: 'Galchi' },
  'Back': { en: 'Back', am: 'ተመለስ', ti: 'ተመለስ', om: 'Duubatti' },
  'Next': { en: 'Next', am: 'ቀጣይ', ti: 'ዝቕጽል', om: 'Itti aanaa' },
  'Loading...': { en: 'Loading...', am: 'በመጫን ላይ...', ti: 'ይጽዓን ኣሎ...', om: 'Fe\'amaa jira...' },
  'No data found': { en: 'No data found', am: 'ምንም መረጃ አልተገኘም', ti: 'ዋላ ሓደ ሓበሬታ ኣይተረኽበን', om: 'Daataan hin argamne' },
  'Export': { en: 'Export', am: 'ላክ (ኤክስፖርት)', ti: 'ኤክስፖርት', om: 'Baasi' },
  'Filter': { en: 'Filter', am: 'አጣራ', ti: 'ኣጻሪ', om: 'Calali' },
  'Active': { en: 'Active', am: 'ንቁ', ti: 'ንጡፍ', om: 'Socho\'aa' },
  'Inactive': { en: 'Inactive', am: 'ቦዝኗል', ti: 'ዘይነጡፍ', om: 'Hin sochoone' },
  'Pending': { en: 'Pending', am: 'በመጠባበቅ ላይ', ti: 'ኣብ ምጽባይ', om: 'Eeggachaa jira' },
  'Approved': { en: 'Approved', am: 'ጸድቋል', ti: 'ጸዲቑ', om: 'Ragga\'eera' },
  'Rejected': { en: 'Rejected', am: 'ውድቅ ተደርጓል', ti: 'ተነጺጉ', om: 'Kufaa ta\'eera' },
  'Present': { en: 'Present', am: 'ተገኝቷል', ti: 'ተረኺቡ', om: 'Argameera' },
  'Absent': { en: 'Absent', am: 'አልተገኘም', ti: 'ኣይተረኸበን', om: 'Hin argamne' },

  // Navigation Keys
  'nav.dashboard': { en: 'Overview Dashboard', am: 'አጠቃላይ ዳሽቦርድ', ti: 'ሓፈሻዊ ዳሽቦርድ', om: 'Daashboordii Waliigalaa' },
  'nav.members': { en: 'Member Management', am: 'የአባላት አስተዳደር', ti: 'ምምሕዳር ኣባላት', om: 'Bulchiinsa Miseensotaa' },
  'nav.families': { en: 'Family & Household', am: 'ቤተሰብና ቤተሰቦች', ti: 'ስድራቤትን ቤተሰብን', om: 'Maatii fi Mana' },
  'nav.branches': { en: 'Multi-Campus Branches', am: 'የቅርንጫፍ ካምፓሶች', ti: 'ጨንፈራት ካምፓስ', om: 'Dameewwan Kaampaasii' },
  'nav.ministries': { en: 'Ministry & Groups', am: 'አገልግሎቶችና ሕብረቶች', ti: 'ኣገልግሎታትን ጉጅለታትን', om: 'Tajaajila fi Gareewwan' },
  'nav.attendance': { en: 'Attendance & Check-in', am: 'የአምልኮ ምዝገባና ክትትል', ti: 'ምምዝጋብ ህላወን ቚጽጽርን', om: 'Hordoffii Harka Fuudhaa' },
  'nav.devotions': { en: 'Daily Devotion & Word', am: 'ዕለታዊ መንፈሳዊ ስንቅና ቃል', ti: 'መዓልታዊ ቃልን መንፈሳዊ ስንቅን', om: 'Sagalee Guyyaa' },
  'nav.events': { en: 'Event & Ticketing', am: 'ሁነቶችና ቲኬቶች', ti: 'ፍጻሜታትን ትኬታትን', om: 'Qophii fi Tikkeettii' },
  'nav.communications': { en: 'Multi-Channel Comm', am: 'መልእክቶችና ማስታወቂያዎች', ti: 'መልእኽትታትን ሓበሬታታትን', om: 'Ergaawwan fi Qunnamtii' },
  'nav.prayer_counseling': { en: 'Prayer & Counseling', am: 'የምልጃ ጸሎትና መንፈሳዊ ምክር', ti: 'ናይ ጸሎት ሕቶታትን ምኽርን', om: 'Kadhannaa fi Gorsa' },
  'nav.visitations': { en: 'Visitations & Care', am: 'የምዕመናን ማጽናኛና ህመምተኞች ጉብኝት', ti: 'ምብጻሕን ጓሳዊ ክንክንን', om: 'Daawwannaa fi Kunuunsa' },
  'nav.volunteers': { en: 'Volunteers & Roster', am: 'በጎ ፈቃደኞችና መረሃ ግብር', ti: 'ወለንተኛታትን መደባትን', om: 'Tola Ooltota' },
  'nav.finances': { en: 'Financial Management', am: 'የፋይናንስ አስተዳደር', ti: 'ምምሕዳር ፋይናንስ', om: 'Bulchiinsa Faayinaansii' },
  'nav.documents': { en: 'Document Vault', am: 'የሰነዶች መዝገብ ቤት', ti: 'መዛግብቲ ሰነዳት', om: 'Kuusaa Galmee' },
  'nav.lms': { en: 'LMS Discipleship', am: 'የደቀመዝሙርነት ማሰልጠኛ', ti: 'ቤት ትምህርቲ ደቀ መዛሙርቲ', om: 'Barnoota Bartootaa' },
  'nav.workflows': { en: 'Workflows & Approvals', am: 'የይሁንታ ጥያቄዎችና ፍቃድ', ti: 'ውሕስነታትን ፍቓዳትን', om: 'Hojiiwwan fi Raggaasisa' },
  'nav.predictive': { en: 'Predictive Analytics', am: 'ትንበያና ስታቲስቲክስ', ti: 'ትንበያታትን ስታቲስቲክስን', om: 'Tilmaama fi Xiinxala' },
  'nav.security_audit': { en: 'Security & Audit Logs', am: 'የደህንነትና የኦዲት መዝገብ', ti: 'መዝገብ ድሕንነትን ኦዲትን', om: 'Nageenya fi Galmee Oodiitii' },
  'nav.settings': { en: 'Organization Settings', am: 'የስርዓት ቅንብሮች', ti: 'ቅጥዕታት ውድብ', om: 'Qindaa\'ina Dhaabbataa' },
  'nav.mobile_preview': { en: 'Mobile App Preview', am: 'የሞባይል እይታ', ti: 'ቅድመ-ርእየት ሞባይል', om: 'Mul\'ata Mobaayilaa' },
  'nav.reports': { en: 'Executive Reports', am: 'ዋና የሪፖርት ማዕከል', ti: 'ፈጻሚ ጸብጻባት', om: 'Gabaasa Hogganaa' },
  'nav.backup': { en: 'System Backups', am: 'የውሂብ ምትኬና ማገገሚያ', ti: 'ምዕቃብን ምምላስን ዳታ', om: 'Baak-appii fi Deebisaa' },
  'nav.api': { en: 'API Integrations Hub', am: 'የኤፒአይ ማገናኛ ማዕከል', ti: 'ማእኸል መተሓላለፊ ኤፒአይ', om: 'Giddugala Qindoomina API' },
  'nav.my_profile': { en: 'My User Profile', am: 'የግል መገለጫዬ', ti: 'ናተይ መግለጺ', om: 'Piroofaayilii Kiyya' },

  // Direct Module Titles
  'Overview Dashboard': { en: 'Overview Dashboard', am: 'አጠቃላይ ዳሽቦርድ', ti: 'ሓፈሻዊ ዳሽቦርድ', om: 'Daashboordii Waliigalaa' },
  'Member Management': { en: 'Member Management', am: 'የአባላት አስተዳደር', ti: 'ምምሕዳር ኣባላት', om: 'Bulchiinsa Miseensotaa' },
  'Family & Household': { en: 'Family & Household', am: 'ቤተሰብና ቤተሰቦች', ti: 'ስድራቤትን ቤተሰብን', om: 'Maatii fi Mana' },
  'Multi-Campus Branches': { en: 'Multi-Campus Branches', am: 'የቅርንጫፍ ካምፓሶች', ti: 'ጨንፈራት ካምፓስ', om: 'Dameewwan Kaampaasii' },
  'Ministry & Groups': { en: 'Ministry & Groups', am: 'አገልግሎቶችና ሕብረቶች', ti: 'ኣገልግሎታትን ጉጅለታትን', om: 'Tajaajila fi Gareewwan' },
  'Attendance & Check-in': { en: 'Attendance & Check-in', am: 'የአምልኮ ምዝገባና ክትትል', ti: 'ምምዝጋብ ህላወን ቚጽጽርን', om: 'Hordoffii Harka Fuudhaa' },
  'Daily Devotion & Word': { en: 'Daily Devotion & Word', am: 'ዕለታዊ መንፈሳዊ ስንቅና ቃል', ti: 'መዓልታዊ ቃልን መንፈሳዊ ስንቅን', om: 'Sagalee Guyyaa' },
  'Event & Ticketing': { en: 'Event & Ticketing', am: 'ሁነቶችና ቲኬቶች', ti: 'ፍጻሜታትን ትኬታትን', om: 'Qophii fi Tikkeettii' },
  'Multi-Channel Comm': { en: 'Multi-Channel Comm', am: 'መልእክቶችና ማስታወቂያዎች', ti: 'መልእኽትታትን ሓበሬታታትን', om: 'Ergaawwan fi Qunnamtii' },
  'Prayer & Counseling': { en: 'Prayer & Counseling', am: 'የምልጃ ጸሎትና መንፈሳዊ ምክር', ti: 'ናይ ጸሎት ሕቶታትን ምኽርን', om: 'Kadhannaa fi Gorsa' },
  'Visitations & Care': { en: 'Visitations & Care', am: 'የምዕመናን ማጽናኛና ህመምተኞች ጉብኝት', ti: 'ምብጻሕን ጓሳዊ ክንክንን', om: 'Daawwannaa fi Kunuunsa' },
  'Volunteers & Roster': { en: 'Volunteers & Roster', am: 'በጎ ፈቃደኞችና መረሃ ግብር', ti: 'ወለንተኛታትን መደባትን', om: 'Tola Ooltota' },
  'Financial Management': { en: 'Financial Management', am: 'የፋይናንስ አስተዳደር', ti: 'ምምሕዳር ፋይናንስ', om: 'Bulchiinsa Faayinaansii' },
  'Document Vault': { en: 'Document Vault', am: 'የሰነዶች መዝገብ ቤት', ti: 'መዛግብቲ ሰነዳት', om: 'Kuusaa Galmee' },
  'LMS Discipleship': { en: 'LMS Discipleship', am: 'የደቀመዝሙርነት ማሰልጠኛ', ti: 'ቤት ትምህርቲ ደቀ መዛሙርቲ', om: 'Barnoota Bartootaa' },
  'Workflows & Approvals': { en: 'Workflows & Approvals', am: 'የይሁንታ ጥያቄዎችና ፍቃድ', ti: 'ውሕስነታትን ፍቓዳትን', om: 'Hojiiwwan fi Raggaasisa' },
  'Predictive Analytics': { en: 'Predictive Analytics', am: 'ትንበያና ስታቲስቲክስ', ti: 'ትንበያታትን ስታቲስቲክስን', om: 'Tilmaama fi Xiinxala' },
  'Security & Audit Logs': { en: 'Security & Audit Logs', am: 'የደህንነትና የኦዲት መዝገብ', ti: 'መዝገብ ድሕንነትን ኦዲትን', om: 'Nageenya fi Galmee Oodiitii' },
  'Organization Settings': { en: 'Organization Settings', am: 'የስርዓት ቅንብሮች', ti: 'ቅጥዕታት ውድብ', om: 'Qindaa\'ina Dhaabbataa' },
  'Mobile App Preview': { en: 'Mobile App Preview', am: 'የሞባይል እይታ', ti: 'ቅድመ-ርእየት ሞባይል', om: 'Mul\'ata Mobaayilaa' },
  'Executive Reports & Analytics': { en: 'Executive Reports & Analytics', am: 'ዋና የሪፖርትና የትንታኔ ማዕከል', ti: 'ፈጻሚ ጸብጻባትን ትንታነን', om: 'Gabaasa fi Xiinxala Hogganaa' },
  'System Backups & Recovery': { en: 'System Backups & Recovery', am: 'የውሂብ ምትኬና መልሶ ማግኛ', ti: 'ምዕቃብን ምምላስን ዳታ', om: 'Baak-appii fi Deebisaa' },

  // Group Headers
  'Core Administration': { en: 'Core Administration', am: 'ዋና አስተዳደር', ti: 'ቀንዲ ምምሕዳር', om: 'Bulchiinsa Ijoo' },
  'Operations & Engagement': { en: 'Operations & Engagement', am: 'ክንውንና ተሳትፎ', ti: 'ስርሒታትን ተሳትፎን', om: 'Hojii fi Hirmaannaa' },
  'Pastoral Care & Service': { en: 'Pastoral Care & Service', am: 'የእረኝነት እንክብካቤና አምልኮት', ti: 'ጓሳዊ ክንክንን ኣገልግሎትን', om: 'Tajaajila fi Kunuunsa' },
  'Documents, LMS & Governance': { en: 'Documents, LMS & Governance', am: 'ሰነዶች፣ ትምህርትና አስተዳደር', ti: 'ሰነዳት፣ ትምህርትን ምምሕዳርን', om: 'Galmee, Barnoota fi Bulchiinsa' },
  'Intelligence & Security': { en: 'Intelligence & Security', am: 'ትንታኔና ደህንነት', ti: 'ትንታነን ድሕንነትን', om: 'Nageenya fi Xiinxala' },

  // Member Module Keys
  'members.title': { en: 'Member Directory & Life Journey', am: 'የአባላት መዝገብና ጉዞ', ti: 'ማህደር ኣባላት', om: 'Galmee Miseensotaa' },
  'members.allMembers': { en: 'All Members', am: 'ሁሉም አባላት', ti: 'ኩሎም ኣባላት', om: 'Miseensota Hundumaa' },
  'members.activeMembers': { en: 'Active Members', am: 'ንቁ አባላት', ti: 'ንጡፋት ኣባላት', om: 'Miseensota Socho\'oo' },
  'members.inactive': { en: 'Inactive', am: 'ቦዝኗል', ti: 'ዘይነጡፍ', om: 'Hin sochoone' },
  'members.pastMembers': { en: 'Past & Death Record', am: 'የቀድሞና ያረፉ አባላት', ti: 'ዝሓለፉን ዝዓረፉን', om: 'Miseensota Duraanii' },
  'members.excommunicated': { en: 'Excommunicated', am: 'የተወገዙ', ti: 'ዝተወገዙ', om: 'Kan Qoodaman' },
  'members.addMember': { en: 'Add Member', am: 'አባል መዝግብ', ti: 'ኣባል መዝግብ', om: 'Miseensa Galmeessi' },
  'members.searchPlaceholder': { en: 'Search member name, phone, kebele, woreda...', am: 'የአባሉን ስም፣ ስልክ፣ ቀበሌ፣ ወረዳ ይፈልጉ...', ti: 'ስም፣ ተሌፎን፣ ቀበሌ ድለ...', om: 'Maqaa, bilbila, ganda barbaadi...' },
  'members.filterDirectory': { en: 'Filter Directory', am: 'መዝገቡን አጣራ', ti: 'መዝገብ ኣጻሪ', om: 'Galmee Calali' },
  'members.clearFilters': { en: 'Clear Filters', am: 'ማጣሪያዎችን አጽዳ', ti: 'መጻረዪታት ኣጽሪ', om: 'Calaltuuwwan Qulqulleessi' },
  'members.applyFilters': { en: 'Apply Filters', am: 'ማጣሪያዎችን ተግብር', ti: 'መጻረዪታት ተግብር', om: 'Calaltuuwwan Hojiirra Oolchi' },
  'members.personalDetails': { en: 'Personal Details', am: 'የግል ዝርዝር', ti: 'ውልቃዊ ዝርዝራት', om: 'Bal\'ina Dhuunfaa' },
  'members.spiritualJourney': { en: 'Spiritual Journey', am: 'መንፈሳዊ ጉዞ', ti: 'መንፈሳዊ ጉዕዞ', om: 'Imala Hafuuraa' },
  'members.familyHousehold': { en: 'Family & Household', am: 'የቤተሰብ መረጃ', ti: 'ሓበሬታ ስድራቤት', om: 'Odeeffannoo Maatii' },
  'members.professionalVocation': { en: 'Professional & Vocation', am: 'የሙያና ሥራ መረጃ', ti: 'ሞያን ስራሕን', om: 'Ogummaa fi Hojii' },
  'members.medicalEmergency': { en: 'Medical & Emergency', am: 'የጤናና ድንገተኛ አደጋ', ti: 'ሕክምናን ህጹጽ ሓደጋን', om: 'Fayyaa fi Balaa' },
  'members.digitalId': { en: 'Digital ID Card', am: 'ዲጂታል መታወቂያ', ti: 'ዲጂታል መንነት ወረቐት', om: 'Kaardii Eenyummaa Diijiitaalaa' },
  'members.recordDeparture': { en: 'Record Departure / Death', am: 'የስንብት/የዕረፍት መዝገብ', ti: 'መዝገብ ዕረፍቲ/ስንብት', om: 'Galmee Boqonnaa' },
  'members.departureReason': { en: 'Departure Reason', am: 'የመነሻ/የስንብት ምክንያት', ti: 'ምኽንያት ስንብት', om: 'Sababa Boqonnaa' },
  'members.departureDate': { en: 'Departure Date', am: 'የስንብት/የዕረፍት ቀን', ti: 'ዕለተ ስንብት', om: 'Guyyaa Boqonnaa' },
  'members.departureNotes': { en: 'Pastoral Notes', am: 'የእረኝነት ማስታወሻ', ti: 'ጓሳዊ መዘኻኸሪ', om: 'Yaadannoo Gorsaa' },
  'members.createdSuccessfully': { en: 'Member registered successfully', am: 'አባሉ በተሳካ ሁኔታ ተመዝግቧል', ti: 'ኣባል ብዓወት ተመዝጊቡ', om: 'Miseensi milkaa\'inaan galmaa\'eera' },
  'members.updatedSuccessfully': { en: 'Member updated successfully', am: 'የአባሉ መረጃ በተሳካ ሁኔታ ተሻሽሏል', ti: 'ሓበሬታ ኣባል ብዓወት ተመሓይሹ', om: 'Odeeffannoon miseensaa milkaa\'inaan haaromsameera' },
  'members.deletedSuccessfully': { en: 'Member deleted successfully', am: 'አባሉ በተሳካ ሁኔታ ተሰርዟል', ti: 'ኣባል ብዓወት ተደምሲሱ', om: 'Miseensi milkaa\'inaan haqameera' },

  // Direct Member Labels
  'All Members': { en: 'All Members', am: 'ሁሉም አባላት', ti: 'ኩሎም ኣባላት', om: 'Miseensota Hundumaa' },
  'Active Members': { en: 'Active Members', am: 'ንቁ አባላት', ti: 'ንጡፋት ኣባላት', om: 'Miseensota Socho\'oo' },
  'Past & Death Record': { en: 'Past & Death Record', am: 'የቀድሞና ያረፉ አባላት', ti: 'ዝሓለፉን ዝዓረፉን', om: 'Miseensota Duraanii' },
  'Excommunicated': { en: 'Excommunicated', am: 'የተወገዙ', ti: 'ዝተወገዙ', om: 'Kan Qoodaman' },
  'Add Member': { en: 'Add Member', am: 'አባል መዝግብ', ti: 'ኣባል መዝግብ', om: 'Miseensa Galmeessi' },
  'View Paper': { en: 'View Paper', am: 'ማመልከቻውን እይ', ti: 'ወረቐት ርአ', om: 'Waraqaa Ilaali' },
  'Import Paper': { en: 'Import Paper', am: 'ማመልከቻ አስገባ', ti: 'ወረቐት ኣእቱ', om: 'Waraqaa Galchi' },
  'First Name': { en: 'First Name', am: 'ስም', ti: 'ስም', om: 'Maqaa' },
  'Last Name': { en: 'Last Name', am: 'የአባት ስም', ti: 'ስም ኣቦ', om: 'Maqaa Abbaa' },
  'Email Address': { en: 'Email Address', am: 'የኢሜይል አድራሻ', ti: 'ኣድራሻ ኢመይል', om: 'Teessoo Imeelii' },
  'Phone Number': { en: 'Phone Number', am: 'ስልክ ቁጥር', ti: 'ቁጽሪ ተሌፎን', om: 'Lakkoofsa Bilbilaa' },
  'Date of Birth': { en: 'Date of Birth', am: 'የትውልድ ቀን', ti: 'ዕለተ ልደት', om: 'Guyyaa Dhalootaa' },
  'Gender': { en: 'Gender', am: 'ጾታ', ti: 'ጾታ', om: 'Saala' },
  'Marital Status': { en: 'Marital Status', am: 'የጋብቻ ሁኔታ', ti: 'ኩነታት መርዓ', om: 'Haala Gaa\'elaa' },
  'Membership Status': { en: 'Membership Status', am: 'የአባልነት ሁኔታ', ti: 'ኩነታት ኣባልነት', om: 'Haala Miseensummaa' },
  'Baptism Status': { en: 'Baptism Status', am: 'የጥምቀት ሁኔታ', ti: 'ኩነታት ጥምቀት', om: 'Haala Cuuphaa' },
  'Emergency Contact': { en: 'Emergency Contact', am: 'የድንገተኛ ጊዜ ተጠሪ', ti: 'ህጹጽ ረድኤት ተጸዋዒ', om: 'Nama Yeroo Balaa' },
  'Assigned Campus': { en: 'Assigned Campus', am: 'የተመደበበት ካምፓስ', ti: 'ዝተመደበሉ ካምፓስ', om: 'Kaampaasii Ramadame' },
  'Spouse Details': { en: 'Spouse Details', am: 'የትዳር አጋር መረጃ', ti: 'ሓበሬታ መጻምዲ', om: 'Odeeffannoo Haadha/Abbaa Warraa' },
  'Children Records': { en: 'Children Records', am: 'የልጆች መረጃ', ti: 'ሓበሬታ ቆልዑ', om: 'Odeeffannoo Ijoollee' },

  // Campuses / Branches
  'All Campuses': { en: 'All Campuses', am: 'ሁሉም ካምፓሶች', ti: 'ኩሎም ካምፓሳት', om: 'Kaampaasii Hundumaa' },
  'Main Sanctuary Campus': { en: 'Main Sanctuary Campus', am: 'ዋናው የመቅደስ ግቢ', ti: 'ቀንዲ ግቢ መቕደስ', om: 'Kaampaasii Qulqullummaa Ijoo' },
  'Bole International Campus': { en: 'Bole International Campus', am: 'የቦሌ ዓለም አቀፍ ግቢ', ti: 'ናይ ቦሌ ዓለም ለኸ ግቢ', om: 'Kaampaasii Idil-addunyaa Boolee' },
  'Sarbet Family Campus': { en: 'Sarbet Family Campus', am: 'የሳርቤት የቤተሰብ ግቢ', ti: 'ናይ ሳርቤት ስድራቤት ግቢ', om: 'Kaampaasii Maatii Saarbeet' },

  // Breadcrumbs
  'CMMS Dashboard': { en: 'CMMS Dashboard', am: 'የሲኤምኤምኤስ ዳሽቦርድ', ti: 'ዳሽቦርድ ሲኤምኤምኤስ', om: 'Daashboordii CMMS' },
  'Overview KPIs': { en: 'Overview KPIs', am: 'አጠቃላይ አመልካቾች', ti: 'ሓፈሻዊ መርኣይታት', om: 'Agarsiiftuuwwan Waliigalaa' },
  'Backup & Recovery': { en: 'Backup & Recovery', am: 'ምትኬና ማገገሚያ', ti: 'ምዕቃብን ምምላስን', om: 'Baak-appii fi Deebisaa' },
  'Scheduled Backups': { en: 'Scheduled Backups', am: 'ቀጠሮ የተያዘላቸው ምትኬዎች', ti: 'ዝተመደበ ምዕቃብ', om: 'Baak-appii Saganteeffame' },
  'Backup History': { en: 'Backup History', am: 'የምትኬ ታሪክ', ti: 'ታሪኽ ምዕቃብ', om: 'Seenaa Baak-appii' },
  'Insights': { en: 'Insights', am: 'ግኝቶችና ትንታኔ', ti: 'ግኝታትን ትንታነን', om: 'Xiinxala' },
  'Account & Security': { en: 'Account & Security', am: 'መለያና ደህንነት', ti: 'ኣካውንትን ድሕንነትን', om: 'Akkaawuntii fi Nageenya' },
  'My User Profile': { en: 'My User Profile', am: 'የግል መገለጫዬ', ti: 'ናተይ መግለጺ', om: 'Piroofaayilii Kiyya' },
  'Pastoral Governance': { en: 'Pastoral Governance', am: 'የእረኝነት አመራር', ti: 'ጓሳዊ ምምሕዳር', om: 'Hoggana Qeesii' },
  'Approval Queue & Review': { en: 'Approval Queue & Review', am: 'የይሁንታ ጥያቄዎች ግምገማ', ti: 'ምርመራን ምጽዳቕን', om: 'Gamaaggama Raggaasisaa' },
  'Member Directory & Profile': { en: 'Member Directory & Profile', am: 'የአባላት ማህደርና መገለጫ', ti: 'ማህደርን መግለጺን ኣባላት', om: 'Galmee fi Piroofaayilii Miseensotaa' },
  'Households & Families': { en: 'Households & Families', am: 'ቤተሰቦችና አባወራዎች', ti: 'ስድራቤታትን ኣባወራታትን', om: 'Maatiifi Mana' },
  'Holy Bible': { en: 'Holy Bible', am: 'መጽሐፍ ቅዱስ', ti: 'መጽሓፍ ቅዱስ', om: 'Macaafa Qulqulluu' },
  'Old Testament': { en: 'Old Testament', am: 'ብሉይ ኪዳን', ti: 'ብሉይ ኪዳን', om: 'Kakuu Moofaa' },
  'New Testament': { en: 'New Testament', am: 'ሐዲስ ኪዳን', ti: 'ሓድሽ ኪዳን', om: 'Kakuu Haaraa' },
  'Daily Devotion & Holy Bible': { en: 'Daily Devotion & Holy Bible', am: 'ዕለታዊ መንፈሳዊ ስንቅና መጽሐፍ ቅዱስ', ti: 'መዓልታዊ ቃልን መጽሓፍ ቅዱስን', om: 'Sagalee Guyyaa fi Macaafa Qulqulluu' },
  'Event Ticketing & Planning': { en: 'Event Ticketing & Planning', am: 'የሁነቶች እቅድና ቲኬቶች', ti: 'ምድላው ፍጻሜታትን ትኬታትን', om: 'Karoora Qophii fi Tikkeettii' },
  'Multi-Channel Communications': { en: 'Multi-Channel Communications', am: 'ሁለገብ የመልእክት ግንኙነቶች', ti: 'ብዙሕ መስመር ዘለዎ ርክብ', om: 'Qunnamtii Kallattii Hundaa' },
  'Prayer & Counseling Portal': { en: 'Prayer & Counseling Portal', am: 'የጸሎትና የምክር ማዕከል', ti: 'ማእኸል ጸሎትን ምኽርን', om: 'Giddugala Kadhannaa fi Gorsaa' },
  'Visitations & Shepherd Care': { en: 'Visitations & Shepherd Care', am: 'የምዕመናን ጉብኝትና የእረኝነት ክትትል', ti: 'ምብጻሕን ጓሳዊ ክንክንን', om: 'Daawwannaa fi Hordoffii Qeesii' },
  'Asset & Facilities Registry': { en: 'Asset & Facilities Registry', am: 'የንብረትና የሕንፃዎች መዝገብ', ti: 'መዝገብ ንብረትን ህንጻታትን', om: 'Galmee Qabeenyaa fi Gamoo' },
  'Document Vault & Archive': { en: 'Document Vault & Archive', am: 'የሰነዶች ማህደርና ካዝና', ti: 'ካዝና ሰነዳትን መዛግብትን', om: 'Kuusaa fi Galmee Sanadaa' },
  'LMS Discipleship Academy': { en: 'LMS Discipleship Academy', am: 'የደቀመዝሙርነት ማሰልጠኛ አካዳሚ', ti: 'ኣካዳሚ ደቀ መዛሙርቲ', om: 'Barnoota Bartoota Waldaa' },

  // Welcome strings & roles
  'welcome': { en: 'Welcome back, {{name}}', am: 'እንኳን ደህና መጡ፣ {{name}}', ti: 'እንቋዕ ብደሓን መጻእካ፣ {{name}}', om: 'Baga nagaan deebite, {{name}}' },
  'welcome_role': { en: 'Welcome, {{name}} ({{role}})', am: 'እንኳን ደህና መጡ፣ {{name}} ({{role}})', ti: 'እንቋዕ ብደሓን መጻእካ፣ {{name}} ({{role}})', om: 'Baga nagaan dhufte, {{name}} ({{role}})' },
  'logged_in_as': { en: 'Logged in as {{name}} - {{branch}}', am: 'ገብተዋል፦ {{name}} - {{branch}}', ti: 'ኣቲኻ ኣለኻ፦ {{name}} - {{branch}}', om: 'Seenteetta፦ {{name}} - {{branch}}' },

  // Auth strings
  'auth.member_tab': { en: 'Member Portal', am: 'የምዕመናን መግቢያ', ti: 'መእተዊ ምእመናን', om: 'Seensa Miseensotaa' },
  'auth.staff_tab': { en: 'Staff & Leadership', am: 'የአመራሮችና ሠራተኞች መግቢያ', ti: 'መእተዊ መራሕትን ሰራሕተኛታትን', om: 'Seensa Hogganootaa' },
  'auth.google_login': { en: 'Continue with Google', am: 'በጉግል ቀጥል', ti: 'ብጉግል ቀጽል', om: 'Google\'n Itti Fufi' },
  'auth.google_login_desc': { en: 'Sign in using verified Google account', am: 'በተረጋገጠ የጉግል መለያ ይግቡ', ti: 'ብጉግል ኣካውንት እቶ', om: 'Akkaawuntii Google mirkanaa\'een seeni' },
  'auth.member_identifier': { en: 'Member ID, Email, or Phone', am: 'የአባል መለያ፣ ኢሜይል ወይም ስልክ', ti: 'መፍለዪ ኣባል፣ ኢመይል ወይ ተሌፎን', om: 'Eenyummaa, Imeelii ykn Bilbila' },
  'auth.member_identifier_placeholder': { en: 'e.g. MEM-001 or phone', am: 'ምሳሌ፦ MEM-001 ወይም ስልክ', ti: 'ንኣብነት፦ MEM-001 ወይ ተሌፎን', om: 'fakkeenyaaf: MEM-001 ykn bilbila' },
  'auth.member_password': { en: 'Password', am: 'የይለፍ ቃል', ti: 'ናይ ሕልፊ ቃል', om: 'Jecha Darbii' },
  'auth.member_password_placeholder': { en: '••••••••', am: '••••••••', ti: '••••••••', om: '••••••••' },
  'auth.remember_me': { en: 'Remember Me', am: 'አስታውሰኝ', ti: 'ዘክረኒ', om: 'Na Yaadadhu' },
  'auth.forgot_password': { en: 'Forgot Password?', am: 'የይለፍ ቃል ረሱ?', ti: 'ቃል ሓሊፍካ ረሲዕካዮ?', om: 'Jecha darbii irraanfattee?' },
  'auth.member_login_btn': { en: 'Sign In to Portal', am: 'ወደ ማዕከሉ ግባ', ti: 'ናብ ማእኸል እቶ', om: 'Gara Giddugalaatti Seeni' },
  'auth.or_divider': { en: 'Or', am: 'ወይም', ti: 'ወይ', om: 'Yookiin' },
  'auth.back_to_login': { en: 'Back to Login', am: 'ወደ መግቢያው ተመለስ', ti: 'ናብ መእተዊ ተመለስ', om: 'Gara Seensaatti Deebi\'i' },
  'auth.email': { en: 'Work Email Address', am: 'የሥራ ኢሜይል አድራሻ', ti: 'ኣድራሻ ናይ ስራሕ ኢመይል', om: 'Teessoo Imeelii Hojii' },
  'auth.password': { en: 'Password', am: 'የይለፍ ቃል', ti: 'ናይ ሕልፊ ቃል', om: 'Jecha Darbii' },
  'auth.campus_id': { en: 'Assigned Campus', am: 'የተመደቡበት ካምፓስ', ti: 'ዝተመደበሉ ካምፓስ', om: 'Kaampaasii Ramadame' },
  'auth.role': { en: 'System Role', am: 'የስርዓቱ ሚና', ti: 'ግደ ስርዓት', om: 'Gahee Sirnaa' },
  'auth.login_btn': { en: 'Authorize & Sign In', am: 'ፈቃድ አረጋግጥና ግባ', ti: 'ኣረጋጊጽካ እቶ', om: 'Mirkaneessiitii Seeni' },

  // Role Names
  'roles.systemAdmin': { en: 'System Administrator', am: 'ዋና የስርዓት አስተዳዳሪ', ti: 'ዋና ኣመሓዳሪ ስርዓት', om: 'Bulchaa Sirnaa Olaanaa' },
  'roles.manager': { en: 'Church Administrator', am: 'የቤተ ክርስቲያን አስተዳዳሪ', ti: 'ኣመሓዳሪ ቤተ ክርስቲያን', om: 'Bulchaa Waldaa' },
  'roles.pastor': { en: 'Senior Pastor', am: 'ዋና ፓስተር / ካህን', ti: 'ቀንዲ ፓስተር / ካህን', om: 'Luba Olaanaa' },
  'roles.ministryLeader': { en: 'Ministry Leader', am: 'የአገልግሎት መሪ', ti: 'መራሒ ኣገልግሎት', om: 'Hogganaa Tajaajilaa' },
  'roles.regularMember': { en: 'Congregation Member', am: 'የማኅበሩ ምዕመን', ti: 'ምእመን ማሕበር', om: 'Miseensa Waldaa' },

  // Devotions
  'Today\'s Devotion': { en: 'Today\'s Devotion', am: 'የዕለቱ መንፈሳዊ ስንቅ', ti: 'ናይ ሎሚ መንፈሳዊ ስንቂ', om: 'Sagalee Guyyaa Har\'aa' },
  'YouVersion Bible Reader': { en: 'YouVersion Bible Reader', am: 'የዩቨርሽን መጽሐፍ ቅዱስ አንባቢ', ti: 'ናይ ዩቨርሽን መጽሓፍ ቅዱስ ኣንባቢ', om: 'Dubbisaa Macaafa Qulqulluu YouVersion' },
  'Daily Reading Plan': { en: 'Daily Reading Plan', am: 'የዕለት ንባብ ዕቅድ', ti: 'መዓልታዊ መደብ ንባብ', om: 'Karoora Dubbisa Guyyaa' },
  'Spiritual Journal': { en: 'Spiritual Journal', am: 'መንፈሳዊ ማስታወሻ', ti: 'መንፈሳዊ መዘኻኸሪ', om: 'Yaadannoo Hafuuraa' },
  'Devotion Archive': { en: 'Devotion Archive', am: 'የቀደሙ ቃላት ማህደር', ti: 'ካዝና ዝሓለፉ ቃላት', om: 'Kuusaa Sagalee Darbee' },
  'Scripture Passage': { en: 'Scripture Passage', am: 'የቅዱሳት መጻሕፍት ምንባብ', ti: 'ምንባብ ቅዱሳት መጻሕፍቲ', om: 'Dubbisa Qulqulluu' },
  'Closing Prayer': { en: 'Closing Prayer', am: 'የመዝጊያ ጸሎት', ti: 'ናይ መዕጸዊ ጸሎት', om: 'Kadhannaa Xumuraa' },
  'Publish Devotion': { en: 'Publish Devotion', am: 'የዕለቱን ቃል አሳትም', ti: 'ናይ ሎሚ ቃል ኣሕትም', om: 'Sagalee Guyyaa Maxxansi' },

  // Events
  'Schedule New Event & Upload Poster': { en: 'Schedule New Event & Upload Poster', am: 'አዲስ ሁነት ያቅዱና ፖስተር ይጫኑ', ti: 'ሓድሽ ፍጻሜ መዲብካ ፖስተር ጽዓን', om: 'Qophii Haaraa Karoorsi' },
  'View Poster': { en: 'View Poster', am: 'ፖስተሩን እይ', ti: 'ፖስተር ርአ', om: 'Poostara Ilaali' },
  'Register': { en: 'Register', am: 'ተመዝገብ', ti: 'ተመዝገብ', om: 'Galmaa\'i' },
  'Registered': { en: 'Registered', am: 'ተመዝግቧል', ti: 'ተመዝጊቡ', om: 'Galmaa\'eera' },
  'Free Admission': { en: 'Free Admission', am: 'ነጻ መግቢያ', ti: 'ብነጻ መእተዊ', om: 'Seensa Bilisaa' },

  // Prayer & Counseling
  'Submit Prayer Request': { en: 'Submit Prayer Request', am: 'የጸሎት ጥያቄ ያስገቡ', ti: 'ናይ ጸሎት ሕቶ ኣእቱ', om: 'Kadhannaa Dhiyeessi' },
  'Book Pastoral Counseling': { en: 'Book Pastoral Counseling', am: 'የእረኝነት ምክር ቀጠሮ ይያዙ', ti: 'ቆጸራ ምኽሪ ሓዝ', om: 'Beellama Gorsaa Qabadhu' },
  'Prayer Requests & Testimonies': { en: 'Prayer Requests & Testimonies', am: 'የጸሎት ጥያቄዎችና ምስክርነቶች', ti: 'ናይ ጸሎት ሕቶታትን ምስክርነታትን', om: 'Gaaffii Kadhannaa fi Dhugaa Ba\'umsa' },
  'Confidential Counseling Sessions': { en: 'Confidential Counseling Sessions', am: 'ሚስጥራዊ የምክር አገልግሎት ክፍለ-ጊዜያት', ti: 'ምስጢራዊ ክፍለ ግዜ ምኽሪ', om: 'Yeroo Gorsaa Iccitii' },

  // Settings & Theme
  'Theme Mode': { en: 'Theme Mode', am: 'የገጽታ ቀለም', ti: 'ቀለም ገጽ', om: 'Haala Halluu' },
  'Language Preference': { en: 'Language Preference', am: 'የቋንቋ ምርጫ', ti: 'ምርጫ ቋንቋ', om: 'Filannoo Afaanii' },
  'Currency': { en: 'Currency', am: 'የገንዘብ ምንዛሪ', ti: 'دراهم / ገንዘብ', om: 'Gosa Maallaqaa' },
  'High Contrast Mode': { en: 'High Contrast Mode', am: 'ከፍተኛ የንፅፅር እይታ', ti: 'ልዑል ንጽጽር', om: 'Haala Wal-biraa Ol\'aanaa' },
  'Reduce Motion': { en: 'Reduce Motion', am: 'እንቅስቃሴ ቀንስ', ti: 'ምንቅስቓስ ኣጉድል', om: 'Sochii Hir\'isi' },
};

// 4. Merge everything into unified language dictionaries
const enOut = { ...existingEn, ...oldEnglish };
const amOut = { ...enOut, ...existingAm, ...oldAmharic, ...amOverride };
const tiOut = { ...enOut, ...existingTi, ...oldTigrigna };
const omOut = { ...enOut, ...existingOm, ...oldOromo };

// Apply masterData entries
for (const [key, trans] of Object.entries(masterData)) {
  enOut[key] = trans.en;
  amOut[key] = trans.am || trans.en;
  tiOut[key] = trans.ti || trans.en;
  omOut[key] = trans.om || trans.en;
}

// 5. Ensure all keys in enOut exist in all languages (with fallback if missing)
for (const key of Object.keys(enOut)) {
  if (!amOut[key]) amOut[key] = oldAmharic[key] || enOut[key];
  if (!tiOut[key]) tiOut[key] = oldTigrigna[key] || enOut[key];
  if (!omOut[key]) omOut[key] = oldOromo[key] || enOut[key];
}

// Write out nicely formatted JSON files
fs.writeFileSync(path.join(localesDir, 'en.json'), JSON.stringify(enOut, null, 2), 'utf8');
fs.writeFileSync(path.join(localesDir, 'am.json'), JSON.stringify(amOut, null, 2), 'utf8');
fs.writeFileSync(path.join(localesDir, 'ti.json'), JSON.stringify(tiOut, null, 2), 'utf8');
fs.writeFileSync(path.join(localesDir, 'om.json'), JSON.stringify(omOut, null, 2), 'utf8');

console.log('Successfully wrote locale files:');
console.log('en.json keys:', Object.keys(enOut).length);
console.log('am.json keys:', Object.keys(amOut).length);
console.log('ti.json keys:', Object.keys(tiOut).length);
console.log('om.json keys:', Object.keys(omOut).length);
