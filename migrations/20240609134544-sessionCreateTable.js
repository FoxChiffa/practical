module.exports = {
  async up(db) {
    await db.createCollection(
      "session"
    )
  },

  async down(db) {
    await db.dropCollection('session');
  }
};
