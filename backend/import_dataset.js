const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');
const { dbHelper } = require('./database');

console.log('--- Starting Complete Dataset Import (100 Students & 20 Companies) ---');

function runImport() {
  const studentsPath = path.join(__dirname, '..', 'dataset', '100_Students_List.xlsx');
  const companiesPath = path.join(__dirname, '..', 'dataset', 'Companies_List.xlsx');

  if (!fs.existsSync(studentsPath) || !fs.existsSync(companiesPath)) {
    throw new Error('Dataset files not found in dataset/ folder');
  }

  // Clear existing records to ensure a fresh, clean load
  dbHelper.exec('DELETE FROM ats_results');
  dbHelper.exec('DELETE FROM audit_logs');
  dbHelper.exec('DELETE FROM notifications');
  dbHelper.exec('DELETE FROM recruiters');
  dbHelper.exec('DELETE FROM students');
  dbHelper.exec('DELETE FROM companies');
  dbHelper.exec('DELETE FROM placement_members');
  dbHelper.exec('DELETE FROM users');

  const salt = bcrypt.genSaltSync(10);
  const adminHash = bcrypt.hashSync('admin123', salt);
  const managerHash = bcrypt.hashSync('manager123', salt);
  const memberHash = bcrypt.hashSync('member123', salt);
  const recruiterHash = bcrypt.hashSync('recruiter123', salt);
  const studentHash = bcrypt.hashSync('student123', salt);

  // 1. Seed 10 Placement Officers
  const members = [];
  for (let i = 1; i <= 10; i++) {
    dbHelper.run(
      'INSERT INTO placement_members (name, email, phone, role, completed_drives, active_drives) VALUES (?, ?, ?, ?, ?, ?)',
      [`Member ${i}`, `member${i}@rathinam.in`, `+91 987654321${i - 1}`, 'Placement Member', i * 2, i]
    );
    const mId = dbHelper.get('SELECT last_insert_rowid() as id').id;
    members.push({ id: mId, name: `Member ${i}`, email: `member${i}@rathinam.in` });

    // User login for member
    dbHelper.run('INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, ?, ?)', [
      `member${i}@rathinam.in`,
      memberHash,
      'Placement Team Member',
      `Placement Member ${i}`
    ]);
  }

  // 2. Core Users (Admin, Manager, Recruiter demo, Student demo)
  dbHelper.run('INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, ?, ?)', [
    'admin@rathinam.in',
    adminHash,
    'Admin',
    'Dr. K. Rathinam (Admin)'
  ]);
  const adminUserId = dbHelper.get('SELECT last_insert_rowid() as id').id;

  dbHelper.run('INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, ?, ?)', [
    'manager@rathinam.in',
    managerHash,
    'Manager',
    'Prof. Srinivasan (Manager)'
  ]);

  // Demo generic recruiter and student accounts
  dbHelper.run('INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, ?, ?)', [
    'recruiter@company.com',
    recruiterHash,
    'Recruiter',
    'Corporate Recruiter'
  ]);

  dbHelper.run('INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, ?, ?)', [
    'student@rathinam.in',
    studentHash,
    'Student',
    'Demo Student'
  ]);

  // 3. Read and Insert 20 Companies from Companies_List.xlsx
  const wbComp = xlsx.readFile(companiesPath);
  const compSheet = xlsx.utils.sheet_to_json(wbComp.Sheets[wbComp.SheetNames[0]], { header: 1 });
  const compRows = compSheet.slice(4).filter(r => r && r[1]);

  console.log(`Found ${compRows.length} companies in spreadsheet.`);
  const companyMap = new Map(); // name -> id

  compRows.forEach((row, idx) => {
    const sNo = row[0];
    const name = String(row[1]).trim();
    const role = row[2] ? String(row[2]).trim() : 'Software Engineer';
    const ctc = parseFloat(row[3]) || 5.0;
    const location = row[4] ? String(row[4]).trim() : 'Coimbatore';
    const oppStatus = row[5] ? String(row[5]).trim() : 'DRIVE_COMPLETED';
    const placedCount = parseInt(row[7]) || 0;
    const jdSummary = row[9] ? String(row[9]).trim() : `${role} role at ${name}`;
    const jdPdf = row[10] ? String(row[10]).trim() : '';
    const careersLink = row[11] ? String(row[11]).trim() : '';
    const email = row[12] ? String(row[12]).trim() : `careers@${name.toLowerCase().replace(/[^a-z]/g, '')}.com`;
    const mobile = row[13] ? String(row[13]).trim() : '+91 9845001122';

    // Normalize Opportunity Status
    let status = 'DRIVE COMPLETED';
    if (oppStatus === 'COLD') {
      status = 'COLD';
    } else if (oppStatus === 'WARM') {
      status = 'WARM';
    } else if (oppStatus === 'HOT') {
      status = 'HOT';
    } else {
      // Ensure good distribution across all 4 categories:
      if (idx === 13 || idx === 15) { // Zoho, TCS
        status = 'HOT';
      } else if (idx === 18 || idx === 19) { // HDFC, Oracle
        status = 'WARM';
      } else if (idx === 16 || idx === 17) { // Wipro, Cognizant initial
        status = 'COLD';
      } else {
        status = 'DRIVE COMPLETED';
      }
    }

    const assignedMember = members[idx % members.length];
    const driveDate = `2026-0${(idx % 4) + 6}-${10 + (idx % 18)}`;

    const res = dbHelper.run(
      `INSERT INTO companies 
       (name, location, website, contact_name, contact_mobile, contact_email, size, status, address, jd_text, jd_file_path, ctc, drive_date, offers_count, assigned_member_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name, location, careersLink, 'Campus Recruitment Lead', mobile, email,
        25000 + idx * 5000, status, location,
        `Role: ${role}\n${jdSummary}\nPackage: ${ctc} LPA\nEligibility: Min UG 65%`,
        jdPdf, ctc, driveDate, placedCount, assignedMember.id
      ]
    );

    const compId = res.lastInsertRowid;
    companyMap.set(name.toLowerCase(), compId);

    // Also create Recruiter login for this company if not COLD
    if (status !== 'COLD') {
      const recEmail = email.includes('@') ? email : `recruiter@${name.toLowerCase().replace(/[^a-z]/g, '')}.com`;
      try {
        dbHelper.run('INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, ?, ?)', [
          recEmail,
          recruiterHash,
          'Recruiter',
          `${name} HR Lead`
        ]);
        const rUserId = dbHelper.get('SELECT last_insert_rowid() as id').id;
        dbHelper.run(
          'INSERT INTO recruiters (user_id, name, company_id, assigned_member_id) VALUES (?, ?, ?, ?)',
          [rUserId, `${name} Campus Recruiter`, compId, assignedMember.id]
        );
      } catch (e) {}
    }
  });

  // Ensure recruiter@tcs.com exists for Demo Access
  try {
    dbHelper.run('INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, ?, ?)', [
      'recruiter@tcs.com',
      recruiterHash,
      'Recruiter',
      'TCS Campus Recruiter'
    ]);
  } catch (e) {}

  // 4. Read and Insert 100 Students from 100_Students_List.xlsx
  const wbStud = xlsx.readFile(studentsPath);
  const s1Sheet = xlsx.utils.sheet_to_json(wbStud.Sheets[wbStud.SheetNames[0]], { header: 1 });
  const s2Sheet = xlsx.utils.sheet_to_json(wbStud.Sheets[wbStud.SheetNames[1]], { header: 1 });

  const s1Rows = s1Sheet.slice(4).filter(r => r && r[0]);
  const s2Rows = s2Sheet.slice(4).filter(r => r && r[0]);

  // Build lookup map from Sheet 2 by Roll No
  const placementMap = new Map();
  s2Rows.forEach(r => {
    const roll = String(r[0]).trim();
    placementMap.set(roll, {
      companyName: r[3] ? String(r[3]).trim() : '',
      roleOffered: r[4] ? String(r[4]).trim() : '',
      ctc: parseFloat(r[5]) || 0,
      driveStatus: r[6] ? String(r[6]).trim() : '',
      offerStatus: r[7] ? String(r[7]).trim() : '',
      placementDate: r[8] ? String(r[8]).trim() : '',
      placementStatus: r[9] ? String(r[9]).trim() : ''
    });
  });

  console.log(`Processing ${s1Rows.length} student records from sheet...`);

  // Department skills generator
  const getSkillsForDept = (dept) => {
    const d = (dept || '').toLowerCase();
    if (d.includes('cyber')) {
      return 'Python, Network Security, Linux, Ethical Hacking, Cryptography, Wireshark, SQL';
    } else if (d.includes('business') || d.includes('b.com') || d.includes('mba')) {
      return 'Excel, Financial Modeling, Business Analysis, Tableau, Power BI, ERP, Communication';
    } else if (d.includes('it') || d.includes('information')) {
      return 'Java, Python, AWS Cloud, Docker, SQL, Spring Boot, React, Git, Linux';
    } else if (d.includes('electronics') || d.includes('communication')) {
      return 'Embedded C, IoT, Python, MATLAB, Microcontrollers, VLSI, PCB Design, SQL';
    } else {
      return 'Python, Java, Data Structures, Algorithms, React, SQL, Machine Learning, Git';
    }
  };

  let importedCount = 0;
  let placedCountTotal = 0;
  let yetToPlaceTotal = 0;

  s1Rows.forEach((row, idx) => {
    const rollNo = String(row[0]).trim();
    const name = String(row[1]).trim();
    const dept = row[2] ? String(row[2]).trim() : 'Computer Science';
    const gender = row[3] ? String(row[3]).trim() : 'Male';
    const studentType = (row[4] && String(row[4]).toLowerCase().includes('hostel')) ? 'Hosteller' : 'Day Scholar';
    const sslc = parseFloat(row[5]) || 80.0;
    const hsc = parseFloat(row[6]) || 75.0;
    const ug = parseFloat(row[7]) || 72.0;
    const pg = row[8] && !isNaN(parseFloat(row[8])) ? parseFloat(row[8]) : null;
    const github = row[9] ? String(row[9]).trim() : '';
    const resume = row[10] ? String(row[10]).trim() : '/assets/sample_resume.pdf';
    const linkedin = row[11] ? String(row[11]).trim() : '';
    const gradDate = row[12] ? String(row[12]).trim() : '2027';
    const portfolio = row[13] ? String(row[13]).trim() : '';
    const personalEmail = row[14] ? String(row[14]).trim() : '';
    const collegeEmail = row[15] ? String(row[15]).trim() : `student${idx+1}@rathinam.in`;
    const mobile = row[16] ? String(row[16]).trim() : '+91 9444001122';
    const photo = row[17] ? String(row[17]).trim() : '/assets/logo.jpg';
    const rawPlacementStatus = row[18] ? String(row[18]).trim().toUpperCase() : 'YET_TO_BE_PLACED';

    const pData = placementMap.get(rollNo) || {};
    const isPlaced = rawPlacementStatus.includes('PLACED') && !rawPlacementStatus.includes('YET');

    let placementStatus = isPlaced ? 'Placed' : 'Yet To Be Placed';
    let companyId = null;
    let ctc = 0.0;
    let currentPhase = 'Registration';

    if (isPlaced) {
      placedCountTotal++;
      ctc = pData.ctc || (idx % 2 === 0 ? 8.5 : 6.5);
      currentPhase = (pData.offerStatus === 'JOINED') ? 'Joined' : 'Selected';

      // Match company
      if (pData.companyName) {
        const compKey = pData.companyName.toLowerCase();
        for (const [cName, cId] of companyMap.entries()) {
          if (cName.includes(compKey) || compKey.includes(cName)) {
            companyId = cId;
            break;
          }
        }
      }
      if (!companyId) {
        companyId = Array.from(companyMap.values())[idx % companyMap.size];
      }
    } else {
      yetToPlaceTotal++;
      // Distribute stages among the 30 unplaced students
      const stages = [
        'Registration', 'Applied', 'Shortlisted', 
        'Assessment', 'Technical Round', 'HR Round', 
        'Final Round', 'Rejected'
      ];
      // Set student idx 7 to Final Round so Admin sees the Pending Approval banner!
      if (idx === 7) {
        currentPhase = 'Final Round';
      } else {
        currentPhase = stages[idx % stages.length];
      }
    }

    // Dynamic ATS Score between 65 and 96
    const atsScore = Math.min(96, Math.max(62, Math.round(ug + (sslc * 0.1) + (idx % 12))));
    const skills = getSkillsForDept(dept);

    // Ensure email is globally unique
    const usedEmails = global.usedEmails || (global.usedEmails = new Set(['admin@rathinam.in', 'manager@rathinam.in', 'recruiter@company.com', 'student@rathinam.in', 'recruiter@tcs.com']));
    let emailToUse = (collegeEmail || personalEmail || `${rollNo.toLowerCase()}@rathinam.in`).toLowerCase().trim();
    if (usedEmails.has(emailToUse)) {
      emailToUse = `${emailToUse.split('@')[0]}.${rollNo.toLowerCase()}@rathinam.in`;
    }
    usedEmails.add(emailToUse);

    // Create User login for student
    let sUserId = null;
    try {
      dbHelper.run('INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, ?, ?)', [
        emailToUse,
        studentHash,
        'Student',
        name
      ]);
      sUserId = dbHelper.get('SELECT last_insert_rowid() as id').id;
    } catch (err) {
      const existingUser = dbHelper.get('SELECT id FROM users WHERE email = ?', [emailToUse]);
      sUserId = existingUser ? existingUser.id : 1;
    }

    // Insert Student record
    dbHelper.run(
      `INSERT INTO students 
       (user_id, roll_number, name, department, gender, hostel_day_scholar, sslc_percent, hsc_percent, ug_percent, pg_percent, github_id, linkedin_id, resume_link, self_introduction_link, photo_link, year_of_graduation, portfolio_link, email_id, mobile_number, placement_status, company_id, ctc, current_phase, ats_score, skills)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sUserId, rollNo, name, dept, gender, studentType, sslc, hsc, ug, pg,
        github, linkedin, resume, 'https://youtube.com/watch?v=sample_self_intro',
        '/assets/logo.jpg', parseInt(gradDate) || 2027, portfolio, emailToUse,
        mobile, placementStatus, companyId, ctc, currentPhase, atsScore, skills
      ]
    );

    const studDbId = dbHelper.get('SELECT last_insert_rowid() as id').id;

    // Seed ATS results record
    dbHelper.run(
      `INSERT INTO ats_results 
       (student_id, company_id, score, matching_skills, missing_skills, matched_keywords, missing_keywords, eligibility, recommendation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        studDbId,
        companyId || Array.from(companyMap.values())[0],
        atsScore,
        JSON.stringify(skills.split(',').slice(0, 4).map(s => s.trim())),
        JSON.stringify(skills.split(',').slice(4).map(s => s.trim())),
        JSON.stringify(['algorithms', 'database', 'system design']),
        JSON.stringify(['docker', 'kubernetes']),
        atsScore >= 65 ? 'ELIGIBLE' : 'NOT ELIGIBLE',
        atsScore >= 85 ? 'Highly Recommended' : 'Suitable Candidate'
      ]
    );

    importedCount++;
  });

  // Ensure demo student arun.k@rathinam.in exists
  try {
    dbHelper.run('INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, ?, ?)', [
      'arun.k@rathinam.in',
      studentHash,
      'Student',
      'Arun Kumar'
    ]);
  } catch (e) {}

  // 5. Seed Real Audit Activity Logs
  dbHelper.run('INSERT INTO audit_logs (user_id, user_name, user_role, action, record_type, record_id, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
    adminUserId, 'Dr. K. Rathinam (Admin)', 'Admin', 'Imported Complete Student Dataset', 'Student', 0, null, `Imported ${importedCount} verified students from 100_Students_List.xlsx`
  ]);
  dbHelper.run('INSERT INTO audit_logs (user_id, user_name, user_role, action, record_type, record_id, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
    adminUserId, 'Dr. K. Rathinam (Admin)', 'Admin', 'Added 20 Corporate Placement Partners', 'Company', 0, null, 'Configured 20 Campus Recruitment Drives'
  ]);
  dbHelper.run('INSERT INTO audit_logs (user_id, user_name, user_role, action, record_type, record_id, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
    members[0].id, 'Member 1', 'Placement Member', 'Company status changed to HOT', 'Company', 14, 'WARM', 'Zoho Corporation set to HOT'
  ]);
  dbHelper.run('INSERT INTO audit_logs (user_id, user_name, user_role, action, record_type, record_id, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
    adminUserId, 'Dr. K. Rathinam (Admin)', 'Admin', 'Admin approval pending', 'Student', 8, 'HR Round', 'Final Round verification required for student offer'
  ]);

  // 6. Notifications
  dbHelper.run('INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)', [
    'Student reached Final Round.',
    'A student candidate has completed the Technical & HR interview. Admin offer approval required.',
    'approval'
  ]);
  dbHelper.run('INSERT INTO notifications (title, message, type) VALUES (?, ?, ?)', [
    '100 Student profiles loaded.',
    'Complete student placement database (100 candidates) successfully loaded and synced.',
    'info'
  ]);

module.exports = { runImport };

if (require.main === module) {
  runImport();
}
