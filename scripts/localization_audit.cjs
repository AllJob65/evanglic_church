const fs = require('fs');
const path = require('path');

const en = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/i18n/locales/en.json'), 'utf8'));
const am = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/i18n/locales/am.json'), 'utf8'));
const ti = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/i18n/locales/ti.json'), 'utf8'));
const om = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/i18n/locales/om.json'), 'utf8'));

console.log('=== CMMS LOCALIZATION AUDIT REPORT ===\n');

const enKeys = Object.keys(en);
console.log(`[Master Dictionary - en.json]: ${enKeys.length} total entries.`);

const locales = [
  { name: 'Amharic (am)', dict: am, code: 'am' },
  { name: 'Tigrigna (ti)', dict: ti, code: 'ti' },
  { name: 'Afaan Oromoo (om)', dict: om, code: 'om' },
];

let totalIssues = 0;

locales.forEach(({ name, dict, code }) => {
  console.log(`\n--- Auditing ${name} ---`);
  
  // 1. Missing keys
  const missingKeys = enKeys.filter((k) => dict[k] === undefined);
  if (missingKeys.length > 0) {
    console.error(`❌ [${code}] Missing keys count: ${missingKeys.length}`);
    console.error(`Sample missing:`, missingKeys.slice(0, 10));
    totalIssues += missingKeys.length;
  } else {
    console.log(`✅ [${code}] 0 missing keys. 100% dictionary coverage!`);
  }

  // 2. Empty values
  const emptyKeys = Object.entries(dict).filter(([k, v]) => typeof v !== 'string' || v.trim() === '');
  if (emptyKeys.length > 0) {
    console.error(`❌ [${code}] Empty translation values: ${emptyKeys.length}`);
    totalIssues += emptyKeys.length;
  } else {
    console.log(`✅ [${code}] 0 empty translation values.`);
  }

  // 3. Interpolation parameters validation
  let interpolationMismatches = 0;
  enKeys.forEach((k) => {
    const enVal = en[k];
    const locVal = dict[k];
    if (typeof enVal === 'string' && typeof locVal === 'string') {
      const enParams = (enVal.match(/{{\s*[\w.-]+\s*}}|{[\w.-]+}/g) || []).sort();
      const locParams = (locVal.match(/{{\s*[\w.-]+\s*}}|{[\w.-]+}/g) || []).sort();
      if (enParams.length > 0 && enParams.join(',') !== locParams.join(',')) {
        console.warn(`⚠️ [${code}] Interpolation mismatch for key "${k}": en="${enVal}" vs ${code}="${locVal}"`);
        interpolationMismatches++;
      }
    }
  });

  if (interpolationMismatches === 0) {
    console.log(`✅ [${code}] All interpolation parameters match master dictionary.`);
  } else {
    totalIssues += interpolationMismatches;
  }
});

console.log('\n=== AUDIT SUMMARY ===');
if (totalIssues === 0) {
  console.log('🎉 AUDIT PASSED: All translation dictionaries are in sync with 0 missing keys and 0 empty values!');
  process.exit(0);
} else {
  console.error(`⚠️ Found ${totalIssues} issue(s) that require attention.`);
  process.exit(1);
}
