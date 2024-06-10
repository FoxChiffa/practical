module.exports = {
  async up(db) {
    await db.createCollection(
      "user"
    )
  },

  async down(db) {
    await db.dropCollection('user');
  }
};
