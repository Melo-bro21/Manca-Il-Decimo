const sportsCenterService = require('./sports-centers.service');

async function  getAllSportsCenter(req,res,next) {
 try 
 {
 const sportsCenters = await sportsCenterService.getAllSportsCenters();
 
 res.status(200).json({
    message: 'Sports center retrieved successfully',
    data: sportsCenters,
 });
 }catch(error){
   next(error);
 }
}

async function getSportsCenterById(req,res,next) {
 try{
 const sportsCenterId= Number(req.params.id);
 const sportsCenter = await sportsCenterService.getSportsCenterById(sportsCenterId);

 res.status(200).json({
    message: 'Sports center retrived successfully',
    data: sportsCenter,
 });
 }catch (error){
   next(error);
 }
}

async function getFieldsBySportsCenterId(req,res,next) {
 try{
  const sportsCenterId = Number(req.params.id);
  const fields= await sportsCenterService.getFieldsBySportsCenterId(sportsCenterId);

  res.status(200).json({
    message:'Sports center fields retrived successfully',
    data:fields,
  })
 }catch(error){
   next(error);
 }  
}

module.exports= {
    getAllSportsCenter,
    getSportsCenterById,
    getFieldsBySportsCenterId,
};