const {AppError} = require("../shared/errors"); 

function notFoundMiddleware(req,res,next) 
{
    next(new AppError(`Error ${req.originalUrl} not found`, 404));
}

module.exports=notFoundMiddleware;
