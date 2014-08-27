define(function(require, exports, module) {

  // ########################
  //  Dependencies
  // ########################
  var DomComponent = require('DomComponent');


  // ########################
  //  Template
  // ########################
  var template = DomComponent.getHtml(function() {/*
    <zone-sentiment>
      <div class="controls">
        Time zone: 
        <input type="text" class="timeZone" name="timeZone" value="Wellington" />
      </div>
      <div class="average"></div>
      <ul class="tweets mostPositive"></ul>
      <ul class="tweets mostNegative"></ul>
     </zone-sentiment> 
  */});

  var tweetRenderer = DomComponent.getHtml(function() {/*
    <li><user><name>{{user_name}}</name><handle><a href="https://twitter.com/{{screen_name}}">@{{screen_name}}</a></handle></user></div>
    <score>{{score}}&nbsp;</score>
    <br/><text>{{text}}</text></li>
  */});

  var Class = function ZoneSentiment() {

    if(!(this instanceof ZoneSentiment)) { return new ZoneSentiment(); }

    var instance = this, dom,
        state = { zone: 'N/A', averageSentiment: 'N/A' }, 
        emitters = { zoneChange: null };

    // ------------------------
    //  Chainable Getters and Setters
    // ------------------------
    instance.zone = function(_) {
      if(!arguments.length) { return state.zone; }
      if(state.zone !== _) {
        state.zone = _;
        refreshZone();
      }
      return instance;
    };

    instance.averageSentiment = function(_) {
      if(!arguments.length) { return state.averageSentiment; }
      if(state.averageSentiment !== _) {
        state.averageSentiment = _;
        refreshAverage();
      }
      return instance;
    };

    instance.mostExtreme = function(_) {
      if(!arguments.length) { return state.mostExtreme; }
      if(state.mostExtreme !== _) {
        state.mostExtreme = _;
        refreshExtreme();
      }
      return instance;
    };

    // ------------------------
    //  View
    // ------------------------

    instance.render = function(rootDom) {
      dom = rootDom;
      dom.load(template);
      refreshAverage();
      refreshZone();
    };

    function refreshZone() {
      if(!dom) { return; }
      dom.first(".timeZone").value = state.zone;
    }

    function refreshAverage() {
      if(!dom) { return; }
      dom.first('.average').innerHTML = state.averageSentiment;
    }

    function refreshExtreme() {
      if(!dom) { return; }
      if(!state.mostExtreme) { state.mostExtreme = []; }
      dom.first('.mostPositive').innerHTML = renderTweetList(state.mostExtreme[0] || []);
      dom.first('.mostNegative').innerHTML = renderTweetList(state.mostExtreme[1] || []);
    }

    function renderTweetList(list) {
      return list.map(function(item) { 
        var html = DomComponent.template(tweetRenderer, item);
        return html;
      }).join('\n');
    }

    instance.reset = function() {
      state.averageSentiment = 'N/A';
      state.mostExtreme = [];
      refreshAverage();
      refreshExtreme();
    };


    // ------------------------
    //  Interactivity
    // ------------------------

    instance.enable = function() {
      dom.first(".timeZone").addEventListener("change", function() { 
        var old = state.zone;
        state.zone = this.value;
        emit('zoneChange', {new: this.value, old: old});
      });
    };

    instance.addEventListener = function(type, fn) {
      emitters[type] = fn;
      return instance;
    };

    function emit(type, data) {
      var fn = emitters[type];
      if(fn && typeof fn === "function") {
        fn(data);
      }
    }

    return instance;
  };

  module.exports = Class;

});


