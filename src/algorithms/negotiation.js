/* input: consumer: { price: '', epsilon: '' }, providers: [array] */
function negotiation(consumer, providers) {
  var r = 2;
  var P = providers.map(function(provider, index) {
    var rank = index + 1;
    var sensitivity = (providers.length - rank) / providers.length;
    var discount = (1 - sensitivity) / r;

    return {
      sensitivity: (providers.length - rank) / providers.length,
      discount: discount,
    };
  });

  var C = providers.map(function(consumer, index) {
    var necessity = 0.5;
    var discount = necessity / r;
    return {
      necessity: necessity,
      discount: discount,
    };
  });

  providers = P.map(function(provider, index) {
    var w = (1 - C[index].discount)/(1-C[index].discount*provider.discount);
    C[index].final_price = w * consumer.price + (1-w) * providers[index].price
    P[index].final_price = w * consumer.price + (1-w) * providers[index].price
    P[index].credit = providers[index].price - P[index].final_price
    C[index].credit = consumer.price - C[index].final_price;
    C[index].epsilon = providers[index].epsilon;
  })


  const transactions = providers.map(function(provider, index) {
    return {
      negotiation_price: P[index].final_price,
      negotiation_epsilon: C[index].epsilon,
      p_credit_change: P[index].credit,
      c_credit_change: C[index].credit,
      c_point_change: -P[index].final_price * C[index].epsilon,
      p_point_change: P[index].final_price * C[index].epsilon,
    }
  })
  return transactions;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = negotiation;
}
