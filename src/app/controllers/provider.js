const { Router } = require('express');
const db = require('app/models');
const Promise = require('bluebird');
const negotiation = require('./../../algorithms/negotiation');

const router = Router({ mergeParams: true });
const Op = db.Sequelize.Op;

module.exports = (app) => {
  app.use('/provider', router);
};

router.use((req, res, next) => {
  if (!req.user) {
    res.redirect('/signin/provider');
  } else {
    next();
  }
});

router.route('/')
  .get(async (req, res, next) => {
    /* 제공자 첫 화면 */
    const recent_questions = await db.Question.findAll({
      order: [
        ['id','DESC']
      ],
      limit : 10,
    });
    try {
      const unapproved_questions = await db.Question.findAll({
        include: [
          {
            required: true, // inner join
            model: db.Transaction,
            where: {
              pid: req.user.id,
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
        ],
        order: [
          ['id', 'DESC']
        ],
        limit: 10
      })
      res.render('provider/index', { recent_questions, unapproved_questions });
    } catch (err) {
      next(err);
    }
  });



router.route('/questions')
  .get(async(req, res, next) => {
    /* 전체 질의 목록 */
    try {
      let recent_questions = await db.Question.findAll({
        group: ['id'],
        order: [
          ['id', 'DESC']
        ],
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
        ]
      });
      recent_questions = await Promise.map(recent_questions, question => question.toJSON());
      res.render('provider/questions', { recent_questions });
    } catch(err){
      next(err);
    }
  });

router.route('/questions/:qid(\\d+)')
  .all(async (req, res, next) => {
    const transaction = await db.Transaction.findOne({
      where: {
        qid: req.params.qid,
        pid: req.user.id,
      }
    });
    if (transaction) {
      req.flash('error', 'Already answered.');
      return res.redirect('back');
    }
    next();
  })
  .get(async(req, res, next) => {
    /* 특정 질의 응답 화면 */
    const current_question = await db.Question.findOne({
      where: { id: req.params.qid },
      include: [
        { model: db.QuestionNumericExtra },
        { model: db.Consumer},
        { model: db.QuestionOption }]
    });

    //res.send(`/provider/questions/${req.params.qid}`);
    res.render('provider/questions-reply', { current_question });
  })
  .post(async (req, res, next) => {
    const { p_epsilon, p_price,radio } = req.body;
    let value = radio;
    let perturbed = radio;
    let rappor = null;

    try {
      const question = await db.Question.findById(req.params.qid);
      if (question.type == 'integer') {
        value = req.body.value;
        perturbed = req.body.perturbed;
        
      } else {
        value = req.body.radio;
        perturbed = 0;
        rappor = req.body.perturbed;
      }
      const consumer = await db.Consumer.findById(question.cid);
      const nego_consumer = { price: question.price, epsilon: question.epsilon };
      const nego_provider = { price: p_price, epsilon: p_epsilon };

      nego = negotiation(nego_consumer, [nego_provider]);
      await db.Transaction.create({
        negotiation_price: nego[0].negotiation_price,
        negotiation_epsilon: nego[0].negotiation_epsilon,
        p_point_change: nego[0].p_point_change,
        c_point_change: nego[0].c_point_change,
        p_credit_change: nego[0].p_credit_change,
        c_credit_change: nego[0].c_credit_change,
        p_epsilon: p_epsilon,
        p_price: p_price,
        p_response: perturbed,
        p_rappor: rappor,
        original_p_response: value,
        cid: question.cid,
        qid: req.params.qid,
        pid: req.user.id
      })
      req.flash('success', 'reply success');
      res.redirect('/provider');
    } catch (err) {
      next(err);
    }
  });

router.route('/profile')
  .get((req, res, next) => {
    /* 제공자 개인 정보 화면 */

    res.render('provider/profile');
  })
  .post((req, res, next) => {
    /* 프로필 사진 갱신, 비밀번호 갱신, 기본 설정 갱신 작업 처리 */
    res.send('POST /provider/profile');
  });

router.route('/question')
  .get(async(req, res, next) => {
    /* 현재 제공자가 참여한 질의 내용 확인 */
    try {
      const approved_questions = await db.Question.findAll({
        include: [
          {
            required: true, // inner join
            model: db.Transaction,
            where: {
              pid: req.user.id,
              c_approval_flag: 'approve',
              p_approval_flag: 'approve'
            }
          }],
        order: [
          ['id', 'DESC']
        ],
        limit: 10
      })
      res.render('provider/question', { approved_questions });
    }
    catch (err) {
      next(err);
    }
  });

router.route('/question/:qid(\\d+)')
  .get(async (req, res, next) => {
    /* 현재 제공자가 협상 완료 후 정고 제공한 질의 상세 내역 확인
      (답변 내용, 협상 가격, epsilon 값, 누적 epsilon 계산, 사용자로부터의 대가)
      */
    const current_question = await db.Transaction.findOne({
      where: {
        qid: req.params.qid,
        pid: req.user.id,
      },
      include: [
        { model: db.Consumer },
        { model: db.Provider },
        { model: db.Question }
      ]
    });
    res.render('provider/question-details', {current_question});
  });

router.route('/negotiation')
  .get(async(req, res, next) => {
    /* 현재 제공자가 협상중인 질의 내용 확인 */
    try {
      const unapproved_questions = await db.Question.findAll({
        include: [
          {
            required: true, // inner join
            model: db.Transaction,
            where: {
              pid: req.user.id,
              $or: [
                {
                  c_approval_flag: 'yet',
                  p_approval_flag: 'yet',
                },
                {
                  c_approval_flag: 'approve',
                  p_approval_flag: 'yet',
                },
                {
                  c_approval_flag: 'yet',
                  p_approval_flag: 'approve'
                }
              ]
            },
          }
        ],
        order: [
          ['id', 'DESC']
        ],
        limit: 10
      })
      res.render('provider/negotiation', { unapproved_questions });
    }
    catch (err) {
      next(err);
    }
  });

router.route('/negotiation/:qid(\\d+)')
  .get(async (req, res, next) => {
    /* 현재 제공자가 협상중인 질의 세부 내역 확인 */
    const current_question = await db.Transaction.findOne({
      where: {
        qid: req.params.qid,
        pid: req.user.id,
      },
      include: [
        { model: db.Consumer },
        { model: db.Provider },
        { model: db.Question }
      ]
    });
    res.render('provider/negotiation-details', { current_question });
  })
  .post(async (req, res, next) => {
    /* 제공자가 협상중인 질의에 대해 승인을 할 경우 정보 제공 프로세스 작동, 거부할 경우 해당 작업 삭제 */
    try {
      const question = await db.Question.findById(req.params.qid);
      const { type } = req.body;

      const sqlT = await db.sequelize.transaction();
      const transaction = await db.Transaction.findOne({
        where: {
          cid: question.cid,
          pid: req.user.id,
          qid: req.params.qid,
        },
        transaction: sqlT,
      })
      if (type === 'approve' || type === 'deny') {
        await db.Transaction.update({
          p_approval_flag: type
        }, {
          where: {
            qid: req.params.qid,
            pid: req.user.id,
            cid: question.cid
          },
          transaction: sqlT,
        });
        if (type === 'approve') {
          // consumer가 approve 했으면 더한다.
          if (transaction.c_approval_flag == 'approve') {
            await db.Provider.update({ point: db.Sequelize.literal(`point + ${transaction.p_point_change}`) }, { where: { id: req.user.id }, transaction: sqlT });
            await db.Provider.update({ credit: db.Sequelize.literal(`credit + ${transaction.p_credit_change}`) }, { where: { id: req.user.id }, transaction: sqlT });
          }
          // consumer가 deny 했으면 아무일도 일어나지 않는다.
          sqlT.commit();
          req.flash('success', 'Approved.');
        } else {
          // provider deny
          if (transaction.c_approval_flag == 'approve') {
            // consumer 정보를 rollback해야한다
            await db.Consumer.update({ point: db.Sequelize.literal(`point - ${transaction.c_point_change}`) }, { where: { id: question.cid }, transaction: sqlT });
            await db.Consumer.update({ credit: db.Sequelize.literal(`credit - ${transaction.c_credit_change}`) }, { where: { id: question.cid }, transaction: sqlT });
          }
          // consumer가 approve 했으면 돈을 돌려준다.
          // consumer가 deny 했으면 아무일도 일어나지 않는다.
          sqlT.commit();
          req.flash('success', 'Denied');
        }
      }
      res.redirect('/provider/negotiation');
    } catch (err) {
      sqlT.rollback();
      next(err);
    }
  });


router.route('/credit')
  .get(async (req, res, next) => {
    /* 현재 제공자의 누적 credit 및 point 확인 */

    res.render('provider/credit', { credit: req.user.credit, point: req.user.point });
  });



