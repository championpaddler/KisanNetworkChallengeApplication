
//@Author - Shubham Kumar
// Contact- 8447033951

//Start
var express = require("express"); // Importing Express Moodule
var app    = express(); // Initialising Express App
var moment=require('moment'); // Import Moment Module for Timestamp
var path=require('path');
//importing postgre module

var pg = require('pg');
//importing postgre remote url

var conString = "postgres://jnrbodvy:fARxSzboPtCbcvWvPXrcEjaFW6Dr8QM-@baasu.db.elephantsql.com:5432/jnrbodvy";
//creating client

var pgclient = new pg.Client(conString);
//connecting client

pgclient.connect();


//Setting up environment variable for Twilio Message Api
process.env['TWILIO_ACCOUNT_SID']='AC03afb8e9a8a1190530d1b7a64d268b33' //Twilio Account Sid
process.env['TWILIO_AUTH_TOKEN']='8377b0002619f02867c8ce26492153cb' //Twilio Account Auth Token
process.env['TWILIO_PHONE_NUMBER']='+17175379973'; //Twilio Account Phone Number


//Setting up twilio Client

const client = require('twilio')(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);


//Table creation if not exists
  pgclient.query("CREATE TABLE IF NOT EXISTS  Contacts(Sid SERIAL PRIMARY KEY, FirstName VARCHAR(40) not null,LastName VARCHAR(40) not null, Number VARCHAR(10) not null)");



  pgclient.query("CREATE TABLE IF NOT EXISTS  Messages (Mid SERIAL PRIMARY KEY, FirstName VARCHAR(40) not null,LastName VARCHAR(40) not null, Number VARCHAR(10) not null, Message VARCHAR(1000) not null, Timestamp VARCHAR(1000) not null)");



//Creating middleware for Angular frontend 
app.use(express.static('public'))
//Creating middleware body-parser for parsing requests to node server

var bodyParser = require('body-parser');

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));

//CORS Configuration for testing purpose only .Please uncommet while testing with Angular 

app.use(function(req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");

        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
        res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers")

      next();
      });

    


app.get('/',function(req,res){
  res.sendFile(path.join(__dirname+"/index.html"));
})
    
//Api to get Contacts Data

   app.get('/contacts',function(req,res){
    pgclient.query("SELECT * FROM Contacts",function(err,result){
      res.send(JSON.stringify(result.rows));
    })
    })

    
//Api to get Messages Data
  app.get('/messages',function(req,res){
    pgclient.query("SELECT * FROM Messages ORDER BY MID DESC ",function(err,result){
      res.send(result.rows);
    })
})

// Api to get details of  particular client
app.get('/user/:id',function(req,res){
  pgclient.query("SELECT * FROM Contacts WHERE Sid = ($1) ",[req.params.id],function(err,result){
    res.send(result.rows);
  })
  
});

// POST Api to save message delievered to a particular client
app.post('/user/:id',function(req,res){
// Fetching Client details from Contacts and passing them

 pgclient.query("SELECT * FROM Contacts WHERE Sid =($1) ",[req.params.id],function(err,result){
    if(err) {console.log(" Inside Contacts  Error:",err); }
   
   // naming parameter of client
    var First=result.rows[0]['firstname']; //Firstname 
    var last=result.rows[0]['lastname'];   //Last name 
    var number=result.rows[0]['number'];   //Phone number
    var timestamp= moment().format('MMMM Do YYYY, h:mm:ss'); 
    // CurrentTimstamp
    //Inserting Message Details
    pgclient.query("Insert into Messages (FirstName,LastName,Number,Message,Timestamp) VALUES($1,$2,$3,$4,$5)",[First,last,number,req.body.message,timestamp],function(err)
    {
      //Consoling error if any 
      if(err){  console.log(" Inside Messages  Error:",err);}
      }) 
   
// Delievering Actual Messages
// Please Note for actual delievery of message to client,client's number must be verified in Twilio trial account caller number's
  client.messages.create({
         body: req.body.message,
         from: process.env.TWILIO_PHONE_NUMBER,
         to: '+91'+number
       })
      .then(message => {res.send(["Done",err]);//sending Done reply incase message is delievered
     }).catch(e=>res.send(e));//catch is used for sending Error to frontend 
    });

 //This prevents from node app to crash  as in case of any error while delievering of message
   process.on('uncaughtException', function (err) {});
});


//Api to add new client to contacts

app.post('/add/',function(req,res){
  //Fetcing details from payload 
var fir=req.body[0].firstName;
var last=req.body[0].LastName;
var number=req.body[0].Phone;
pgclient.query("INSERT INTO Contacts (FirstName,LastName,Number) VALUES($1,$2,$3)",[fir,last,number],function(err,rows)
{

});
res.send(["Done"]); //Sending Confirmation
})

//deleting the client
app.post('/delete/',function(req,res){
  //Fetcing details from payload 
var user=req.body[0]['id'];
pgclient.query("DELETE FROM Contacts WHERE Sid =($1) ",[user],function(err,rows){
  res.send(["Deleted"]);
 });
})


  


app.listen(process.env.PORT || 3000);
//