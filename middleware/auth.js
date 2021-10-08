const jwt = require('jsonwebtoken');
const config = require('config');

module.exports = function (req, res, next) {
  var token = req.header('x-auth-token');
  if (!token)
    return res.status(401).send('Токен аутентификации не предоставлен.');

  try {
    const decodedUser = jwt.verify(token, config.get('jwtPrivateKey'));
    req.user_id = decodedUser;
    next();
  } catch (ex) {
    res.status(400).send('Неверный токен аутентификации.');
  }
};
