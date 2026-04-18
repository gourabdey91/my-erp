const mongoose = require('mongoose');
const MaterialMaster = require('./models/MaterialMaster');
const Category = require('./models/Category');
const ImplantType = require('./models/ImplantType');

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://ssagency:Ssagency@2024@ssagency.piwvvhi.mongodb.net/ss_agency_db?retryWrites=true&w=majority';

async function testMaterials() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check total materials
    const totalMaterials = await MaterialMaster.countDocuments();
    console.log(`\n📊 Total materials in database: ${totalMaterials}`);

    // Check materials with surgicalCategories
    const materialsWithCategories = await MaterialMaster.countDocuments({
      surgicalCategories: { $exists: true, $ne: [] }
    });
    console.log(`📊 Materials with surgicalCategories: ${materialsWithCategories}`);

    // Check materials with old surgicalCategory field
    const materialsWithOldField = await MaterialMaster.countDocuments({
      surgicalCategory: { $exists: true }
    });
    console.log(`📊 Materials with old surgicalCategory field: ${materialsWithOldField}`);

    // Get categories
    const categories = await Category.find({ isActive: true }).select('_id code description');
    console.log(`\n📋 Active categories: ${categories.length}`);
    if (categories.length > 0) {
      console.log('Categories:', categories.map(c => `${c.code} (${c._id})`).join(', '));

      // Test query - find materials with first category
      const testCategory = categories[0];
      console.log(`\n🧪 Testing query with category: ${testCategory.code} (${testCategory._id})`);

      const materialsForCategory = await MaterialMaster.find({
        surgicalCategories: testCategory._id,
        isActive: true
      }).select('materialNumber description surgicalCategories implantType');

      console.log(`Found ${materialsForCategory.length} materials with this category`);
      if (materialsForCategory.length > 0) {
        console.log('Sample:', materialsForCategory[0]);
      }

      // Test aggregate query
      console.log(`\n🧪 Testing aggregate query with category: ${testCategory._id}`);
      const aggregateResult = await MaterialMaster.aggregate([
        {
          $match: {
            surgicalCategories: testCategory._id,
            isActive: true,
            implantType: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: '$implantType'
          }
        },
        {
          $lookup: {
            from: 'implanttypes',
            localField: '_id',
            foreignField: '_id',
            as: 'implantTypeData'
          }
        },
        {
          $unwind: '$implantTypeData'
        },
        {
          $project: {
            _id: '$implantTypeData._id',
            name: '$implantTypeData.name'
          }
        }
      ]);

      console.log(`Aggregate result: ${aggregateResult.length} implant types`);
      if (aggregateResult.length > 0) {
        console.log('Results:', aggregateResult);
      }
    }

    console.log('\n✅ Test complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testMaterials();
