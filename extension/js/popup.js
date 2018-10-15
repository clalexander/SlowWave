(function(){
    window.mindfulBrowsing = {};
    var settings = {};
    var blockedUrlPatterns = [
        { "urlPattern": "facebook.com" },
        { "urlPattern": "twitter.com" },
        { "urlPattern": ""}
    ];
    var allowedUrlPatterns = [
        { "urlPattern": ""}
    ];
    var inspirations = [
        { "title": "take five deep breaths" },
        { "title": "take a quick walk" },
        { "title": ""}
    ];
	var waitTimeSeconds = 30;
	var browseTimeMinutes = 10;
	var quickResume = {
		active: false
	};
	var schedule = {
		active: false,
		hidden: "",
		details: {
			times: {
				start: "09:00",
				end: "17:00"
			},
			weekdays: [
				{ day: "Sun", active: false },
				{ day: "Mon", active: true },
				{ day: "Tue", active: true },
				{ day: "Wed", active: true },
				{ day: "Thu", active: true },
				{ day: "Fri", active: true },
				{ day: "Sat", active: false },
			]
		}
	};
	var limitation = {
		active: false,
		hidden: "",
		details: {
			limit: 3,
			period_hours: 2
		}
	};
	var photo = {
		active: true,
		hidden: "",
		details: {
			periods: 2,
			period_value_seconds: 3600
		}
	};
	var periodValues = [
		{
			label: "minute(s)",
			value: 60
		},
		{
			label: "hour(s)",
			value: 60*60
		},
		{
			label: "day(s)",
			value: 60*60*24
		}
	];

    var initialized = false;

    var saveSettings = function() {
        // Save it using the Chrome extension storage API.
        if (initialized === true) {
            var saveBlockedUrlPatterns = [];
            for (var p in blockedUrlPatterns) {
                if (blockedUrlPatterns[p] && blockedUrlPatterns[p].urlPattern !== "") {
                    saveBlockedUrlPatterns.push(blockedUrlPatterns[p]);
                }
            }
            var saveAllowedUrlPatterns = [];
            for (var p in allowedUrlPatterns) {
                if (allowedUrlPatterns[p] && allowedUrlPatterns[p].urlPattern !== "") {
                    saveAllowedUrlPatterns.push(allowedUrlPatterns[p]);
                }
            }
            var saveInspirations = [];
            for (var t in inspirations) {
                if (inspirations[t] && inspirations[t].title !== "") {
                    saveInspirations.push(inspirations[t]);
                }
            }
            chrome.storage.sync.set({
                "blockedUrlPatterns": saveBlockedUrlPatterns,
                "allowedUrlPatterns": saveAllowedUrlPatterns,
                "inspirations": saveInspirations,
				"waitTimeSeconds": waitTimeSeconds,
				"browseTimeMinutes": browseTimeMinutes,
				"quickResume": quickResume,
				"photo": photo,
				"schedule": schedule,
				"limitation": limitation
            }, function() {
              // Notify that we saved.
            });
        }
    };
    var loadSettings = function() {
        // Save it using the Chrome extension storage API.
        chrome.storage.sync.get(null, function(settings) {
			blockedUrlPatterns = settings.blockedUrlPatterns || blockedUrlPatterns;  
			allowedUrlPatterns = settings.allowedUrlPatterns || allowedUrlPatterns;  
			inspirations = settings.inspirations || inspirations;
			waitTimeSeconds = settings.waitTimeSeconds || waitTimeSeconds;
			browseTimeMinutes = settings.browseTimeMinutes || browseTimeMinutes;
			quickResume = settings.quickResume || quickResume;
			photo = settings.photo || photo;
			schedule = settings.schedule || schedule;
			if(settings.limitation) {
				if(!settings.limitation.details.period_hours) {
					settings.limitation.details.period_hours = limitation.details.period_hours;
				}
				limitation = settings.limitation;
			}

			init();
        });
    };
    var init = function() {
        var ractive = new Ractive({
            el: '#container',
            template:
			'<h2>I want to be mindful of spending my time on:</h2>'+
			'<div class="responses">'+
			'	{{#blockedUrlPatterns:num}}'+
			'	<div class="response"><label>http://</label><input type="text" placeholder="example.url" value="{{urlPattern}}" /><a class="removeX" on-click="removeBlockedUrl">&#x2716; <span class="label">Remove</span></a></div>'+
			'	{{/blockedUrlPatterns}}'+
			'	<div class="response addBtnRow"><a on-click="addBlockedUrl" class="addX" >&#x271A; <span class="label">Add another</span></a></div>'+
			'</div>'+
			'<h2>...but I\'m okay spending my time on:</h2>'+
			'<div class="responses">'+
			'	{{#allowedUrlPatterns:num}}'+
			'	<div class="response"><label>http://</label><input type="text" placeholder="example.url" value="{{urlPattern}}" /><a class="removeX" on-click="removeAllowedUrl">&#x2716; <span class="label">Remove</span></a></div>'+
			'	{{/allowedUrlPatterns}}'+
			'	<div class="response addBtnRow"><a on-click="addAllowedUrl" class="addX" >&#x271A; <span class="label">Add another</span></a></div>'+
			'</div>'+
			'<h2>Inspirations:</h2>'+
			'<div class="responses inspirations">'+
			'	{{#inspirations:num}}'+
			'	<div class="response"><input type="text" placeholder="what inspires you" value="{{title}}" /><a class="removeX" on-click="removeInspiration">&#x2716; <span class="label">Remove</span></a></div>'+
			'	{{/inspirations}}'+
			'	<div class="response addBtnRow"><a on-click="addInspiration" class="addX" >&#x271A; <span class="label">Add another</span></a></div>'+
			'</div>'+
			'<h2>Settings:</h2>'+
			'<div class="settings">'+
			'	<div class="setting"><label class="main">Wait</label><input type="text" value="{{waitTimeSeconds}}" /> <span class="label">seconds</span></div>'+
			'	<div class="setting"><label class="main">Browse</label><input type="text" value="{{browseTimeMinutes}}" /> <span class="label">minutes</span></div>'+
			'	{{#quickResume}}'+
			'	<div class="setting">'+
			'		<label class="main">Quick Resume</label><label class="switch"><input type="checkbox" checked="{{active}}" /><span class="slider"></span></label>'+
			'	</div>'+
			'	{{/quickResume}}'+
			'	{{#photo}}'+
			'	<div class="setting">'+
			'		<label class="main">Photo</label><label class="switch"><input type="checkbox" checked="{{active}}" /><span class="slider"></span></label>'+
			'		<div class="detail photo {{hidden}}">'+
			'			{{#details}}'+
			'			<div class="detailItem">Rotate every <input type="text" value="{{periods}}" /><select value="{{period_value_seconds}}">'+
			'				{{#periodValues:num}}'+
			'				<option value="{{value}}">{{label}}</option>'+
			'				{{/periodValues}}'+
			'			</select></div>'+
			'			{{/details}}'+
			'		</div>'+
			'	</div>'+
			'	{{/photo}}'+
			'	{{#schedule}}'+
			'	<div class="setting">'+
			'		<label class="main">Schedule</label><label class="switch"><input type="checkbox" checked="{{active}}" /><span class="slider"></span></label>'+
			'		<div class="detail schedule {{hidden}}">'+
			'			{{#details}}'+
			'			<div class="detailItem">Enabled between <input type="time" value="{{times.start}}" /> and <input type="time" value="{{times.end}}" /></div>'+
			'			<div class="detailItem">'+
			'				{{#weekdays}}'+
			'				<label class="checkbox">{{day}}<input type="checkbox" checked="{{active}}" /><span class="checkmark"></span></label>'+
			'				{{/weekdays}}'+
			'			</div>'+
			'			{{/details}}'+
			'		</div>'+
			'	</div>'+
			'	{{/schedule}}'+
			'	{{#limitation}}'+
			'	<div class="setting">'+
			'		<label class="main">Limit</label><label class="switch"><input type="checkbox" checked="{{active}}" /><span class="slider"></span></label>'+
			'		<div class="detail limitation {{hidden}}">'+
			'			{{#details}}'+
			'			<div class="detailItem">Maximum <input type="text" value="{{limit}}" /> browsing period(s) per <input type="text" value="{{period_hours}}" /> hour(s)</div>'+
			'			{{/details}}'+
			'		</div>'+
			'	</div>'+
			'	{{/limitation}}'+
			'</div>'+
			'',
            data: {
				name: 'world',
				blockedUrlPatterns: blockedUrlPatterns,
				allowedUrlPatterns: allowedUrlPatterns,
				inspirations: inspirations,
				waitTimeSeconds: waitTimeSeconds,
				browseTimeMinutes: browseTimeMinutes,
				quickResume: quickResume,
				photo: photo,
				schedule: schedule,
				limitation, limitation,
				periodValues: periodValues
            }
        });
        ractive.on({
            addBlockedUrl: function() {
                blockedUrlPatterns.push({ "urlPattern": ""});
				return false;
            },
            addAllowedUrl: function() {
                allowedUrlPatterns.push({ "urlPattern": ""});
				return false;
            },
            addInspiration: function() {
                inspirations.push({ "title": ""});
                return false;
            },
            removeBlockedUrl: function(event) {
                blockedUrlPatterns.splice(event.index.num, 1);
                return false;
            },
            removeAllowedUrl: function(event) {
                allowedUrlPatterns.splice(event.index.num, 1);
                return false;
            },
            removeInspiration: function(event) {
                inspirations.splice(event.index.num, 1);
                return false;
            }
        });
        ractive.observe('blockedUrlPatterns', function ( newValue, oldValue, keypath ) {
            saveSettings();
        }, false);
        ractive.observe('allowedUrlPatterns', function ( newValue, oldValue, keypath ) {
            saveSettings();
        }, false);
        ractive.observe('inspirations', function ( newValue, oldValue, keypath ) {
            saveSettings();
        }, false);
		ractive.observe('waitTimeSeconds', function( newValue, oldValue, keypath ) {
			if (newValue && typeof newValue === 'number' && newValue >= 0) {
				waitTimeSeconds = Math.floor(newValue);
				saveSettings();
			}
		}, false);
		ractive.observe('browseTimeMinutes', function( newValue, oldValue, keypath ) {
			if (newValue && typeof newValue === 'number' && newValue >= 1) {
				browseTimeMinutes = Math.floor(newValue);
				saveSettings();
			}
		}, false);
		ractive.observe('quickResume.active', function( newValue, oldValue, keypath ) {
			saveSettings();
		}, false);
		ractive.observe('photo.active', function( newValue, oldValue, keypath ) {
			var newHidden = newValue ? "" : "hidden";
			photo.hidden = newHidden;
			ractive.set('photo.hidden', newHidden);
			saveSettings();
		}, false);
		ractive.observe('photo.details.periods', function( newValue, oldValue, keypath ) {
			if (newValue && typeof newValue === 'number' && newValue >= 1) {
				photo.details.periods = Math.floor(newValue);
				saveSettings();
			}
		}, false);
		ractive.observe('photo.details.period_value_seconds', function( newValue, oldValue, keypath ) {
			saveSettings();
		}, false);
		ractive.observe('schedule.active', function( newValue, oldValue, keypath ) {
			var newHidden = newValue ? "" : "hidden";
			schedule.hidden = newHidden;
			ractive.set('schedule.hidden', newHidden);
			saveSettings();
		}, false);
		ractive.observe('schedule.details.times', function( newValue, oldValue, keypath ) {
			if ( newValue.start && newValue.end ) {
				schedule.details.times = newValue;
				saveSettings();
			}
		}, false);
		ractive.observe('schedule.details.weekdays', function( newValue, oldValue, keypath ) {
			saveSettings();
		}, false);
		ractive.observe('limitation.active', function( newValue, oldValue, keypath ) {
			var newHidden = newValue ? "" : "hidden";
			limitation.hidden = newHidden;
			ractive.set('limitation.hidden', newHidden);
			saveSettings();
		}, false);
		ractive.observe('limitation.details.limit', function( newValue, oldValue, keypath ) {
			if (newValue && typeof newValue === 'number' && newValue >= 1) {
				limitation.details.limit = Math.floor(newValue);
				saveSettings();
			}
		}, false);
		ractive.observe('limitation.details.period_hours', function( newValue, oldValue, keypath ) {
			if (newValue && typeof newValue === 'number' && newValue >= 1) {
				limitation.details.period_hours = Math.floor(newValue);
				saveSettings();
			}
		}, false);
		
		initialized = true;
		saveSettings();
    }
	
    loadSettings();
})();