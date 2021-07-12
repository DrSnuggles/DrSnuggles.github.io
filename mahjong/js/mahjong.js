/* EmojiLand - DrSnuggles 2021
  Mahjong
*/

'use strict'
window.EL = {}
EL.mahjong = ( function () {
  const debug = true

  let my = {},
  jGame,
  board,
  shiftY

  function log(...args){
    if (debug) console.log(`[Mahjong: ${new Date().toISOString()}]`, ...args)
  }

  //
  // init
  //
  addEventListener('load', () => {
    log('mahjong onload')

		// configure Guru
    if (typeof Guru !== 'undefined') {
      Guru.show = debug
      Guru.send = !debug
    }

    //
    // browser behaviour
    //
    // should be in emojiGame.js
    document.oncontextmenu = (ev) => {
      ev.preventDefault()
    }

    // cont loading
    fetch('./mahjong.json')
    .then(r => r.json())
    .then(j => {
      log(j)
      jGame = j

      //
      // Set main, game specifc HTML
      //
      document.body.innerHTML = `<style>
      @font-face {
        font-family: SegoeUI;
        src: url(./css/seguiemj.ttf) format('ttf');
      }
      body {
        background-color: #293061;
      }
      select { /* should be moved to default style.css */
        font-family: sans-serif;
        font-size: min(3.5vw, 3vh);
        background-color: transparent;
        color: red;
        border: none;
        outline: none;
      }
      select option {
        background-color: #000;
      }

      #gameDiv {
        position: relative;
        display: inline-flex;
      }
      .end {
        font-size: min(50vw, 50vh);
      }
      .tile {
        position: absolute;
        font-size: min(8vw, 9vh);
        transition: ease-in-out .1s;
        font-family: SegoeUI;
      }
      /*.tile:hover,*/
      .tile.selected
      {
        /*font-size: min(8vw, 7vh);*/
        animation: attractor .5s infinite;
      }
      @keyframes attractor {
        0% {
          font-size: min(8vw, 9vh);
        }
        50% {
          font-size: min(9vw, 10vh);          
        }
        100% {
          font-size: min(8vw, 9vh);
        }
      }
      </style>
      <center>
      <table id="topLine" style="text-align: center;">
        <tr>
          <td width="33.33%">TILES</td>
          <td width="33.33%">POSSIBLE</td>
          <td>BOARD</td>
        </tr>
        <tr>
          <td style="color: red;" id="scoreTilesLeft">00000</td>
          <td style="color: red;" id="scorePossible">00000</td>
          <td id="contSel"></td>
        </tr>
      </table>
      <div id="gameDiv"></div>
      <!--
      <table id="bottomLine">
        <tr>
          <td id="dispLives"></td>
          <td></td>
          <td></td>
        </tr>
        <tr>
          <td colspan="2" style="text-align: right;" align="right"><div id="dispTime" style="position:relative;background-color: green;">&nbsp;</div></td>
          <td style="color: yellow;text-align: right;width: 1px;">TIME</td>
        </tr>
      </table>
      -->
      </center>`
      
      let sel = ['<select onchange="EL.mahjong.change(this.selectedIndex)">']
      Object.keys(jGame.layouts).forEach(layout => {
        sel.push(`<option>${layout}</option>`)
      })
      sel.push('</select>')
      contSel.innerHTML = sel.join('')

      //
      // events
      //
      onresize = drawBoard
      oncontextmenu = showPairs

      generateBoard('Turtle')

    })

  }) // addeventlistener load
  function randomInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }
  function generateBoard(layout){
    let map = expandMapping( jGame.layouts[layout] )

    // find max dimensions
    let z = 0, y = 0, x = 0
    for (let i = 0, n = map.length; i < n; i++) {
      if (map[i][0] > z) z = map[i][0]
      if (map[i][2] > y) y = map[i][2]
      if (map[i][1] > x) x = map[i][1]
    }
    z++
    y++
    x++
    log('max dimensions', z, y, x)
    // create empty multidim array
    let ret = [] // still sucks! new Array(z+1).fill( new Array(y+1).fill( new Array(x+1).fill(0) ) )
    for (let i = 0; i < z; i++) {
      ret[i] = []
      for (let j = 0; j < y; j++) {
        ret[i][j] = []
        for (let k = 0; k < x; k++) {
          ret[i][j][k] = 0
        }
      }
    }

    for (let i = 0, n = map.length; i < n; i++) {
      const z = map[i][0],
      y = map[i][2],
      x = map[i][1]
      
      //log(i,z,y,x)
      ret[z][y][x] = 1
    }

    //let ret = JSON.parse(JSON.stringify(jGame.layouts[layout])) // make copy of original board
    // 144 tiles in total
    // fill array of tiles we can pick from, those unicode chars are two bytes wide, i pick from JSON
    let pickFrom = []
    for (let i = 0; i < 4; i++) {
      for (let j = jGame.tiles.x4.length-1; j >= 0; j-=2) {
        pickFrom.push(jGame.tiles.x4[j-1]+jGame.tiles.x4[j])
      }
    }
    for (let i = jGame.tiles.x1.length-1; i >= 0; i-=2) {
      pickFrom.push(jGame.tiles.x1[i-1]+jGame.tiles.x1[i])
    }
    
    // fill object with tiles
    for (let l = 0, n = ret.length; l < n; l++) { // layers
      for (let y = 0, nn = ret[l].length; y < nn; y++) { // rows
        for (let x = 0, nnn = ret[l][y].length; x < nnn; x++) { // cols
          if (ret[l][y][x] === 1) { // we have to find a tile for this position
            ret[l][y][x] = pickFrom.splice(randomInteger(0, pickFrom.length-1), 1)[0]
          }
        }
      }
    }
    console.log('generated board', ret)
    board = ret
    drawBoard()
    return ret
  }
  // from https://github.com/ffalt/mah/
  function expandMapping(map) {
    const result = []
    map.forEach(matrix => {
      const z = matrix[0]
      const rows = matrix[1]
      rows.forEach(row => {
        const y = row[0]
        const cells = row[1]
        if (!Array.isArray(cells)) {
          result.push([z, cells, y])
        } else {
          cells.forEach(cell => {
            if (Array.isArray(cell)) {
              let x = cell[0]
              const count = cell[1]
              for (let i = 0; i < count; i++) {
                result.push([z, x, y])
                x += 2
              }
            } else {
              result.push([z, cell, y])
            }
          })
        }
      })
    })
    return result
  }

  //
  // loop
  //
  function drawBoard() {

    const vUnit = Math.min(innerWidth, innerHeight*.9)

    let html = [],
    layerShiftX = vUnit/100,
    layerShiftY = vUnit/-100,
    widthX = vUnit/26,
    widthY = vUnit/19
    
    const shiftY = Math.abs(board.length-1 * layerShiftY) // top left -> shiftY = 80, will need more for stacked tiles in perspective! abs(layers-1*layerShiftY)

    // draw layers from bottom to top
    // each layer from up to down
    // from right to left
    for (let l = 0, n = board.length; l < n; l++) { // layers
      //console.log('---------------- Layer '+ l +' ---------------------')
      for (let y = 0, nn = board[l].length; y < nn; y++) { // rows
        for (let x = board[l][y].length-1; x >= 0; x--) { // cols
          const tile = board[l][y][x]
          if (tile !== 0) {
            //ctx.fillText(tile, widthX*x+l*layerShiftX, widthY*y+l*layerShiftY+shiftY)
            //html.push(`<div class="tile" style="left:${widthX*x+l*layerShiftX}px;top:${widthY*y+l*layerShiftY+shiftY}px;">${tile}</div>`)
            html.push(`<div class="tile" l="${l}" r="${y}" c="${x}" onclick="EL.mahjong.click(this,${l},${y},${x})" style="left:${widthX*x+l*layerShiftX}px;top:${widthY*y+l*layerShiftY+shiftY}px;">${tile}</div>`)
            //console.log(tile, widthX*x+l*layerShiftX, widthY*y+l*layerShiftY+shiftY)
            /*
            ctx.fillText(tile, widthX*x+l*layerShiftX, widthY*y+l*layerShiftY+80)
            console.log(tile, widthX*x+l*layerShiftX, widthY*y+l*layerShiftY)
            */
          }
        }
      }
    }
    
    gameDiv.innerHTML = html.join('')
    gameDiv.style.width = widthX*board[0][0].length+'px'
    updateScores()
  }
  function freeTile(l,r,c) {
    return (freeAbove(l,r,c) && (freeLeft(l,r,c) || freeRight(l,r,c)))
    
    // sub helpers
    function freeAbove(l,r,c) {
      if (l === board.length-1) return true // already top
      for (let y = Math.max(0, r-1); y <= Math.min(board[l].length-1, r+1); y++) {
        for (let x = Math.max(0, c-1); x <= Math.min(board[l][r].length-1, c+1); x++) {
          if (board[l+1][y][x] !== 0) return false
        }
      }
      return true
    }
    function freeLeft(l,r,c) {
      if (c < 2) return true
      for (let y = Math.max(0, r-1); y <= Math.min(board[l].length-1, r+1); y++) {
        if (board[l][y][c-2] !== 0) return false
      }
      return true
    }
    function freeRight(l,r,c) {
      if (c > board[l][r].length-3) return true
      for (let y = Math.max(0, r-1); y <= Math.min(board[l].length-1, r+1); y++) {
        if (board[l][y][c+2] !== 0) return false
      }
      return true
    }
  }
  function click(el, l, r, c) {
    //log(el, l, r, c)
    let sel = gameDiv.querySelector('.selected')

    // 1st check if it's a free tile
    if (!freeTile(l, r, c)) return
    
    // 2nd 
    if (sel && sel !== el) {
      console.log(jGame.tiles.x1.length)
      // look for 2nd tile
      if (board[l][r][c] === sel.innerText // identical x4 type
        || (jGame.tiles.x1.substr(0,8).indexOf(board[l][r][c]) !== -1 && jGame.tiles.x1.substr(0,8).indexOf(sel.innerText) !== -1) // mixed types a 8=unicode
        || (jGame.tiles.x1.substr(8,8).indexOf(board[l][r][c]) !== -1 && jGame.tiles.x1.substr(8,8).indexOf(sel.innerText) !== -1)
      ) {
        //EL.log('clicked 2nd tile correct')
        gameDiv.removeChild(sel)
        gameDiv.removeChild(el)
        board[l][r][c] = 0
        board[sel.getAttribute('l')][sel.getAttribute('r')][sel.getAttribute('c')] = 0
        
      } else {
        //EL.log('clicked 2nd tile wrong',board[l][r][c],sel.innerText)
        return
      }
    } else {
      
    }

    el.classList.toggle('selected')
    updateScores()
  }
  function updateScores(){
    let tilesLeft = gameDiv.querySelectorAll('.tile').length
    scoreTilesLeft.innerText = tilesLeft
    findPairs(false)
    // end of game
    if (tilesLeft === 0) {
      gameDiv.innerHTML = '<span class="end">😊</span>'
    } else if (scorePossible.innerText*1 === 0) {
      gameDiv.innerHTML = '<span class="end">😭</span>'
    }
  }
  function findPairs(mark){
    // find all free tiles
    let freeTiles = []
    for (let z = 0, n = board.length; z < n; z++) {
      for (let y = 0, nn = board[z].length; y < nn; y++) {
        for (let x = 0, nnn = board[z][y].length; x < nnn; x++) {
          if (board[z][y][x] !== 0 && freeTile(z,y,x)) freeTiles.push(board[z][y][x])
        }
      }
    }
    log('freeTiles', freeTiles)
    // find pairs
    const pairs = {}
    freeTiles.forEach(function (x) { pairs[x] = (pairs[x] || 0) + 1 })
    log('pairs', pairs)
    
    let poss = 0
    let x1a = 0
    let x1b = 0
    Object.values(pairs).forEach(val => {
      if (jGame.tiles.x1.substr(0,8).indexOf(val) !== -1) x1a++ // mixed kinds 8=unicode
      if (jGame.tiles.x1.substr(8,8).indexOf(val) !== -1) x1b++
      if (val>1) poss++ // 2 of a kind
      if (val>3) poss++ // 4 of a kind
    })
    scorePossible.innerText = poss + Math.floor(x1a/2) + Math.floor(x1b/2)
    
  }
  function showPairs(){
    findPairs(true)
  }

  //
  // public
  //
  my.click = click
  my.change = (ind) => {
    const tilesLeft = gameDiv.querySelectorAll('.tile')
    if (tilesLeft.length !== 144) {
      let confim = confirm('Really change game and lose progress?')
      if (!confim) return
    }
    let layout = Object.keys(jGame.layouts)[ind]
    generateBoard(layout)
  }

  //
  // exit
  //
  return my
}())
