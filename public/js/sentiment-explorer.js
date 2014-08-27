define(function(require, exports, module) {

  // ########################
  //  Dependencies
  // ########################
  var DomComponent  = require('DomComponent');
  var ZoneSentiment = require('ZoneSentiment');
  window.socket = io.connect('http://localhost:3000');

  // ########################
  //  Template
  // ########################
  var template = DomComponent.getHtml(function() {/*
    <sentiment-explorer>
    <div class="controls">
        <button id="start">start</button>
        <button id="stop">stop</button>
        <spacer style="width: 42px;"></spacer>
        Words: <input type="text" id="trackedWords" name="trackedWords" value="" />
        <spacer style="width: 42px;"></spacer>
        Location:
          <input type="radio" name="location" value="World"  checked="checked" />World 
          <input type="radio" name="location" value="New Zealand" />New Zealand
      </div>
      <ul class="timezones">
        <li zone="Pacific Time (US & Canada)"></li>
        <li zone="Auckland"></li>
        <li zone="Wellington"></li>
      </ul>
     </sentiment-explorer> 
  */});

  // ########################
  //  Static functions and variables
  // ########################
  var STATE = { MONITORING: "monitoring", STOPPED: "stopped" },
      LOCATIONS = { 
        'World'        : '-180.00,-90.00,180.00,90.00', 
        'New York'     : '-74.00,40.00,-73.00,41.00', 
       // 'New Zealand'  : '165.00,-45.00,175.00,-38.00',
        'New Zealand'  : '170.00,-50.00,180.00,-30.00',
        'Wellington'   : '174.70,-41.33,174.85,-41.29'
      };

  // ########################
  //  Class or Instance Factory
  // ########################
  var Class = function SentimentExplorer() {

    if(!(this instanceof SentimentExplorer)) { return new SentimentExplorer(); }

    var instance = this, 
        state = STATE.STOPPED,
        xZones = [];

    // ------------------------
    //   View
    // ------------------------
    instance.render = function(dom) {
      dom.load(template);
      dom.first("#trackedWords").value = serverData.words;
      dom.all('.timezones > li').forEach(function(node, i) {
        var zone = node.getAttribute('zone');
        var xZone = ZoneSentiment().zone(zone);
        xZones.push(xZone);
        DomComponent.embedComponent(xZone, node);
      });
      
    };

    // ------------------------
    //  Interactivity
    // ------------------------
    instance.enable = function(dom) {

      dom.first("#start"       ).addEventListener("click",  startMonitoring);
      dom.first("#stop"        ).addEventListener("click",  stopMonitoring);
      dom.first("#trackedWords").addEventListener("change", stopMonitoring);
      xZones.forEach(function(xZone) { 
        xZone.addEventListener("zoneChange", stopMonitoring); 
      });

      socket.on('zoneData', function(data) {
        xZones.forEach(function(xZone) {
          if(xZone.zone() === data.zone) { 
            xZone.averageSentiment(data.average); 
            xZone.mostExtreme(data.mostExtreme); 
          }
          
        });
      });

      function startMonitoring() {
        stopMonitoring();
        if(state === STATE.MONITORING) { return; }
        document.getElementById('start').disabled = "true"; 
        var location = dom.first('input[name="location"]:checked').value;
        if(!LOCATIONS.hasOwnProperty(location)) { location = 'World'; }
        var locArea = LOCATIONS[location];
        var words = dom.first("#trackedWords").value;
        var filters = {language  : 'en', locations: locArea, track: words && words.length ?  words : undefined};
        socket.emit('browserCommand', { command: "startMonitoring", filters: filters  });
        state = STATE.MONITORING;

        xZones.forEach(function(xZone) {
          var zone = xZone.zone();
          xZone.reset();
          socket.emit('browserCommand', { command: "trackZone", zone: zone});
        });
      }

      function stopMonitoring() {
        if(state === STATE.STOPPED) { return; }
        document.getElementById('start').disabled = null; 
        socket.emit('browserCommand', { command: "stopMonitoring"  });
        state = STATE.STOPPED;
      }

    };
    return instance;
  };


  module.exports = Class;

});


