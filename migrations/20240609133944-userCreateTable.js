module.exports = {
  async up(db) {
    await db.createCollection(
      "node"
    )
  },

  async down(db) {
    await db.dropCollection('node');
  }
};
