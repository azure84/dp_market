const {
  numeric,
  scaling
} = require('./../src/algorithms/numeric');
const _ = require('lodash');


const [min, max] = [1000, 2000]
const [min_e, max_e] = [0.1, 10.0]
const users = _.map(_.range(10), () => (parseInt(Math.random() * (max-min) + min)))
const avg = _.sum(users) / users.length

let perturbed_users = _.map(users, (user) => (numeric([user], Math.random() * (max_e - min_e) + min_e, min, max)[0]))
perturbed_users = scaling(perturbed_users, min, max);
const perturbed_avg = _.sum(perturbed_users) / users.length;

console.log(avg, perturbed_avg)
