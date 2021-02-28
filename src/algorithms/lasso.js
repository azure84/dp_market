const pythonBridge = require('python-bridge');
const python = pythonBridge({
  python: 'python3'
});


async function Lasso(xMat, yMat) {
  python.ex`from sklearn import linear_model`;
  python.ex`import json`;
  /*
    var xMat = [[0, 0, 1, 0, 0, 0, 1, 0, 0, 1],
   [1, 0, 0, 1, 0, 0, 0, 0, 0, 0],
   [0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
   [0, 1, 1, 0, 1, 0, 0, 1, 0, 0],
   [0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
   [1, 0, 0, 0, 0, 1, 0, 0, 0, 0],
   [0, 1, 0, 0, 0, 0, 1, 0, 1, 0],
   [0, 0, 0, 0, 0, 0, 0, 0, 0, 1]]
    var yMat = [ 99184, 213632, 106640, 196176,  20832, 199616, 129848,  14336]
    */
  python.ex`
  def reg():
    model = linear_model.Lasso(alpha=0.5, normalize=True, fit_intercept = False)
    model.fit(${xMat}, ${yMat})
    return json.dumps(model.coef_.tolist())
  `;
  const str = await python`reg()`;
  return JSON.parse(str);
}

module.exports = Lasso;
