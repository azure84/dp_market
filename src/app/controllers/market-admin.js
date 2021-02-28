const { Router } = require('express');
const db = require('app/models');
const router = Router({ mergeParams: true });
const Promise = require('bluebird');
const moment = require('moment');

module.exports = (app) => {
  app.use('/admin', router);
};

require('./admin-visualization')(router);

router.use((req, res, next) => {
  return next();
  // pass admin
  if (req.user && req.user.admin) {
    next();
  } else {
    res.status(401).send('Not Authorized');
  }
});

router.route('/questions')
  .get(async (req, res, next) => {
    try {
      let questions = await db.Question.findAll({
        attributes: {
          include: [[
            db.Sequelize.fn('COUNT', db.Sequelize.col('transactions.qid')), 'reply_count'
          ]]
        },
        include: [
          {
            model: db.Consumer
          },
          {
            required: false,
            model: db.Transaction,
            where: {
              c_approval_flag: 'approve',
              p_approval_flag: 'approve'
             }
          }
        ],
        group: ['id'],
        order: [['id', 'DESC']]
      });
      questions = await Promise.map(questions, question => question.toJSON());
      res.render('market-admin/questions', { questions });
    } catch (err) {
      next(err);
    }
  });

router.route('/questions/:qid(\\d+)')
  .get(async (req, res, next) => {
    try {
      let question = await db.Question.findOne({
        where: {
          id: req.params.qid,
        },
        attributes: {
          include: [[
            db.Sequelize.fn('COUNT', db.Sequelize.col('transactions.qid')), 'reply_count'
          ]]
        },
        include: [
          { model: db.QuestionOption },
            {
              required: false,
               model: db.Transaction,
               where: {
                 c_approval_flag: 'approve',
                 p_approval_flag: 'approve'
                }
            },
          { model: db.Consumer }
        ],
        group: ['QuestionOptions.id']
      });
      question = question.toJSON();
      res.render('market-admin/questions-details', { question });
    } catch (err) {
      next(err);
    }
  })
  .post(async (req, res, next) => {
    /* 설문 강제로 종료 */
    try {
      await db.Question.update({
        manual_close: true,
      }, { where: { id: req.params.qid } });
      req.flash('success', 'The question is closed.');
      res.redirect('/admin/questions');
    } catch (err) {
      next(err);
    }
  });

router.route('/manage/providers')
  .get(async (req, res, next) => {

    try {
      const providers = await db.Provider.findAll();
      res.render('market-admin/provider-manage', { providers });
    } catch (err) {
      next(err);
    }

  });

router.route('/manage/providers/:pid(\\d+)')
  .get(async (req, res, next) => {
    try {
      const provider = await db.Provider.findOne({ where: { id: req.params.pid } });
      const negotiating_questions = await db.Question.findAll({
        attributes: ['id', 'title'],
        include: [
          {
            required: true, // inner join
            model: db.Transaction,
            where: {
              pid: provider.id,
              $or: [
                {
                  c_approval_flag: 'yet',
                  p_approval_flag: 'yet',
                },
                {
                  c_approval_flag: 'yet',
                  p_approval_flag: 'approve',
                },
                {
                  c_approval_flag: 'approve',
                  p_approval_flag: 'yet',
                },
              ]
            },
          }
        ]
      })
      req.negotiating_questions = negotiating_questions;
      next();
    } catch (err) {
      next(err);
    }
  })
  .get(async (req, res, next) => {
    try {
      const provider = await db.Provider.findOne({ where: { id: req.params.pid } });
      const negotiated_questions = await db.Question.findAll({
        attributes: ['id', 'title'],
        include: [
          {
            required: true, // inner join
            model: db.Transaction,
            where: {
              pid: provider.id,
              c_approval_flag: 'approve',
              p_approval_flag: 'approve',
            },
          }
        ]
      });
      const negotiating_questions = req.negotiating_questions;
      res.render('market-admin/provider-manage-details', { provider, negotiating_questions, negotiated_questions });
    } catch (err) {
      next(err);
    }
  });

router.route('/manage/consumers')
  .get(async (req, res, next) => {
    try {
      const consumers = await db.Consumer.findAll();
      res.render('market-admin/consumer-manage', { consumers });
    } catch (err) {
      next(err);
    }
  });

router.route('/manage/consumers/:cid(\\d+)')
  .get(async (req, res, next) => {
    try {
      const consumer = await db.Consumer.findOne({ where: { id : req.params.cid } });
      const negotiating_questions = await db.Question.findAll({
        where: {
          cid: consumer.id,
          expired_at: {
            $gte: moment.now()
          },
          manual_close: false,
        },
        attributes: ['id', 'title'],
        include: [
          {
            required: false, // inner join
            model: db.Transaction,
            where: {
              cid: consumer.id,
            },
          }
        ]
      })
      req.negotiating_questions = negotiating_questions;
      next();
      //res.render('market-admin/consumer-manage-negotiation', { consumer, questions });
    } catch (err) {
      next(err);
    }
  })
  .get(async (req, res, next) => {
    try {
      const consumer = await db.Consumer.findOne({ where: { id : req.params.cid } });
      const negotiated_questions = await db.Question.findAll({
        where: {
          cid: consumer.id,
          $or: [
            {
              expired_at: {
                $lte: moment.now(),
              }
            },
            {
              manual_close: true
            },
          ]
        },
        attributes: ['id', 'title'],
        include: [
          {
            required: true, // inner join
            model: db.Transaction,
            where: {
              cid: consumer.id,
            },
          }
        ]
      })
      const negotiating_questions = req.negotiating_questions;
      res.render('market-admin/consumer-manage-details', { consumer, negotiating_questions, negotiated_questions });
    } catch (err) {
      next(err);
    }
  });

router.route('/manage/transactions')
  .get((req, res, next) => {
    res.redirect('/admin/manage/transactions/negotiation');
  });

router.route('/manage/questions/:qid(\\d+)')
  .get(async (req, res, next) => {
    try {
      let question = await db.Question.findOne({
        where: {
          id: req.params.qid,
        },
        include: [
          { 
            required: false,
            model: db.Transaction,
            where: {
              c_approval_flag: 'approve',
              p_approval_flag: 'approve'
            },
            include: [
              { model: db.Provider }
            ]
          },
          { model: db.Consumer }
        ],
      });
      const question_options = await question.getQuestionOptions();
      const reply_count = await question.countReplies();
      question = question.toJSON();
      question.QuestionOptions = question_options;
      question.reply_count = reply_count;
      res.render('market-admin/transaction-details', { question });
    } catch (err) {
      next(err);
    }
  });

router.route('/manage/transactions/negotiation')
  .get(async (req, res, next) => {
    try {
      let questions = await db.Question.findAll({
        where: {
          expired_at: {
            $gte: moment.now(),
          },
          manual_close: false,
        },
        attributes: {
          include: [[
            db.Sequelize.fn('COUNT', db.Sequelize.col('transactions.qid')), 'reply_count',
          ]]
        },
        include: [
          {
            model: db.Consumer
          },
          {
            required: false,
              model: db.Transaction,
              where: {
                  c_approval_flag: 'approve',
                  p_approval_flag: 'approve'
              }
          }
        ],
        group: ['id'],
        order: [['id', 'DESC']]
      });
      questions = await Promise.map(questions, question => question.toJSON());
      res.render('market-admin/transaction-manage-negotiation', { questions });
    } catch (err) {
      next(err);
    }
  });

router.route('/manage/transactions/question')
  .get(async (req, res, next) => {
    try {
      let questions = await db.Question.findAll({
        where: {
          $or: [
            {
              expired_at: {
                $lte: moment.now()
              }
            },
            {
              manual_close: true,
            },
          ]
        },
        attributes: {
          include: [[
            db.Sequelize.fn('COUNT', db.Sequelize.col('transactions.qid')), 'reply_count'
          ]]
        },
        include: [
          {
            model: db.Consumer
          },
          {
            required: false,
            model: db.Transaction,
            where: {
              c_approval_flag: 'approve',
              p_approval_flag: 'approve'
             }
          }
        ],
        group: ['id'],
        order: [['id', 'DESC']]
      });
      questions = await Promise.map(questions, question => question.toJSON());
      res.render('market-admin/transaction-manage-question', { questions });
    } catch (err) {
      next(err);
    }
  });

router.route('/config')
  .get((req, res, next) => {
    res.render('market-admin/config');
  });
