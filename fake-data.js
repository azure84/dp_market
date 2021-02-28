require('app-module-path').addPath(__dirname + '/src');
const db = require('app/models');
const Promise = require('bluebird');
const negotiation = require('algorithms/negotiation');
const _ = require('lodash');
const moment = require('moment');
const { numeric } = require('algorithms/numeric');

const consumer_count = 1;
const provider_count = 1000;
const run = async () => {

  const consumer = await db.Consumer.findOne({
    where: {
       email: 'test_consumer@test.com',
    },
  });
  const base = 0;
  const providers = await Promise.map(_.range(provider_count), (num, index) => (
    db.Provider.create({
      email: `test_provider${base + index + 1}@test.com`,
      password: 'test1234',
      epsilon: (Math.floor(Math.random() * 30) + 1) / 10,
      price: 1000 + (Math.floor(Math.random() * 500) + 1),
      point: 0,
      credit: 0,
    })
  ));
  const question = await db.Question.findById(34);

  /*
  const question = await db.Question.create({
    title: 'How many hours do you sleep a day?',
    type: 'integer',
    description: 'Please Enter the integer value between 0 ~ 24',
    expired_at: moment.now(),
    manual_close: false,
    cid: consumer.id,
    epsilon: consumer.epsilon,
    price: consumer.price,
  });
  */
  
  const transactions = await Promise.map(_.range(provider_count), (num, index) => {
    const provider_index = num;

    const nego_consumer = {
      price: consumer.price,
      epsilon: consumer.epsilon,
    };
    const nego_provider = {
      price: providers[provider_index].price,
      epsilon: providers[provider_index].epsilon,
    };

    const nego = negotiation(nego_consumer, [nego_provider]);

    const provider_response = Math.floor(Math.random() * 4) + 6

    return db.Transaction.create({
      negotiation_price: nego[0].negotiation_price,
      negotiation_epsilon: nego[0].negotiation_epsilon,
      p_point_change: nego[0].p_point_change,
      c_point_change: nego[0].c_point_change,
      p_credit_change: nego[0].p_credit_change,
      c_credit_change: nego[0].c_credit_change,
      p_epsilon: providers[provider_index].epsilon,
      p_price: providers[provider_index].price,
      p_response: numeric([provider_response], providers[provider_index].epsilon, 0, 24),
      original_p_response: provider_response,
      cid: consumer.id,
      qid: question.id,
      pid: providers[provider_index].id,
      p_approval_flag: 'approve',
      c_approval_flag: 'approve',
    });
  })
};

run()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch((err) => {
    console.log(err);
  });
