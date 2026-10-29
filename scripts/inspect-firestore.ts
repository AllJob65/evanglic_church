import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function inspect() {
  console.log('Testing connection to database:', firebaseConfig.firestoreDatabaseId);
  const collectionsToCheck = ['users', 'members', 'branches', 'audit_logs', 'attendance', 'devotions', 'giving', 'test'];
  for (const col of collectionsToCheck) {
    try {
      const snap = await getDocs(collection(db, col));
      console.log(`Collection "${col}": ${snap.size} documents found.`);
      snap.forEach(doc => {
        console.log(`  - Doc ID: ${doc.id}, data:`, JSON.stringify(doc.data()).substring(0, 100));
      });
    } catch (err: any) {
      console.log(`Collection "${col}" error:`, err.message);
    }
  }
}

inspect().then(() => process.exit(0)).catch(err => {
  console.error('Inspect error:', err);
  process.exit(1);
});
