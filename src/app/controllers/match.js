const { Router } = require('express');
const { PythonShell } = require('python-shell');
const Promise = require('bluebird');
const db = require('app/models');

const router = Router({ mergeParams: true });

const pymatch = (args = []) => new Promise((resolve, reject) => {
  PythonShell.run(`${__dirname}/../../algorithms/match.py`, { mode: 'text', args }, (err, results) => {
    if (err) { return reject(err); }
    return resolve(JSON.parse(results));
  });
});

module.exports = (app) => {
  app.use('/match', router);
};

router.route('/')
  .get((req, res, next) => {
    // render mode
    console.log('query: ', req.query);
    if (req.query.api) {
      next();
    } else {
      res.render('match');
    }
  })
  .get(async (req, res, next) => {
    // api mode
    //
    //
    const transaction = await db.sequelize.transaction();
    try {
      console.log('asdasdasdasdasd');
      await db.Transaction.destroy({ where: {}, transaction });
      const consumers = await db.Consumer.findAll({ attributes: ['id', 'user_id', 'epsilon', 'budget'] });
      const providers = await db.Provider.findAll({ attributes: ['id', 'user_id', 'epsilon'] });
      console.log(JSON.stringify(consumers), JSON.stringify(providers));
      const match = await pymatch([JSON.stringify(consumers), JSON.stringify(providers)]);
      await Promise.each(match.consumers, async (consumer) => {
        if (consumer.partner_index !== -1) {
          const provider = match.providers[consumer.partner_index];
          await db.Transaction.create({
            ConsumerId: consumer.consumer_id,
            ProviderId: provider.provider_id,
            consumerPrice: consumer.price,
            providerPrice: provider.price,
            providerEpsilon: provider.epsilon,
            consumerEpsilon: consumer.epsilon,
          }, {
            transaction,
          });
        }
      });
      if (transaction) {
        transaction.commit();
      }
      // sql transaction을 연다
      res.json({ match });
    } catch (err) {
      if (transaction) {
        transaction.rollback();
      }
      next(err);
    }
  });
