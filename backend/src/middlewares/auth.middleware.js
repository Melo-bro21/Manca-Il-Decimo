const jwt = require('jsonwebtoken');

const {AppError} = require('../shared/errors');
const env = require('../config/env');

const authMiddleware = (req,res,next) => {

  const authHeader = req.headers.authorization; 

  if(!authHeader) 
  {
    throw new AppError('Token mancante',401);
   }
  
   const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new AppError('Formato token non valido', 401);
  }

 const token = parts[1];

 try {
  const decoded = jwt.verify(token, env.jwtSecret);
  
  req.user = {
    id: decoded.id,
    email: decoded.email,
    role: decoded.role,
  };

  next();
 }catch(error) {
  throw new AppError('Token non valodi o scaduto', 401);
 }
};

module.exports = authMiddleware;