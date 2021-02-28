## DP

### Installation
- npm install
### Configuration
- src/config/index.js

### Tutorial Mode
- HTML tag에 data-intro='내용' data-step=숫자 (optional) 을 추가하면 된다.

### Sweat Alert2
- 서버에서 특정 성공 메세지를 띄우고 싶을 때
- req.flash('swalSuccess', '문장') 을 호출하면 된다.
### Development
- npm start

### Migration

- npm run sequelize db:migrate

### Migration Create
- npm run sequelize migration:generate -- --name=파일명


### 2019. 07. 21
- npm run sequelize db:migrate
- node fake-data.js (한번만 실행하면 DB에 임시로 데이터를 집어넣습니다)
  1. provider 50명을 생성합니다. ex) provider1@test.com, 비밀번호 123123
  2. consumer 1명을 생성합니다.
  3. question 1개를 생성합니다.
  4. transaction을 50개 생성합니다. 협상을 모두 마친 상태입니다.

#### 변경해야 할 파일
- src/app/controllers/admin-visualization/index.js
- src/app/views/market-admin/visualization/index.pug
"# dp_market" 
