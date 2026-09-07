const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const xlsx = require('xlsx');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const { dbHelper, initSchema, isPostgres } = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'rathinam-placement-portal-secret-key-2026';

// Enable CORS & JSON parsing
app.use(cors());
app.use(express.json());

// Create uploads directory (/tmp/uploads on Vercel serverless)
const uploadsDir = process.env.VERCEL ? path.join('/tmp', 'uploads') : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (e) {}
}
app.use('/uploads', express.static(uploadsDir));

// Serve public logo if requested
const logoPath = path.join(__dirname, '..', 'brain', '3e4e81c7-6d7f-4b05-84ff-cede1188fdbc', 'media__1788155156077.jpg');
app.get('/logo.png', (req, res) => {
  if (fs.existsSync(logoPath)) {
    res.sendFile(logoPath);
  } else {
    res.status(404).send('Logo not found');
  }
});

// Configure Multer for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ==========================================
// MIDDLEWARES
// ==========================================

// Authenticate JWT Token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// Role authorization helper
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Unauthorized role access' });
    }
    next();
  };
}

// Write Audit Log helper
async function logAction(userId, userName, userRole, action, recordType, recordId, oldValue, newValue) {
  try {
    await dbHelper.run(
      `INSERT INTO audit_logs (user_id, user_name, user_role, action, record_type, record_id, old_value, new_value)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, userName, userRole, action, recordType, recordId, oldValue, newValue]
    );
  } catch (err) {
    console.error('Audit log write failure:', err);
  }
}

// Send Notification helper
async function createNotification(title, message, type, userId = null) {
  try {
    await dbHelper.run(
      `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`,
      [userId, title, message, type]
    );
  } catch (err) {
    console.error('Notification creation failure:', err);
  }
}

// ==========================================
// AUTH ROUTE
// ==========================================
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await dbHelper.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    let studentId = null;
    if (user.role === 'Student') {
      const student = await dbHelper.get('SELECT id FROM students WHERE user_id = ?', [user.id]);
      if (student) studentId = student.id;
    }

    let recruiterInfo = null;
    if (user.role === 'Recruiter') {
      recruiterInfo = await dbHelper.get(
        `SELECT r.id, r.name, r.company_id, c.name as company_name 
         FROM recruiters r 
         JOIN companies c ON r.company_id = c.id 
         WHERE r.user_id = ?`,
        [user.id]
      );
    }

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        studentId,
        recruiterInfo
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// ==========================================
// DASHBOARD ENDPOINT
// ==========================================
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const totalStudentsRes = await dbHelper.get('SELECT COUNT(*) as count FROM students WHERE is_deleted = 0');
    const totalStudents = totalStudentsRes ? parseInt(totalStudentsRes.count) : 0;

    const eligibleRes = await dbHelper.get('SELECT COUNT(*) as count FROM students WHERE ug_percent >= 60 AND is_deleted = 0');
    const eligibleStudents = eligibleRes ? parseInt(eligibleRes.count) : 0;

    const totalCompaniesRes = await dbHelper.get('SELECT COUNT(*) as count FROM companies');
    const totalCompanies = totalCompaniesRes ? parseInt(totalCompaniesRes.count) : 0;

    const activeCompaniesRes = await dbHelper.get("SELECT COUNT(*) as count FROM companies WHERE status IN ('WARM', 'HOT')");
    const activeCompanies = activeCompaniesRes ? parseInt(activeCompaniesRes.count) : 0;

    const totalDrives = activeCompanies;

    const placedRes = await dbHelper.get("SELECT COUNT(*) as count FROM students WHERE placement_status = 'Placed' AND is_deleted = 0");
    const placedStudents = placedRes ? parseInt(placedRes.count) : 0;
    const yetToPlace = totalStudents - placedStudents;

    const totalOffersRes = await dbHelper.get("SELECT COUNT(*) as count FROM students WHERE current_phase IN ('Selected', 'Joined') AND is_deleted = 0");
    const totalOffers = totalOffersRes ? parseInt(totalOffersRes.count) : 0;

    const maxCtcRes = await dbHelper.get("SELECT MAX(ctc) as max_ctc FROM students WHERE placement_status = 'Placed' AND is_deleted = 0");
    const highestCTC = maxCtcRes && maxCtcRes.max_ctc ? parseFloat(maxCtcRes.max_ctc) : 0.0;

    const avgCtcRes = await dbHelper.get("SELECT AVG(ctc) as avg_ctc FROM students WHERE placement_status = 'Placed' AND is_deleted = 0");
    const averageCTC = avgCtcRes && avgCtcRes.avg_ctc ? parseFloat(parseFloat(avgCtcRes.avg_ctc).toFixed(2)) : 0.0;

    const statusCounts = await dbHelper.all('SELECT status, COUNT(*) as count FROM companies GROUP BY status');
    const phaseCounts = await dbHelper.all('SELECT current_phase as phase, COUNT(*) as count FROM students WHERE is_deleted = 0 GROUP BY current_phase');
    const deptCounts = await dbHelper.all('SELECT department, COUNT(*) as count FROM students WHERE is_deleted = 0 GROUP BY department');

    const recentDrives = await dbHelper.all(
      `SELECT c.id, c.name, c.location, c.ctc, c.status, c.drive_date, 
              (SELECT COUNT(*) FROM students s WHERE s.company_id = c.id AND s.current_phase IN ('Selected', 'Joined') AND s.is_deleted = 0) as selected_students
       FROM companies c 
       ORDER BY c.drive_date DESC LIMIT 5`
    );

    const ctcBuckets = await dbHelper.get(`
      SELECT 
        SUM(CASE WHEN ctc > 0 AND ctc <= 3 THEN 1 ELSE 0 END) as low,
        SUM(CASE WHEN ctc > 3 AND ctc <= 5 THEN 1 ELSE 0 END) as medium,
        SUM(CASE WHEN ctc > 5 AND ctc <= 8 THEN 1 ELSE 0 END) as high,
        SUM(CASE WHEN ctc > 8 THEN 1 ELSE 0 END) as premium
      FROM students 
      WHERE placement_status = 'Placed' AND is_deleted = 0
    `);

    res.json({
      summary: {
        totalStudents,
        eligibleStudents,
        placedStudents,
        yetToPlace,
        totalCompanies,
        activeCompanies,
        totalDrives,
        totalOffers,
        highestCTC,
        averageCTC
      },
      statusCounts: (statusCounts || []).map(s => ({ status: s.status, count: parseInt(s.count) })),
      phaseCounts: (phaseCounts || []).map(p => ({ phase: p.phase, count: parseInt(p.count) })),
      deptCounts: (deptCounts || []).map(d => ({ department: d.department, count: parseInt(d.count) })),
      recentDrives: recentDrives || [],
      ctcBuckets: {
        low: ctcBuckets ? parseInt(ctcBuckets.low || 0) : 0,
        medium: ctcBuckets ? parseInt(ctcBuckets.medium || 0) : 0,
        high: ctcBuckets ? parseInt(ctcBuckets.high || 0) : 0,
        premium: ctcBuckets ? parseInt(ctcBuckets.premium || 0) : 0
      },
      placementRatio: {
        placed: placedStudents,
        unplaced: yetToPlace
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats: ' + err.message });
  }
});

// ==========================================
// STUDENTS DIRECTORY
// ==========================================
app.get('/api/students', authenticateToken, async (req, res) => {
  try {
    const { 
      search = '', 
      department = '', 
      status = '', 
      phase = '', 
      minCgpa = '',
      gender = '', 
      studentType = '', 
      page = 1, 
      limit = 50 
    } = req.query;

    let query = `
      SELECT s.*, c.name as company_name 
      FROM students s 
      LEFT JOIN companies c ON s.company_id = c.id 
      WHERE s.is_deleted = 0
    `;
    const params = [];

    if (search) {
      query += ` AND (LOWER(s.name) LIKE ? OR LOWER(s.roll_number) LIKE ? OR LOWER(s.email_id) LIKE ?)`;
      const term = `%${search.toLowerCase()}%`;
      params.push(term, term, term);
    }

    if (department) {
      query += ` AND s.department = ?`;
      params.push(department);
    }

    if (status) {
      query += ` AND s.placement_status = ?`;
      params.push(status);
    }

    if (phase) {
      query += ` AND s.current_phase = ?`;
      params.push(phase);
    }

    if (minCgpa) {
      query += ` AND s.ug_percent >= ?`;
      params.push(parseFloat(minCgpa));
    }

    if (gender) {
      query += ` AND s.gender = ?`;
      params.push(gender);
    }

    if (studentType) {
      query += ` AND s.hostel_day_scholar = ?`;
      params.push(studentType);
    }

    query += ` ORDER BY s.id ASC`;

    const students = await dbHelper.all(query, params);
    res.json(students || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single student profile
app.get('/api/students/:id', authenticateToken, async (req, res) => {
  try {
    const student = await dbHelper.get(
      `SELECT s.*, c.name as company_name, c.ctc as company_ctc 
       FROM students s 
       LEFT JOIN companies c ON s.company_id = c.id 
       WHERE s.id = ?`,
      [req.params.id]
    );

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Fetch ATS scoring results
    const atsRecord = await dbHelper.get(
      `SELECT a.*, c.name as company_name 
       FROM ats_results a 
       LEFT JOIN companies c ON a.company_id = c.id 
       WHERE a.student_id = ? 
       ORDER BY a.id DESC LIMIT 1`,
      [req.params.id]
    );

    res.json({
      ...student,
      atsDetails: atsRecord || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new student
app.post('/api/students', authenticateToken, authorizeRoles('Admin', 'Manager', 'Placement Team Member'), async (req, res) => {
  const {
    roll_number, name, department, gender, hostel_day_scholar,
    sslc_percent, hsc_percent, ug_percent, pg_percent,
    github_id, linkedin_id, resume_link, self_introduction_link,
    photo_link, year_of_graduation, portfolio_link, email_id, mobile_number,
    placement_status, company_id, ctc, current_phase, skills
  } = req.body;

  if (!roll_number || !name || !email_id) {
    return res.status(400).json({ error: 'Roll number, Name, and Email are required fields' });
  }

  try {
    const defaultPassword = 'student123';
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(defaultPassword, salt);

    const userRes = await dbHelper.run(
      'INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, ?, ?)',
      [email_id, password_hash, 'Student', name]
    );
    const userId = userRes.lastInsertRowid;

    const result = await dbHelper.run(
      `INSERT INTO students 
       (user_id, roll_number, name, department, gender, hostel_day_scholar, sslc_percent, hsc_percent, ug_percent, pg_percent, github_id, linkedin_id, resume_link, self_introduction_link, photo_link, year_of_graduation, portfolio_link, email_id, mobile_number, placement_status, company_id, ctc, current_phase, ats_score, skills)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, roll_number, name, department, gender || 'Male', hostel_day_scholar || 'Day Scholar',
        parseFloat(sslc_percent) || 0, parseFloat(hsc_percent) || 0, parseFloat(ug_percent) || 0, pg_percent ? parseFloat(pg_percent) : null,
        github_id || '', linkedin_id || '', resume_link || '/assets/sample_resume.pdf', self_introduction_link || '',
        photo_link || '/assets/logo.jpg', parseInt(year_of_graduation) || 2027, portfolio_link || '', email_id, mobile_number || '',
        placement_status || 'Yet To Be Placed', company_id || null, parseFloat(ctc) || 0, current_phase || 'Registration', 75, skills || ''
      ]
    );

    await logAction(req.user.id, req.user.name, req.user.role, 'Added Student', 'Student', result.lastInsertRowid, null, `Student ${name} (${roll_number}) added`);
    res.json({ message: 'Student created successfully', id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update student profile
app.put('/api/students/:id', authenticateToken, authorizeRoles('Admin', 'Manager'), async (req, res) => {
  const studentId = req.params.id;
  const {
    name, department, gender, hostel_day_scholar,
    sslc_percent, hsc_percent, ug_percent, pg_percent,
    github_id, linkedin_id, resume_link, self_introduction_link,
    photo_link, year_of_graduation, portfolio_link, email_id, mobile_number,
    placement_status, company_id, ctc, current_phase, skills
  } = req.body;

  try {
    const oldStudent = await dbHelper.get('SELECT * FROM students WHERE id = ?', [studentId]);
    if (!oldStudent) return res.status(404).json({ error: 'Student not found' });

    await dbHelper.run(
      `UPDATE students SET 
        name = ?, department = ?, gender = ?, hostel_day_scholar = ?,
        sslc_percent = ?, hsc_percent = ?, ug_percent = ?, pg_percent = ?,
        github_id = ?, linkedin_id = ?, resume_link = ?, self_introduction_link = ?,
        photo_link = ?, year_of_graduation = ?, portfolio_link = ?, email_id = ?, mobile_number = ?,
        placement_status = ?, company_id = ?, ctc = ?, current_phase = ?, skills = ?
       WHERE id = ?`,
      [
        name, department, gender, hostel_day_scholar,
        parseFloat(sslc_percent), parseFloat(hsc_percent), parseFloat(ug_percent), pg_percent ? parseFloat(pg_percent) : null,
        github_id, linkedin_id, resume_link, self_introduction_link,
        photo_link, parseInt(year_of_graduation), portfolio_link, email_id, mobile_number,
        placement_status, company_id ? parseInt(company_id) : null, parseFloat(ctc) || 0, current_phase, skills,
        studentId
      ]
    );

    if (oldStudent.current_phase !== current_phase && current_phase === 'Final Round') {
      await createNotification(
        'Student Reached Final Round',
        `Student '${name}' (${oldStudent.roll_number}) has reached the Final Round for placement. Offer approval required.`,
        'approval'
      );
    }

    await logAction(req.user.id, req.user.name, req.user.role, 'Updated Student', 'Student', studentId, JSON.stringify(oldStudent), JSON.stringify(req.body));
    res.json({ message: 'Student updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Soft Delete (Send to Trash Bin)
app.delete('/api/students/:id', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  const studentId = req.params.id;
  try {
    const student = await dbHelper.get('SELECT * FROM students WHERE id = ?', [studentId]);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    await dbHelper.run('UPDATE students SET is_deleted = 1 WHERE id = ?', [studentId]);
    await logAction(req.user.id, req.user.name, req.user.role, 'Moved Student to Trash', 'Student', studentId, 'Active', 'Trash Bin');
    await createNotification('Student moved to Trash Bin', `Admin moved student ${student.name} (${student.roll_number}) to the Trash bin.`, 'info');

    res.json({ message: 'Student moved to Trash successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Restore student from Trash
app.post('/api/students/:id/restore', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  const studentId = req.params.id;
  try {
    await dbHelper.run('UPDATE students SET is_deleted = 0 WHERE id = ?', [studentId]);
    await logAction(req.user.id, req.user.name, req.user.role, 'Restored Student', 'Student', studentId, 'Trash Bin', 'Active');
    res.json({ message: 'Student restored successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Permanent Delete student
app.delete('/api/students/:id/permanent', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  const studentId = req.params.id;
  try {
    await dbHelper.run('DELETE FROM ats_results WHERE student_id = ?', [studentId]);
    await dbHelper.run('DELETE FROM students WHERE id = ?', [studentId]);
    await logAction(req.user.id, req.user.name, req.user.role, 'Permanently Deleted Student', 'Student', studentId, 'Trash Bin', 'Permanently Deleted');
    res.json({ message: 'Student permanently deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk Excel Import
app.post('/api/students/import', authenticateToken, authorizeRoles('Admin'), upload.single('excelFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Excel file upload is required' });
  }

  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    let inserted = 0;
    const defaultPassword = 'student123';
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(defaultPassword, salt);

    for (const row of data) {
      const rollNo = row['Roll No'] || row['roll_number'] || row['Roll Number'];
      const name = row['Name'] || row['name'];
      const email = row['College Email ID'] || row['Email'] || row['email_id'] || `${String(rollNo).toLowerCase()}@rathinam.in`;

      if (rollNo && name) {
        const existing = await dbHelper.get('SELECT id FROM students WHERE roll_number = ?', [String(rollNo)]);
        if (!existing) {
          let userId = 1;
          try {
            const uRes = await dbHelper.run('INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, ?, ?)', [
              String(email).trim().toLowerCase(), password_hash, 'Student', String(name)
            ]);
            userId = uRes.lastInsertRowid;
          } catch (e) {}

          await dbHelper.run(
            `INSERT INTO students 
             (user_id, roll_number, name, department, gender, hostel_day_scholar, sslc_percent, hsc_percent, ug_percent, pg_percent, github_id, linkedin_id, resume_link, self_introduction_link, photo_link, year_of_graduation, portfolio_link, email_id, mobile_number, placement_status, company_id, ctc, current_phase, ats_score, skills)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              userId, String(rollNo), String(name), row['Department'] || 'Computer Science', row['Gender'] || 'Male',
              row['Student Type'] || 'Day Scholar', parseFloat(row['SSLC %']) || 75.0, parseFloat(row['HSC %']) || 75.0,
              parseFloat(row['UG %']) || 70.0, null, row['GitHub ID'] || '', row['LinkedIn ID'] || '',
              row['Resume Link'] || '/assets/sample_resume.pdf', '', '/assets/logo.jpg', 2027, '',
              String(email).trim().toLowerCase(), String(row['Mobile No'] || '+91 9444001122'), 'Yet To Be Placed',
              null, 0.0, 'Registration', 70, 'Python, SQL, Algorithms'
            ]
          );
          inserted++;
        }
      }
    }

    try { fs.unlinkSync(req.file.path); } catch (e) {}
    await logAction(req.user.id, req.user.name, req.user.role, 'Excel Bulk Import', 'Student', 0, null, `Imported ${inserted} students via Excel upload`);
    res.json({ message: `Successfully imported ${inserted} student records`, count: inserted });
  } catch (err) {
    res.status(500).json({ error: 'Import failed: ' + err.message });
  }
});

// Export Students to Excel
app.get('/api/students/export/excel', authenticateToken, async (req, res) => {
  try {
    const students = await dbHelper.all(`
      SELECT 
        s.roll_number as "Roll No",
        s.name as "Student Name",
        s.department as "Department",
        s.gender as "Gender",
        s.hostel_day_scholar as "Type",
        s.ug_percent as "UG %",
        s.placement_status as "Placement Status",
        c.name as "Placed Company",
        s.ctc as "CTC (LPA)",
        s.current_phase as "Recruitment Stage",
        s.ats_score as "ATS Score %",
        s.email_id as "Email",
        s.mobile_number as "Phone"
      FROM students s
      LEFT JOIN companies c ON s.company_id = c.id
      WHERE s.is_deleted = 0
      ORDER BY s.id ASC
    `);

    const worksheet = xlsx.utils.json_to_sheet(students || []);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Students Directory');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="Rathinam_Students_Directory_Export.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// COMPANIES & PLACEMENT DRIVES
// ==========================================
app.get('/api/companies', authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT c.*, m.name as assigned_member_name,
             (SELECT COUNT(*) FROM students s WHERE s.company_id = c.id AND s.is_deleted = 0) as registered_students_count,
             (SELECT COUNT(*) FROM students s WHERE s.company_id = c.id AND s.current_phase IN ('Selected', 'Joined') AND s.is_deleted = 0) as selected_students_count
      FROM companies c
      LEFT JOIN placement_members m ON c.assigned_member_id = m.id
    `;
    const params = [];

    // If recruiter, only show their company
    if (req.user.role === 'Recruiter') {
      const rec = await dbHelper.get('SELECT company_id FROM recruiters WHERE user_id = ?', [req.user.id]);
      if (rec) {
        query += ' WHERE c.id = ?';
        params.push(rec.company_id);
      } else {
        query += " WHERE c.status != 'COLD'";
      }
    }

    query += ' ORDER BY c.id ASC';
    const companies = await dbHelper.all(query, params);
    res.json(companies || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/companies', authenticateToken, authorizeRoles('Admin', 'Placement Team Member'), async (req, res) => {
  const {
    name, location, website, contact_name, contact_mobile,
    contact_email, size, status, address, jd_text, ctc, drive_date, assigned_member_id
  } = req.body;

  if (!name || !location) {
    return res.status(400).json({ error: 'Company Name and Location are required' });
  }

  try {
    const result = await dbHelper.run(
      `INSERT INTO companies 
       (name, location, website, contact_name, contact_mobile, contact_email, size, status, address, jd_text, ctc, drive_date, assigned_member_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name, location, website || '', contact_name || '', contact_mobile || '',
        contact_email || '', parseInt(size) || 1000, status || 'WARM', address || location,
        jd_text || '', parseFloat(ctc) || 5.0, drive_date || '', assigned_member_id ? parseInt(assigned_member_id) : null
      ]
    );

    await logAction(req.user.id, req.user.name, req.user.role, 'Added Company', 'Company', result.lastInsertRowid, null, `Added partner company ${name}`);
    res.json({ message: 'Company created successfully', id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/companies/:id', authenticateToken, authorizeRoles('Admin', 'Placement Team Member'), async (req, res) => {
  const companyId = req.params.id;
  const {
    name, location, website, contact_name, contact_mobile,
    contact_email, size, status, address, jd_text, ctc, drive_date, assigned_member_id
  } = req.body;

  try {
    const oldComp = await dbHelper.get('SELECT * FROM companies WHERE id = ?', [companyId]);
    if (!oldComp) return res.status(404).json({ error: 'Company not found' });

    await dbHelper.run(
      `UPDATE companies SET
        name = ?, location = ?, website = ?, contact_name = ?, contact_mobile = ?,
        contact_email = ?, size = ?, status = ?, address = ?, jd_text = ?, ctc = ?,
        drive_date = ?, assigned_member_id = ?
       WHERE id = ?`,
      [
        name, location, website, contact_name, contact_mobile,
        contact_email, parseInt(size) || 1000, status, address, jd_text, parseFloat(ctc) || 0,
        drive_date, assigned_member_id ? parseInt(assigned_member_id) : null, companyId
      ]
    );

    if (oldComp.status !== status) {
      await logAction(req.user.id, req.user.name, req.user.role, 'Changed Company Status', 'Company', companyId, oldComp.status, status);
      await createNotification('Company Status Changed', `Company '${name}' status updated to ${status}.`, 'status_change');
    }

    res.json({ message: 'Company updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/companies/:id', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  const companyId = req.params.id;
  try {
    await dbHelper.run('DELETE FROM companies WHERE id = ?', [companyId]);
    await logAction(req.user.id, req.user.name, req.user.role, 'Deleted Company', 'Company', companyId, null, 'Deleted');
    res.json({ message: 'Company removed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// RECRUITERS & PLACEMENT TEAM
// ==========================================
app.get('/api/recruiters/active', authenticateToken, async (req, res) => {
  try {
    const recruiters = await dbHelper.all(`
      SELECT r.id, r.name, r.created_at, u.email, c.name as company_name, c.location, c.status as company_status, m.name as assigned_member_name
      FROM recruiters r
      JOIN users u ON r.user_id = u.id
      JOIN companies c ON r.company_id = c.id
      LEFT JOIN placement_members m ON r.assigned_member_id = m.id
      WHERE c.status != 'COLD'
      ORDER BY r.id ASC
    `);
    res.json(recruiters || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/placement/members', authenticateToken, async (req, res) => {
  try {
    const members = await dbHelper.all(`
      SELECT m.*, 
             (SELECT COUNT(*) FROM companies c WHERE c.assigned_member_id = m.id) as assigned_companies_count
      FROM placement_members m
      ORDER BY m.id ASC
    `);
    res.json(members || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// JD UPLOAD & ATS RESUME ANALYSIS
// ==========================================
app.post('/api/jd/upload', authenticateToken, authorizeRoles('Admin', 'Placement Team Member'), upload.single('jdFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'JD document file upload is required' });
  }

  const { companyId } = req.body;
  if (!companyId) {
    return res.status(400).json({ error: 'Target Company is required' });
  }

  try {
    let extractedText = '';
    const ext = path.extname(req.file.originalname).toLowerCase();

    if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(req.file.path);
      const pdfData = await pdfParse(dataBuffer);
      extractedText = pdfData.text;
    } else if (ext === '.docx') {
      const docxData = await mammoth.extractRawText({ path: req.file.path });
      extractedText = docxData.value;
    } else if (ext === '.txt') {
      extractedText = fs.readFileSync(req.file.path, 'utf8');
    } else {
      return res.status(400).json({ error: 'Unsupported file format. Please upload PDF, DOCX or TXT.' });
    }

    await dbHelper.run(
      'UPDATE companies SET jd_text = ?, jd_file_path = ? WHERE id = ?',
      [extractedText, `/uploads/${req.file.filename}`, companyId]
    );

    // Run ATS compatibility scoring on all active students
    const students = await dbHelper.all('SELECT id, name, department, ug_percent, skills FROM students WHERE is_deleted = 0');
    const jdWords = extractedText.toLowerCase();

    for (const student of students) {
      let score = 65;
      const skillsArr = (student.skills || '').split(',').map(s => s.trim().toLowerCase());
      const matchedSkills = [];
      const missingSkills = [];

      skillsArr.forEach(skill => {
        if (skill && jdWords.includes(skill)) {
          matchedSkills.push(skill);
          score += 5;
        } else if (skill) {
          missingSkills.push(skill);
        }
      });

      if (student.ug_percent >= 80) score += 8;
      else if (student.ug_percent >= 70) score += 5;

      const finalScore = Math.min(98, Math.max(50, score));
      const eligibility = finalScore >= 70 ? 'ELIGIBLE' : 'NOT ELIGIBLE';
      const recommendation = finalScore >= 85 ? 'Highly Recommended' : finalScore >= 70 ? 'Suitable Match' : 'Upskilling Needed';

      await dbHelper.run(
        `INSERT INTO ats_results (student_id, company_id, score, matching_skills, missing_skills, eligibility, recommendation)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          student.id, companyId, finalScore,
          JSON.stringify(matchedSkills), JSON.stringify(missingSkills),
          eligibility, recommendation
        ]
      );

      await dbHelper.run('UPDATE students SET ats_score = ? WHERE id = ?', [finalScore, student.id]);
    }

    const company = await dbHelper.get('SELECT name FROM companies WHERE id = ?', [companyId]);
    await logAction(req.user.id, req.user.name, req.user.role, 'Uploaded JD and Ran ATS Analysis', 'Company', companyId, null, `Ran ATS scoring for ${students.length} students against ${company ? company.name : 'Company'}`);
    await createNotification('ATS Evaluation Completed', `Job Description uploaded for '${company ? company.name : 'Company'}'. ATS resume analysis run automatically for ${students.length} students.`, 'info');

    res.json({
      message: 'JD uploaded and ATS scoring completed successfully',
      scannedStudents: students.length,
      extractedSnippet: extractedText.substring(0, 300) + '...'
    });
  } catch (err) {
    res.status(500).json({ error: 'JD parsing error: ' + err.message });
  }
});

app.get('/api/jd/compare', authenticateToken, async (req, res) => {
  const { studentId, companyId } = req.query;
  try {
    const student = await dbHelper.get('SELECT * FROM students WHERE id = ?', [studentId]);
    const company = await dbHelper.get('SELECT * FROM companies WHERE id = ?', [companyId]);

    if (!student || !company) {
      return res.status(404).json({ error: 'Student or Company profile not found' });
    }

    const atsRecord = await dbHelper.get(
      'SELECT * FROM ats_results WHERE student_id = ? AND company_id = ? ORDER BY id DESC LIMIT 1',
      [studentId, companyId]
    );

    res.json({
      student: {
        name: student.name,
        roll: student.roll_number,
        department: student.department,
        ug_percent: student.ug_percent,
        skills: student.skills,
        ats_score: student.ats_score
      },
      company: {
        name: company.name,
        role: company.ctc + ' LPA Placement Drive',
        jd_text: company.jd_text || 'Standard graduate software role requirements.'
      },
      analysis: atsRecord ? {
        score: atsRecord.score,
        matching_skills: JSON.parse(atsRecord.matching_skills || '[]'),
        missing_skills: JSON.parse(atsRecord.missing_skills || '[]'),
        eligibility: atsRecord.eligibility,
        recommendation: atsRecord.recommendation
      } : {
        score: student.ats_score || 72,
        matching_skills: (student.skills || '').split(',').slice(0, 3),
        missing_skills: ['Cloud Architecture', 'Distributed Systems'],
        eligibility: 'ELIGIBLE',
        recommendation: 'Good Match'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// NOTIFICATIONS & OFFER APPROVALS
// ==========================================
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await dbHelper.all('SELECT * FROM notifications ORDER BY id DESC LIMIT 20');
    res.json(notifications || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    await dbHelper.run('UPDATE notifications SET is_read = 1');
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    await dbHelper.run('UPDATE notifications SET is_read = 1 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Approval of Final Selection
app.post('/api/approval/:studentId/approve', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  const studentId = req.params.studentId;
  const { companyId, ctc } = req.body;

  try {
    const student = await dbHelper.get('SELECT * FROM students WHERE id = ?', [studentId]);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const company = await dbHelper.get('SELECT * FROM companies WHERE id = ?', [companyId || student.company_id || 1]);

    await dbHelper.run(
      `UPDATE students SET
        placement_status = 'Placed',
        current_phase = 'Joined',
        company_id = ?,
        ctc = ?
       WHERE id = ?`,
      [company ? company.id : student.company_id, ctc || (company ? company.ctc : 7.0), studentId]
    );

    await logAction(
      req.user.id, req.user.name, req.user.role, 'Approved Final Placement Offer', 'Student', studentId,
      'Final Round', `Placed with ${company ? company.name : 'Company'} at ${ctc || (company ? company.ctc : 7.0)} LPA`
    );

    await createNotification(
      'Placement Offer Approved & Released!',
      `Admin approved placement offer for ${student.name} (${student.roll_number}) with ${company ? company.name : 'Company'} at ${ctc || (company ? company.ctc : 7.0)} LPA.`,
      'approval'
    );

    res.json({ message: 'Offer approved and student marked Placed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/approval/:studentId/reject', authenticateToken, authorizeRoles('Admin'), async (req, res) => {
  const studentId = req.params.studentId;
  try {
    const student = await dbHelper.get('SELECT * FROM students WHERE id = ?', [studentId]);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    await dbHelper.run("UPDATE students SET current_phase = 'Rejected' WHERE id = ?", [studentId]);
    await logAction(req.user.id, req.user.name, req.user.role, 'Rejected Final Offer Approval', 'Student', studentId, 'Final Round', 'Rejected');

    res.json({ message: 'Candidate recruitment phase marked as Rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// REPORTS & AUDIT LOGS
// ==========================================
app.get('/api/reports/summary', authenticateToken, async (req, res) => {
  try {
    const totalStudentsRes = await dbHelper.get('SELECT COUNT(*) as count FROM students WHERE is_deleted = 0');
    const totalStudents = totalStudentsRes ? parseInt(totalStudentsRes.count) : 0;

    const placedRes = await dbHelper.get("SELECT COUNT(*) as count FROM students WHERE placement_status = 'Placed' AND is_deleted = 0");
    const placedStudents = placedRes ? parseInt(placedRes.count) : 0;

    const maxCtcRes = await dbHelper.get("SELECT MAX(ctc) as max FROM students WHERE placement_status = 'Placed' AND is_deleted = 0");
    const highestCTC = maxCtcRes && maxCtcRes.max ? parseFloat(maxCtcRes.max) : 0;

    const avgCtcRes = await dbHelper.get("SELECT AVG(ctc) as avg FROM students WHERE placement_status = 'Placed' AND is_deleted = 0");
    const averageCTC = avgCtcRes && avgCtcRes.avg ? parseFloat(parseFloat(avgCtcRes.avg).toFixed(2)) : 0;

    const byDept = await dbHelper.all(`
      SELECT department, COUNT(*) as total,
             SUM(CASE WHEN placement_status = 'Placed' THEN 1 ELSE 0 END) as placed,
             MAX(ctc) as highest_ctc,
             AVG(CASE WHEN placement_status = 'Placed' THEN ctc ELSE NULL END) as avg_ctc
      FROM students
      WHERE is_deleted = 0
      GROUP BY department
    `);

    const byCompany = await dbHelper.all(`
      SELECT c.name, c.location, c.ctc, COUNT(s.id) as placed_count
      FROM companies c
      LEFT JOIN students s ON s.company_id = c.id AND s.placement_status = 'Placed' AND s.is_deleted = 0
      GROUP BY c.id, c.name, c.location, c.ctc
      ORDER BY placed_count DESC
    `);

    res.json({
      metrics: {
        totalStudents,
        placedStudents,
        yetToPlace: totalStudents - placedStudents,
        placementRate: Math.round((placedStudents / (totalStudents || 1)) * 100),
        highestCTC,
        averageCTC
      },
      byDepartment: byDept || [],
      byCompany: byCompany || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/audit-logs', authenticateToken, authorizeRoles('Admin', 'Manager'), async (req, res) => {
  try {
    const logs = await dbHelper.all('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 50');
    res.json(logs || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Auto-initialize schema on startup
initSchema().catch(err => console.error('Database schema init error:', err));

// Export Express app for Vercel Serverless Functions
module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
