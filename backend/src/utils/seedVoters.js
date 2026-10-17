const path = require('path');
const mongoose = require('mongoose');
const XLSX = require('../../../mobile/node_modules/xlsx');
const User = require('../models/User');
const { hashPassword } = require('./crypto');
const { MONGODB_URI } = require('../config/env');

const voters = [
  { voterId: 'VOTER-2026-101', fullName: 'Aarav Sharma', email: 'aarav.sharma@voting.edu', phoneNumber: '+91 98765 43101' },
  { voterId: 'VOTER-2026-102', fullName: 'Diya Patel', email: 'diya.patel@voting.edu', phoneNumber: '+91 98765 43102' },
  { voterId: 'VOTER-2026-103', fullName: 'Rohan Verma', email: 'rohan.verma@voting.edu', phoneNumber: '+91 98765 43103' },
  { voterId: 'VOTER-2026-104', fullName: 'Priya Singh', email: 'priya.singh@voting.edu', phoneNumber: '+91 98765 43104' },
  { voterId: 'VOTER-2026-105', fullName: 'Ananya Iyer', email: 'ananya.iyer@voting.edu', phoneNumber: '+91 98765 43105' },
  { voterId: 'VOTER-2026-106', fullName: 'Kabir Mehta', email: 'kabir.mehta@voting.edu', phoneNumber: '+91 98765 43106' },
  { voterId: 'VOTER-2026-107', fullName: 'Ishaan Reddy', email: 'ishaan.reddy@voting.edu', phoneNumber: '+91 98765 43107' },
  { voterId: 'VOTER-2026-108', fullName: 'Tanvi Joshi', email: 'tanvi.joshi@voting.edu', phoneNumber: '+91 98765 43108' },
  { voterId: 'VOTER-2026-109', fullName: 'Aditya Nair', email: 'aditya.nair@voting.edu', phoneNumber: '+91 98765 43109' },
  { voterId: 'VOTER-2026-110', fullName: 'Meera Kapoor', email: 'meera.kapoor@voting.edu', phoneNumber: '+91 98765 43110' },
  { voterId: 'VOTER-2026-111', fullName: 'Siddharth Gupta', email: 'siddharth.gupta@voting.edu', phoneNumber: '+91 98765 43111' },
  { voterId: 'VOTER-2026-112', fullName: 'Riya Malhotra', email: 'riya.malhotra@voting.edu', phoneNumber: '+91 98765 43112' },
  { voterId: 'VOTER-2026-113', fullName: 'Aryan Deshmukh', email: 'aryan.deshmukh@voting.edu', phoneNumber: '+91 98765 43113' },
  { voterId: 'VOTER-2026-114', fullName: 'Sneha Kulkarni', email: 'sneha.kulkarni@voting.edu', phoneNumber: '+91 98765 43114' },
  { voterId: 'VOTER-2026-115', fullName: 'Vikram Chatterjee', email: 'vikram.chatterjee@voting.edu', phoneNumber: '+91 98765 43115' },
];

async function seed() {
  console.log('Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);

  const defaultPassword = 'Password@123';
  const passwordHash = await hashPassword(defaultPassword);

  console.log(`Processing ${voters.length} voters...`);
  let createdCount = 0;

  for (const v of voters) {
    const existing = await User.findOne({ voterId: v.voterId });
    if (!existing) {
      await User.create({
        voterId: v.voterId,
        fullName: v.fullName,
        email: v.email,
        phoneNumber: v.phoneNumber,
        passwordHash,
        role: 'voter',
        status: 'active',
      });
      createdCount++;
      console.log(`Created: ${v.voterId} (${v.fullName})`);
    } else {
      console.log(`Already exists: ${v.voterId}`);
    }
  }

  console.log(`Seeding complete. ${createdCount} new voter accounts created.`);

  // Generate Excel workbook
  const excelData = voters.map((v, idx) => ({
    'S.No': idx + 1,
    'Voter ID': v.voterId,
    'Full Name': v.fullName,
    'Email Address': v.email,
    'Phone Number': v.phoneNumber,
    'Login Password': defaultPassword,
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  // Column widths
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 22 },
    { wch: 28 },
    { wch: 16 },
    { wch: 16 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Eligible Voters');

  const rootDir = path.resolve(__dirname, '../../../');
  const xlsxPath = path.join(rootDir, 'voters_list.xlsx');
  const csvPath = path.join(rootDir, 'voters_list.csv');

  XLSX.writeFile(workbook, xlsxPath);
  console.log(`Excel file generated: ${xlsxPath}`);

  const csvContent = XLSX.utils.sheet_to_csv(worksheet);
  const fs = require('fs');
  fs.writeFileSync(csvPath, csvContent, 'utf8');
  console.log(`CSV file generated: ${csvPath}`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
