const PushBullet = require('pushbullet')
const pusher = new PushBullet(process.env.PUSHBULLET_KEY);

module.exports = (message, title = '') => {
  console.log(message);
  if(process.env.NOTIFY == 'true'){
    pushMessage(title, message)
  }
}

const pushMessage = (title, message) => pusher.note({}, title, message, (error, response) => {})
