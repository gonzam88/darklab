var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT;
var listener = server.listen(port);


let columnasMapa = 21; //tambien filas, es un cuadrado

// ABRO IMAGEN LABERINTO
// var laberinto;
var players = [];
var mapa    = []; // array
var items   = []; // objeto
var rastros = []; // donde quedo la sange/muertos

var mapKeys = {
  camino:    "#ffffff",
  comienzo:  "#878787",
  pared:     "#000000",
  llave:     "#fcff00",
  puerta:    "#814900",
  salida:    "#00ff00"
}

var initPos = {x:0,y:0}
var exitPos = {x:0,y:0}

var playerColors = ["#848ccf","#93b5e1", "#ffe4e4", "#be5683"]

var fs = require('fs');
var Canvas = require('canvas');

// CARGO EL MAPA

fs.readFile('./assets/484d8ef5-a783-417d-8e0d-f08531f28d0e%2Flaberinto-21x21_map.png?v=1598411110690', function(err, data) {
    if (err) throw err;
    var canvas = Canvas.createCanvas(columnasMapa,columnasMapa);
    var ctx = canvas.getContext('2d');
  
    var image = new Canvas.Image; // Create a new Image
    image.onload = function() {
      ctx.drawImage(image, 0, 0);
      for(let y = 0; y < columnasMapa; y++){
          for(let x = 0; x < columnasMapa; x++){
            
            let px = ctx.getImageData(x, y, 1, 1).data
            let val = rgbToHex(px[0], px[1], px[2]);
            
            switch(val){
              case mapKeys.pared:
                mapa.push(1)
                break;
                
              case mapKeys.salida:
                mapa.push(2)
                break;
                
              default:
                mapa.push(0)
            }
            
            
            if(val == mapKeys.comienzo){
              initPos.x = x
              initPos.y = y
            }
            if(val == mapKeys.salida){
              exitPos.x = x
              exitPos.y = y
            }
            
          } 
        }
        //console.log(mapa)
    };
    image.src = data;
});

// CARGO LOS ITEMS
fs.readFile('./assets/484d8ef5-a783-417d-8e0d-f08531f28d0e%2Flaberinto-21x21_items.png?v=1598411824594', function(err, data) {
    if (err) throw err;
    var canvas = Canvas.createCanvas(columnasMapa,columnasMapa);
    var ctx = canvas.getContext('2d');
  
    var image = new Canvas.Image; // Create a new Image
    image.onload = function() {
      ctx.drawImage(image, 0, 0);
      for(let y = 0; y < columnasMapa; y++){
          for(let x = 0; x < columnasMapa; x++){
            
            let px = ctx.getImageData(x, y, 1, 1).data
            let val = rgbToHex(px[0], px[1], px[2]);
            if(val == "#000000"){ continue }
            
            let itemName = mapKeys.getKeyByValue( val )
            let data = {pos : {x:x, y:y}, item : itemName}
            items.push(data)
          } 
        }
    };
    image.src = data;
});

function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}
function rgbToHex(r, g, b) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

// Routing
app.use(express.static('public'));
// Chatroom


io.on('connection', (socket) => {
  console.log("user connected",socket.id)
  let newPColor = playerColors[Math.floor(Math.random() * playerColors.length)]
  
  let newPlayer = {
    pos: initPos, 
    id:socket.id, 
    hasKey:false, 
    heading:0,
    color: newPColor
  };
  players.push(newPlayer);
  console.log("new player", newPlayer)
  //console.log(players)
  
  // when the client emits 'new message', this listens and executes
  socket.on('logged', (data) => {
    // we tell the client to execute 'new message'
    socket.emit('createLevel', {
      id: socket.id,
      players: players,
      mapa: mapa,
      items: items,
      rastros: rastros,
      initPos: initPos,
      exitPos: exitPos,
      mapKeys: mapKeys,
      color: newPColor, // anda re mal, revisar
      
      username: socket.username,
      message: data,
      timestamp: new Date(),
      
      
    });
    
    // les aviso al resto que agreguen este pj
    socket.broadcast.emit('newPlayer',newPlayer);
    
  });


  socket.on('moved', (data) => {
    // el usuario se movio
    // le envio a todos menos al que me envió
    if(data.pos){
      let j = GetJugadorFromId(data.id)
      j.pos = data.pos
      socket.broadcast.emit('update',data);  
    }
    
  });
  
  
  socket.on("murio", (data) =>{    
    console.log("murio", data)

    io.emit('playerMurio',data); // se lo envio a todes    
    rastros.push({ pos:data.pos, tipo: 1, time: Date.now() })
    
    if(data.hasKey){
      // el jugador que murio tenia una llave
      let _data = {pos : data.playerPos, item : "llave"}
      items.push(_data)
      io.emit("itemsUpdate",items)
    }
    
    let player = GetJugadorFromId(data.id)
    player.pos = initPos;
    player.hasKey = false
    // TODO guardar rastros en DB
  })
  

  socket.on("agarroLlave", (data) =>{
    console.log("Agarro llave", data)
    for(let i=0;i<items.length;i++){
      if(items[i].item == "llave"){
        items.splice(i,1) // saco la llave de los items
        break;
      }
    }
    let player = GetJugadorFromId(socket.id)
    player.hasKey = true
    io.emit("itemsUpdate",items)
    socket.broadcast.emit('update',player);  
  })

  
  socket.on("abrioPuerta", (data) =>{
    
    // saco la puerta de los items
    for(let i=0;i<items.length;i++){
      if(items[i].item == "puerta"){
        items.splice(i,1) // saco la llave de los items
        break;
      }
    }
    //let player = GetJugadorFromId(socket.id)
    //player.hasKey = false // le saco la llave
    io.emit("itemsUpdate",items)
    //socket.broadcast.emit('update',player);  
  })



  // when the user disconnects.. perform this
  socket.on('disconnect', () => {
    
    socket.broadcast.emit('playerDisconnected',{id:socket.id});
    for(let i = 0; i < players.length; i++){
      if(players[i].id == socket.id){
        console.log("disconnected",players[i])
        if(players[i].hasKey){
          let data = {pos : players[i].pos, item : "llave"}
          items.push(data)
          io.emit("itemsUpdate",items)
        }
        players.splice(i,1);
        break;
      }
    }
    
  });
  
});

console.log(`Your app is listening on port ${listener.address().port}`);




function GetJugadorFromId(_id){
  for(let i=0; i<players.length; i++){
    if(players[i].id == _id){
      return players[i];
    }
  }
}


Object.prototype.getKeyByValue = function( value ) {
    for( var prop in this ) {
        if( this.hasOwnProperty( prop ) ) {
             if( this[ prop ] === value )
                 return prop;
        }
    }
}