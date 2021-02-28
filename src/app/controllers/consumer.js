const { Router } = require('express');
const db = require('app/models');
const Promise = require('bluebird');
const moment = require('moment');
const _ = require('lodash');
const { sumBits, makingDictionary } = require('algorithms/rappor');
const Lasso = require('algorithms/lasso');

const router = Router({ mergeParams: true });
const Op = db.Sequelize.Op;

module.exports = (app) => {
  app.use('/consumer', router);
};
router.use((req, res, next) => {
  if (!req.user) {
    res.redirect('/signin/consumer');
  } else {
    next();
  }
});

router.route('/')
  .get(async(req, res, next) => {
    /* 사용자 첫 화면 */
    const recent_questions = await db.Question.findAll({
      where: {
        cid:req.user.id
      },
      order: [
        ['id', 'DESC']
      ]
    });
    const processing_questions = await db.Question.findAll({
      where: {
        cid:req.user.id,
        manual_close: 0,
        expired_at: {
          [Op.gte]: moment.now(),
        },
      },
      order: [
        ['id', 'DESC']
      ]
    });
    res.render('consumer',{ recent_questions, processing_questions });
  });

router.route('/questions')
  .get(async (req, res, next) => {
    /* 전체 질의 목록 */
    try {
      let questions = await db.Question.findAll({
        where: {
          cid: req.user.id,
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
      res.render('consumer/questions', { questions });
    } catch (err) {
      next(err);
    }
  });


router.route('/questions/:qid(\\d+)')
  .get(async (req, res, next) => {
    /* 해당 사용자가 등록한 특정 질의 상세 내용 */
    try {
      let question = await db.Question.findOne({
        where: {
          cid:req.user.id,
          id:req.params.qid
        },
        include: [
          {
            model: db.QuestionOption
          },
          {
            model: db.QuestionNumericExtra,
          }
        ]
      });
      if (!question) {
        res.redirect('/consumer/questions');
      } else {
        const count = await question.countReplies();
        question = question.toJSON();
        question.count = count;
        res.render('consumer/questions-details', { question });
      }
    
    } catch (err) {
      next(err);
    }
  })
  .post(async(req, res, next) => {
    /* 설문 완료 시 해당 질의를 종료 상태로 변경 */
    try {
      await db.Question.update({
        manual_close: 1,
      }, { where:{cid:req.user.id, id:req.params.qid } });
      
      res.redirect('/consumer');
    } catch (err) {
      next(err);
    }
    res.send(`POST /consumer/questions/${req.params.qid}`);
  });

router.route('/question/:qid(\\d+)/fetch')
  .post(async (req, res, next) => {
    try {
      const aggr = await db.Transaction.sum('p_response', {
        where: {
          qid: req.params.qid,
          cid: req.user.id,
          c_approval_flag: 'approve',
          p_approval_flag: 'approve',
        },
      });
      const user_size = await db.Transaction.count('p_response', {
        where: {
          qid: req.params.qid,
          cid: req.user.id,
          c_approval_flag: 'approve',
          p_approval_flag: 'approve',
        }
      });

      /* hardcoding */
      const [min, max] = [0, 10000];
      /* */
      res.json({
        avg: aggr * (max - min) / 2 / user_size + (min + max) / 2,
      });
    } catch (err) {
      next(err);
    }
  })

router.route('/create-question')
  .get((req, res, next) => {
    /* 특정 사용에 의한 질의 생성 화면 */
    res.render('consumer/create-question');
  })
  .post(async (req, res, next) => {
    /* 특정 사용자에 의한 질의 생성 작업 처리 (설문 제목, 설명, 질문 제목, 질문 타입 등등) */
    let selectList;
    const {
      title,
      type,
      description,
      epsilon,
      price,
      min,
      max
    } = req.body;
    let transaction = null;
    const expired_at = moment().add(7, 'days');

    if (type != 'select' && type != 'integer') {
      return res.redirect('/consumer/create-question');
    }
    try {
      if (type == 'select') {
        selectList = JSON.parse(req.body['select-data']);
      }
      const transaction = await db.sequelize.transaction();
      const question = await db.Question.create({
        title,
        description,
        type,
        cid: req.user.id,
        expired_at,
        epsilon,
        price
        
      }, { transaction });
      if (type == 'select') {
        const options = await Promise.map(selectList, (label, value) => {
          return { label, value, qid: question.id };
        });
        const questionOtions = await db.QuestionOption.bulkCreate(options, { transaction });
      } else if (type == 'integer') {
        const questionNumericExtra = await db.QuestionNumericExtra.create({
          qid: question.id,
          min,
          max
        }, { transaction });
      }
      if (transaction) { transaction.commit(); }
      req.flash('success', 'Question is created.');
      res.redirect('/consumer');
    } catch (err) {
      if (transaction) { transaction.rollback(); }
      next(err);
    }
  });

router.route('/profile')
  .get((req, res, next) => {
    /* 사용자 개인 정보 */
    res.render('consumer/profile');
  })
  .post((req, res, next) => {
    /* 프로필 사진 갱신, 비번 갱신, 기본 설정 작업 처리 */
    res.send('POST /consumer/profile');
  });

router.route('/question')
  .get(async(req, res, next) => {
    /* 현재 사용자가 생성한 질의 화면 */
      /* 협상 완료된 질의 */
    const complete_questions = await db.Question.findAll({
      where: {
        cid:req.user.id,
        [Op.or]: [
          {
            manual_close: 1,
          },
          {
            expired_at: {
                [Op.lte]: moment.now(),
            }
          }
        ],
        },

      order: [
        ['id', 'DESC']
        ]
    });       
    res.render('consumer/question', {complete_questions});
  });

router.route('/question/:qid(\\d+)')
  .get(async(req, res, next) => {
    /* 현재 사용자가 협상 완료 후 정보 확보한 질의 상세 내역 확인
      (참여자 id, 결정 가격, epsilon 값, 누적 epsilon 예산, 지불한 대가, 질의 결과 값, 잔여 point)
     */
    try {
      let question = await db.Question.findOne({
        where: {
          id: req.params.qid,
        },
        include: [
          { model: db.QuestionOption },
          { model: db.QuestionNumericExtra },
          {
            required: false,
            model: db.Transaction,
            where: {
              c_approval_flag: 'approve',
              p_approval_flag: 'approve',
            },
            include: [
              { model: db.Provider },
            ]
          },
        ],
      });

      const aggr = await db.Transaction.sum('p_response', {
        where: {
          qid: req.params.qid,
          cid: req.user.id,
          c_approval_flag: 'approve',
          p_approval_flag: 'approve',
        },
      });
      const user_size = await db.Transaction.count('p_response', {
        where: {
          qid: req.params.qid,
          cid: req.user.id,
          c_approval_flag: 'approve',
          p_approval_flag: 'approve',
        }
      });

      const count = await question.countReplies();
      if (question.type === 'integer') {
        const [min, max] = [question.numericMin, question.numericMax];
        console.log(min, max);
        const avg = aggr * (max - min) / 2 / user_size + (max + min) / 2;
        question = question.toJSON();
        question.aggregation = avg;
        console.log(question.aggregation);
      } else if (question.type === 'select') {

        const P = 0.5;
        const Q = 0.75;
        const F = 0.5;
        const NUM_COHORT = 1;
        const NUM_BLOOM_BITS = 8;
        const NUM_ITEM = question.QuestionOptions.length;
        const NUM_HASH = 2;

        const vectorC = {};
        const vectorT = {};
        const yMat = _.fill(_.range(NUM_COHORT * NUM_BLOOM_BITS), 0);
        const xMat = _.range(NUM_COHORT * NUM_BLOOM_BITS).map(() => _.fill(_.range(NUM_ITEM), 0));
        const cohortReport = {};
        const result = {};
        const resultMean = {};

        _.range(NUM_ITEM).forEach((item) => {
          const value = `v${item}`;
          result[value] = {}
          resultMean[value] = {}
          _.range(1, NUM_COHORT+1).forEach((cohort) => {
            result[value][cohort] = []
            resultMean[value][cohort] = 0.0
          })
        })
        
        _.range(1, NUM_COHORT+1).forEach((cohort) => {
          cohortReport[cohort] = 0
          vectorC[cohort] = _.fill(_.range(NUM_BLOOM_BITS), 0);
          vectorT[cohort] = _.fill(_.range(NUM_BLOOM_BITS), 0);
        })

        const dict = makingDictionary(NUM_ITEM, NUM_COHORT, NUM_HASH, NUM_BLOOM_BITS);
        const transactions = await db.Transaction.findAll({
          where: {
            qid: req.params.qid,
            cid: req.user.id,
            c_approval_flag: 'approve',
            p_approval_flag: 'approve',
          }
        });

        const userData = transactions.map((transaction) => {
          return { cohort: 1, rappor: transaction.p_rappor };
        });

        userData.forEach((user) => {
          cohortReport[user.cohort] += 1
          vectorC[user.cohort] = sumBits(vectorC[user.cohort], user.rappor, NUM_BLOOM_BITS);
        })

        _.range(1, NUM_COHORT+1).forEach((i) => {
          _.range(NUM_BLOOM_BITS).forEach((j) => {
            vectorT[i][j] = (parseFloat(vectorC[i][j]) - (parseFloat(P) + (0.5 * F * Q) - (0.5 * F * P)) * parseFloat(cohortReport[i])) / ((1-F) * (Q-P))
            yMat[(i-1) * NUM_BLOOM_BITS + j] = vectorT[i][j]
          })
        })

        let cnt = 0;
        let lineCnt = 0;

        dict.forEach((line) => {
          lineCnt += 1;
          line = line.trim()
          const words = line.split(' ')
          const item = words[0].slice(1)
          const cohort = parseInt(words[1])
          let meanHash = 0.0
          _.range(2, NUM_HASH + 2).forEach((index) => {
            const bloomBitsIndex = parseInt(words[index]);
            i = parseInt((cohort-1) * NUM_BLOOM_BITS + bloomBitsIndex);
            j = parseInt(item);
            xMat[i][j] = 1;
          });
        });
        // python으로 던진다.
        const coef = await Lasso(xMat, yMat);
        question = question.toJSON();
        question.coef = coef;
      }
      question.count = count;
      res.render('consumer/question-details', { question });
    } catch (err) {
      next(err);
    }
  })
  
  .post(async (req, res, next) => {
    /* 협상 완료한 질의 결과 값 요청 */
    try {
      const aggr = await db.Transaction.sum('p_response', {
        where: {
          qid: req.params.qid,
          cid: req.user.id,
          c_approval_flag: 'approve',
          p_approval_flag: 'approve',
        },
      });
      const user_size = await db.Transaction.count('p_response', {
        where: {
          qid: req.params.qid,
          cid: req.user.id,
          c_approval_flag: 'approve',
          p_approval_flag: 'approve',
        }
      });

      /* hardcoding */
      const [min, max] = [0, 10000];
      /* */
      res.json({
        avg: aggr * (min + max) / 2 / user_size + (min - max) / 2 * user_size,
      });
    } catch (err) {
      next(err);
    }
  });

router.route('/negotiation')
  .get(async(req, res, next) => {
      const processing_questions = await db.Question.findAll({
        where: {
          cid:req.user.id,
          manual_close: 0,
          expired_at: {
            [Op.gte]: moment.now(),
          },
        },
        order: [
          ['id', 'DESC']
        ]
      });
      res.render('consumer/negotiation', { processing_questions});

  });

router.route('/negotiation/:qid(\\d+)')
  .get(async(req, res, next) => {
    /* 현재 사용자가 협상 중인 질의 상세 내역 확인
      (참여자 id, 결정 가격, epsilon 값, 누적 epsilon 예산, 지불한 대가, 질의 결과 값, 잔여 point)
     */    
    try {
      const consumer_info = await db.Consumer.findOne({
      where: {id:req.user.id
              }
    })
      let question = await db.Question.findOne({
        where: {
          id: req.params.qid,
        },
        include: [
          { model: db.QuestionOption },
          { model: db.QuestionNumericExtra },
          { 
            model: db.Transaction,
            include: [
              { model: db.Provider }
            ]
          },
          { model: db.Consumer }
        ],
      });
      const aggr = await db.Transaction.sum('p_response', {
        where: {
          qid: req.params.qid,
          cid: req.user.id,
          c_approval_flag: 'approve',
          p_approval_flag: 'approve',
        },
      });
      const user_size = await db.Transaction.count('p_response', {
        where: {
          qid: req.params.qid,
          cid: req.user.id,
          c_approval_flag: 'approve',
          p_approval_flag: 'approve',
        }
      });

      const count = await question.countReplies();
      if (question.type === 'integer') {
        const [min, max] = [question.numericMin, question.numericMax];
        console.log(min, max);
        const avg = aggr * (max - min) / 2 / user_size + (max + min) / 2;
        question = question.toJSON();
        question.aggregation = avg;
      } else if (question.type === 'select') {

        const P = 0.5;
        const Q = 0.75;
        const F = 0.5;
        const NUM_COHORT = 1;
        const NUM_BLOOM_BITS = 8;
        const NUM_ITEM = question.QuestionOptions.length;
        const NUM_HASH = 2;

        const vectorC = {};
        const vectorT = {};
        const yMat = _.fill(_.range(NUM_COHORT * NUM_BLOOM_BITS), 0);
        const xMat = _.range(NUM_COHORT * NUM_BLOOM_BITS).map(() => _.fill(_.range(NUM_ITEM), 0));
        const cohortReport = {};
        const result = {};
        const resultMean = {};

        _.range(NUM_ITEM).forEach((item) => {
          const value = `v${item}`;
          result[value] = {}
          resultMean[value] = {}
          _.range(1, NUM_COHORT+1).forEach((cohort) => {
            result[value][cohort] = []
            resultMean[value][cohort] = 0.0
          })
        })
        
        _.range(1, NUM_COHORT+1).forEach((cohort) => {
          cohortReport[cohort] = 0
          vectorC[cohort] = _.fill(_.range(NUM_BLOOM_BITS), 0);
          vectorT[cohort] = _.fill(_.range(NUM_BLOOM_BITS), 0);
        })

        const dict = makingDictionary(NUM_ITEM, NUM_COHORT, NUM_HASH, NUM_BLOOM_BITS);
        const transactions = await db.Transaction.findAll({
          where: {
            qid: req.params.qid,
            cid: req.user.id,
            c_approval_flag: 'approve',
            p_approval_flag: 'approve',
          }
        });

        const userData = transactions.map((transaction) => {
          return { cohort: 1, rappor: transaction.p_rappor };
        });

        userData.forEach((user) => {
          cohortReport[user.cohort] += 1
          vectorC[user.cohort] = sumBits(vectorC[user.cohort], user.rappor, NUM_BLOOM_BITS);
        })

        _.range(1, NUM_COHORT+1).forEach((i) => {
          _.range(NUM_BLOOM_BITS).forEach((j) => {
            vectorT[i][j] = (parseFloat(vectorC[i][j]) - (parseFloat(P) + (0.5 * F * Q) - (0.5 * F * P)) * parseFloat(cohortReport[i])) / ((1-F) * (Q-P))
            yMat[(i-1) * NUM_BLOOM_BITS + j] = vectorT[i][j]
          })
        })

        let cnt = 0;
        let lineCnt = 0;

        dict.forEach((line) => {
          lineCnt += 1;
          line = line.trim()
          const words = line.split(' ')
          const item = words[0].slice(1)
          const cohort = parseInt(words[1])
          let meanHash = 0.0
          _.range(2, NUM_HASH + 2).forEach((index) => {
            const bloomBitsIndex = parseInt(words[index]);
            i = parseInt((cohort-1) * NUM_BLOOM_BITS + bloomBitsIndex);
            j = parseInt(item);
            xMat[i][j] = 1;
          });
        });
        // python으로 던진다.
        const coef = await Lasso(xMat, yMat);
        question = question.toJSON();
        question.coef = coef;
      }
      question.count = count;
      res.render('consumer/negotiation-details', { question,consumer_info});
    } catch (err) {
      next(err);
    }
  })
  .post(async (req, res, next) => {
    /* 사용자가 협상중인 제공자와의 협상 값에 대해 승인을 할 경우, 정보 확보 프로세스 작, 거부할 경우 해당 제공와의 관계 삭제 */
    const { type, pid } = req.body;

    if (type != 'approve' && type != 'deny') {
      req.flash('error', 'Not a valid request.');
      return res.redirect('back');
    }

    const sqlT = await db.sequelize.transaction();
    const transaction = await db.Transaction.findOne({
      where: {
        cid: req.user.id,
        qid: req.params.qid,
        pid: pid,
      },
      transaction: sqlT,
    });

    await db.Transaction.update({
      c_approval_flag: type
    }, {
      where: {
        cid: req.user.id,
        qid: req.params.qid,
        pid: pid,
      },
      transaction: sqlT,
    });
    if (type === 'approve') {
      try {
        if (transaction.p_approval_flag == 'approve') {
          // 협상 완료
            await db.Provider.update({ point: db.Sequelize.literal(`point + ${transaction.p_point_change}`) }, { where: { id: pid }, transaction: sqlT });
            await db.Provider.update({ credit: db.Sequelize.literal(`credit + ${transaction.p_credit_change}`) }, { where: { id: pid }, transaction: sqlT });
        }
        // consumer는 일단 먼저 지불한다.
        await db.Consumer.update({ point: db.Sequelize.literal(`point + ${transaction.c_point_change}`) }, { where: { id: req.user.id }, transaction: sqlT });
        await db.Consumer.update({ credit: db.Sequelize.literal(`credit + ${transaction.c_credit_change}`) }, { where: { id: req.user.id }, transaction: sqlT });
        sqlT.commit();
        req.flash('success', 'Transaction is Approved.');
      } catch (err) {
        sqlT.rollback();
        req.flash('error', 'Not enough point.');
      }
    } else {
      sqlT.commit();
      req.flash('success', 'Transaction is denied.');
    }
    res.redirect(`/consumer/negotiation/${req.params.qid}`);
  });

router.route('/credit')
  .get((req, res, next) => {
    /* 현재 사용자의 누적 credit 및 point 확인 */
    const {
      credit,
      point
    } = req.user;
    res.render('consumer/credit', { credit, point });
  })
  .post(async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
      const addition = 5000;
      await db.PointLog.create({
        type: 'consumer',
        tid: req.user.id,
        point_change: addition,
      }, { transaction });
      await req.user.update({
        point: db.sequelize.literal('`point`+' + addition),
      }, { transaction });
      transaction.commit();
      res.redirect('/consumer/credit');
    } catch (err) {
      transaction.rollback();
      next(err);
    }
  });
