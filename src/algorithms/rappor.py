#-*- coding:utf-8 -*-
import hashlib
import sys
import struct
import numpy as np
from random import *
from scipy.stats import zipf
from sklearn import linear_model
from sklearn.feature_selection import SelectFromModel
import sys
import json

num_bloom_bits = 8 
num_hash = 2
num_cohort = 1 
num_reports = 500000
num_item = 10
p = 0.5
q = 0.75
f = 0.5
zipf_distribution = 1.01



# Making hash dictionary
# 각 cohort 마다
# 각 item의  bloom filter에서의 hash 위치를 기록해 놓는다.
# (같은 아이템도 cohort 별로 다른 hash 값을 갖는다)
def making_dictionary(num_item,num_cohort,num_hash,num_bloom_bits):

    fw = open('dictionary.txt','w')
    for item in range(num_item):
        for cohort in range(1,num_cohort+1):
            user_item = 'v'+ str(item)                  
            value = struct.pack('>L',cohort) + user_item            # cohort 값과 item에 따라서 다른 value가 나온다. 
            md5 = hashlib.md5(value)                                 
            digest = md5.digest()                                   # value값으로 hash 위치 지정
            fw.write(user_item + ' ' + str(cohort))
            for i in xrange(num_hash):
                fw.write(' ' + str(ord(digest[i])%num_bloom_bits))
            fw.write('\n')


# Sum of bits
# 두 벡터 값을 더하기 위한 함수
def sum_bits(bit1, bit2,num_bloom_bits):
    ret = []
    for i in range(0,num_bloom_bits):
        ret.append(int(bit1[i])+int(bit2[i]))

    return ret


# zipf distribution's probability mass function
# 지프 분포에 따라서 값을 도출한다
def pmf(x,distribution):

    ret = zipf.pmf(x,distribution)
    return ret


# Compute item's Weights
# 아이템의 weight를 계산한다
def ComputeWeight(num_item,distribution):

    weights = []
    for item in range(1,num_item+1):
        item = float(item)
        weights.append(pmf(item,distribution))
    
    return weights


# Sampling frequency
# global 변수인 zipf 분포 값을 이용하여 각 item의 frequency를 계산한다.
def Sample_zipf(num_reports,num_item,distribution):
    
    weights = ComputeWeight(num_item,distribution)
    item_freq = []
    sum_weights = sum(weights)
    fw = open('true_value.txt','w')
    for item in range(num_item):
        item_p = min(max(weights[item]/sum_weights,0),1)
        item_list = num_reports
        rnd_sample_array = np.random.binomial(item_list,item_p,1)
        rnd_sample = rnd_sample_array[0]
        num_reports -= rnd_sample
        sum_weights -= weights[item]
        item_freq.append(rnd_sample)
        fw.write(str(item) + ' ' + str(rnd_sample)+ ' ' + str(item_p) +'\n')
    
    return item_freq

# Making Input
# global 변수인 zipf 분포 값을 이용하여 input을 생성한다.
def making_input(num_reports, num_item, num_cohort, distribution):

    fw = open('input.csv','w')
    item_freq = Sample_zipf(num_reports, num_item, distribution)        # line 74: 각 item들의 frequency를 계산한다.
    user_data = {}
    tmp_list = []
    for item in range(0,len(item_freq)):
        for i in range(0,item_freq[item]):
            tmp_list.append(item)                                       
    """
    cnt = 0;
    cnt2 = 0;
    cnt3 = 0;
    cnt4 = 0;
    for i in range(0,len(tmp_list)):
        if tmp_list[i] == 0:
            cnt += 1;
        if tmp_list[i] == 1:
            cnt2 += 1;
        if tmp_list[i] == 2:
            cnt3 += 1;
        if tmp_list[i] == 3:
            cnt4 += 1;
    print cnt
    print cnt2
    print cnt3
    print cnt4
    """
    shuffle(tmp_list)

    for user in range(0,len(tmp_list)):
        user_data[user]={}
        user_data[user]['item'] = 'v'+str(tmp_list[user])
        user_data[user]['cohort'] = randint(1,num_cohort)
        fw.write(str(user_data[user]['item'])+','+str(user_data[user]['cohort'])+'\n')

    fw.close()
    return user_data
    


# Bloom Filter
# user의 item으로 bloom_filter에서의 hash위치를 찾는다.
def bloom_filter(user_data,num_bloom_bits,num_hash):

    value = struct.pack('>L',user_data['cohort']) + user_data['item']   # cohort 값과 item에 따라서 다른 값(value)이 나온다.
    md5 = hashlib.md5(value)                                            # value값으로 hash의 위치 지정
    while(1):
        digest = md5.digest()                                           
        if len(digest) >=  num_hash:
            break
    
    return [ord(digest[i]) % num_bloom_bits for i in xrange(num_hash)]


# Whole RAPPOR process
def Rappor(user_data,num_bloom_bits,num_hash,p,q,f):

    blm_filter = bloom_filter(user_data,num_bloom_bits,num_hash)        # user의 item을 hash에 통과시켜 bloom_filter 의위치 지정
    str1 = ""                                                            
    for i in range(0,num_bloom_bits):
        if i not  in blm_filter:
            str1+='0'
        else:
            str1+='1'
    fake_blm_filter = Permanent_Randomized(blm_filter,f)                # Permanent randomize를 실행한다.
    
    report = Instaneous_Randomized(fake_blm_filter,p,q)                 # Instaneous randomize를 실행한다.
    return report



# Phase1: Bloom Filter -> perturbed data
# item을 hash에 통과 시켜 만들어진 각 bloom filter를randomize한다.
# 각bit의 값 Bi를
#{ 1 , with probability 1/2f }
#{ 0 , with probability 1/2f }
#{ Bi, with probability 1-f  }
# 로 coin tossing 해준다.
def Permanent_Randomized(user_blm_filter,f):

    r = 0
    str1 = ""
    for i in range(0,num_bloom_bits):
        ran = random()
        if ran < float(0.5*f):              # Bi = 1 , with probability 1/2f 
            str1 += "1"
        elif ran < 2*float(0.5*f):          # Bi = 0 , with probability 1/2f 
            str1 += "0"
        else:                               # Bi = Bi , with probability 1-f 
            if i in user_blm_filter:
                str1 += "1"
            else:
                str1 += "0"
    r = int(str1,2)
    return r


# Phase2: perturbed data -> perturbed data
# Permanent randomize 된 값을 instanos randomize한다.
# 이는 중복된 query에 대해서 보호하기 위함
# 각 bit의 값 Bi를
#{ Bi , with probability q }
#{ NOT Bi , with probability p }
def Instaneous_Randomized(user_fake_blm_filter,p,q):
    report = []
    for bit_num in range(0,num_bloom_bits):
        ran = random()
        if user_fake_blm_filter & ( 1 << bit_num):
            if ran < q:                                 # Bi = Bi , with probability q 
                report.append('1')
            else:
                report.append('0')
        else:                                           # Bi = Bi의 반전 , with probability p 
            if ran < p:
                report.append('1')
            else:
                report.append('0')
    report.reverse() 
    return ''.join(report)
    

if __name__=="__main__":

    vector_c = {}
    vector_t = {}
    y_mat = np.zeros((num_cohort*num_bloom_bits))
    x_mat = np.zeros((num_cohort*num_bloom_bits,num_item))

    cohort_report = {}
    result = {}
    result_mean = {}
    for item in range(0,num_item):
        value = 'v'+str(item)
        result[value]= {}
        result_mean[value] = {}
        for cohort in range(1,num_cohort+1):
            result[value][cohort] = []
            result_mean[value][cohort] = 0.0

    for cohort in range(1,num_cohort+1):
        cohort_report[cohort] = 0
        vector_c[cohort] = [0] * num_bloom_bits
        vector_t[cohort] = [0] * num_bloom_bits
    
                                                                            # 여기까지는 변수initialize


    making_dictionary(num_item,num_cohort,num_hash,num_bloom_bits)                      # 각 cohort별 item의 hash 위치를 저장해 놓는다.
    user_data = making_input(num_reports, num_item, num_cohort, zipf_distribution)      # 각 user가 가진 item으로bloom filter의 hash 위치를 찾는다.

    with open('user_data.json', 'w') as fpp:
        json.dump(user_data, fpp)

    for i in range(0,len(user_data)):
        cohort_report[user_data[i]['cohort']] += 1                                      # cohort별 report수를 카운트
        #print user_data[i]['cohort'],cohort_report[user_data[i]['cohort']]
        vector_c[user_data[i]['cohort']] = sum_bits(vector_c[user_data[i]['cohort']],Rappor(user_data[i],num_bloom_bits,num_hash,p,q,f),num_bloom_bits)
                                                                                        # 각 유저별로 Randomize 함수인 Rappor를 수행시켜 해당 벡터값들을 모두 합산한다=> vector_c
    for i in range(1,num_cohort+1):
        for j in range(0,num_bloom_bits):
            vector_t[i][j] = (float(vector_c[i][j]) - (float(p) + (0.5*f*q) - (0.5*f*p))*float(cohort_report[i])) / ((1-f)*(q-p))
                                                                                        # 합산된 vector 값은biased하기 때문에 unbiased하게 조정해준다=> vector_t 
            y_mat[(i-1)*num_bloom_bits+j] = vector_t[i][j]                              # vector_t를  { 가로 : cohort 수 * bloom bit수, 세로 : 1 }
                                                                                        # 사이즈를   가지는 matrix로 변환한다     
                                                                                        # => y_mat
    
    print('vector_c', vector_c)
    print('vector_t', vector_t)
    
                                                                                        # line 242 에서 만들어진 dictionary로 { 가로 : item 수 , 세로 : cohort 수 *  bloom_bit 수}
    fr = open('dictionary.txt','r')                                                     # 사이즈를 가지는(각 cohort별 각 item의 hash 위치) matrix를 생성한다       
    cnt = 0                                                                             # => x_mat
    line_cnt = 0                                                                        
    lines = fr.readlines()
    for line in lines:
        line_cnt += 1
      
        line = line.strip()
        words = line.split(' ')
        
        item = words[0][1:]
        cohort = int(words[1])
        mean_hash = 0.0
        for index in range(2,num_hash+2):
            bloom_bits_index = int(words[index])
            i = int((cohort-1)*num_bloom_bits+bloom_bits_index)
            j = int(item)
            x_mat[i][j] = 1                                                              

                                                                                        # x_mat과 y_mat을 LASSO regression을 통해 각 item별 coefficient를 구한다 => frequency 
                                                                                         
    print(x_mat)
    print(y_mat)
    model = linear_model.Lasso(alpha=0.5,normalize=True,fit_intercept = False)          # (Rasso)linear regression 
    x_mat = x_mat.tolist()
    y_mat = y_mat.tolist()
    a_model = model.fit(x_mat,y_mat)    
    print model.coef_                                                                   # 각 item별 frequency를 출력
    print('len', len(model.coef_))


