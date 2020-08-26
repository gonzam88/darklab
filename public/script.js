var colores = {
  fondo:   "#1a1a2e",
  yo:      "#0f346066",
  otros:   "#0f346066",
  muerte:  "#e94560"
}
document.body.style.background = colores.fondo

var mapKeys;
var spriteLlave;
var spritesPj = []
var spritePuerta
var spriteCalavera

//the socket connection
var socket = io();
var map = []; // TODO Borrar
var myId = null; 
var ctx;

var players = [];
var mapa    = [];
var items   = [];
var rastros = []; // donde quedo la sange/muertos

let columnasMapa = 21; //tambien filas, es un cuadrado

// getter trucho
var initPos = function(){return {x:_initPos.x, y:_initPos.y}}
var _initPos;
var _exitPos;

socket.emit("logged", "holis");
function b64(e){var t="";var n=new Uint8Array(e);var r=n.byteLength;for(var i=0;i<r;i++){t+=String.fromCharCode(n[i])}return window.btoa(t)}

socket.on("createLevel", function(msg){
  console.log(msg)
  
  myId     = msg.id
  players  = msg.players
  mapKeys  = msg.mapKeys
  mapa     = msg.mapa
  items    = msg.items
  rastros  = msg.rastros
  _initPos = msg.initPos
  _exitPos = msg.exitPos
  mapKeys  = msg.mapKeys
  myColor  = msg.color

  let myp5 = new p5(sketch);
})

socket.on("newPlayer", function(msg){
  players.push(msg)
})

socket.on("update", function(msg){
  //console.log(msg)
  for(let i = 0; i < players.length; i++){
    if(players[i].id == msg.id){
      players[i] = msg
    }
  }
})


socket.on("playerMurio",function(msg){
  // un jugador murio
  let victima = GetJugadorFromId(msg.id);
  rastros.push({pos:msg.pos, tipo: 1, time: Date.now()})
  victima.pos = initPos();
  victima.hasKey = false
})

socket.on("playerDisconnected", function(msg){
  // console.log("disconnected", msg)
  for(let i = 0; i < players.length; i++){
    if(players[i].id == msg.id){
      players.splice(i,1);
      return;
    }
  }
})

socket.on("itemsUpdate", function(msg){
  items = msg
})



function GetPixel(x,y){
  return ctx.getImageData(x, y, 1, 1).data;
}

function GetMapPixel(x,y){
  let index = y * columnasMapa + x;  
  return map[index];
}


function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}
function rgbToHex(r, g, b) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}
  
  
function GetJugadorFromId(_id){
  for(let i=0; i<players.length; i++){
    if(players[i].id == _id){
      return players[i];
    }
  }
}


// drawing loop
let sketch = function(p) {

  
  let tileSize = 21;
  
  p.preload = function(){
    console.log("p5 preloading")
    spriteLlave = p.loadImage('https://cdn.glitch.com/484d8ef5-a783-417d-8e0d-f08531f28d0e%2Fitem1BIT_key.png?v=1598400450261');
    spritesPj[0] = p.loadImage('https://cdn.glitch.com/484d8ef5-a783-417d-8e0d-f08531f28d0e%2FHEROS1bit_Adventurer%20Idle%20D.png?v=1598416626001');
    spritesPj[1] = p.loadImage('https://cdn.glitch.com/484d8ef5-a783-417d-8e0d-f08531f28d0e%2FHEROS1bit_Adventurer%20Idle%20L.png?v=1598417269008');
    spritesPj[2] = p.loadImage('https://cdn.glitch.com/484d8ef5-a783-417d-8e0d-f08531f28d0e%2FHEROS1bit_Adventurer%20Idle%20U.png?v=1598416626382');
    spritesPj[3] = p.loadImage('https://cdn.glitch.com/484d8ef5-a783-417d-8e0d-f08531f28d0e%2FHEROS1bit_Adventurer%20Idle%20R.png?v=1598416626149');
    
    spritePuerta = p.loadImage('https://cdn.glitch.com/484d8ef5-a783-417d-8e0d-f08531f28d0e%2Fpuerta.png?v=1598416313465');
    spriteCalavera = p.loadImage('https://cdn.glitch.com/484d8ef5-a783-417d-8e0d-f08531f28d0e%2Fitem1BIT_bones-shadow.png?v=1598416320445');
  }

  p.setup = function() {
    console.log("p5 loaded")
    
      
    document.onkeydown = checkKey;
    // MAPA is LOADED
    let cnv = p.createCanvas(600, 600);
    let gameContainer = document.getElementById('gameContainer');
    cnv.parent(gameContainer)
    playerPos = initPos()
  };

  p.draw = function() {
    //p.background(colores.fondo);
    
    //p.clear()
    p.background(0)
    p.noStroke();
    
    let medio = columnasMapa/2
    
    p.translate(
      (600/2) - (playerPos.x * tileSize),
      (600/2) - (playerPos.y * tileSize)
    )
    
    
    if(debugMap){
      for(let y = 0; y < columnasMapa; y++){
        for(let x = 0; x < columnasMapa; x++){
          let index = y * columnasMapa + x;  
          if(mapa[index]==0){
            p.noStroke()
            p.fill(200)
            p.square((x*tileSize)-(tileSize/2), (y*tileSize)-(tileSize/2), tileSize);  
          }
        }
      }
    }
    
    
    
    // dibujo los rastros
    for(let i =0; i< rastros.length; i++){
      switch(rastros[i].tipo){
        case 1: //muerte
          let x = rastros[i].pos.x * tileSize
          let y = rastros[i].pos.y * tileSize
          
          p.fill(GetMuerteColor(rastros[i].time))
          //p.textSize(16);
          //p.text("x",x,y)
          
          //p.square(x - (tileSize/2),y - (tileSize/2),tileSize)
          // p.setAlpha(0-255)
          
          p.image(spriteCalavera, x - (tileSize/2),y - (tileSize/2))  
          break;
      }
    }
    
    // dibujo los items
    for(let i=0; i<items.length;i++){
      switch(items[i].item){
        case "llave":
          p.image(spriteLlave, (items[i].pos.x * tileSize)- (tileSize/2), (items[i].pos.y * tileSize)- (tileSize/2))  
          break;
          
        case "puerta":
          p.image(spritePuerta, (items[i].pos.x * tileSize)- (tileSize/2), (items[i].pos.y * tileSize)- (tileSize/2))  
          break;
      }
    }
    
    // Me dibujo a mi
    DrawPlayer(playerPos, playerHeading, hasKey, myColor)
    
    // dibujo a los demas
    p.fill(colores.otros)
    for(let i = 0; i < players.length; i++){
      if(players[i].id != myId){
        DrawPlayer(players[i].pos, players[i].heading, players[i].hasKey, players[i].color)
        ///p.circle((players[i].pos.x * tileSize), (players[i].pos.y * tileSize), tileSize/2)  
      }
    }
    
    
    
    
  }; // end update
  
  
  function DrawPlayer(pos,_heading,_hasKey, color = "#ffffff"){
    p.tint(color)
    p.image(spritesPj[_heading], (pos.x * tileSize)- (tileSize/2), (pos.y * tileSize)- (tileSize/2))
    if(_hasKey){
      p.image(spriteLlave, (pos.x * tileSize), (pos.y * tileSize))  
    }
  }
  
  function GetMuerteColor(_time){
    let diff = (Date.now() - _time) / 1000;
    let minutosQueDura = 10; // las muertes duran 10 minutos
    let alfa = p.map(diff, 0, minutosQueDura * 60, 100, 0)
    return convertHex(colores.muerte, alfa)
  }
  function convertHex(hexCode,opacity){
    var hex = hexCode.replace('#','');
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    var r = parseInt(hex.substring(0,2), 16),
        g = parseInt(hex.substring(2,4), 16),
        b = parseInt(hex.substring(4,6), 16);
    opacity = p.constrain(opacity,0,100)
    return 'rgba('+r+','+g+','+b+','+opacity/100+')';
}
  
  
  
  function checkKey(e) {
      e = e || window.event;
      let playerMoved = false;
      let nextPos = Object.assign({}, playerPos); // Object assign hace una copia, sino queda una referencia
      if (e.keyCode == '38') {
          nextPos.y --
          playerMoved = true
          playerHeading = 2
      }
      else if (e.keyCode == '40') {
          nextPos.y ++
          playerMoved = true
          playerHeading = 0
      }
      else if (e.keyCode == '37') {
         nextPos.x --
          playerMoved = true
          playerHeading = 1
      }
      else if (e.keyCode == '39') {
         nextPos.x ++
          playerMoved = true
        playerHeading = 3
      }
    
    
    if(playerMoved){
      // Chequeo si la proxima posicion es valida o muere
      let nextPosVal = GetMapPixel(nextPos.x, nextPos.y);
      
      let index = nextPos.y * columnasMapa + nextPos.x;
      let allowMove = false;
      if(mapa[index] == 0){
        // Piso: puede caminar
        // Primero chequeo si en este nuevo lugar hay un item
        if(items.length>0){
          for(let i=0; i <items.length; i++){
            if(items[i].pos.x == nextPos.x && items[i].pos.y == nextPos.y){
              //console.log(items[i].item)
              switch(items[i].item){
                case "llave":
                  allowMove = true
                  socket.emit("agarroLlave", {
                      id: myId,
                      pos:nextPos
                    })
                  hasKey = true
                  alert("Encontraste una llave")
                  break;

                case "puerta":
                  if(hasKey){
                    // abre la puerta
                    hasKey = false
                    socket.emit("abrioPuerta", {
                      id: myId,
                      pos:nextPos,
                      hasKey:false
                    })
                    allowMove = true
                    alert("La puerta se abre haciendo un chirrido insoportable")  
                  }else{
                    allowMove = false
                    alert("La puerta parece estar cerrada con llave")  
                  }

                  break;

              }
              break; // salgo del forloop
            }else{
              // no hay items en la proxima posicion
              allowMove = true
            }
          }
        }else{
          allowMove=true
        }
        
        
      }else if(mapa[index] == 1){
        // Pared: muere
        if(!disableCollision){
            socket.emit("murio", {
              id: myId,
              pos:nextPos,
              playerPos: playerPos,
              hasKey: hasKey
            })
            
          hasKey=false  
            playerPos = initPos()
            alert("moriste");
          }
      }else if(mapa[index] == 2){
        // GANASTE !
        
        socket.emit("gano", {
          id: myId,
          pos:nextPos
        })
        alert("GANASTE!")
      }
      
      if(allowMove || disableCollision){
        playerPos = nextPos;
        socket.emit("moved", {
            id: myId,
            pos:playerPos,
            heading: playerHeading,
            hasKey: hasKey
        });
      }
      

      
    }

  }
  
};






let playerHeading = 0
/*
0: sur
1: oeste
2: norte
3: este
*/
let myColor;
let disableCollision = false
let playerPos;
let hasKey = false
let debugMap = false

function DEBUG(k = true){
   debugMap = k
   disableCollision = k
}