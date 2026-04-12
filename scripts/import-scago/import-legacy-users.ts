import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const INSTITUTION_ID = 'ba52611f-9ad5-44b7-824e-97725a177336';
const SKIP_GROUPS = new Set(['Frozen User Group']);

// ─── CSV parser (handles quoted fields) ────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

// ─── SQL escaping ──────────────────────────────────────────────────────────────

function sqlStr(s: string): string {
  if (s.includes("'") || s.includes('\\')) {
    const tag = 'SQLDQ';
    if (!s.includes(`$${tag}$`)) {
      return `$${tag}$${s}$${tag}$`;
    }
    return `'${s.replace(/'/g, "''")}'`;
  }
  return `'${s}'`;
}

function sqlStrOrNull(s: string): string {
  return s ? sqlStr(s) : 'NULL';
}

// ─── Legacy user import ────────────────────────────────────────────────────────

export interface LegacyUserRow {
  email: string;
  username: string;
  firstname: string;
  lastname: string;
  usergroups: string;
  roles: string;
  dateregistered: string;
  occupation: string;
  location: string;
  credentials: string;
  organization: string;
  department: string;
  organizationaddress: string;
  country: string;
}

export function parseUsersCSV(csvPath: string): LegacyUserRow[] {
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split('\n').filter(l => l.trim() !== '');

  // Skip header
  const dataLines = lines.slice(1);
  const users: LegacyUserRow[] = [];

  for (const line of dataLines) {
    const fields = parseCSVLine(line);
    if (fields.length < 2) continue;

    const email = fields[0]?.trim();
    if (!email) continue;

    users.push({
      email,
      username: fields[1]?.trim() || '',
      firstname: fields[2]?.trim() || '',
      lastname: fields[3]?.trim() || '',
      usergroups: fields[4]?.trim() || '',
      roles: fields[5]?.trim() || '',
      dateregistered: fields[6]?.trim() || '',
      occupation: fields[9]?.trim() || '',
      location: fields[10]?.trim() || '',
      credentials: fields[11]?.trim() || '',
      organization: fields[12]?.trim() || '',
      department: fields[13]?.trim() || '',
      organizationaddress: fields[14]?.trim() || '',
      country: fields[15]?.trim() || '',
    });
  }

  return users;
}

export function generateLegacyUserSQL(csvPath: string): string {
  const users = parseUsersCSV(csvPath);
  const lines: string[] = [];

  lines.push('-- ============================================================');
  lines.push('-- SCAGO LMS — Legacy User Import');
  lines.push(`-- Source: ${path.basename(csvPath)}`);
  lines.push(`-- Users: ${users.length}`);
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push('-- ============================================================');
  lines.push('');
  lines.push('BEGIN;');
  lines.push('');

  // Collect unique groups (excluding system groups)
  const groupNames = new Set<string>();
  for (const user of users) {
    if (user.usergroups) {
      const groups = user.usergroups.split(';').map(g => g.trim()).filter(g => g && !SKIP_GROUPS.has(g));
      groups.forEach(g => groupNames.add(g));
    }
  }

  // Create user_groups
  const groupIdMap = new Map<string, string>();
  if (groupNames.size > 0) {
    lines.push('-- ── User Groups ──────────────────────────────────────────────');
    lines.push('');
    for (const name of groupNames) {
      const groupId = crypto.randomUUID();
      groupIdMap.set(name, groupId);

      lines.push(`INSERT INTO user_groups (id, institution_id, name, description)`);
      lines.push(`VALUES (`);
      lines.push(`  '${groupId}',`);
      lines.push(`  '${INSTITUTION_ID}',`);
      lines.push(`  ${sqlStr(name)},`);
      lines.push(`  ${sqlStr(`Imported from SCAGO EdApp: ${name}`)}`);
      lines.push(`) ON CONFLICT (institution_id, name) DO NOTHING;`);
      lines.push('');
    }
  }

  // Insert legacy_users
  lines.push('-- ── Legacy Users ─────────────────────────────────────────────');
  lines.push('');

  for (const user of users) {
    const legacyId = crypto.randomUUID();
    const fullName = [user.firstname, user.lastname].filter(Boolean).join(' ') || user.username || user.email;

    lines.push(`INSERT INTO legacy_users (id, institution_id, email, full_name, occupation, affiliation, country)`);
    lines.push(`VALUES (`);
    lines.push(`  '${legacyId}',`);
    lines.push(`  '${INSTITUTION_ID}',`);
    lines.push(`  ${sqlStr(user.email.toLowerCase())},`);
    lines.push(`  ${sqlStr(fullName)},`);
    lines.push(`  ${sqlStrOrNull(user.occupation || user.credentials)},`);
    lines.push(`  ${sqlStrOrNull(user.organization)},`);
    lines.push(`  ${sqlStrOrNull(user.country || user.location)}`);
    lines.push(`) ON CONFLICT (institution_id, email) DO NOTHING;`);
    lines.push('');
  }

  // Create user_group_members for legacy users
  const usersWithGroups = users.filter(u => u.usergroups);
  if (usersWithGroups.length > 0) {
    lines.push('-- ── Legacy User Group Memberships ────────────────────────────');
    lines.push('');
    lines.push('-- Note: These use legacy_user_id + subquery to resolve group IDs');
    lines.push('-- Run after legacy_users are inserted');
    lines.push('');

    for (const user of usersWithGroups) {
      const groups = user.usergroups.split(';').map(g => g.trim()).filter(g => g && !SKIP_GROUPS.has(g));
      for (const groupName of groups) {
        lines.push(`INSERT INTO user_group_members (id, group_id, legacy_user_id)`);
        lines.push(`SELECT`);
        lines.push(`  gen_random_uuid(),`);
        lines.push(`  ug.id,`);
        lines.push(`  lu.id`);
        lines.push(`FROM user_groups ug`);
        lines.push(`CROSS JOIN legacy_users lu`);
        lines.push(`WHERE ug.institution_id = '${INSTITUTION_ID}'`);
        lines.push(`  AND ug.name = ${sqlStr(groupName)}`);
        lines.push(`  AND lu.institution_id = '${INSTITUTION_ID}'`);
        lines.push(`  AND lu.email = ${sqlStr(user.email.toLowerCase())}`);
        lines.push(`ON CONFLICT DO NOTHING;`);
        lines.push('');
      }
    }
  }

  lines.push('COMMIT;');
  lines.push('');
  lines.push(`-- Summary: ${users.length} legacy users, ${groupNames.size} user groups`);
  lines.push('');

  return lines.join('\n');
}
