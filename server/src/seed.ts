import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { db, setMeta } from './db.js';

interface SeedQuestion {
  id: string;
  topicId: string;
  subjectId: string;
  questionText: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string;
}

export function seedIfEmpty(): void {
  const existing = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (existing.count > 0) return;

  const now = new Date();
  const iso = (daysAgo = 0, hoursAgo = 0) =>
    new Date(now.getTime() - daysAgo * 86400000 - hoursAgo * 3600000).toISOString();

  const studentHash = bcrypt.hashSync('student123', 8);
  const teacherHash = bcrypt.hashSync('teacher123', 8);
  const adminHash = bcrypt.hashSync('admin123', 8);

  // 1. Users
  const users = [
    { id: 'u-admin-1', name: 'Dr. Rajesh Kulkarni', email: 'admin@vidyasetu.edu', hash: adminHash, role: 'admin', grade: 'Admin', school: 'VidyaSetu State Hub', village: 'Pune', streak: 12, sync: iso(0, 1) },
    { id: 'u-teacher-1', name: 'Prof. Sunita Deshmukh', email: 'teacher@vidyasetu.edu', hash: teacherHash, role: 'teacher', grade: 'Class 8 Mentor', school: 'ZP High School, Wai', village: 'Wai, Satara', streak: 8, sync: iso(0, 2) },
    { id: 'u-student-1', name: 'Aarav Patil', email: 'aarav@vidyasetu.edu', hash: studentHash, role: 'student', grade: 'Class 8', school: 'ZP High School, Wai', village: 'Wai, Satara', streak: 6, sync: iso(0, 3) },
    { id: 'u-student-2', name: 'Sneha Jadhav', email: 'sneha@vidyasetu.edu', hash: studentHash, role: 'student', grade: 'Class 8', school: 'ZP High School, Wai', village: 'Panchgani, Satara', streak: 9, sync: iso(0, 1) },
    { id: 'u-student-3', name: 'Rohan Shinde', email: 'rohan@vidyasetu.edu', hash: studentHash, role: 'student', grade: 'Class 8', school: 'ZP High School, Wai', village: 'Bhuinj, Satara', streak: 2, sync: iso(2, 5) },
    { id: 'u-student-4', name: 'Meera Pawar', email: 'meera@vidyasetu.edu', hash: studentHash, role: 'student', grade: 'Class 9', school: 'ZP High School, Wai', village: 'Khandala, Satara', streak: 5, sync: iso(1, 4) },
    { id: 'u-student-5', name: 'Kiran Bhosale', email: 'kiran@vidyasetu.edu', hash: studentHash, role: 'student', grade: 'Class 8', school: 'ZP High School, Wai', village: 'Wai, Satara', streak: 3, sync: iso(4, 2) },
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, grade, school, village, active, streak_days, last_active_date, last_sync_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
  `);

  for (const u of users) {
    insertUser.run(u.id, u.name, u.email, u.hash, u.role, u.grade, u.school, u.village, u.streak, iso(0).slice(0, 10), u.sync, iso(30));
  }

  // 2. Classes & Enrollments
  db.prepare(`
    INSERT INTO classes (id, name, grade, school, teacher_id, description, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('cls-8a', 'Class 8 – Olympiad Batch A', 'Class 8', 'ZP High School, Wai', 'u-teacher-1', 'Core National Science & Math Olympiad preparation batch for rural scholars.', iso(25));

  db.prepare(`
    INSERT INTO classes (id, name, grade, school, teacher_id, description, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('cls-9a', 'Class 9 – Foundation Scholars', 'Class 9', 'ZP High School, Wai', 'u-teacher-1', 'Advanced problem-solving cohort preparing for regional talent search.', iso(20));

  const enroll = db.prepare('INSERT INTO class_students (class_id, student_id, enrolled_at) VALUES (?, ?, ?)');
  enroll.run('cls-8a', 'u-student-1', iso(24));
  enroll.run('cls-8a', 'u-student-2', iso(24));
  enroll.run('cls-8a', 'u-student-3', iso(24));
  enroll.run('cls-8a', 'u-student-5', iso(22));
  enroll.run('cls-9a', 'u-student-4', iso(19));

  // 3. Subjects
  const subjects = [
    { id: 'sub-math', name: 'Mathematics', code: 'MATH', description: 'Number theory, algebra, geometry, mensuration, and quantitative Olympiad problem solving.', icon: 'calculator', color: '#2563eb' },
    { id: 'sub-sci', name: 'Science', code: 'SCI', description: 'Physics, chemistry, and biology concepts tested in National Science Olympiads.', icon: 'flask', color: '#059669' },
    { id: 'sub-logic', name: 'Logical Reasoning', code: 'LOGIC', description: 'Pattern recognition, series, coding-decoding, spatial reasoning, and analytical puzzles.', icon: 'brain', color: '#d97706' },
  ];

  const insertSubject = db.prepare(`
    INSERT INTO subjects (id, name, code, description, icon, color, version, updated_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);
  for (const s of subjects) {
    insertSubject.run(s.id, s.name, s.code, s.description, s.icon, s.color, iso(10), iso(30));
  }

  // 4. Topics
  const topics = [
    // Mathematics
    { id: 'top-math-1', subjectId: 'sub-math', title: 'Number Systems & Divisibility', chapter: 1, desc: 'Prime factorization, HCF/LCM, divisibility rules, and modular remainders.', diff: 'Easy', mins: 20 },
    { id: 'top-math-2', subjectId: 'sub-math', title: 'Linear Equations & Algebraic Identities', chapter: 2, desc: 'Solving word problems, identities, factorization, and simultaneous equations.', diff: 'Medium', mins: 25 },
    { id: 'top-math-3', subjectId: 'sub-math', title: 'Geometry, Triangles & Mensuration', chapter: 3, desc: 'Angle properties, Pythagoras theorem, area, perimeter, and volume problems.', diff: 'Hard', mins: 30 },
    { id: 'top-math-4', subjectId: 'sub-math', title: 'Ratio, Percentage & Profit-Loss', chapter: 4, desc: 'Proportional reasoning, compound percentage change, and commercial math.', diff: 'Medium', mins: 20 },
    // Science
    { id: 'top-sci-1', subjectId: 'sub-sci', title: 'Force, Pressure & Laws of Motion', chapter: 1, desc: 'Balanced forces, friction, atmospheric pressure, inertia, and momentum.', diff: 'Easy', mins: 20 },
    { id: 'top-sci-2', subjectId: 'sub-sci', title: 'Light, Reflection & Optics', chapter: 2, desc: 'Laws of reflection, plane and spherical mirrors, refraction, and dispersion.', diff: 'Medium', mins: 25 },
    { id: 'top-sci-3', subjectId: 'sub-sci', title: 'Cell Structure & Microorganisms', chapter: 3, desc: 'Organelles, plant vs animal cells, nitrogen fixation, and beneficial microbes.', diff: 'Easy', mins: 18 },
    { id: 'top-sci-4', subjectId: 'sub-sci', title: 'Acids, Bases, Salts & Reactions', chapter: 4, desc: 'pH scale, indicators, neutralization reactions, and everyday chemistry.', diff: 'Hard', mins: 25 },
    // Logical Reasoning
    { id: 'top-logic-1', subjectId: 'sub-logic', title: 'Number & Alphabet Series', chapter: 1, desc: 'Identify arithmetic, geometric, square, prime, and alternating sequences.', diff: 'Easy', mins: 15 },
    { id: 'top-logic-2', subjectId: 'sub-logic', title: 'Coding-Decoding & Blood Relations', chapter: 2, desc: 'Letter shifts, symbol ciphers, and multi-generation family trees.', diff: 'Medium', mins: 20 },
    { id: 'top-logic-3', subjectId: 'sub-logic', title: 'Direction Sense, Clocks & Puzzles', chapter: 3, desc: 'Compass navigation, clock angle formulas, and seating arrangements.', diff: 'Hard', mins: 25 },
  ];

  const insertTopic = db.prepare(`
    INSERT INTO topics (id, subject_id, title, chapter_number, description, difficulty, estimated_minutes, version, is_published, updated_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
  `);
  for (const t of topics) {
    insertTopic.run(t.id, t.subjectId, t.title, t.chapter, t.desc, t.diff, t.mins, iso(7), iso(28));
  }

  // 5. Questions (55 Olympiad MCQs with rich explanations)
  const questions: SeedQuestion[] = [
    // MATH 1: Number Systems & Divisibility
    {
      id: 'q-m1-1', topicId: 'top-math-1', subjectId: 'sub-math', difficulty: 'Easy', tags: 'LCM,HCF',
      questionText: 'What is the smallest positive integer that is divisible by 12, 15, and 20?',
      options: ['30', '60', '90', '120'], correctIndex: 1,
      explanation: 'Prime factorizations: 12 = 2² × 3, 15 = 3 × 5, 20 = 2² × 5. LCM = 2² × 3 × 5 = 60.'
    },
    {
      id: 'q-m1-2', topicId: 'top-math-1', subjectId: 'sub-math', difficulty: 'Easy', tags: 'Divisibility',
      questionText: 'If the 5-digit number 473x8 is divisible by 9, what is the digit x?',
      options: ['3', '4', '5', '6'], correctIndex: 2,
      explanation: 'A number is divisible by 9 if the sum of its digits is a multiple of 9. Sum = 4+7+3+x+8 = 22 + x. The next multiple of 9 is 27, so x = 27 − 22 = 5.'
    },
    {
      id: 'q-m1-3', topicId: 'top-math-1', subjectId: 'sub-math', difficulty: 'Medium', tags: 'Remainders',
      questionText: 'What is the remainder when 2¹⁰ is divided by 7?',
      options: ['1', '2', '4', '6'], correctIndex: 1,
      explanation: 'Note that 2³ = 8 ≡ 1 (mod 7). Therefore, 2¹⁰ = (2³)³ × 2¹ ≡ 1³ × 2 = 2 (mod 7).'
    },
    {
      id: 'q-m1-4', topicId: 'top-math-1', subjectId: 'sub-math', difficulty: 'Medium', tags: 'Factors',
      questionText: 'How many positive divisors does the number 72 have?',
      options: ['8', '10', '12', '14'], correctIndex: 2,
      explanation: '72 = 2³ × 3². Number of divisors = (3 + 1)(2 + 1) = 4 × 3 = 12.'
    },
    {
      id: 'q-m1-5', topicId: 'top-math-1', subjectId: 'sub-math', difficulty: 'Hard', tags: 'Unit Digit',
      questionText: 'What is the unit digit of 7²⁰²⁶?',
      options: ['1', '3', '7', '9'], correctIndex: 3,
      explanation: 'Unit digits of powers of 7 repeat in a cycle of 4: 7, 9, 3, 1. Since 2026 = 4 × 506 + 2, the unit digit matches 7², which is 9.'
    },

    // MATH 2: Linear Equations & Algebraic Identities
    {
      id: 'q-m2-1', topicId: 'top-math-2', subjectId: 'sub-math', difficulty: 'Easy', tags: 'Linear Equations',
      questionText: 'Solve for x: 3(2x − 4) = 2(x + 6).',
      options: ['4', '5', '6', '8'], correctIndex: 2,
      explanation: 'Expand both sides: 6x − 12 = 2x + 12 → 4x = 24 → x = 6.'
    },
    {
      id: 'q-m2-2', topicId: 'top-math-2', subjectId: 'sub-math', difficulty: 'Medium', tags: 'Identities',
      questionText: 'If x + 1/x = 5, what is the value of x² + 1/x²?',
      options: ['21', '23', '25', '27'], correctIndex: 1,
      explanation: 'Square both sides: (x + 1/x)² = x² + 2 + 1/x² = 25. Subtract 2 to get x² + 1/x² = 23.'
    },
    {
      id: 'q-m2-3', topicId: 'top-math-2', subjectId: 'sub-math', difficulty: 'Medium', tags: 'Word Problems',
      questionText: 'A father is currently 3 times as old as his son. In 12 years, he will be twice as old as his son. What is the son’s current age?',
      options: ['10 years', '12 years', '14 years', '16 years'], correctIndex: 1,
      explanation: 'Let son’s age = s, father’s age = 3s. In 12 years: 3s + 12 = 2(s + 12) → 3s + 12 = 2s + 24 → s = 12.'
    },
    {
      id: 'q-m2-4', topicId: 'top-math-2', subjectId: 'sub-math', difficulty: 'Hard', tags: 'Identities',
      questionText: 'If a + b = 7 and ab = 10, find the value of a³ + b³.',
      options: ['133', '143', '153', '213'], correctIndex: 0,
      explanation: 'Use a³ + b³ = (a + b)³ − 3ab(a + b) = 7³ − 3(10)(7) = 343 − 210 = 133.'
    },
    {
      id: 'q-m2-5', topicId: 'top-math-2', subjectId: 'sub-math', difficulty: 'Easy', tags: 'Factorization',
      questionText: 'Which of the following is the factored form of x² − 9y²?',
      options: ['(x − 3y)²', '(x + 3y)(x − 3y)', '(x + 9y)(x − y)', '(x − 9y)²'], correctIndex: 1,
      explanation: 'Using the difference of squares identity a² − b² = (a + b)(a − b) with a = x and b = 3y gives (x + 3y)(x − 3y).'
    },

    // MATH 3: Geometry, Triangles & Mensuration
    {
      id: 'q-m3-1', topicId: 'top-math-3', subjectId: 'sub-math', difficulty: 'Easy', tags: 'Angles',
      questionText: 'The angles of a triangle are in the ratio 2 : 3 : 4. What is the measure of the largest angle?',
      options: ['60°', '72°', '80°', '90°'], correctIndex: 2,
      explanation: 'Sum of angles = 180°. Total parts = 2 + 3 + 4 = 9. Each part = 20°. Largest angle = 4 × 20° = 80°.'
    },
    {
      id: 'q-m3-2', topicId: 'top-math-3', subjectId: 'sub-math', difficulty: 'Medium', tags: 'Pythagoras',
      questionText: 'A ladder 13 m long leans against a vertical wall with its foot 5 m away from the wall. How high up the wall does the ladder reach?',
      options: ['8 m', '10 m', '11 m', '12 m'], correctIndex: 3,
      explanation: 'By the Pythagorean theorem: height = √(13² − 5²) = √(169 − 25) = √144 = 12 m.'
    },
    {
      id: 'q-m3-3', topicId: 'top-math-3', subjectId: 'sub-math', difficulty: 'Hard', tags: 'Mensuration',
      questionText: 'If the radius of a circle is doubled, by what percentage does its area increase?',
      options: ['100%', '200%', '300%', '400%'], correctIndex: 2,
      explanation: 'Original area = πr². New area = π(2r)² = 4πr². Increase = 3πr², which is (3πr² / πr²) × 100% = 300%.'
    },
    {
      id: 'q-m3-4', topicId: 'top-math-3', subjectId: 'sub-math', difficulty: 'Hard', tags: 'Polygons',
      questionText: 'How many diagonals does a regular octagon (8-sided polygon) have?',
      options: ['16', '20', '24', '28'], correctIndex: 1,
      explanation: 'Number of diagonals in an n-gon = n(n − 3)/2. For n = 8: 8 × 5 / 2 = 20 diagonals.'
    },
    {
      id: 'q-m3-5', topicId: 'top-math-3', subjectId: 'sub-math', difficulty: 'Medium', tags: 'Volume',
      questionText: 'A cube has a total surface area of 150 cm². What is its volume?',
      options: ['64 cm³', '100 cm³', '125 cm³', '216 cm³'], correctIndex: 2,
      explanation: 'Total surface area = 6a² = 150 → a² = 25 → a = 5 cm. Volume = a³ = 5³ = 125 cm³.'
    },

    // MATH 4: Ratio, Percentage & Profit-Loss
    {
      id: 'q-m4-1', topicId: 'top-math-4', subjectId: 'sub-math', difficulty: 'Easy', tags: 'Percentage',
      questionText: 'A farmer harvested 480 kg of wheat last year and 540 kg this year. What is the percentage increase?',
      options: ['10%', '12.5%', '15%', '18%'], correctIndex: 1,
      explanation: 'Increase = 540 − 480 = 60 kg. Percentage increase = (60 / 480) × 100% = 12.5%.'
    },
    {
      id: 'q-m4-2', topicId: 'top-math-4', subjectId: 'sub-math', difficulty: 'Medium', tags: 'Profit-Loss',
      questionText: 'A shopkeeper sells a bicycle for ₹3,600 at a 20% profit. What was the cost price of the bicycle?',
      options: ['₹2,880', '₹3,000', '₹3,120', '₹3,200'], correctIndex: 1,
      explanation: 'SP = 1.20 × CP → CP = 3600 / 1.20 = ₹3,000.'
    },
    {
      id: 'q-m4-3', topicId: 'top-math-4', subjectId: 'sub-math', difficulty: 'Medium', tags: 'Ratio',
      questionText: 'If A : B = 2 : 3 and B : C = 4 : 5, what is the ratio A : B : C?',
      options: ['8 : 12 : 15', '6 : 12 : 15', '8 : 10 : 15', '4 : 6 : 5'], correctIndex: 0,
      explanation: 'Make B common (LCM of 3 and 4 is 12): A : B = 8 : 12 and B : C = 12 : 15, so A : B : C = 8 : 12 : 15.'
    },
    {
      id: 'q-m4-4', topicId: 'top-math-4', subjectId: 'sub-math', difficulty: 'Hard', tags: 'Successive Change',
      questionText: 'The price of an item is increased by 20% and then decreased by 20%. What is the net percentage change?',
      options: ['No change', '2% decrease', '4% decrease', '4% increase'], correctIndex: 2,
      explanation: 'Start with 100 → +20% gives 120 → −20% of 120 is 24 → final price = 96. Net change = 4% decrease.'
    },
    {
      id: 'q-m4-5', topicId: 'top-math-4', subjectId: 'sub-math', difficulty: 'Easy', tags: 'Simple Interest',
      questionText: 'Find the simple interest on ₹2,000 at 6% per annum for 3 years.',
      options: ['₹300', '₹360', '₹400', '₹420'], correctIndex: 1,
      explanation: 'SI = (P × R × T) / 100 = (2000 × 6 × 3) / 100 = ₹360.'
    },

    // SCI 1: Force, Pressure & Laws of Motion
    {
      id: 'q-s1-1', topicId: 'top-sci-1', subjectId: 'sub-sci', difficulty: 'Easy', tags: 'Pressure',
      questionText: 'Why do school bags have wide straps instead of thin strings?',
      options: ['To increase total force', 'To decrease pressure by increasing contact area', 'To reduce the mass of the bag', 'To increase friction with clothes'], correctIndex: 1,
      explanation: 'Pressure = Force / Area. Wide straps increase the area over which the bag’s weight acts, reducing pressure on the shoulders.'
    },
    {
      id: 'q-s1-2', topicId: 'top-sci-1', subjectId: 'sub-sci', difficulty: 'Easy', tags: 'Forces',
      questionText: 'What is the SI unit of force?',
      options: ['Pascal', 'Joule', 'Newton', 'Watt'], correctIndex: 2,
      explanation: 'The SI unit of force is the Newton (N), defined as 1 kg·m/s². Pascal is pressure, Joule is energy, Watt is power.'
    },
    {
      id: 'q-s1-3', topicId: 'top-sci-1', subjectId: 'sub-sci', difficulty: 'Medium', tags: 'Newton Laws',
      questionText: 'When a moving bus suddenly stops, passengers tend to fall forward. Which law explains this?',
      options: ['Newton’s First Law (Inertia)', 'Newton’s Second Law', 'Newton’s Third Law', 'Law of Gravitation'], correctIndex: 0,
      explanation: 'Due to inertia of motion (Newton’s First Law), the upper body continues moving forward even after the feet stop with the bus.'
    },
    {
      id: 'q-s1-4', topicId: 'top-sci-1', subjectId: 'sub-sci', difficulty: 'Medium', tags: 'Calculation',
      questionText: 'A force of 50 N acts perpendicularly on an area of 0.5 m². What is the pressure exerted?',
      options: ['25 Pa', '50 Pa', '100 Pa', '250 Pa'], correctIndex: 2,
      explanation: 'Pressure = Force / Area = 50 N / 0.5 m² = 100 N/m² = 100 Pa.'
    },
    {
      id: 'q-s1-5', topicId: 'top-sci-1', subjectId: 'sub-sci', difficulty: 'Hard', tags: 'Friction',
      questionText: 'Arrange the following types of friction in strictly decreasing order of magnitude for the same pair of surfaces:',
      options: ['Rolling > Sliding > Static', 'Static > Sliding > Rolling', 'Sliding > Static > Rolling', 'Static > Rolling > Sliding'], correctIndex: 1,
      explanation: 'Static friction is greatest (must overcome interlocking at rest), followed by sliding friction, while rolling friction is the smallest.'
    },

    // SCI 2: Light, Reflection & Optics
    {
      id: 'q-s2-1', topicId: 'top-sci-2', subjectId: 'sub-sci', difficulty: 'Easy', tags: 'Reflection',
      questionText: 'If a ray of light strikes a plane mirror at an angle of 35° with the mirror surface, what is the angle of reflection?',
      options: ['35°', '55°', '70°', '90°'], correctIndex: 1,
      explanation: 'Angle of incidence is measured from the normal: i = 90° − 35° = 55°. By the law of reflection, angle of reflection r = i = 55°.'
    },
    {
      id: 'q-s2-2', topicId: 'top-sci-2', subjectId: 'sub-sci', difficulty: 'Medium', tags: 'Mirrors',
      questionText: 'Which type of mirror is used as a rear-view mirror in vehicles to provide a wider field of view?',
      options: ['Plane mirror', 'Concave mirror', 'Convex mirror', 'Parabolic mirror'], correctIndex: 2,
      explanation: 'Convex mirrors always form erect, diminished images and cover a much wider field of view behind the vehicle.'
    },
    {
      id: 'q-s2-3', topicId: 'top-sci-2', subjectId: 'sub-sci', difficulty: 'Medium', tags: 'Dispersion',
      questionText: 'When white light passes through a glass prism, which color bends (deviates) the MOST?',
      options: ['Red', 'Yellow', 'Green', 'Violet'], correctIndex: 3,
      explanation: 'Violet light has the shortest wavelength in the visible spectrum and travels slowest in glass, so it refracts and deviates the most.'
    },
    {
      id: 'q-s2-4', topicId: 'top-sci-2', subjectId: 'sub-sci', difficulty: 'Hard', tags: 'Multiple Images',
      questionText: 'Two plane mirrors are placed at an angle of 60° to each other. How many images of an object placed between them are formed?',
      options: ['4', '5', '6', '7'], correctIndex: 1,
      explanation: 'Using n = (360° / θ) − 1 = (360 / 60) − 1 = 6 − 1 = 5 images.'
    },
    {
      id: 'q-s2-5', topicId: 'top-sci-2', subjectId: 'sub-sci', difficulty: 'Easy', tags: 'Human Eye',
      questionText: 'Which part of the human eye controls the amount of light entering the pupil?',
      options: ['Retina', 'Cornea', 'Iris', 'Optic nerve'], correctIndex: 2,
      explanation: 'The iris is the colored muscular diaphragm that expands or contracts to adjust pupil size and regulate light intake.'
    },

    // SCI 3: Cell Structure & Microorganisms
    {
      id: 'q-s3-1', topicId: 'top-sci-3', subjectId: 'sub-sci', difficulty: 'Easy', tags: 'Organelles',
      questionText: 'Which cell organelle is known as the "powerhouse of the cell" because it generates ATP?',
      options: ['Ribosome', 'Mitochondria', 'Golgi apparatus', 'Lysosome'], correctIndex: 1,
      explanation: 'Mitochondria perform cellular respiration to release energy stored as ATP molecules.'
    },
    {
      id: 'q-s3-2', topicId: 'top-sci-3', subjectId: 'sub-sci', difficulty: 'Easy', tags: 'Plant Cells',
      questionText: 'Which two structures are present in plant cells but absent in animal cells?',
      options: ['Nucleus and cytoplasm', 'Cell wall and chloroplasts', 'Cell membrane and mitochondria', 'Ribosomes and vacuoles'], correctIndex: 1,
      explanation: 'Plant cells have a rigid cellulose cell wall for support and chloroplasts for photosynthesis, both absent in animal cells.'
    },
    {
      id: 'q-s3-3', topicId: 'top-sci-3', subjectId: 'sub-sci', difficulty: 'Medium', tags: 'Microbes',
      questionText: 'Which bacterium lives in the root nodules of leguminous plants and fixes atmospheric nitrogen?',
      options: ['Lactobacillus', 'Rhizobium', 'E. coli', 'Streptococcus'], correctIndex: 1,
      explanation: 'Rhizobium forms a symbiotic relationship with legumes (peas, beans, gram), converting atmospheric N₂ into usable nitrates.'
    },
    {
      id: 'q-s3-4', topicId: 'top-sci-3', subjectId: 'sub-sci', difficulty: 'Medium', tags: 'Fermentation',
      questionText: 'During bread making, yeast produces which gas that causes dough to rise?',
      options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'], correctIndex: 2,
      explanation: 'Yeast respires anaerobically (fermentation), breaking down sugar into alcohol and carbon dioxide bubbles that make dough fluffy.'
    },
    {
      id: 'q-s3-5', topicId: 'top-sci-3', subjectId: 'sub-sci', difficulty: 'Hard', tags: 'Disease',
      questionText: 'Malaria is caused by a protozoan (Plasmodium) transmitted by which vector?',
      options: ['Male Anopheles mosquito', 'Female Anopheles mosquito', 'Female Aedes mosquito', 'Housefly'], correctIndex: 1,
      explanation: 'Female Anopheles mosquitoes transmit Plasmodium parasites when they bite humans for blood meals.'
    },

    // SCI 4: Acids, Bases, Salts & Reactions
    {
      id: 'q-s4-1', topicId: 'top-sci-4', subjectId: 'sub-sci', difficulty: 'Easy', tags: 'Indicators',
      questionText: 'What color change occurs when blue litmus paper is dipped into lemon juice?',
      options: ['Stays blue', 'Turns red', 'Turns green', 'Turns colorless'], correctIndex: 1,
      explanation: 'Lemon juice contains citric acid. Acids turn blue litmus paper red.'
    },
    {
      id: 'q-s4-2', topicId: 'top-sci-4', subjectId: 'sub-sci', difficulty: 'Medium', tags: 'Neutralization',
      questionText: 'What are the products formed when hydrochloric acid (HCl) reacts with sodium hydroxide (NaOH)?',
      options: ['NaCl + H₂', 'NaCl + H₂O', 'NaOH + Cl₂', 'Na₂O + HCl'], correctIndex: 1,
      explanation: 'Acid + Base → Salt + Water. Here: HCl + NaOH → NaCl (common salt) + H₂O (water).'
    },
    {
      id: 'q-s4-3', topicId: 'top-sci-4', subjectId: 'sub-sci', difficulty: 'Medium', tags: 'Everyday Chemistry',
      questionText: 'Why is baking soda (sodium bicarbonate) applied to an ant bite?',
      options: ['It cools the skin only', 'It neutralizes the formic acid injected by the ant', 'It adds acid to the wound', 'It absorbs water'], correctIndex: 1,
      explanation: 'Ant stings inject formic acid. Baking soda is a mild base that neutralizes the acid and relieves irritation.'
    },
    {
      id: 'q-s4-4', topicId: 'top-sci-4', subjectId: 'sub-sci', difficulty: 'Hard', tags: 'pH Scale',
      questionText: 'A solution has a pH of 2. Another solution has a pH of 5. How many times more acidic (higher H⁺ concentration) is the first solution?',
      options: ['3 times', '30 times', '100 times', '1,000 times'], correctIndex: 3,
      explanation: 'The pH scale is logarithmic (base 10). A difference of 3 pH units means 10³ = 1,000 times higher H⁺ ion concentration.'
    },
    {
      id: 'q-s4-5', topicId: 'top-sci-4', subjectId: 'sub-sci', difficulty: 'Hard', tags: 'Reactions',
      questionText: 'Which gas is evolved when dilute sulfuric acid reacts with zinc granules?',
      options: ['Carbon dioxide', 'Sulfur dioxide', 'Hydrogen', 'Oxygen'], correctIndex: 2,
      explanation: 'Active metals react with dilute acids to produce salt and hydrogen gas: Zn + H₂SO₄ → ZnSO₄ + H₂↑ (burns with a pop sound).'
    },

    // LOGIC 1: Number & Alphabet Series
    {
      id: 'q-l1-1', topicId: 'top-logic-1', subjectId: 'sub-logic', difficulty: 'Easy', tags: 'Number Series',
      questionText: 'Find the next number in the series: 2, 6, 12, 20, 30, ?',
      options: ['38', '40', '42', '44'], correctIndex: 2,
      explanation: 'Differences are +4, +6, +8, +10, so next difference is +12: 30 + 12 = 42. (Also n(n+1): 6×7 = 42).'
    },
    {
      id: 'q-l1-2', topicId: 'top-logic-1', subjectId: 'sub-logic', difficulty: 'Easy', tags: 'Alphabet Series',
      questionText: 'Find the missing term: B, E, H, K, N, ?',
      options: ['P', 'Q', 'R', 'S'], correctIndex: 1,
      explanation: 'Each letter advances by +3 positions in the alphabet: B(2), E(5), H(8), K(11), N(14), Q(17).'
    },
    {
      id: 'q-l1-3', topicId: 'top-logic-1', subjectId: 'sub-logic', difficulty: 'Medium', tags: 'Squares & Cubes',
      questionText: 'Find the next number: 1, 8, 27, 64, 125, ?',
      options: ['196', '216', '225', '256'], correctIndex: 1,
      explanation: 'These are consecutive cubes: 1³, 2³, 3³, 4³, 5³, so the next term is 6³ = 216.'
    },
    {
      id: 'q-l1-4', topicId: 'top-logic-1', subjectId: 'sub-logic', difficulty: 'Medium', tags: 'Alternating Series',
      questionText: 'Find the wrong number in the series: 3, 7, 15, 31, 64, 127.',
      options: ['15', '31', '64', '127'], correctIndex: 2,
      explanation: 'Rule is (previous × 2) + 1: 3→7→15→31→63→127. So 64 is wrong and should be 63.'
    },
    {
      id: 'q-l1-5', topicId: 'top-logic-1', subjectId: 'sub-logic', difficulty: 'Hard', tags: 'Fibonacci Variant',
      questionText: 'Find the next term: 4, 5, 9, 14, 23, 37, ?',
      options: ['56', '58', '60', '62'], correctIndex: 2,
      explanation: 'Each term equals the sum of the two preceding terms: 4+5=9, 5+9=14, 9+14=23, 14+23=37, 23+37=60.'
    },

    // LOGIC 2: Coding-Decoding & Blood Relations
    {
      id: 'q-l2-1', topicId: 'top-logic-2', subjectId: 'sub-logic', difficulty: 'Easy', tags: 'Coding',
      questionText: 'If SCHOOL is coded as TDIPPM, how is BOOK coded in the same language?',
      options: ['CPPL', 'CPPM', 'BPPK', 'DQQL'], correctIndex: 0,
      explanation: 'Each letter is shifted forward by +1: B→C, O→P, O→P, K→L, giving CPPL.'
    },
    {
      id: 'q-l2-2', topicId: 'top-logic-2', subjectId: 'sub-logic', difficulty: 'Medium', tags: 'Blood Relations',
      questionText: 'Pointing to a photograph, Maya says, "He is the son of my grandfather’s only son." How is the boy related to Maya?',
      options: ['Cousin', 'Uncle', 'Brother', 'Nephew'], correctIndex: 2,
      explanation: 'Maya’s grandfather’s only son is Maya’s father. The son of Maya’s father is Maya’s brother.'
    },
    {
      id: 'q-l2-3', topicId: 'top-logic-2', subjectId: 'sub-logic', difficulty: 'Medium', tags: 'Number Coding',
      questionText: 'If CAT = 24 and DOG = 26, what is the code for BAT? (A=1, B=2, ..., Z=26)',
      options: ['21', '22', '23', '24'], correctIndex: 2,
      explanation: 'Sum of alphabet positions: C(3)+A(1)+T(20)=24; D(4)+O(15)+G(7)=26; B(2)+A(1)+T(20)=23.'
    },
    {
      id: 'q-l2-4', topicId: 'top-logic-2', subjectId: 'sub-logic', difficulty: 'Hard', tags: 'Reverse Coding',
      questionText: 'If INDIA is coded as 9-14-4-9-1, and TRAIN is coded as 20-18-1-9-14, how is SETU coded?',
      options: ['19-5-20-21', '18-5-20-21', '19-6-20-22', '19-5-19-21'], correctIndex: 0,
      explanation: 'Each letter maps directly to its alphabet rank: S=19, E=5, T=20, U=21 → 19-5-20-21.'
    },
    {
      id: 'q-l2-5', topicId: 'top-logic-2', subjectId: 'sub-logic', difficulty: 'Hard', tags: 'Blood Relations',
      questionText: 'A is the sister of B. B is the brother of C. C is the father of D. How is A related to D?',
      options: ['Mother', 'Sister', 'Aunt', 'Grandmother'], correctIndex: 2,
      explanation: 'A, B, and C are siblings, with A being female and C being D’s father. Thus A is D’s paternal aunt.'
    },

    // LOGIC 3: Direction Sense, Clocks & Puzzles
    {
      id: 'q-l3-1', topicId: 'top-logic-3', subjectId: 'sub-logic', difficulty: 'Easy', tags: 'Directions',
      questionText: 'Ravi walks 4 km North, then turns right and walks 3 km East. How far is he from his starting point?',
      options: ['5 km', '6 km', '7 km', '8 km'], correctIndex: 0,
      explanation: 'North and East are perpendicular. Shortest distance = √(4² + 3²) = √(16 + 9) = 5 km.'
    },
    {
      id: 'q-l3-2', topicId: 'top-logic-3', subjectId: 'sub-logic', difficulty: 'Medium', tags: 'Clocks',
      questionText: 'What is the acute angle between the hour hand and minute hand of a clock at 3:30?',
      options: ['60°', '75°', '80°', '90°'], correctIndex: 1,
      explanation: 'Angle = |30H − 5.5M| = |30(3) − 5.5(30)| = |90 − 165| = 75°.'
    },
    {
      id: 'q-l3-3', topicId: 'top-logic-3', subjectId: 'sub-logic', difficulty: 'Medium', tags: 'Ranking',
      questionText: 'In a class of 40 students, Priya ranks 14th from the top. What is her rank from the bottom?',
      options: ['25th', '26th', '27th', '28th'], correctIndex: 2,
      explanation: 'Rank from bottom = Total − Rank from top + 1 = 40 − 14 + 1 = 27th.'
    },
    {
      id: 'q-l3-4', topicId: 'top-logic-3', subjectId: 'sub-logic', difficulty: 'Hard', tags: 'Calendar',
      questionText: 'If 1st January of a non-leap year falls on a Monday, what day of the week will 31st December of the same year be?',
      options: ['Sunday', 'Monday', 'Tuesday', 'Wednesday'], correctIndex: 1,
      explanation: 'A non-leap year has 365 days = 52 full weeks + 1 day. So the 365th day (Dec 31) falls on the same weekday as Jan 1 (Monday).'
    },
    {
      id: 'q-l3-5', topicId: 'top-logic-3', subjectId: 'sub-logic', difficulty: 'Hard', tags: 'Puzzles',
      questionText: 'Five friends sit in a row facing North. A is to the immediate left of B. C is at the extreme right. D is between B and E. E is immediately left of C. Who sits in the exact middle?',
      options: ['A', 'B', 'D', 'E'], correctIndex: 2,
      explanation: 'From right to left: C is 5th, E is 4th, D is 3rd (between B and E), B is 2nd, A is 1st. Order: A, B, D, E, C. Middle is D.'
    },
  ];

  const insertQ = db.prepare(`
    INSERT INTO questions (id, topic_id, subject_id, question_text, options_json, correct_index, explanation, difficulty, tags, version, is_published, updated_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
  `);
  for (const q of questions) {
    insertQ.run(q.id, q.topicId, q.subjectId, q.questionText, JSON.stringify(q.options), q.correctIndex, q.explanation, q.difficulty, q.tags, iso(5), iso(25));
  }

  // 6. Mock Exams
  const exams = [
    {
      id: 'exam-full-1',
      title: 'Rural National Olympiad – Full Mock Test 1',
      description: 'Comprehensive timed mock exam spanning Mathematics, Science, and Logical Reasoning at Olympiad level.',
      subjectId: null,
      examType: 'Full Olympiad',
      duration: 20,
      difficulty: 'Medium',
      questionIds: [
        'q-m1-1', 'q-m1-3', 'q-m2-2', 'q-m3-2', 'q-m4-2',
        'q-s1-1', 'q-s1-3', 'q-s2-1', 'q-s3-1', 'q-s4-2',
        'q-l1-1', 'q-l1-4', 'q-l2-1', 'q-l2-2', 'q-l3-2'
      ]
    },
    {
      id: 'exam-math-1',
      title: 'Mathematics Olympiad Sprint Test',
      description: 'Focused quantitative test covering Number Systems, Algebra, Geometry, and Percentages.',
      subjectId: 'sub-math',
      examType: 'Subject Test',
      duration: 15,
      difficulty: 'Medium',
      questionIds: ['q-m1-1', 'q-m1-2', 'q-m1-4', 'q-m2-1', 'q-m2-2', 'q-m2-3', 'q-m3-1', 'q-m3-2', 'q-m4-1', 'q-m4-3']
    },
    {
      id: 'exam-sci-1',
      title: 'Science Foundation Olympiad Challenge',
      description: 'Test your conceptual clarity in Physics, Chemistry, and Biology.',
      subjectId: 'sub-sci',
      examType: 'Subject Test',
      duration: 12,
      difficulty: 'Easy',
      questionIds: ['q-s1-1', 'q-s1-2', 'q-s1-4', 'q-s2-1', 'q-s2-2', 'q-s2-5', 'q-s3-1', 'q-s3-3', 'q-s4-1', 'q-s4-3']
    },
    {
      id: 'exam-logic-1',
      title: 'Logical Reasoning & Aptitude Speed Test',
      description: 'Sharpen your analytical reasoning with series, ciphers, and spatial puzzles.',
      subjectId: 'sub-logic',
      examType: 'Subject Test',
      duration: 10,
      difficulty: 'Hard',
      questionIds: ['q-l1-1', 'q-l1-3', 'q-l1-5', 'q-l2-2', 'q-l2-4', 'q-l3-1', 'q-l3-2', 'q-l3-5']
    }
  ];

  const insertExam = db.prepare(`
    INSERT INTO mock_exams (id, title, description, subject_id, exam_type, duration_minutes, difficulty, question_ids_json, is_published, version, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 'u-admin-1', ?, ?)
  `);
  for (const e of exams) {
    insertExam.run(e.id, e.title, e.description, e.subjectId, e.examType, e.duration, e.difficulty, JSON.stringify(e.questionIds), iso(12), iso(4));
  }

  // 7. Seed realistic Practice Attempts for Students so Analytics/Recommendations work out of the box!
  const insertAttempt = db.prepare(`
    INSERT INTO practice_attempts (id, student_id, question_id, topic_id, subject_id, selected_index, is_correct, time_spent_sec, attempted_at, synced_at, offline_recorded)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const qById = new Map(questions.map((q) => [q.id, q]));

  const seedStudentAttempts = (studentId: string, entries: Array<[string, boolean, number, boolean]>) => {
    for (const [qId, correct, daysAgo, offline] of entries) {
      const q = qById.get(qId);
      if (!q) continue;
      const selected = correct ? q.correctIndex : (q.correctIndex + 1) % 4;
      insertAttempt.run(
        uuid(),
        studentId,
        q.id,
        q.topicId,
        q.subjectId,
        selected,
        correct ? 1 : 0,
        22 + Math.floor(Math.random() * 25),
        iso(daysAgo, Math.floor(Math.random() * 8)),
        iso(Math.max(0, daysAgo - 1), 1),
        offline ? 1 : 0
      );
    }
  };

  // Aarav Patil: strong in Number Systems & Force, weak in Geometry & Acids/Bases (great for adaptive recommendations!)
  seedStudentAttempts('u-student-1', [
    ['q-m1-1', true, 6, true], ['q-m1-2', true, 6, true], ['q-m1-3', true, 5, false], ['q-m1-4', false, 5, false],
    ['q-m2-1', true, 4, true], ['q-m2-2', false, 4, true], ['q-m2-3', true, 3, false],
    ['q-m3-1', false, 3, true], ['q-m3-2', false, 2, true], ['q-m3-3', false, 2, true], ['q-m3-5', true, 1, false],
    ['q-s1-1', true, 5, false], ['q-s1-2', true, 5, false], ['q-s1-3', true, 4, true], ['q-s1-4', true, 3, false],
    ['q-s4-1', true, 2, true], ['q-s4-2', false, 2, true], ['q-s4-4', false, 1, true],
    ['q-l1-1', true, 4, false], ['q-l1-2', true, 3, false], ['q-l1-3', true, 1, true], ['q-l2-1', true, 1, false], ['q-l2-2', false, 0, true],
  ]);

  // Sneha Jadhav: top performer
  seedStudentAttempts('u-student-2', [
    ['q-m1-1', true, 5, false], ['q-m1-2', true, 5, false], ['q-m1-3', true, 4, false],
    ['q-m3-1', true, 3, true], ['q-m3-2', true, 3, true], ['q-m3-3', true, 2, false],
    ['q-s1-1', true, 4, false], ['q-s2-1', true, 2, false], ['q-s4-2', true, 1, false],
    ['q-l1-1', true, 1, false], ['q-l2-1', true, 1, false], ['q-l3-1', false, 0, false],
  ]);

  // Rohan Shinde: struggling in Algebra & Geometry, hasn't synced in 2 days
  seedStudentAttempts('u-student-3', [
    ['q-m1-1', true, 6, true], ['q-m1-2', false, 6, true],
    ['q-m2-1', false, 5, true], ['q-m2-2', false, 4, true], ['q-m2-3', false, 3, true],
    ['q-m3-1', false, 3, true], ['q-m3-2', false, 2, true],
    ['q-s1-1', true, 4, true], ['q-s4-1', false, 2, true],
  ]);

  // Meera Pawar & Kiran Bhosale
  seedStudentAttempts('u-student-4', [
    ['q-m1-1', true, 4, false], ['q-m2-1', true, 3, false], ['q-m3-1', true, 2, false],
    ['q-s2-1', false, 2, false], ['q-s2-2', true, 1, false], ['q-l1-1', true, 1, false],
  ]);
  seedStudentAttempts('u-student-5', [
    ['q-m1-1', false, 5, true], ['q-m3-1', false, 4, true], ['q-s4-1', false, 4, true], ['q-s4-2', false, 4, true], ['q-l1-1', true, 4, true],
  ]);

  // 8. Seed Mock Exam Attempts
  const insertExamAttempt = db.prepare(`
    INSERT INTO exam_attempts (id, exam_id, student_id, answers_json, marked_review_json, score, total_questions, accuracy, time_taken_sec, auto_submitted, started_at, submitted_at, synced_at, offline_recorded)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertExamAttempt.run(
    uuid(), 'exam-math-1', 'u-student-1',
    JSON.stringify({ 'q-m1-1': 1, 'q-m1-2': 2, 'q-m1-4': 2, 'q-m2-1': 2, 'q-m2-2': 0, 'q-m2-3': 1, 'q-m3-1': 1, 'q-m3-2': 3, 'q-m4-1': 1, 'q-m4-3': 0 }),
    JSON.stringify(['q-m2-2', 'q-m3-1']),
    8, 10, 80, 640, 0, iso(4, 2), iso(4, 1), iso(4, 1), 1
  );
  insertExamAttempt.run(
    uuid(), 'exam-sci-1', 'u-student-1',
    JSON.stringify({ 'q-s1-1': 1, 'q-s1-2': 2, 'q-s1-4': 2, 'q-s2-1': 0, 'q-s2-2': 2, 'q-s2-5': 2, 'q-s3-1': 1, 'q-s3-3': 0, 'q-s4-1': 1, 'q-s4-3': 1 }),
    JSON.stringify(['q-s2-1']),
    8, 10, 80, 520, 0, iso(2, 3), iso(2, 2), iso(2, 2), 0
  );
  insertExamAttempt.run(
    uuid(), 'exam-math-1', 'u-student-2',
    JSON.stringify({ 'q-m1-1': 1, 'q-m1-2': 2, 'q-m1-4': 2, 'q-m2-1': 2, 'q-m2-2': 1, 'q-m2-3': 1, 'q-m3-1': 2, 'q-m3-2': 3, 'q-m4-1': 1, 'q-m4-3': 0 }),
    JSON.stringify([]),
    10, 10, 100, 580, 0, iso(3, 1), iso(3, 0), iso(3, 0), 0
  );
  insertExamAttempt.run(
    uuid(), 'exam-math-1', 'u-student-3',
    JSON.stringify({ 'q-m1-1': 1, 'q-m1-2': 0, 'q-m1-4': 1, 'q-m2-1': 0, 'q-m2-2': 0, 'q-m2-3': 1, 'q-m3-1': 0, 'q-m3-2': 3, 'q-m4-1': 1, 'q-m4-3': 1 }),
    JSON.stringify(['q-m2-2']),
    4, 10, 40, 890, 1, iso(3, 5), iso(3, 4), iso(2, 5), 1
  );

  // 9. Seed Assignments
  const insertAssign = db.prepare(`
    INSERT INTO assignments (id, teacher_id, class_id, title, description, assignment_type, topic_id, exam_id, target_questions, due_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertAssign.run('asg-1', 'u-teacher-1', 'cls-8a', 'Geometry & Triangles Weekly Practice', 'Complete at least 4 Geometry practice questions offline or online before Friday.', 'practice', 'top-math-3', null, 4, iso(-3).slice(0, 10), iso(5));
  insertAssign.run('asg-2', 'u-teacher-1', 'cls-8a', 'Mathematics Olympiad Sprint Mock Exam', 'Attempt the 15-minute Mathematics Sprint mock exam and review all incorrect solutions.', 'mock_exam', null, 'exam-math-1', 10, iso(-2).slice(0, 10), iso(4));
  insertAssign.run('asg-3', 'u-teacher-1', 'cls-8a', 'Acids, Bases & Neutralization Drill', 'Revise pH scale and neutralization reactions (minimum 3 questions).', 'practice', 'top-sci-4', null, 3, iso(-5).slice(0, 10), iso(2));

  // 10. Seed Sync Logs
  const insertSync = db.prepare(`
    INSERT INTO sync_logs (id, user_id, status, attempts_synced, exams_synced, content_version, error_message, device_info, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertSync.run(uuid(), 'u-student-1', 'Synced', 6, 1, 1, '', 'Android Tablet PWA', iso(0, 3));
  insertSync.run(uuid(), 'u-student-2', 'Synced', 5, 1, 1, '', 'Chrome Desktop PWA', iso(0, 1));
  insertSync.run(uuid(), 'u-student-3', 'Synced', 4, 1, 1, '', 'Mobile Web PWA', iso(2, 5));
  insertSync.run(uuid(), 'u-student-5', 'Failed', 0, 0, 1, 'Network timeout on 2G connection', 'Android Phone PWA', iso(4, 2));

  // 11. Platform metadata
  setMeta('content_version', '1');
  setMeta('last_published_at', iso(4));
  setMeta('release_notes', 'Initial Olympiad Content Pack v1.0 – Mathematics, Science & Logical Reasoning (55 verified MCQs + 4 Mock Exams).');
}
