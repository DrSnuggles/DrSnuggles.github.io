/* Loader.js by DrSnuggles
  with serviceWorker.js
*/
'use strict'

var L = (function(my) {

  //
  // Service worker registration
  //
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./serviceWorker.js', {scope : "./"} )
    .then(reg => {
      //console.log('ServiceWorker registered with scope: ', reg.scope)

      if (reg.active) {
        // sw running
        reg.active.postMessage({type:'init'})
      } else {
        // sw starts up
        setTimeout(()=>{location.reload(true)},2000)
      }
    })
    .catch(e => {
      console.error('ServiceWorker registration failed: ',e)
    })

    // Receive msg
    navigator.serviceWorker.addEventListener('message', event => {
      //console.log(event.data)
      // event is a MessageEvent object
      let j = event.data
      //console.log(`The service worker sent me a message: ${j.type}`)
      switch (j.type) {
        case 'reload':
          document.location.reload(true)
          break
        case 'msg':
          break
        case 'init':
          // style first
          if (j.c) addHead('style', j.c)
          // libs
          if (j.b) addHead('script', j.b)
          // DOM
          if (j.d) document.body.innerHTML = j.d
          // App last
          if (j.a) addHead('script', j.a, ()=>{
            App.init()
          })
          break
        default:
          console.error('Server sent unknown message type:', j.type)
      }

      function addHead(tag, txt, cb) {
        let tmp = document.createElement(tag)
        tmp.type = (tag==='script') ? 'text/javascript' : 'text/css'
        //tmp.text = txt // works for script only
        tmp.appendChild(document.createTextNode(txt)) // works for script and style
        document.head.appendChild(tmp)
        if (cb) cb()
      }

    }) // message

  }

}(L | {}))
