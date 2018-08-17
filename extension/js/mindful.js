Array.prototype.indexOf = function(value, keypath) {
	for (var i = 0; i < this.length; i++) {
    	var ele = this[i];
        if (keypath)
          ele = keypath.split('.').reduce((previous, current) => {
              if (previous && current in previous)
                  return previous[current];
              return null;
          }, ele);
        if ( ele && ele == value )
        	return i;
    }
    return -1;
};

function addClassName(ele, className) {
	if (ele)
		ele.classList.add(className);
}
function removeClassName(ele, className) {
	if (ele)
		ele.classList.remove(className);
}

(function() {
	var websites = [];
    var inspirations = [];

    var match = false;
    var href = window.location.href;
    var site_name = null;
    var inspiration = null;
    var was_in_timeout = false;
    var syncFinished = false;
    var localFinished = false;
    var timeouts;
    var currentPhoto;
    var base64;
	var waitTimeSeconds;
	var browseTimeMinutes;
	var currentDelay = 0;
	var waitIntervalId;
	var focusPollingIntervalId;
	var schedule;
	var limitation;
	var photoSettings;
	var pendingPhotoUpdate = false;

	/*
    Storage:
    {
        "websites": ["foo.com", "bar.com"],
        "inspirations": ["go for a walk", "etc"],
        "timeouts": [
            	{
					"url": "foo.com",
					"active": true,
					"exp_time": 1234532341231,  // ms since epoch when timeout expires
					"prev_timeouts": [ 1234532341231, 1234532341231, 1234532341231 ]  // start times of previous timeout periods
				}
        ],
        "currentPhoto": {
			"last_updated": 12312431242,
			"info": {
				"credit": "Chris Gin",
				"credit_url": "http://chrisgin.com",
				"url": "https://mindfulbrowsing.org/photos/2.jpg"
			}
        }
    }
	*/

    chrome.storage.sync.get(null, function(settings) {
      websites = settings.websites || {};
      inspirations = settings.inspirations || {};
	  waitTimeSeconds = settings.waitTimeSeconds || 30;
	  browseTimeMinutes = settings.browseTimeMinutes || 10;
	  schedule = settings.schedule || {};
	  limitation = settings.limitation || {};
      timeouts = settings.timeouts || {};
      currentPhoto = settings.currentPhoto || {};
	  photoSettings = settings.photo || {};
      initialized = true;
      syncFinished = true;
      initIfReady();
    });
    chrome.storage.local.get('mindfulbrowsing', function(settings) {
        if (settings && settings.mindfulbrowsing && settings.mindfulbrowsing.base64) {
            base64 = settings.mindfulbrowsing.base64 || {};
        } else {
            base64 = undefined;
        }
        localFinished = true;
        initIfReady();
    });
    var initIfReady = function() {
        if (localFinished && syncFinished) {
            init();
        }
    };
	
    var mindfulBrowsing = window.mindfulBrowsing || {};
    mindfulBrowsing.saveSettings = function() {
        // Save it using the Chrome extension storage API.
        if (initialized === true) {
            chrome.storage.sync.set({
                "timeouts": timeouts,
                "currentPhoto": currentPhoto,
            }, function() {
              // Notify that we saved.
            });
            chrome.storage.local.set({'mindfulbrowsing': {
                "base64": base64,
            }}, function() {
              // Notify that we saved.
            });
        }
    };
	mindfulBrowsing.trimTimeouts = function() {
		// necessary for new timeout version
		if( !(timeouts instanceof Array) ) {
			delete timeouts;
			timeouts = [];
			mindfulBrowsing.saveSettings();
		}
		
		var now = new Date();
		var period_hours = limitation.details.period_hours ? limitation.details.period_hours : 2;
		var limit_period_start = now.getTime() - period_hours * 60*60*1000;
		
		timeouts = timeouts.filter(function(timeout) {
			timeout.prev_timeouts = timeout.prev_timeouts.filter(function(prev_timeout) {
				return prev_timeout >= limit_period_start;
			});
			return timeout.active || timeout.prev_timeouts.length > 0;
		});
		mindfulBrowsing.saveSettings();
	};
	mindfulBrowsing.isActive = function() {
		var now = new Date();
		
		if ( !schedule.active )
			return true;
		
		with (schedule.details) {
			if ( !schedule.details.weekdays[now.getDay()].active )
				return false
			
			var nowTime = lzero(now.getHours()) + ":" + lzero(now.getMinutes());
			if ( times.start < times.end ) {
				return times.start <= nowTime && nowTime < times.end;
			} else {
				return times.start <= nowTime || nowTime < times.end;
			}
		}
		
		function lzero(x) {
			return x > 9 ? x : "0" + x;
		}
		
		return true;
	};
    mindfulBrowsing.confirmClicked = function() {
        var now = new Date();
        var timeout_diff = (browseTimeMinutes*60000);
		var i = timeouts.indexOf(site_name, "url");
		if( i < 0 ) {
			timeouts.push({
				url: site_name,
				active: false,
				exp_time: 0,
				prev_timeouts: []
			});
			i = timeouts.length - 1;
		} 
		with (timeouts[i]) {
			active = true;
			exp_time = now.getTime() + timeout_diff;
			prev_timeouts.push(now.getTime());
		}
        mindfulBrowsing.saveSettings();
        was_in_timeout = true;
        setTimeout(mindfulBrowsing.addOverlayIfActive, timeout_diff);
		mindfulBrowsing.removeOverlay();
    };
    mindfulBrowsing.addOverlay = function() {
        inspiration = inspirations[Math.floor(Math.random() * inspirations.length)].title;
        var body = document.body;

        var ele = document.createElement("div");
		ele.classList.add("hidden");
        ele.id="mindfulBrowsingConfirm";
        ele.innerHTML = [
        "<div class='mindfulBrowsingHeading'>",
            "<h1 id='mindfulBrowsingMessage'></h1>",
            "<h2>"+inspiration+"</h2>",
        "</div>",
		"<div class='mindfulBrowsingBody'>",
			"<div class='timer' id='mindfulBrowsingWaitTimer'></div>",
			"<div class='options hidden' id='mindfulBrowsingOptions'>",
				"<a class='mindfulBtn' id='mindfulBrowsingContinue' href='#'>Yes, "+browseTimeMinutes+" minute"+( browseTimeMinutes > 1 ? "s" : "" )+".</a>",
				"<a class='mindfulBtn' id='mindfulBrowsingLeave' href='javascript:window.open(location,\"_self\");window.close();'>Actually, nah.</a>",
			"</div>",
		"</div>",
        ].join("");
		
        ele.style.background = "linear-gradient(to bottom, rgba(97,144,187,1) 0%,rgba(191,227,255,0.95) 100%)";
		
        if (photoSettings.active) {
			ele.innerHTML += "<a href='" + currentPhoto.info.credit_url + "' id='mindfulBrowsingPhotoCredit'>Photo by " + currentPhoto.info.credit + "</a>";
			if(!pendingPhotoUpdate && base64 != undefined) {
				ele.style.background = "inherit";
				ele.style.backgroundColor = "rgba(97, 144, 187, 0.92)";
				ele.style.backgroundImage = "url(" + base64 + ")";
			}
        }
        ele.style.backgroundSize = "cover";
        ele.style.backgroundPosition = "center center";
        ele.style.backgroundRepeat = "no-repeat";
        document.body.appendChild(ele);
		setTimeout(function() {
			removeClassName(ele, "hidden");
		}, 0);
        
        btn = document.getElementById("mindfulBrowsingContinue");
        btn.onclick = mindfulBrowsing.confirmClicked;
		
		mindfulBrowsing.updateOverlay();
    };
	mindfulBrowsing.addOverlayIfActive = function() {
		if ( mindfulBrowsing.isActive() ) {
			mindfulBrowsing.addOverlay();
		}
	};
	mindfulBrowsing.removeOverlay = function() {
        var ele = document.getElementById("mindfulBrowsingConfirm");
		ele.classList.add("hidden");
		setTimeout(function() {
			ele.parentNode.removeChild(ele);
		}, 400);
	};
	mindfulBrowsing.updateOverlay = function() {
		var message;
        var go_verb = (was_in_timeout)? "stay on" : "spend time on";		
		var i = timeouts.indexOf(site_name, "url");
		var limit = limitation.details.limit;
		var limit_hit = (i >= 0 && limitation.active && timeouts[i].prev_timeouts.length >= limit);
		
		if ( limit_hit ) {
			message = "You have reached your limit of  " + limit + "  view" + (limit > 1 ? "s" : "") + " per hour on  " + site_name;
		} else {
			message = "Do you want to " + go_verb + " " +site_name+"?"
			mindfulBrowsing.initWaitTimer();
		}
		document.getElementById("mindfulBrowsingMessage").innerHTML = message;
	};
	mindfulBrowsing.updateWaitTimerDisplay = function() {
		if(currentDelay > 0) {
			var ele = document.getElementById("mindfulBrowsingWaitTimer");
			if (ele)
				ele.innerHTML = currentDelay;
		} 
	};
	mindfulBrowsing.initWaitTimer = function() {
		currentDelay = waitTimeSeconds;		
		removeClassName(document.getElementById("mindfulBrowsingWaitTimer"), "hidden");
		addClassName(document.getElementById("mindfulBrowsingOptions"), "hidden");
		mindfulBrowsing.updateWaitTimerDisplay();
		setTimeout(function() {
			mindfulBrowsing.resumeWaitTimer();
			focusPollingIntervalId = setInterval(function() {
				// poll background script to update tab focus
				chrome.runtime.sendMessage({ text: "update_tabIsFocused" });
			}, 250);
		}, 500);
	};
	mindfulBrowsing.updateWaitTimer = function() {
		currentDelay -= 1;
		mindfulBrowsing.updateWaitTimerDisplay();
		if(currentDelay <= 0) {
			mindfulBrowsing.suspendWaitTimer();
			clearInterval(focusPollingIntervalId);
			addClassName(document.getElementById("mindfulBrowsingWaitTimer"), "hidden");
			removeClassName(document.getElementById("mindfulBrowsingOptions"), "hidden");
		}
	};
	mindfulBrowsing.resumeWaitTimer = function() {
		mindfulBrowsing.suspendWaitTimer();
		waitIntervalId = setInterval(mindfulBrowsing.updateWaitTimer, 1000);
	};
	mindfulBrowsing.suspendWaitTimer = function() {
		clearInterval(waitIntervalId);
		waitIntervalId = null;
	};
	mindfulBrowsing.updateTabIsFocused = function(isFocused) {
		if(waitIntervalId) {			
			if(!isFocused)
				mindfulBrowsing.suspendWaitTimer();
		} else {
			if(isFocused)
				mindfulBrowsing.resumeWaitTimer();
		}
	};
    window.mindfulBrowsing = mindfulBrowsing;
	
    function init() {
        var now = new Date();
		
		if (photoSettings && photoSettings.active) {
			
			var photoRotateTimeDiff = photoSettings.details.periods * photoSettings.details.period_value_seconds * 1000;
			
			if (base64 === undefined || currentPhoto.last_updated === undefined || currentPhoto.last_updated + photoRotateTimeDiff < now.getTime()) {
				var photo_index = Math.floor(Math.random() * window.mindfulBrowsing.photoInfo.photos.length);
				currentPhoto = {};
				currentPhoto.info = window.mindfulBrowsing.photoInfo.photos[photo_index];
				currentPhoto.last_updated = now.getTime();
				mindfulBrowsing.saveSettings();

				// Cache the photo offline.  
				var xmlHTTP = new XMLHttpRequest();
				xmlHTTP.open('GET', currentPhoto.info.url, true);
				xmlHTTP.responseType = 'arraybuffer';
				xmlHTTP.onload = function(e) {
					var arr = new Uint8Array(this.response);
					var raw = '';
					var i,j,subArray,chunk = 5000;
					for (i=0,j=arr.length; i<j; i+=chunk) {
					   subArray = arr.subarray(i,i+chunk);
					   raw += String.fromCharCode.apply(null, subArray);
					}
					var b64=btoa(raw);
					base64 = "data:image/jpeg;base64,"+b64;
					mindfulBrowsing.saveSettings();

					var ele = document.getElementById("mindfulBrowsingConfirm");
					if(ele)
						ele.style.backgroundImage = "url(" + base64 + ")";
					
					pendingPhotoUpdate = false;
				};
				pendingPhotoUpdate = true;
				xmlHTTP.send();
			}
		}
		
		if ( mindfulBrowsing.isActive() ) {
			for (var i in websites) {
				if (href.indexOf(websites[i].url) != -1) {
					site_name = websites[i].url;
					match = true;
					// Check timeouts
					mindfulBrowsing.trimTimeouts();
					var j = timeouts.indexOf(site_name, "url");
					if (j >= 0) {
						with(timeouts[j]) {
							if(active) {
								if(exp_time < now.getTime()) {
									active = false;
									mindfulBrowsing.saveSettings();
								} else {
									match = false;
									was_in_timeout = true;
									setTimeout(mindfulBrowsing.addOverlayIfActive, timeouts[j].exp_time - now.getTime());
								}
							}
						}
					}
					if (match) {
						break;
					}
				}
			}
			if (match) {
				(function delayedAddOverlay() {
					if(document.body != null) {
						mindfulBrowsing.addOverlay();
					} else {
						setTimeout(delayedAddOverlay, 10);
					}
				})()
			}
		}
    }
})();
