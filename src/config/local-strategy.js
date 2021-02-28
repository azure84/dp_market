const passport = require('passport');
const db = require('app/models');
const { Strategy: LocalStrategy } = require('passport-local');

passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password',
  passReqToCallback: true,
}, async (req, email, password, done) => {
  try {
    let user = null;
    if (req.params.type === 'consumer') {
      user = await db.Consumer.findOne({ where: { email } });
    } else if (req.params.type === 'provider') {
      user = await db.Provider.findOne({ where: { email } });
    }

    if (!user) {
      return done(null, false, { message: 'User does not exist.' });
    }
    if (!await user.validPassword(password)) {
      return done(null, false, { message: 'Password does not match.' });
    }
    return done(null, user);
  } catch (err) {
    return done(err, false);
  }
}));
