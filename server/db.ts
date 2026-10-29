import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  Member,
  Family,
  Branch,
  Ministry,
  AttendanceRecord,
  AttendanceSession,
  EventItem,
  CommunicationMessage,
  CommunicationLog,
  PrayerRequest,
  CounselingSession,
  VisitationRecord,
  VolunteerShift,
  Asset,
  DocumentItem,
  LmsCourse,
  WorkflowRequest,
  AuditLog,
  SystemUser,
  SystemBrandingConfig,
  ApiKeyRecord,
  WebhookSubscription,
  SmsGatewayConfig,
  Devotion,
  DevotionReaction,
  DevotionComment,
  BibleNote,
  BibleHighlight,
  BibleBookmark,
  BibleReadingHistoryEntry,
  BibleReadingPlanProgress,
  BibleReaderSettings,
  DEFAULT_BIBLE_READER_SETTINGS,
  BibleMessage,
  BibleMessageRecipient,
  MinistryMemberRecord,
  GroupChatSession,
  Conversation,
  ConversationParticipant,
  ConversationMessage,
  MinistryAnnualPlan,
  ProfileChangeRequest,
  RegistrationInvitationRecord,
} from '../src/types';
import {
  initialBranches,
  initialMembers,
  initialFamilies,
  initialMinistries,
  initialAttendanceRecords,
  initialAttendanceSessions,
  initialEvents,
  initialCommunications,
  initialPrayerRequests,
  initialCounselingSessions,
  initialVisitations,
  initialVolunteerShifts,
  initialAssets,
  initialDocuments,
  initialCourses,
  initialWorkflows,
  initialAuditLogs,
  initialSystemUsers,
  initialProfileChangeRequests,
} from '../src/data/mockData';

export interface DatabaseSchema {
  branding: SystemBrandingConfig;
  branches: Branch[];
  members: Member[];
  families: Family[];
  ministries: Ministry[];
  attendanceRecords: AttendanceRecord[];
  attendanceSessions: AttendanceSession[];
  events: EventItem[];
  communications: CommunicationMessage[];
  communicationLogs: CommunicationLog[];
  registrationInvitations?: RegistrationInvitationRecord[];
  prayerRequests: PrayerRequest[];
  counselingSessions: CounselingSession[];
  visitations: VisitationRecord[];
  volunteerShifts: VolunteerShift[];
  assets: Asset[];
  documents: DocumentItem[];
  documentCategories: string[];
  courses: LmsCourse[];
  workflows: WorkflowRequest[];
  profileChangeRequests?: ProfileChangeRequest[];
  auditLogs: AuditLog[];
  systemUsers: SystemUser[];
  apiKeys: ApiKeyRecord[];
  webhooks: WebhookSubscription[];
  smsConfig: SmsGatewayConfig;
  devotions: Devotion[];
  devotionReactions: DevotionReaction[];
  devotionComments: DevotionComment[];
  bibleNotes: BibleNote[];
  bibleHighlights: BibleHighlight[];
  bibleBookmarks: BibleBookmark[];
  bibleReadingHistory: BibleReadingHistoryEntry[];
  bibleReadingPlans: BibleReadingPlanProgress[];
  bibleSettings?: Record<string, BibleReaderSettings>;
  bibleTranslationConfig?: any;
  bibleMessages: BibleMessage[];
  bibleMessageRecipients: BibleMessageRecipient[];
  ministryMembers?: MinistryMemberRecord[];
  groupChatSessions?: GroupChatSession[];
  permissionDeniedLogs?: PermissionDeniedLog[];
  conversations?: Conversation[];
  conversationParticipants?: ConversationParticipant[];
  conversationMessages?: ConversationMessage[];
  backupConfig?: BackupScheduleConfig;
  backupLogs?: BackupLogEntry[];
  securityConfig?: SecurityGovernanceConfig;
  ministryAnnualPlans?: MinistryAnnualPlan[];
  securitySessions?: any[];
  consumedRefreshTokens?: {
    tokenHash: string;
    sessionId: string;
    userId: string;
    userEmail: string;
    consumedAt: number;
  }[];
  securityAlerts?: any[];
  userRevocations?: Record<string, number>;
}

export interface SecurityGovernanceConfig {
  jwtLifespanHours: number;
  lockoutMaxAttempts: number;
  lockoutDurationMinutes: number;
  mfaEnforcementMode: 'enforced' | 'optional';
}

export interface BackupScheduleConfig {
  enabled: boolean;
  frequency: 'Daily' | 'Weekly' | 'Monthly';
  time: string; // "HH:MM" e.g. "02:00"
  destination: 'Local Storage';
  lastRunAt?: string;
  nextRunAt?: string;
}

export interface BackupLogEntry {
  id: string;
  filename: string;
  date: string;
  size: string;
  bytes: number;
  type: 'Full System' | 'Incremental' | 'Differential' | 'Pre-Restore Auto Snapshot' | 'Pre-Reset Auto Snapshot' | 'Scheduled';
  destination: 'Local Storage';
  status: 'Completed' | 'Verified' | 'Failed';
  triggeredBy: string;
  checksum?: string;
  error?: string;
}

export interface PermissionDeniedLog {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  userRole: string;
  action: string;
  targetType: 'group' | 'ministry' | 'video_room' | 'conversation';
  targetId: string;
  reason: string;
  ipAddress?: string;
}

const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const BUNDLED_DB_FILE = path.join(process.cwd(), 'cmms_db.json');
const DB_FILE = IS_SERVERLESS ? path.join('/tmp', 'cmms_db.json') : BUNDLED_DB_FILE;
export const AUDIT_CHECKPOINT_FILE = IS_SERVERLESS
  ? path.join('/tmp', '.cmms_audit_checkpoint.json')
  : path.join(process.cwd(), '.cmms_audit_checkpoint.json');

export interface AuditChainCheckpoint {
  headHash: string;
  lastRecordId: string;
  chainedRecordsCount: number;
  legacyUnchainedCount: number;
  totalRecordsCount: number;
  updatedAt: string;
  hmacSignature: string;
}

const DEFAULT_SMS_CONFIG: SmsGatewayConfig = {
  provider: 'EthioTelecom',
  senderId: '',
  enabled: false,
  smsUrl: 'https://api.ethiotelecom.et/sms/v1/send',
  appId: process.env.ETHIO_TELECOM_APP_ID || '',
  appSecret: process.env.ETHIO_TELECOM_APP_SECRET || '',
  balanceCredits: 0,
  monthlyQuota: 0,
  usedCredits: 0,
};

const DEFAULT_API_KEYS: ApiKeyRecord[] = [];

const DEFAULT_WEBHOOKS: WebhookSubscription[] = [];

const DEFAULT_BRANDING: SystemBrandingConfig = {
  churchName: 'Church Management System',
  systemName: 'CMMS Enterprise',
  titleBadge: 'Enterprise',
  churchMotto: '',
  faviconUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="%232563eb"/><path d="M16 4l-9 8v16h18V12l-9-8zm0 5l5 4.5v12.5h-10V13.5l5-4.5z" fill="%23ffffff"/><rect x="14" y="19" width="4" height="7" rx="1" fill="%23ffffff"/></svg>',
  churchLogoUrl: '',
  darkLogoUrl: '',
  primaryColorHex: '#2563eb',
  accentColorHex: '#7c3aed',
  loginPanelColorHex: '#0f172a',
  defaultThemeMode: 'light',
  headquartersAddress: '',
  contactPhone: '',
  contactEmail: '',
  taxIdNumber: '',
};

const DEFAULT_SECURITY_CONFIG: SecurityGovernanceConfig = {
  jwtLifespanHours: 8,
  lockoutMaxAttempts: 5,
  lockoutDurationMinutes: 15,
  mfaEnforcementMode: 'enforced',
};

const DEFAULT_DEVOTIONS: Devotion[] = [];

const DEFAULT_DEVOTION_COMMENTS: DevotionComment[] = [];

const DEFAULT_BIBLE_MESSAGES: BibleMessage[] = [];

const DEFAULT_BIBLE_RECIPIENTS: BibleMessageRecipient[] = [];

class DatabaseStore {
  private data: DatabaseSchema;
  private lastPersistedData: DatabaseSchema;
  private persistenceSimulateFailure = false;
  private persistenceErrors: { timestamp: string; operation: string; error: string }[] = [];

  constructor() {
    this.data = this.loadInitialData();
    this.lastPersistedData = JSON.parse(JSON.stringify(this.data)) as DatabaseSchema;
  }

  public setSimulatePersistenceFailure(fail: boolean): void {
    this.persistenceSimulateFailure = fail;
  }

  public getPersistenceErrors(): { timestamp: string; operation: string; error: string }[] {
    return [...this.persistenceErrors];
  }

  public recordPersistenceError(operation: string, errorMsg: string): void {
    this.persistenceErrors.unshift({
      timestamp: new Date().toISOString(),
      operation,
      error: errorMsg,
    });
    if (this.persistenceErrors.length > 100) {
      this.persistenceErrors.pop();
    }
  }

  private loadInitialData(): DatabaseSchema {
    try {
      const sourceFile = fs.existsSync(DB_FILE)
        ? DB_FILE
        : fs.existsSync(BUNDLED_DB_FILE)
        ? BUNDLED_DB_FILE
        : null;
      if (sourceFile) {
        const raw = fs.readFileSync(sourceFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.members) && Array.isArray(parsed.branches)) {
          if (!parsed.branding) parsed.branding = { ...DEFAULT_BRANDING };
          if (!Array.isArray(parsed.systemUsers)) {
            parsed.systemUsers = [...initialSystemUsers];
          } else {
            for (const initUser of initialSystemUsers) {
              const exists = parsed.systemUsers.some(
                (u: SystemUser) =>
                  u.id === initUser.id ||
                  (u.email && initUser.email && u.email.toLowerCase() === initUser.email.toLowerCase())
              );
              if (!exists) {
                parsed.systemUsers.push({ ...initUser });
              }
            }
          }
          if (!parsed.apiKeys) parsed.apiKeys = [...DEFAULT_API_KEYS];
          if (!parsed.webhooks) parsed.webhooks = [...DEFAULT_WEBHOOKS];
          if (!parsed.smsConfig) parsed.smsConfig = { ...DEFAULT_SMS_CONFIG };
          if (!parsed.securityConfig) parsed.securityConfig = { ...DEFAULT_SECURITY_CONFIG };
          if (!parsed.attendanceSessions) parsed.attendanceSessions = [...initialAttendanceSessions];
          if (!parsed.devotions || parsed.devotions.length === 0) parsed.devotions = [...DEFAULT_DEVOTIONS];
          if (!parsed.devotionReactions) parsed.devotionReactions = [];
          if (!parsed.devotionComments) parsed.devotionComments = [...DEFAULT_DEVOTION_COMMENTS];
          if (!parsed.bibleNotes) parsed.bibleNotes = [];
          if (!parsed.bibleHighlights) parsed.bibleHighlights = [];
          if (!parsed.bibleBookmarks) parsed.bibleBookmarks = [];
          if (!parsed.bibleReadingHistory) parsed.bibleReadingHistory = [];
          if (!parsed.bibleReadingPlans) parsed.bibleReadingPlans = [];
          if (!parsed.bibleMessages || parsed.bibleMessages.length === 0) parsed.bibleMessages = [...DEFAULT_BIBLE_MESSAGES];
          if (!parsed.bibleMessageRecipients || parsed.bibleMessageRecipients.length === 0) parsed.bibleMessageRecipients = [...DEFAULT_BIBLE_RECIPIENTS];
          if (!parsed.ministryMembers) parsed.ministryMembers = [];
          if (!parsed.groupChatSessions) parsed.groupChatSessions = [];
          if (!parsed.permissionDeniedLogs) parsed.permissionDeniedLogs = [];

          if (parsed.ministryMembers.length === 0 && Array.isArray(parsed.ministries)) {
            for (const m of parsed.ministries) {
              if (m.directorMemberId) {
                parsed.ministryMembers.push({
                  id: `mm-${m.id}-dir`,
                  ministryId: m.id,
                  userId: m.directorMemberId,
                  userName: 'Ministry Director',
                  role: 'Leader',
                  status: 'Active',
                  joinedAt: m.establishedDate || new Date().toISOString(),
                });
              }
              if (m.coordinatorMemberId && m.coordinatorMemberId !== m.directorMemberId) {
                parsed.ministryMembers.push({
                  id: `mm-${m.id}-coord`,
                  ministryId: m.id,
                  userId: m.coordinatorMemberId,
                  userName: 'Ministry Coordinator',
                  role: 'CoLeader',
                  status: 'Active',
                  joinedAt: m.establishedDate || new Date().toISOString(),
                });
              }
              if (m.leaderMemberId && m.leaderMemberId !== m.directorMemberId && m.leaderMemberId !== m.coordinatorMemberId) {
                parsed.ministryMembers.push({
                  id: `mm-${m.id}-lead`,
                  ministryId: m.id,
                  userId: m.leaderMemberId,
                  userName: 'Ministry Leader',
                  role: 'Leader',
                  status: 'Active',
                  joinedAt: m.establishedDate || new Date().toISOString(),
                });
              }
            }
          }

          if (!parsed.conversations) parsed.conversations = [];
          if (!parsed.conversationParticipants) parsed.conversationParticipants = [];
          if (!parsed.conversationMessages) parsed.conversationMessages = [];
          if (!Array.isArray(parsed.communicationLogs)) parsed.communicationLogs = [];
          if (!Array.isArray(parsed.registrationInvitations)) parsed.registrationInvitations = [];
          if (!Array.isArray(parsed.profileChangeRequests)) parsed.profileChangeRequests = [...initialProfileChangeRequests];
          if (!Array.isArray(parsed.securitySessions)) parsed.securitySessions = [];
          if (!Array.isArray(parsed.consumedRefreshTokens)) parsed.consumedRefreshTokens = [];
          if (!Array.isArray(parsed.securityAlerts)) parsed.securityAlerts = [];
          if (!parsed.userRevocations || typeof parsed.userRevocations !== 'object') parsed.userRevocations = {};

          // Startup is strictly read-only on historical audit records: NEVER rewrite existing audit hashes.
          return parsed;
        }
      }
    } catch (err) {
      console.warn('[DB] Failed to load disk database snapshot, fallback to memory seed:', err);
    }

    const defaultState: DatabaseSchema = {
      branding: { ...DEFAULT_BRANDING },
      branches: [...initialBranches],
      members: [...initialMembers],
      families: [...initialFamilies],
      ministries: [...initialMinistries],
      attendanceRecords: [...initialAttendanceRecords],
      attendanceSessions: [...initialAttendanceSessions],
      events: [...initialEvents],
      communications: [...initialCommunications],
      communicationLogs: [],
      prayerRequests: [...initialPrayerRequests],
      counselingSessions: [...initialCounselingSessions],
      visitations: [...initialVisitations],
      volunteerShifts: [...initialVolunteerShifts],
      assets: [...initialAssets],
      documents: [...initialDocuments],
      documentCategories: ['Official Policies', 'Financial Audits', 'Liturgical & Worship', 'Legal & Governance', 'Sermon Outlines', 'Certificates'],
      courses: [...initialCourses],
      workflows: [...initialWorkflows],
      profileChangeRequests: [...initialProfileChangeRequests],
      auditLogs: [...initialAuditLogs],
      systemUsers: [...initialSystemUsers],
      apiKeys: [...DEFAULT_API_KEYS],
      webhooks: [...DEFAULT_WEBHOOKS],
      smsConfig: { ...DEFAULT_SMS_CONFIG },
      devotions: [...DEFAULT_DEVOTIONS],
      devotionReactions: [],
      devotionComments: [...DEFAULT_DEVOTION_COMMENTS],
      bibleNotes: [],
      bibleHighlights: [],
      bibleBookmarks: [],
      bibleReadingHistory: [],
      bibleReadingPlans: [],
      bibleSettings: {},
      bibleMessages: [...DEFAULT_BIBLE_MESSAGES],
      bibleMessageRecipients: [...DEFAULT_BIBLE_RECIPIENTS],
      ministryMembers: [],
      groupChatSessions: [],
      permissionDeniedLogs: [],
      conversations: [],
      conversationParticipants: [],
      conversationMessages: [],
      securitySessions: [],
      consumedRefreshTokens: [],
      securityAlerts: [],
      userRevocations: {},
    };

    this.persist(defaultState);
    return defaultState;
  }

  /**
   * Computes canonical SHA-256 tamper-evident hash for an audit record.
   */
  public computeAuditEntryHash(prevHash: string, entry: Partial<AuditLog>): string {
    const canonical = [
      prevHash,
      entry.id || '',
      entry.timestamp || '',
      entry.eventType || entry.action || '',
      entry.actorId || entry.userEmail || '',
      entry.outcome || 'SUCCESS',
      entry.severity || 'LOW',
      entry.module || '',
      entry.details || '',
      entry.ipAddress || '',
    ].join('|');
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Read-only inspection of the current chain head from existing audit records without mutating any record.
   */
  public getReadOnlyChainHead(logs?: AuditLog[]): {
    headHash: string;
    lastRecordId: string;
    chainedCount: number;
    legacyUnchainedCount: number;
    totalCount: number;
  } {
    const list = Array.isArray(logs) ? logs : this.data?.auditLogs || [];
    let headHash = 'GENESIS_CMMS_AUDIT_CHAIN_0000000000000000';
    let lastRecordId = 'GENESIS';
    let chainedCount = 0;
    let legacyUnchainedCount = 0;

    // Inspect oldest -> newest without mutating any record
    for (let i = list.length - 1; i >= 0; i--) {
      const entry = list[i];
      if (entry.integrityHash && entry.prevHash) {
        chainedCount++;
        headHash = entry.integrityHash;
        lastRecordId = entry.id;
      } else {
        legacyUnchainedCount++;
      }
    }

    return {
      headHash,
      lastRecordId,
      chainedCount,
      legacyUnchainedCount,
      totalCount: list.length,
    };
  }

  private computeCheckpointHmac(cp: Omit<AuditChainCheckpoint, 'hmacSignature'>): string {
    const secret = process.env.JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'cmms-checkpoint-anchor-secret-key';
    const payload = `${cp.headHash}|${cp.lastRecordId}|${cp.chainedRecordsCount}|${cp.legacyUnchainedCount}|${cp.totalRecordsCount}`;
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Writes an independent HMAC-signed checkpoint anchor file (.cmms_audit_checkpoint.json)
   * so that truncation, deletion of the latest audit record, or unauthorized hash rewriting is detected.
   */
  public writeAuditCheckpoint(logs?: AuditLog[]): AuditChainCheckpoint {
    const stats = this.getReadOnlyChainHead(logs);
    const partial = {
      headHash: stats.headHash,
      lastRecordId: stats.lastRecordId,
      chainedRecordsCount: stats.chainedCount,
      legacyUnchainedCount: stats.legacyUnchainedCount,
      totalRecordsCount: stats.totalCount,
      updatedAt: new Date().toISOString(),
    };
    const checkpoint: AuditChainCheckpoint = {
      ...partial,
      hmacSignature: this.computeCheckpointHmac(partial),
    };
    const tmpFile = `${AUDIT_CHECKPOINT_FILE}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(checkpoint, null, 2), 'utf-8');
    fs.renameSync(tmpFile, AUDIT_CHECKPOINT_FILE);
    return checkpoint;
  }

  /**
   * Reads and verifies the independent trusted chain head checkpoint.
   */
  public readAuditCheckpoint(): {
    exists: boolean;
    validHmac: boolean;
    checkpoint?: AuditChainCheckpoint;
    error?: string;
  } {
    try {
      if (!fs.existsSync(AUDIT_CHECKPOINT_FILE)) {
        return { exists: false, validHmac: true };
      }
      const raw = fs.readFileSync(AUDIT_CHECKPOINT_FILE, 'utf-8');
      const parsed: AuditChainCheckpoint = JSON.parse(raw);
      const expectedHmac = this.computeCheckpointHmac(parsed);
      if (parsed.hmacSignature !== expectedHmac) {
        return {
          exists: true,
          validHmac: false,
          checkpoint: parsed,
          error: 'Checkpoint HMAC signature mismatch — independent checkpoint file was tampered with.',
        };
      }
      return { exists: true, validHmac: true, checkpoint: parsed };
    } catch (err: any) {
      return {
        exists: true,
        validHmac: false,
        error: `Failed to read audit checkpoint: ${err.message}`,
      };
    }
  }

  public persist(customState?: DatabaseSchema, _options?: { throwOnError?: boolean }) {
    if (this.persistenceSimulateFailure) {
      const msg = 'Simulated durable database write failure (database access disabled).';
      this.recordPersistenceError('db.persist', msg);
      this.data = JSON.parse(JSON.stringify(this.lastPersistedData)) as DatabaseSchema;
      throw new Error(msg);
    }

    try {
      const stateToSave = customState || this.data;
      const tmpPath = `${DB_FILE}.${process.pid}.${Date.now()}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(stateToSave, null, 2), 'utf-8');
      fs.renameSync(tmpPath, DB_FILE);
      this.lastPersistedData = JSON.parse(JSON.stringify(stateToSave)) as DatabaseSchema;
      if (customState) {
        this.data = JSON.parse(JSON.stringify(stateToSave)) as DatabaseSchema;
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.error('[DB] Persistence write failed:', msg);
      this.recordPersistenceError('db.persist', msg);
      this.data = JSON.parse(JSON.stringify(this.lastPersistedData)) as DatabaseSchema;
      throw new Error(`Authoritative database persistence failed: ${msg}`);
    }
  }

  public getState(): DatabaseSchema {
    return this.data;
  }

  public getBranding(): SystemBrandingConfig {
    return this.data.branding || DEFAULT_BRANDING;
  }

  public updateBranding(partial: Partial<SystemBrandingConfig>): SystemBrandingConfig {
    this.data.branding = { ...this.getBranding(), ...partial };
    this.persist();
    this.addAuditLog('Update System Branding', 'Settings & Super Admin', `Updated system name/favicon configuration`);
    return this.data.branding;
  }

  public getSecurityConfig(): SecurityGovernanceConfig {
    if (!this.data.securityConfig) {
      this.data.securityConfig = { ...DEFAULT_SECURITY_CONFIG };
    }
    return this.data.securityConfig;
  }

  public updateSecurityConfig(partial: Partial<SecurityGovernanceConfig>): SecurityGovernanceConfig {
    this.data.securityConfig = { ...this.getSecurityConfig(), ...partial };
    this.persist();
    this.addAuditLog('Update Security Governance Policy', 'Security Settings', `Updated security policy: JWT ${this.data.securityConfig.jwtLifespanHours}h, Lockout ${this.data.securityConfig.lockoutMaxAttempts} attempts (${this.data.securityConfig.lockoutDurationMinutes} min), MFA: ${this.data.securityConfig.mfaEnforcementMode}`);
    return this.data.securityConfig;
  }

  public restoreState(newState: DatabaseSchema): boolean {
    if (!newState || !Array.isArray(newState.members)) {
      return false;
    }
    this.data = newState;
    if (!this.data.branding) this.data.branding = { ...DEFAULT_BRANDING };
    if (!this.data.apiKeys) this.data.apiKeys = [...DEFAULT_API_KEYS];
    if (!this.data.webhooks) this.data.webhooks = [...DEFAULT_WEBHOOKS];
    if (!this.data.smsConfig) this.data.smsConfig = { ...DEFAULT_SMS_CONFIG };
    if (!this.data.devotions) this.data.devotions = [...DEFAULT_DEVOTIONS];
    if (!this.data.devotionReactions) this.data.devotionReactions = [];
    if (!this.data.devotionComments) this.data.devotionComments = [...DEFAULT_DEVOTION_COMMENTS];
    if (!this.data.bibleNotes) this.data.bibleNotes = [];
    if (!this.data.bibleHighlights) this.data.bibleHighlights = [];
    if (!this.data.bibleBookmarks) this.data.bibleBookmarks = [];
    if (!this.data.bibleReadingHistory) this.data.bibleReadingHistory = [];
    if (!this.data.bibleReadingPlans) this.data.bibleReadingPlans = [];
    if (!this.data.bibleMessages) this.data.bibleMessages = [...DEFAULT_BIBLE_MESSAGES];
    if (!this.data.bibleMessageRecipients) this.data.bibleMessageRecipients = [...DEFAULT_BIBLE_RECIPIENTS];
    if (!this.data.ministryMembers) this.data.ministryMembers = [];
    if (!this.data.groupChatSessions) this.data.groupChatSessions = [];
    if (!this.data.permissionDeniedLogs) this.data.permissionDeniedLogs = [];
    if (!this.data.conversations) this.data.conversations = [];
    if (!this.data.conversationParticipants) this.data.conversationParticipants = [];
    if (!this.data.conversationMessages) this.data.conversationMessages = [];
    if (!Array.isArray(this.data.communicationLogs)) this.data.communicationLogs = [];
    if (!Array.isArray(this.data.profileChangeRequests)) this.data.profileChangeRequests = [...initialProfileChangeRequests];
    if (!Array.isArray(this.data.securitySessions)) this.data.securitySessions = [];
    if (!Array.isArray(this.data.consumedRefreshTokens)) this.data.consumedRefreshTokens = [];
    if (!Array.isArray(this.data.securityAlerts)) this.data.securityAlerts = [];
    if (!this.data.userRevocations || typeof this.data.userRevocations !== 'object') this.data.userRevocations = {};
    // Strictly preserve existing audit records as-is without rewriting historical hashes
    this.persist();
    this.writeAuditCheckpoint(this.data.auditLogs);
    return true;
  }

  public resetToDefaults(): DatabaseSchema {
    // Preserve append-only audit logs and security telemetry across factory resets
    const preservedAuditLogs = Array.isArray(this.data.auditLogs) && this.data.auditLogs.length > 0
      ? [...this.data.auditLogs]
      : [...initialAuditLogs];
    this.data = {
      branding: { ...DEFAULT_BRANDING },
      branches: [...initialBranches],
      members: [...initialMembers],
      families: [...initialFamilies],
      ministries: [...initialMinistries],
      attendanceRecords: [...initialAttendanceRecords],
      attendanceSessions: [...initialAttendanceSessions],
      events: [...initialEvents],
      communications: [...initialCommunications],
      communicationLogs: [],
      prayerRequests: [...initialPrayerRequests],
      counselingSessions: [...initialCounselingSessions],
      visitations: [...initialVisitations],
      volunteerShifts: [...initialVolunteerShifts],
      assets: [...initialAssets],
      documents: [...initialDocuments],
      documentCategories: ['Official Policies', 'Financial Audits', 'Liturgical & Worship', 'Legal & Governance', 'Sermon Outlines', 'Certificates'],
      courses: [...initialCourses],
      workflows: [...initialWorkflows],
      profileChangeRequests: [...initialProfileChangeRequests],
      auditLogs: preservedAuditLogs,
      systemUsers: [...initialSystemUsers],
      apiKeys: [...DEFAULT_API_KEYS],
      webhooks: [...DEFAULT_WEBHOOKS],
      smsConfig: { ...DEFAULT_SMS_CONFIG },
      devotions: [...DEFAULT_DEVOTIONS],
      devotionReactions: [],
      devotionComments: [...DEFAULT_DEVOTION_COMMENTS],
      bibleNotes: [],
      bibleHighlights: [],
      bibleBookmarks: [],
      bibleReadingHistory: [],
      bibleReadingPlans: [],
      bibleSettings: {},
      bibleMessages: [...DEFAULT_BIBLE_MESSAGES],
      bibleMessageRecipients: [...DEFAULT_BIBLE_RECIPIENTS],
      ministryMembers: [],
      groupChatSessions: [],
      permissionDeniedLogs: [],
      conversations: [],
      conversationParticipants: [],
      conversationMessages: [],
      securitySessions: this.data.securitySessions || [],
      consumedRefreshTokens: this.data.consumedRefreshTokens || [],
      securityAlerts: this.data.securityAlerts || [],
      userRevocations: this.data.userRevocations || {},
      backupConfig: this.data.backupConfig || {
        enabled: true,
        frequency: 'Daily',
        time: '02:00',
        destination: 'Local Storage',
      },
      backupLogs: this.data.backupLogs || [],
    };
    this.persist();
    this.writeAuditCheckpoint(this.data.auditLogs);
    return this.data;
  }

  public reloadFromDisk(): DatabaseSchema {
    this.data = this.loadInitialData();
    this.lastPersistedData = JSON.parse(JSON.stringify(this.data)) as DatabaseSchema;
    return this.data;
  }

  public getBackupConfig(): BackupScheduleConfig {
    if (!this.data.backupConfig) {
      this.data.backupConfig = {
        enabled: true,
        frequency: 'Daily',
        time: '02:00',
        destination: 'Local Storage',
      };
    }
    return this.data.backupConfig;
  }

  public updateBackupConfig(cfg: Partial<BackupScheduleConfig>): BackupScheduleConfig {
    this.data.backupConfig = { ...this.getBackupConfig(), ...cfg };
    this.persist();
    return this.data.backupConfig;
  }

  public getBackupLogs(): BackupLogEntry[] {
    if (!Array.isArray(this.data.backupLogs)) {
      this.data.backupLogs = [];
    }
    return this.data.backupLogs;
  }

  public addBackupLog(entry: Omit<BackupLogEntry, 'id'>): BackupLogEntry {
    if (!Array.isArray(this.data.backupLogs)) {
      this.data.backupLogs = [];
    }
    const log: BackupLogEntry = {
      id: `bak-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...entry,
    };
    this.data.backupLogs.unshift(log);
    // Keep last 200 logs
    if (this.data.backupLogs.length > 200) {
      this.data.backupLogs = this.data.backupLogs.slice(0, 200);
    }
    this.persist();
    return log;
  }

  public logPermissionDenied(entry: Omit<PermissionDeniedLog, 'id' | 'timestamp'>): PermissionDeniedLog {
    const newLog: PermissionDeniedLog = {
      id: `pdenied-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    if (!this.data.permissionDeniedLogs) {
      this.data.permissionDeniedLogs = [];
    }
    this.data.permissionDeniedLogs.unshift(newLog);
    if (this.data.permissionDeniedLogs.length > 1000) {
      this.data.permissionDeniedLogs = this.data.permissionDeniedLogs.slice(0, 1000);
    }
    this.addAuditLog(
      'Unauthorized Access Attempt Blocked',
      'Group & Ministry Security',
      `Blocked ${entry.userEmail} (${entry.userRole}) from action "${entry.action}" on ${entry.targetType} "${entry.targetId}". Reason: ${entry.reason}`,
      entry.userEmail,
      entry.ipAddress || '127.0.0.1'
    );
    this.persist();
    return newLog;
  }

  public save(customState?: DatabaseSchema) {
    this.persist(customState);
  }

  public addAuditLog(
    logOrAction: string | Partial<AuditLog>,
    moduleName: string = 'System',
    details: string = '',
    user: string = 'Super Administrator',
    ip: string = '127.0.0.1'
  ): AuditLog {
    // Determine the current chain head strictly read-only without mutating any legacy record
    const chainInfo = this.getReadOnlyChainHead(this.data.auditLogs);
    const headHash = chainInfo.headHash;

    let newLog: AuditLog;
    if (typeof logOrAction === 'object' && logOrAction !== null) {
      const id = logOrAction.id || `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const timestamp = logOrAction.timestamp || new Date().toISOString();
      const userEmail = logOrAction.userEmail || 'admin@gracecathedral.org';
      const actorId = logOrAction.actorId || userEmail;
      const outcome = logOrAction.outcome || 'SUCCESS';
      const severity = logOrAction.severity || 'LOW';
      const action = logOrAction.action || 'System Action';
      const module = logOrAction.module || moduleName || 'General';
      const cleanDetails = logOrAction.details || details || '';
      const ipAddress = logOrAction.ipAddress || ip || '127.0.0.1';
      const prevHash = headHash;
      const partialForHash: Partial<AuditLog> = {
        id,
        timestamp,
        eventType: logOrAction.eventType,
        action,
        actorId,
        userEmail,
        outcome,
        severity,
        module,
        details: cleanDetails,
        ipAddress,
      };
      const integrityHash = this.computeAuditEntryHash(prevHash, partialForHash);

      newLog = {
        id,
        timestamp,
        userEmail,
        userName: logOrAction.userName || 'Super Administrator',
        user: logOrAction.user || logOrAction.userName || userEmail || 'Super Administrator',
        userRole: logOrAction.userRole || 'SYSTEM_ADMIN',
        actorId,
        eventType: logOrAction.eventType,
        outcome,
        severity,
        correlationId: logOrAction.correlationId,
        action,
        module,
        targetUserId: logOrAction.targetUserId,
        targetUserEmail: logOrAction.targetUserEmail,
        details: cleanDetails,
        ipAddress,
        userAgent: logOrAction.userAgent,
        deviceFingerprint: logOrAction.deviceFingerprint,
        sessionId: logOrAction.sessionId,
        location: logOrAction.location,
        commitData: logOrAction.commitData,
        device: logOrAction.device || 'Direct Server Operation',
        prevHash,
        integrityHash,
        schemaVersion: logOrAction.schemaVersion || '2.0',
      };
    } else {
      const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const timestamp = new Date().toISOString();
      const userEmail = user.includes('@') ? user : 'admin@gracecathedral.org';
      const actorId = userEmail;
      const action = typeof logOrAction === 'string' ? logOrAction : 'System Action';
      const prevHash = headHash;
      const partialForHash: Partial<AuditLog> = {
        id,
        timestamp,
        action,
        actorId,
        userEmail,
        outcome: 'SUCCESS',
        severity: 'LOW',
        module: moduleName,
        details,
        ipAddress: ip,
      };
      const integrityHash = this.computeAuditEntryHash(prevHash, partialForHash);

      newLog = {
        id,
        timestamp,
        userEmail,
        userName: user,
        user,
        userRole: 'SYSTEM_ADMIN',
        actorId,
        outcome: 'SUCCESS',
        severity: 'LOW',
        action,
        module: moduleName,
        details,
        ipAddress: ip,
        device: 'Direct Server Operation',
        prevHash,
        integrityHash,
        schemaVersion: '2.0',
      };
    }
    // Append-only: never silently slice or delete historical audit records
    this.data.auditLogs.unshift(newLog);
    try {
      this.persist(undefined, { throwOnError: true });
      this.writeAuditCheckpoint(this.data.auditLogs);
    } catch (err) {
      // persist() restores the complete last-durable snapshot on failure.
      // Do not shift here: that would remove a pre-existing audit record.
      throw err;
    }
    return newLog;
  }

  /**
   * Generates production-ready PostgreSQL relational DDL for Supabase, Neon, AWS RDS, or Azure Postgres
   */
  public generatePostgresDDL(): string {
    const schemaPath = path.join(process.cwd(), 'supabase', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      return fs.readFileSync(schemaPath, 'utf-8');
    }
    return `-- ============================================================================
-- CHURCH MEMBER MANAGEMENT SYSTEM (CMMS) - PRODUCTION POSTGRESQL SCHEMA
-- Compatible with Supabase, Neon, AWS RDS PostgreSQL, and Azure Database for PostgreSQL
-- Generated: ${new Date().toISOString()}
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. BRANCHES / CHAPELS TABLE
CREATE TABLE IF NOT EXISTS branches (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'br-' || gen_random_uuid(),
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(64) NOT NULL DEFAULT 'Satellite Campus',
    parent_branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE SET NULL,
    senior_pastor VARCHAR(255),
    phone VARCHAR(64),
    email VARCHAR(128),
    website VARCHAR(255),
    address TEXT,
    city VARCHAR(128),
    region VARCHAR(128),
    gps_coordinates VARCHAR(128),
    service_times JSONB DEFAULT '[]'::jsonb,
    languages TEXT[] DEFAULT ARRAY['English'],
    timezone VARCHAR(64) DEFAULT 'UTC+3',
    established_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(32) NOT NULL DEFAULT 'Active',
    total_members_count INTEGER DEFAULT 0,
    monthly_target_budget NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. FAMILIES / HOUSEHOLDS TABLE
CREATE TABLE IF NOT EXISTS families (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'fam-' || gen_random_uuid(),
    family_code VARCHAR(64) NOT NULL UNIQUE,
    household_name VARCHAR(255) NOT NULL,
    head_of_household_id VARCHAR(64),
    primary_household_phone VARCHAR(64),
    family_type VARCHAR(64) DEFAULT 'Nuclear Family',
    family_photo_url TEXT,
    primary_language VARCHAR(64) DEFAULT 'English',
    address TEXT,
    woreda VARCHAR(64),
    kebele VARCHAR(64),
    house_number VARCHAR(64),
    city VARCHAR(128),
    region VARCHAR(128),
    registration_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(32) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. MEMBERS TABLE
CREATE TABLE IF NOT EXISTS members (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'mem-' || gen_random_uuid(),
    member_id_number VARCHAR(64) NOT NULL UNIQUE,
    title VARCHAR(32) DEFAULT 'Brother',
    first_name VARCHAR(128) NOT NULL,
    middle_name VARCHAR(128),
    last_name VARCHAR(128) NOT NULL,
    preferred_name VARCHAR(128),
    date_of_birth DATE,
    age INTEGER,
    gender VARCHAR(16) NOT NULL CHECK (gender IN ('Male', 'Female')),
    nationality VARCHAR(64) DEFAULT 'Ethiopian',
    national_id_number VARCHAR(64),
    passport_number VARCHAR(64),
    photo_url TEXT,
    marital_status VARCHAR(32) DEFAULT 'Single',
    marriage_date DATE,
    spouse_name VARCHAR(255),
    spouse_phone VARCHAR(64),
    spouse_member_id VARCHAR(64) REFERENCES members(id) ON DELETE SET NULL,
    primary_phone VARCHAR(64) NOT NULL,
    alt_phone VARCHAR(64),
    email VARCHAR(128),
    preferred_comm_channel VARCHAR(32) DEFAULT 'SMS',
    street_address TEXT,
    city VARCHAR(128),
    sub_city VARCHAR(128),
    woreda VARCHAR(64),
    kebele VARCHAR(64),
    house_number VARCHAR(64),
    region VARCHAR(128),
    postal_code VARCHAR(32),
    gps_coordinates VARCHAR(128),
    family_id VARCHAR(64) REFERENCES families(id) ON DELETE SET NULL,
    family_role VARCHAR(32) DEFAULT 'Head',
    male_children_count INTEGER DEFAULT 0,
    female_children_count INTEGER DEFAULT 0,
    adopted_children_count INTEGER DEFAULT 0,
    salvation_date DATE,
    is_water_baptized BOOLEAN DEFAULT false,
    water_baptism_date DATE,
    water_baptism_location VARCHAR(255),
    baptized_by VARCHAR(255),
    is_holy_spirit_baptized BOOLEAN DEFAULT false,
    spiritual_gifts TEXT[] DEFAULT '{}',
    membership_date DATE DEFAULT CURRENT_DATE,
    membership_status VARCHAR(32) NOT NULL DEFAULT 'Active' CHECK (membership_status IN ('Active', 'Inactive', 'Transferred', 'Deceased', 'On Leave', 'Left Church', 'Excommunicated')),
    membership_type VARCHAR(32) DEFAULT 'Full Member',
    branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    discipleship_status VARCHAR(64) DEFAULT 'Discipled',
    ministry_ids TEXT[] DEFAULT '{}',
    ministries_joined_now TEXT[] DEFAULT '{}',
    ministries_served_before TEXT[] DEFAULT '{}',
    education_level VARCHAR(64),
    occupation VARCHAR(128),
    employer_name VARCHAR(255),
    skills_and_talents TEXT[] DEFAULT '{}',
    languages_spoken TEXT[] DEFAULT '{}',
    departure_reason VARCHAR(64),
    departure_date DATE,
    departure_notes TEXT,
    excommunication_description TEXT,
    blood_type VARCHAR(8),
    known_allergies TEXT[] DEFAULT '{}',
    attendance_score INTEGER DEFAULT 85 CHECK (attendance_score BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. MINISTRIES & DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS ministries (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'min-' || gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64),
    description TEXT,
    branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    director_member_id VARCHAR(64) REFERENCES members(id) ON DELETE SET NULL,
    coordinator_member_id VARCHAR(64) REFERENCES members(id) ON DELETE SET NULL,
    parent_ministry_id VARCHAR(64) REFERENCES ministries(id) ON DELETE SET NULL,
    established_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(32) NOT NULL DEFAULT 'Active',
    member_count INTEGER DEFAULT 0,
    annual_budget NUMERIC(15, 2) DEFAULT 0.00,
    spent_budget NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS attendance_records (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'att-' || gen_random_uuid(),
    service_name VARCHAR(255) NOT NULL,
    service_type VARCHAR(64) NOT NULL,
    branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time VARCHAR(16) NOT NULL,
    member_id VARCHAR(64) NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    check_in_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    check_in_method VARCHAR(32) DEFAULT 'QR Code',
    status VARCHAR(32) NOT NULL DEFAULT 'Present',
    absence_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. FINANCIAL TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS financial_transactions (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'txn-' || gen_random_uuid(),
    receipt_number VARCHAR(64) NOT NULL UNIQUE,
    member_id VARCHAR(64) REFERENCES members(id) ON DELETE SET NULL,
    member_name VARCHAR(255) NOT NULL,
    branch_id VARCHAR(64) NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    contribution_type VARCHAR(64) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(8) NOT NULL DEFAULT 'ETB',
    payment_method VARCHAR(64) NOT NULL,
    payment_reference VARCHAR(128),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    tax_deductible BOOLEAN DEFAULT true,
    status VARCHAR(32) NOT NULL DEFAULT 'Completed',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. USERS & RBAC ROLES TABLE
CREATE TABLE IF NOT EXISTS system_users (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'usr-' || gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(64) NOT NULL DEFAULT 'Branch Administrator',
    branch_name VARCHAR(255) DEFAULT 'Headquarters',
    branch_id VARCHAR(64) REFERENCES branches(id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'Active',
    must_change_password BOOLEAN DEFAULT false,
    is_mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret VARCHAR(128),
    failed_attempts INTEGER DEFAULT 0,
    is_locked BOOLEAN DEFAULT false,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'audit-' || gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    user_email VARCHAR(255) NOT NULL,
    user_role VARCHAR(64) NOT NULL,
    action VARCHAR(128) NOT NULL,
    module VARCHAR(64) NOT NULL,
    details TEXT,
    ip_address VARCHAR(64),
    device TEXT,
    commit_data JSONB
);

-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_members_branch ON members(branch_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(membership_status);
CREATE INDEX IF NOT EXISTS idx_members_family ON members(family_id);
CREATE INDEX IF NOT EXISTS idx_transactions_branch ON financial_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON financial_transactions(date);
CREATE INDEX IF NOT EXISTS idx_attendance_date_member ON attendance_records(date, member_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
`;
  }
}

export const db = new DatabaseStore();
