// Direct MongoDB update script
db.templates.updateMany(
  { hospitalDependent: { $exists: false } },
  { $set: { hospitalDependent: false } }
);

db.templates.find({}).forEach(function(doc) {
  if (!doc.hasOwnProperty('hospitalDependent')) {
    db.templates.updateOne(
      { _id: doc._id },
      { $set: { hospitalDependent: false } }
    );
  }
});

print("Migration completed. Updated templates to include hospitalDependent field.");
