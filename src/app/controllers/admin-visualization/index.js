const { Router } = require('express');

const router = Router({ mergeParams: true });

module.exports = (app) => {
  app.use('/visualization', router);
}

router.route('/')
  .get(async (req, res, next) => {
    res.render('market-admin/visualization/index');
  });
