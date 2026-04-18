const xlsx = require('xlsx');
const path = require('path');

// Create test data similar to what the user might upload
const testData = [
  {
    'Implant Type': 'Burr Hole Cap',
    'Surgical Category': 'Cranial',
    'Subcategory': 'Standard Cap',
    'Length (mm)': 10
  },
  {
    'Implant Type': 'Burr Hole Cap',
    'Surgical Category': 'Maxillofacial',
    'Subcategory': 'Titanium Cap',
    'Length (mm)': 12
  },
  {
    'Implant Type': 'Plates',
    'Surgical Category': 'Ortho',
    'Subcategory': '4 Hole Plate',
    'Length (mm)': 120.5
  },
  {
    'Implant Type': 'Plates',
    'Surgical Category': 'Ortho, Spine',
    'Subcategory': 'T-Plate',
    'Length (mm)': 100
  }
];

// Create workbook
const wb = xlsx.utils.book_new();
const ws = xlsx.utils.json_to_sheet(testData);

// Set column widths
ws['!cols'] = [
  { wch: 20 }, // Implant Type
  { wch: 25 }, // Surgical Category
  { wch: 20 }, // Subcategory
  { wch: 15 }  // Length (mm)
];

xlsx.utils.book_append_sheet(wb, ws, 'Implant Subcategories');

// Save to test file
const filePath = path.join(__dirname, 'test-implant-upload.xlsx');
xlsx.writeFile(wb, filePath);

console.log(`✅ Test file created: ${filePath}`);
console.log('Test data:');
testData.forEach((row, i) => {
  console.log(`  Row ${i+1}: ${row['Implant Type']} - ${row['Surgical Category']} - ${row['Subcategory']}`);
});
