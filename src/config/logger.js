const { format, createLogger, transports } = require('winston');


const combined = format.combine(
  format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`),
);
const logger = createLogger({
  level: 'info',
  format: combined,
  transports: [
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: combined,
  }));
}

module.exports = logger;
