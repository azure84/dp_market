const { Router } = require('express');

const router = Router({ mergeParams: true });
require('./user')(router);
require('./match')(router);
require('./consumer')(router);
require('./provider')(router);
require('./market-admin')(router);
require('./api')(router);

module.exports = (app) => {
  app.use('/', router);
};

router.route('/')
  .get((req, res) => {
    if (req.user) {
      if (req.user.constructor.name == 'Consumer') {
        res.redirect('/consumer');
      } else {
        res.redirect('/provider');
      }
    } else {
      res.render('index');
    }
  });

router.route('/select')
  .get((req, res, next) => {
    if (req.user) {
      if (req.user.is_consumer) {
        res.redirect('/consumer');
      } else if (req.user.is_provider) {
        res.redirect('/provider');
      }
    } else {
      res.redirect('/');
    }
  });
