function rchoice(arr) {
  var rand = Math.random();
  rand *= arr.length;
  rand = Math.floor(rand);
  return arr[rand];
}
function combination(a, b) {
  var upper = 1;
  var lower = 1;
  var lower2 = 1;

  for (var i = 1; i < a + 1; i++) {
    upper *= i;
  }
  for (var i = 1; i < b + 1; i++) {
    lower *= i;
  }

  for (var i = 1; i < a-b+1; i++) {
    lower2 *= i;
  }

  return upper / (lower * lower2);
}

function numeric(tup, eps, min, max) {
  var d = tup.length;
  if (d % 2 == 0) {
    var Cd = Math.pow(2, d - 1) - 0.5 * combination(d, d / 2);
    var B = Math.pow(2, d) + Cd * (Math.exp(eps) - 1);
    B /= combination(d - 1, d / 2) * (Math.exp(eps) - 1);
  } else {
    var Cd = Math.pow(2, d - 1);
    var B = Math.pow(2, d ) + Cd * (Math.exp(eps) - 1);
    B /= combination(d - 1, (d - 1) / 2) * (Math.exp(eps) - 1);
  }


  var v = []
  tup.forEach(function(t) {
    t = parseFloat(t);
    t -= (max + min) / 2;
    t /= (max - min) / 2;
    if (Math.random() < 0.5 + 0.5 * t) {
      v.push(1);
    } else {
      v.push(-1);
    }
  });

  var prob = (Math.exp(eps) * Cd) / ((Math.exp(eps) - 1) * Cd + Math.pow(2, d))
  if (Math.random() < prob) {
    u = 1;
  } else {
    u = 0;
  }

  var T;
  if (u == 1) {
    while (true) {
      T = []
      for (var i = 0; i < d; i++) {
        // choice random [-1, 1]
        T.push(rchoice([-1, 1]))
      }
      sumv = 0
      for (var i = 0; i < d; i++) {
        sumv += T[i] * v[i];
      }
      if (sumv > 0) {
        break;
      }
    }
  } else {
    while (true) {
      T = []
      for (var i = 0; i < d; i++) {
        T.push(rchoice([-1, 1]))
      }
      sumv = 0
      for (var i = 0; i < d; i++) {
        sumv += T[i] * v[i];
      }
      if (sumv <= 0) {
        break;
      }
    }
  }

  for (var i = 0; i < T.length; i++) {
    T[i] *= B;
  }

  return T;
}

function Proposed(tup, eps, min, max) {
  var d = tup.length;

  tup.forEach(function(t) {
    t = parseFloat(t);
    t -= (max + min) / 2;
    t /= (max - min) / 2;
  })

  var j = 0;
  if (d > 1) {
    j = parseInt(Math.random() * (d - 1));
  }

  var prob = tup[j] * ((Math.exp(eps) - 1) + Math.exp(eps) + 1) / (2 * (Math.exp(eps) + 1))
  if (Math.random() > prob) {
    tup[j] = (Math.exp(eps) + 1) / (Math.exp(eps) - 1) * d;
  } else {
    tup[j] = -1 * (Math.exp(eps) + 1) / (Math.exp(eps) - 1) * d;
  }
  return tup;
}

function scaling(perturbed_users, min, max) {
  return perturbed_users.map(function(user) {
    user *= (max - min) / 2;
    user += (max + min) / 2;
    return user;
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    numeric,
    scaling,
  };
}
