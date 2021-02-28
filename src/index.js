require('app-module-path').addPath(__dirname);
const express = require('express');
const config = require('config');
const logger = require('config/logger');
const passport = require('passport');
const cookieSession = require('cookie-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const flash = require('connect-flash');
const db = require('app/models');

const app = express();
require('run-middleware')(app);

app.set('views', `${__dirname}/app/views`);
app.set('view engine', 'pug');
app.use(cookieParser('secret key'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieSession({
  keys: ['secret key'],
  name: 'session',
  maxAge: 24 * 60 * 60 * 1000,
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use('/assets', express.static(`${__dirname}/assets`));

app.use((req, res, next) => {
  req.rootPath = __dirname;
  req.runMiddleware = app.runMiddleware;
  next();
});

app.use((req, res, next) => {
  if (req.user) {
    res.locals.user = req.user;
  }
  next();
})

app.use((req, res, next) => {
  /*
  res.locals.errors = req.flash('error');
  res.locals.successes = req.flash('success');
  */
  next();
})
/* import passport */
require('config/passport')();
require('config/local-strategy');
/* import controllers */
require('app/controllers')(app);


app.use('*', (req, res, next) => {
  res.sendFile(__dirname + '/app/views/pages-404.html');
})
db.sequelize.sync()
  .then(() => {
    app.listen(config.port, () => {
      logger.info(`Server Start on port ${config.port}`);
    });
  });
