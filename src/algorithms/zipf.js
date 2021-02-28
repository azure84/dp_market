const zeta = require('math-riemann-zeta')
exports.pmf = function(k, a) {
  return 1 / (zeta(a) * Math.pow(k, a))
}
