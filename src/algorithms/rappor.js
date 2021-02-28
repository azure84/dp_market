const crypto = require('crypto')
const struct = require('python-struct')
const _ = require('lodash')
const zipf = require('./zipf')
const lasso = require('./lasso')
const random = require('random')
const matrix = require('dstructs-matrix')

const NUM_BLOOM_BITS = 8
const NUM_HASH = 2
const NUM_COHORT = 1
const NUM_REPORTS = 500000
const NUM_ITEM = 10
const P = 0.5
const Q = 0.75
const F = 0.5
const ZIPF_DISTRIBUTION = 1.01

function makingDictionary(numItem, numCohort, numHash, numBloomBits) {

  const ret = []
  _.range(numItem).forEach((item) => {
    _.range(1, numCohort+1).forEach((cohort) => {
      const userItem = `v${item}`
      const value = struct.pack('>L', cohort) + userItem
      const digest = crypto.createHash('md5').update(value).digest()

      let line = `${userItem} ${cohort} `
      line += _.range(numHash).map((i) => {
        return digest[i] % numBloomBits
      }).join(' ')
      ret.push(line)
    })
  })
  return ret
}

function sumBits(bit1, bit2, numBloomBits) {
  const ret = _.range(numBloomBits).map((i) => {
    return parseInt(bit1[i], 10)+parseInt(bit2[i], 10)
  })
  return ret
}

function pmf(x, distribution) {
  return zipf.pmf(x, distribution)
}

function ComputeWeight(numItem, distribution) {
  return _.range(1, numItem+1).map((item) => {
    return pmf(parseFloat(item), distribution)
  })
}

function SampleZipf(numReports, numItem, distribution) {
  const weights = ComputeWeight(numItem, distribution)
  const ret = []
  const itemFreq = []
  let sumWeights = weights.reduce((a, b) => a + b)
  _.range(numItem).forEach((item) => {
    const itemP = Math.min(Math.max(parseFloat(weights[item]/sumWeights), 0.0), 1.0)
    const itemList = numReports
    const rndSampleArray = random.binomial(itemList, itemP)
    const rndSample = rndSampleArray()
    numReports -= rndSample
    sumWeights -= weights[item]
    itemFreq.push(rndSample)
    ret.push(item + ' ' + rndSample + ' ' + itemP)
  })
  return itemFreq
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makingInput(numReports, numItem, numCohort, distribution) {
  const itemFreq = SampleZipf(numReports, numItem, distribution)
  console.log('itemFreq', itemFreq)
  const userData = {}
  let tmpList = []
  _.range(itemFreq.length).forEach((item) => {
    _.range(itemFreq[item]).forEach((i) => {
      tmpList.push(item)
    })
  })
  console.log('tmpList size', tmpList.length)
  tmpList = shuffle(tmpList)
  console.log('tmpList size', tmpList.length)

  const ret = []
  _.range(tmpList.length).forEach((user) => {
    userData[user] = {}
    userData[user].item = `v${tmpList[user]}`
    userData[user].cohort = random.int(1, numCohort)
    ret.push(`${userData[user].item},${userData[user].cohort}`)
  })
  return userData
}

function bloomFilter(userData, numBloomBits, numHash) {
  const value = struct.pack('>L', userData.cohort) + userData.item
  const digest = crypto.createHash('md5').update(value).digest()
  while (1) {
    if (digest.length >= numHash) { break }
  }
  return _.range(numHash).map(i => (digest[i] % numBloomBits))
}

function Rappor(userData, numBloomBits, numHash, p, q, f) {
  const blmFilter = bloomFilter(userData, numBloomBits, numHash)
  let str1 = ''
  _.range(numBloomBits).forEach((i) => {
    if (blmFilter.indexOf(i) === -1) {
      str1 += '0'
    } else {
      str1 += '1'
    }
  })
  const fakeBlmFilter = PermanentRandomized(blmFilter, f)
  const report = InstaneousRandomized(fakeBlmFilter, p, q)
  return report
}

function PermanentRandomized(userBlmFilter, f) {
  let r = 0
  let str1 = ''
  _.range(NUM_BLOOM_BITS).forEach((i) => {
    const ran = random.float()
    if (ran < parseFloat(0.5 * f)) {
      str1 += '1'
    } else if (ran < 2 * parseFloat(0.5 * f)) {
      str1 += '0'
    } else {
      if (userBlmFilter.indexOf(i) !== -1) {
        str1 += '1'
      } else {
        str1 += '0'
      }
    }
  })
  r = parseInt(str1, 2)
  return r
}

function InstaneousRandomized(userFakeBlmFilter, p, q) {
  const report = []
  _.range(NUM_BLOOM_BITS).forEach((bitNum) => {
    const ran = random.float()
    if (userFakeBlmFilter & (1 << bitNum)) {
      if (ran < q) {
        report.push('1')
      } else {
        report.push('0')
      }
    } else {
      if (ran < p) {
        report.push('1')
      } else {
        report.push('0')
      }
    }
  })
  report.reverse()
  return report.join('')
}

function single_perturb(value) {
  const userData = {};
  userData.cohort = random.int(1, NUM_COHORT);
  userData.item = `v${value}`
  const rappor = Rappor(userData, NUM_BLOOM_BITS, NUM_HASH, P, Q, F);

  //return { cohort: userData.cohort, perturbed: rappor };
  return { perturbed: rappor };
}
if (typeof window !== 'undefined') {
  window.rappor_perturb = single_perturb;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    makingDictionary,
    sumBits,
  }
}

/*
const vectorC = {}
const vectorT = {}

const yMat = _.fill(_.range(NUM_COHORT * NUM_BLOOM_BITS), 0)
const xMat = _.range(NUM_COHORT * NUM_BLOOM_BITS).map(() => _.fill(_.range(NUM_ITEM), 0))


const cohortReport = {}
const result = {}
const resultMean = {}

_.range(NUM_ITEM).forEach((item) => {
  const value = `v${item}`
  result[value] = {}
  resultMean[value] = {}
  _.range(1, NUM_COHORT+1).forEach((cohort) => {
    result[value][cohort] = []
    resultMean[value][cohort] = 0.0
  })
})

_.range(1, NUM_COHORT+1).forEach((cohort) => {
  cohortReport[cohort] = 0
  vectorC[cohort] = _.fill(_.range(NUM_BLOOM_BITS), 0)
  vectorT[cohort] = _.fill(_.range(NUM_BLOOM_BITS), 0)
})

const dict = makingDictionary(NUM_ITEM, NUM_COHORT, NUM_HASH, NUM_BLOOM_BITS)
const userData = makingInput(NUM_REPORTS, NUM_ITEM, NUM_COHORT, ZIPF_DISTRIBUTION)

_.range(Object.keys(userData).length).forEach((i) => {
  cohortReport[userData[i].cohort] += 1
  vectorC[userData[i].cohort] = sumBits(vectorC[userData[i].cohort], Rappor(userData[i], NUM_BLOOM_BITS, NUM_HASH, P, Q, F), NUM_BLOOM_BITS)
})

_.range(1, NUM_COHORT+1).forEach((i) => {
  _.range(NUM_BLOOM_BITS).forEach((j) => {
    vectorT[i][j] = (parseFloat(vectorC[i][j]) - (parseFloat(P) + (0.5 * F * Q) - (0.5 * F * P)) * parseFloat(cohortReport[i])) / ((1-F) * (Q-P))
    yMat[(i-1) * NUM_BLOOM_BITS + j] = vectorT[i][j]
  })
})

let cnt = 0
let lineCnt = 0

dict.forEach((line) => {
  lineCnt += 1
  line = line.trim()
  const words = line.split(' ')
  const item = words[0].slice(1)
  const cohort = parseInt(words[1])
  let meanHash = 0.0
  _.range(2, NUM_HASH+2).forEach((index) => {
    const bloomBitsIndex = parseInt(words[index])
    i = parseInt((cohort-1) * NUM_BLOOM_BITS + bloomBitsIndex)
    j = parseInt(item)
    xMat[i][j] = 1
  })
})

console.log(xMat)
console.log(yMat)
const xMatObj = matrix(_.flatten(xMat), [NUM_COHORT * NUM_BLOOM_BITS, NUM_ITEM])
const yMatObj = new Float64Array(yMat)
const out = lasso(xMatObj, yMatObj, 1.0)
console.log(out)
*/
