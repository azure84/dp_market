const { Router } = require('express');

const router = Router({ mergeParams: true });

module.exports = (app) => {
  app.use('/api', router);
};

router.route('/swal')
  .get((req, res, next) => {
    res.json({
      success: req.flash('success'),
      warning: req.flash('warning'),
      error: req.flash('error'),
      info: req.flash('info'),
    });
  });
