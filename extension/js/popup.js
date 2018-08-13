(function(){
    window.mindfulBrowsing = {};
    var settings = {};
    var BLANK_WEBSITE = { "url": ""};
    var BLANK_THING = { "title": ""};
    var websites = [
        { "url": "facebook.com" },
        { "url": "twitter.com" },
        { "url": ""}
    ];
    var inspirations = [
        { "title": "take five deep breaths" },
        { "title": "take a quick walk" },
        { "title": ""}
    ];
    var timeouts = {};
    var currentPhoto;

    var initialized = false;

    var saveSettings = function() {
        // Save it using the Chrome extension storage API.
        if (initialized === true) {
            var saveWebsites = [];
            for (var w in websites) {
                if (websites[w] && websites[w].url !== "") {
                    saveWebsites.push(websites[w]);
                }
            }
            var saveInspirations = [];
            for (var t in inspirations) {
                if (inspirations[t] && inspirations[t].title !== "") {
                    saveInspirations.push(inspirations[t]);
                }
            }
            chrome.storage.sync.set({
                "websites": saveWebsites,
                "inspirations": saveInspirations,
                "timeouts": timeouts,
                "currentPhoto": currentPhoto
            }, function() {
              // Notify that we saved.
            });
        }
    };
    var loadSettings = function() {
        // Save it using the Chrome extension storage API.
        chrome.storage.sync.get(null, function(settings) {
          // Notify that we saved.
          if (settings.websites) {
            websites = settings.websites;  
          }
          if (settings.inspirations) {
            inspirations = settings.inspirations;
          }
          if (settings.timeouts) {
            timeouts = settings.timeouts;
          }
          currentPhoto = settings.currentPhoto;

          init();
          initialized = true;
        });
    };
    var init = function() {
        var ractive = new Ractive({
            // The `el` option can be a node, an ID, or a CSS selector.
            el: 'container',
            template:
            '<h2>I want to be mindful of spending my time on:</h2>'+
            '  <div class="responses">'+
            '      {{#websites:num}}'+
            '      <div class="response"><label>http://</label><input type="text" value="{{url}}" /><a class="removeX" on-click="removeSite">&#x2716; <span class="label">Remove</span></a></div>'+
            '      {{/websites}}'+
            '      <div class="response addBtnRow"><a on-click="addSite" class="addX" >&#x271A; <span class="label">Add another</span></a></div>'+
            '  </div>'+
            '  <h2>Inspirations:</h2>'+
            '  <div class="responses inspirations">'+
            '      {{#inspirations:num}}'+
            '      <div class="response"><input type="text" placeholder="what inspires you" value="{{title}}" /><a class="removeX" on-click="removeInspiration">&#x2716; <span class="label">Remove</span></a></div>'+
            '      {{/inspirations}}'+
            '      <div class="response addBtnRow"><a on-click="addInspiration" class="addX" >&#x271A; <span class="label">Add another</span></a></div>'+
            '  </div>'+
            '',
            data: {
            name: 'world',
            websites: websites,
            inspirations: inspirations
            }
        });
        ractive.on({
            addSite: function() {
                websites.push(BLANK_WEBSITE);
                return false;
            },
            addInspiration: function() {
                inspirations.push(BLANK_THING);
                return false;
            },
            removeSite: function(event) {
                websites.splice(event.index.num, 1);
                return false;
            },
            removeInspiration: function(event) {
                inspirations.splice(event.index.num, 1);
                return false;
            }
        });
        ractive.observe('websites', function ( newValue, oldValue, keypath ) {
            websites = newValue;
            saveSettings();
        }, false);
        ractive.observe('inspirations', function ( newValue, oldValue, keypath ) {
            inspirations = newValue;
            saveSettings();
        }, false);
    }
    loadSettings();
})();