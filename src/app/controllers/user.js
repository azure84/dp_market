const passport = require('passport');
const db = require('app/models');
const { Router } = require('express');

const router = Router({ mergeParams: true });

module.exports = (app) => {
  app.use('/', router);
};

router.route('/signin')
  .get((req, res) => {
    if (req.user) {
      if (req.user.constructor.name == 'consumer') {
        res.redirect('/consumer');
      } else {
        res.redirect('/provider');
      }
    } else {
      res.render('signin');
    }
  })

router.route('/signin/:type(consumer|provider)')
  .get((req, res) => {
    res.render(`signin/${req.params.type}`, {
      errors: req.flash('error'),
      type: req.params.type,
    });
  })
  .post((req, res, next) => {
    passport.authenticate('local', {
      successRedirect: '/select',
      failureRedirect: `/signin/${req.params.type}`,
      failureFlash: true,
    })(req, res, next);
  });

router.route('/signup')
  .get((req, res) => {
    if (req.user) {
      if (req.user.constructor.name == 'consumer') {
        res.redirect('/consumer');
      } else {
        res.redirect('/provider');
      }
    } else {
      res.render('signup');
    }
  })
  .post(async (req, res, next) => {
    const { username, password } = req.body;
    try {
      await db.User.create({ username, password });
      res.send('로그인 하세요');
    } catch (err) {
      next(err);
    }
  });

router.route('/signup/consumer')
  .get((req, res) => {
    res.render('signup/consumer');
  })
  .post(async (req, res, next) => {
    const {
      email,
      password,
      epsilon,
      price,
    } = req.body;
    try {
      await db.Consumer.create({ email, password, epsilon, price });
      req.flash('success', 'join success. Please sign in.');
      res.redirect('/signin/consumer');
    } catch (err) {
      next(err);
    }
  });

router.route('/signup/provider')
  .get((req, res) => {
    res.render('signup/provider');
  })
  .post(async (req, res, next) => {
    const { email, password, epsilon, price } = req.body;
    try {
      await db.Provider.create({ email, password, epsilon, price });
      req.flash('success', 'join success. Please sign in.');
      res.redirect('/signin/provider');
    } catch (err) {
      next(err);
    }
  });

router.route('/signup/demo_consumer')
  .post(async (req, res, next) => {
    try {
      let consumer = await db.Consumer.findOne({
        where: {
          email: 'test_consumer@test.com',
        }
      });
      if (!consumer) {
        consumer = await db.Consumer.create({
          email: 'test_consumer@test.com',
          password: 'test1234',
          epsilon: '0.5',
          price: '500',
        });
      }
      req.login(consumer, (err) => {
        if (err) { next(err); }
        req.flash('success', 'Welcome!!');
        res.redirect('/consumer');
      })
    } catch(err) {
      next(err);
    }
  })

router.route('/signup/demo_provider')
  .post(async (req, res, next) => {
    try {
      /* for demo, not support concurrent request */
      const count = await db.Provider.count();
      const provider = await db.Provider.create({
        email: `test_provider${count + 1}@test.com`,
        password: 'test1234',
        epsilon: '0.5',
        price: '500',
      });
      req.login(provider, (err) => {
        if (err) { next(err); }
        //req.flash('success', 'your password is test1234');
        req.flash('success', 'Welcome Demo Provider !!');
        res.redirect('/provider');
      })
    } catch (err) {
      next(err);
    }
  })

router.route('/signout')
  .post((req, res, next) => {
    req.logout();
    res.redirect('/');
  });
