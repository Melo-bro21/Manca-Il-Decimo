const sportsCenterService = require('./sports-centers.service');
const stripeService = require('../../shared/stripe.service');

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

async function createSportsCenter(req, res, next) {
  try {
    // Chirurgico: forziamo l'assegnazione del proprietario
    const centerData = {
      ...req.body,
      ownerId: req.user.id 
    };
    
    const newCenter = await sportsCenterService.createSportsCenter(centerData);

    res.status(201).json({
      message: 'Centro sportivo creato con successo',
      data: newCenter,
    });
  } catch (error) {
    next(error);
  }
}

async function onboardSportsCenter(req, res, next) {
  try {
    const { sportsCenterId } = req.body;

    // 1. Verifichiamo che il centro appartenga davvero a chi lo sta configurando
    const sportsCenter = await sportsCenterService.getSportsCenterById(sportsCenterId);
    if (sportsCenter.ownerId !== req.user.id) {
      return res.status(403).json({ message: "Non sei il proprietario di questo centro" });
    }

    // 2. Generiamo il link di onboarding con Stripe
    // Usiamo l'email dell'utente e l'URL di ritorno (il tuo frontend)
    const { accountId, url } = await stripeService.createOnboardingLink(
      req.user.email, 
      process.env.FRONTEND_URL 
    );

    // 3. Salviamo l'ID dell'account Stripe nel database del centro sportivo
    await sportsCenterService.updateSportsCenter(sportsCenterId, { 
      stripeAccountId: accountId 
    });

    // 4. Mandiamo l'URL al frontend, così reindirizziamo il proprietario
    res.status(200).json({ url });
  } catch (error) {
    next(error);
  }
}

// ... aggiungi onboardSportsCenter al tuo module.exports esistente

module.exports= {
    getAllSportsCenter,
    getSportsCenterById,
    getFieldsBySportsCenterId,
    createSportsCenter,
    onboardSportsCenter, // <-- aggiunto qui
};