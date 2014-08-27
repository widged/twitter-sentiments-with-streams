// ########################
//  Dependencies
// ########################
var twitter = require('ntwitter'),
    sentiment = require('sentiment'),
    secrets = require('./secret_keys'),
    through = require('through'),
    map = require('map-stream');

var runningInstances = {};    

// ########################
//  Class or Instance Factory
// ########################
var Class = function TwitterSentiments() {

  if(!(this instanceof TwitterSentiments )) { return new TwitterSentiments(); }

  var instance = this, tweetStream, sentimentStream, zoneStreams = {};

  instance.monitor = function(filters) {

    var twit = new twitter(secrets.twitter);

    var count = 0;

    tweets = through();
    tweets
      .pipe(map(addSentiment))
      .on('data', function(data) {
        var userZone = data.user.time_zone;
        var stream = guaranteeStream(userZone);
        count++;
        if(count % 100 === 0) { console.log('[STREAMING]', count, userZone, data.text); }
        stream.queue(data);
      });

    console.log('[FILTERS]', filters)
    twit.stream('statuses/filter', filters, function(stream) {
      tweetStream = stream;
      // not an actual stream, as it doesn't have a method pipe.
      stream.on('data', function (data) { tweets.queue(data); });
      stream.on('error', function (error, code) {
          if (code === 420)  { 
            console.error("[ERROR] API limit hit, are you using your own keys?"); 
          } else {
            console.error("[ERROR] Error received from tweet stream: " + code); 
          }
      });
      stream.on('destroy', function () {
          tweets.emit('end');
      });      
    });
  };

  instance.trackZone = function(zone, emitZoneData) {

    var UPDATE_EVERY = 3;
    var LIST_SIZE    = 5;

    var total = 0;
    var count = 0;
    var min, max;
    var negList = [];
    var posList = [];

    var stream = guaranteeStream(zone);
    stream.on('data', function(tweet) {
      var score = tweet.sentiment.score;
      var summary = tweetSummary(tweet);
      if(min === undefined || score < min) {  min = score; }
      if(max === undefined || score > max) {  max = score; }
      if(score >= 0) { posList.push(summary); }
      if(score <= 0) { negList.push(summary); }
      total += score;
      count += 1;
      // console.log('[ZONE]', zone, summary);
      if(count % UPDATE_EVERY === 0) {  
        posList.sort(function(a, b) { return a.score < b.score; });
        negList.sort(function(a, b) { return a.score > b.score; });
        posList = posList.slice(0, LIST_SIZE);
        negList = negList.slice(0, LIST_SIZE);
        negList.sort(function(a, b) { return a.score < b.score; });
        var average = Math.round(total/count);
        // console.log('SCORE', total, count, average)
        emitZoneData({zone: zone, average: average, mostExtreme: [posList,negList]});
      }
    });

    function tweetSummary(item) { return { score: item.sentiment.score, text: item.text, screen_name: item.user.screen_name, user_name: item.user.name }; }
  };

  instance.stop = function() {
    Object.keys(zoneStreams).forEach(function(key) { zoneStreams[key].removeAllListeners(); });
    if(sentimentStream) { sentimentStream.emit('end'); }
    if(tweetStream)     { tweetStream.destroy(); }
  };

  function guaranteeStream(userZone) {
      if(!zoneStreams.hasOwnProperty(userZone)) { 
        zoneStreams[userZone] = through(); 
      }
      return zoneStreams[userZone];
  }

  function addSentiment(data, asyncReturn) { 
    data.sentiment = sentiment(data.text);
    asyncReturn(null, data);
  }

  return instance;

};

/*
  This is required for cases when the browser application gets refreshed while the 
  node app.js hasn't been restarted. 
    // This is a quick work around to avoid issues when the page gets reloaded. 
    // rewrite TwitterSentiments so that it cache instances as a function of the browser of origin
    // and retrieve the instance for the current browser in case it already exists.  
    twitter

*/
Class.getInstance = function(agentId) {
  var instance;
  if (runningInstances.hasOwnProperty(agentId)) { 
    instance = runningInstances[agentId]; 
    instance.stop();
  }
  if(!instance || !(instance instanceof Class))  {
    instance = new Class();
    runningInstances[agentId] = instance;
  }
  return instance;
};

module.exports = Class;

/*

// ################################################
//  Documentation, notes
// ################################################

// API  
  https://dev.twitter.com/docs/api/1/post/statuses/filter
  https://dev.twitter.com/docs/streaming-apis/parameters

  twit.stream('user', {track:'nodejs'}, function(stream) {})
  twit.stream('statuses/filter', {'locations':'-122.75,36.8,-121.75,37.8,-74,40,-73,41'}, function(stream) {})
  twit.stream('statuses/sample', function(stream) {})
  twit.stream('statuses/firehose', function(stream) {})
  twit.search('nodejs OR #node', {}, function(err, data) { console.log(data); });

// Tweet format

  { created_at: 'Sun Aug 24 10:49:02 +0000 2014',
    id: 503494183387414500,
    id_str: '503494183387414529',
    text: 'RT @DSprayberry: Love training with @roninme !!!! 💪 http://t.co/z1hVzUIY7I',
    source: '<a href="http://twitter.com/download/android" rel="nofollow">Twitter for Android</a>',
    truncated: false,
    in_reply_to_status_id: null,
    in_reply_to_status_id_str: null,
    in_reply_to_user_id: null,
    in_reply_to_user_id_str: null,
    in_reply_to_screen_name: null,
    user: 
     { id: 528299547,
       id_str: '528299547',
       name: 'Şevval Buse Uslubaş',
       screen_name: 'Buseharry',
       location: 'Turkey',
       url: null,
       description: '#TeenWolf #TheOriginals #DanielleCampbell #DylanSprayberry #AshStymest #HarrisonWebb #TheNBHD #UnionJ #NeonJungle #Bullethead #Подари #мне #свою #любовь.',
       protected: false,
       verified: false,
       followers_count: 401,
       friends_count: 104,
       listed_count: 2,
       favourites_count: 1338,
       statuses_count: 2805,
       created_at: 'Sun Mar 18 08:32:40 +0000 2012',
       utc_offset: 10800,
       time_zone: 'Baghdad',
       geo_enabled: false,
       lang: 'tr',
       contributors_enabled: false,
       is_translator: false,
       profile_background_color: '000000',
       profile_background_image_url: 'http://pbs.twimg.com/profile_background_images/498475031551160321/G0YcduEX.jpeg',
       profile_background_image_url_https: 'https://pbs.twimg.com/profile_background_images/498475031551160321/G0YcduEX.jpeg',
       profile_background_tile: true,
       profile_link_color: '8F2F8F',
       profile_sidebar_border_color: '000000',
       profile_sidebar_fill_color: 'A0C5C7',
       profile_text_color: '333333',
       profile_use_background_image: true,
       profile_image_url: 'http://pbs.twimg.com/profile_images/503186895325499392/s_qB-Q4U_normal.jpeg',
       profile_image_url_https: 'https://pbs.twimg.com/profile_images/503186895325499392/s_qB-Q4U_normal.jpeg',
       profile_banner_url: 'https://pbs.twimg.com/profile_banners/528299547/1407679482',
       default_profile: false,
       default_profile_image: false,
       following: null,
       follow_request_sent: null,
       notifications: null },
    geo: null,
    coordinates: null,
    place: null,
    contributors: null,
    retweeted_status: 
     { created_at: 'Fri Aug 22 23:46:06 +0000 2014',
       id: 502964964152602600,
       id_str: '502964964152602624',
       text: 'Love training with @roninme !!!! 💪 http://t.co/z1hVzUIY7I',
       source: '<a href="http://twitter.com/download/iphone" rel="nofollow">Twitter for iPhone</a>',
       truncated: false,
       in_reply_to_status_id: null,
       in_reply_to_status_id_str: null,
       in_reply_to_user_id: null,
       in_reply_to_user_id_str: null,
       in_reply_to_screen_name: null,
       user: 
        { id: 423781033,
          id_str: '423781033',
          name: 'Dylan Sprayberry',
          screen_name: 'DSprayberry',
          location: '',
          url: null,
          description: 'THRASHER - PUNK ROCK - THESBIAN -  \n                      \n                      TEEN WOLF',
          protected: false,
          verified: true,
          followers_count: 188626,
          friends_count: 1029,
          listed_count: 829,
          favourites_count: 335,
          statuses_count: 739,
          created_at: 'Mon Nov 28 22:53:11 +0000 2011',
          utc_offset: -25200,
          time_zone: 'Pacific Time (US & Canada)',
          geo_enabled: false,
          lang: 'en',
          contributors_enabled: false,
          is_translator: false,
          profile_background_color: 'C0DEED',
          profile_background_image_url: 'http://abs.twimg.com/images/themes/theme1/bg.png',
          profile_background_image_url_https: 'https://abs.twimg.com/images/themes/theme1/bg.png',
          profile_background_tile: false,
          profile_link_color: '0084B4',
          profile_sidebar_border_color: 'C0DEED',
          profile_sidebar_fill_color: 'DDEEF6',
          profile_text_color: '333333',
          profile_use_background_image: true,
          profile_image_url: 'http://pbs.twimg.com/profile_images/502697287965880321/tdAIDayr_normal.jpeg',
          profile_image_url_https: 'https://pbs.twimg.com/profile_images/502697287965880321/tdAIDayr_normal.jpeg',
          profile_banner_url: 'https://pbs.twimg.com/profile_banners/423781033/1393444160',
          default_profile: true,
          default_profile_image: false,
          following: null,
          follow_request_sent: null,
          notifications: null },
       geo: null,
       coordinates: null,
       place: null,
       contributors: null,
       retweet_count: 1149,
       favorite_count: 3253,
       entities: 
        { hashtags: [],
          trends: [],
          urls: [],
          user_mentions: [Object],
          symbols: [],
          media: [Object] },
       favorited: false,
       retweeted: false,
       possibly_sensitive: false,
       filter_level: 'low',
       lang: 'en' },
    retweet_count: 0,
    favorite_count: 0,
    entities: 
     { hashtags: [],
       trends: [],
       urls: [],
       user_mentions: [ [Object], [Object] ],
       symbols: [],
       media: [ [Object] ] },
    favorited: false,
    retweeted: false,
    possibly_sensitive: false,
    filter_level: 'medium',
    lang: 'en' }

   */

