const passport = require('passport');
const db = require('app/models');

module.exports = () => {
  passport.serializeUser((user, done) => {
    if (user) {
      done(null, { id: user.id, model: user.constructor.name });
    } else {
      done(null, { });
    }
  });
  passport.deserializeUser(async ({ id, model }, done) => {
    try {
      if (model) {
        const user = await db[model].findByPk(id);
        done(null, user);
      } else {
        done(null, false);
      }
    } catch (err) {
      done(err, false);
    }
  });
};
