

const app= require("./app");
const env= require("./config/env");

const server=app.listen(env.port, ()=>
{
    console.log(`Server is running on port ${env.port}`); 
});


process.on("unhandledRejection", (err)=>{ 
 console.error("Unhandled Rejection:", err);

 server.close(()=>{
 process.exit(1); 
 });
});


process.on("uncaughtException", (err)=>{
 console.error("Unchaught Exception:", err);

 server.close(()=>{
 process.exit(1);
 });
});

