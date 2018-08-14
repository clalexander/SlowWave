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
	var schedule;

    // Storage:
    // {
    //     "websites": ["foo.com", "bar.com"],
    //     "inspirations": ["go for a walk", "etc"],
    //     "timeouts": {
    //         "foo.com": 1234532341231  // ms since epoch when timeout expires
    //     },
    //     "currentPhoto": {
    //         "next_update": 12312431242,
    //         "credit": "Chris Gin",
    //         "credit_url": "http://chrisgin.com",
    //         "start_date": 1404448425891,
    //         "start_date_human": "June 26 2014",
    //         "url": "https://mindfulbrowsing.org/photos/2.jpg"
    //     }
    // }

    chrome.storage.sync.get(null, function(settings) {
      websites = settings.websites || {};
      inspirations = settings.inspirations || {};
	  waitTimeSeconds = settings.waitTimeSeconds || 30;
	  browseTimeMinutes = settings.browseTimeMinutes || 10;
	  schedule = settings.schedule || {};
      timeouts = settings.timeouts || {};
      currentPhoto = settings.currentPhoto || {};
      initialized = true;
      syncFinished = true;
      initIfReady();
    });
    chrome.storage.local.get('mindfulbrowsing', function(settings) {
        // console.log("local")
        // console.log(settings.mindfulbrowsing)
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
    mindfulBrowsing.confirmClicked = function() {
        var now = new Date();
        var timeout_diff = (browseTimeMinutes*60000);
        timeouts[site_name] = now.getTime() + timeout_diff;
        mindfulBrowsing.saveSettings();
        was_in_timeout = true;
        setTimeout(mindfulBrowsing.addOverlayIfActive, timeout_diff);
		mindfulBrowsing.removeOverlay();
        return false;
    };
    mindfulBrowsing.saveSettings = function() {
        // Save it using the Chrome extension storage API.
        if (initialized === true) {
            var saveWebsites = [];
            for (var w in websites) {
                if (websites[w] && websites[w].url != "") {
                    saveWebsites.push(websites[w]);
                }
            }
            var saveInspirations = [];
            for (var t in inspirations) {
                if (inspirations[t] && inspirations[t].title != "") {
                    saveInspirations.push(inspirations[t]);
                }
            }
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
              // console.log("saved local")
            });
        }
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
    mindfulBrowsing.addOverlay = function() {
        inspiration = inspirations[Math.floor(Math.random() * inspirations.length)].title;
        var body = document.body;
        var html = document.documentElement;
        // console.log(currentPhoto)
        var height = Math.max( body.scrollHeight, body.offsetHeight,
            html.clientHeight, html.scrollHeight, html.offsetHeight );
        var go_verb = (was_in_timeout)? "stay on" : "spend time on";

        var ele = document.createElement("div");
		ele.classList.add("hidden");
        ele.id="mindfulBrowsingConfirm";
        ele.innerHTML = [
        "<div class='mindfulBrowsingHeading'>",
            "<h1>Do you want to " + go_verb + " " +site_name+"?</h1>",
            "<h2>"+inspiration+"</h2>",
        "</div>",
		"<div class='mindfulBrowsingBody'>",
			"<div class='timer' id='mindfulBrowsingWaitTimer'></div>",
			"<div class='options hidden' id='mindfulBrowsingOptions'>",
				"<a class='mindfulBtn' id='mindfulBrowsingContinue' href='#'>Yes, "+browseTimeMinutes+" minute"+( browseTimeMinutes > 1 ? "s" : "" )+".</a>",
				"<a class='mindfulBtn' id='mindfulBrowsingLeave' href='javascript:window.open(location,\"_self\");window.close();'>Actually, nah.</a>",
			"</div>",
		"</div>",
        "<a href='" + currentPhoto["credit_url"] + "' id='mindfulBrowsingPhotoCredit'>Photo by " + currentPhoto["credit"] + "</a>"
        ].join("");
        ele.style.height = "100%";
        // ele.style.backgroundColor = "rgba(97, 144, 187, 0.92)";
        ele.style.background = "linear-gradient(to bottom, rgba(97,144,187,1) 0%,rgba(191,227,255,0.92) 100%)";

        // ele.style.backgroundImage = "url('" + currentPhoto["url"] + "')";
        // console.log('base64')
        // console.log(base64)
        if (base64 != undefined) {
            ele.style.background = "inherit";
            ele.style.backgroundColor = "rgba(97, 144, 187, 0.92)";
            ele.style.backgroundImage = "url(" + base64 + ")";
        }
        ele.style.backgroundSize = "cover";
        ele.style.backgroundPosition = "center center";
        ele.style.backgroundRepeat = "no-repeat";
        document.body.appendChild(ele);
		setTimeout(function() {
			ele.classList.remove("hidden");
		}, 0);
        
        btn = document.getElementById("mindfulBrowsingContinue");
        btn.onclick = mindfulBrowsing.confirmClicked;
		
		currentDelay = waitTimeSeconds;		
		document.getElementById("mindfulBrowsingWaitTimer").classList.remove("hidden");
		document.getElementById("mindfulBrowsingOptions").classList.add("hidden");
		mindfulBrowsing.updateWaitTimerDisplay();
		setTimeout(mindfulBrowsing.resumeWaitTimer, 500);
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
	mindfulBrowsing.updateWaitTimerDisplay = function() {
		if(currentDelay > 0) {
			document.getElementById("mindfulBrowsingWaitTimer").innerHTML = currentDelay;
		} 
	};
	mindfulBrowsing.updateWaitTimer = function() {
		currentDelay -= 1;
		mindfulBrowsing.updateWaitTimerDisplay();
		if(currentDelay <= 0) {
			mindfulBrowsing.suspendWaitTimer();
			document.getElementById("mindfulBrowsingWaitTimer").classList.add("hidden");
			document.getElementById("mindfulBrowsingOptions").classList.remove("hidden");
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
    window.mindfulBrowsing = mindfulBrowsing;
    function init() {
        var now = new Date();
        if (base64 === undefined || currentPhoto["next_update"] === undefined || currentPhoto["next_update"] < now.getTime()) {
            var photo_index = 0;
            for (photo_index=0; photo_index<window.mindfulBrowsing.photoInfo.photos.length; photo_index++) {
                if (window.mindfulBrowsing.photoInfo.photos[photo_index]["start_date"] > now.getTime()) {
                    break;
                }
            }
            photo_index = (photo_index > 0) ? photo_index: 1;
            currentPhoto = window.mindfulBrowsing.photoInfo.photos[photo_index-1];
            currentPhoto["next_update"] = now.getTime() + (1000*60*60*2);

            // Cache the photo offline.
            // console.log("opening request")
            // console.log(currentPhoto.url)    
            var xmlHTTP = new XMLHttpRequest();
            xmlHTTP.open('GET', currentPhoto.url, true);
            xmlHTTP.responseType = 'arraybuffer';
            xmlHTTP.onload = function(e) {
                // console.log("responded")
                var arr = new Uint8Array(this.response);
                var raw = '';
                var i,j,subArray,chunk = 5000;
                for (i=0,j=arr.length; i<j; i+=chunk) {
                   subArray = arr.subarray(i,i+chunk);
                   raw += String.fromCharCode.apply(null, subArray);
                }
                var b64=btoa(raw);
                base64 = "data:image/jpeg;base64,"+b64;
                // console.log("base64")
                // console.log(base64)
                mindfulBrowsing.saveSettings();
                // If we're out of sync, update the image.

                var ele = document.getElementById("mindfulBrowsingConfirm");
                ele.style.backgroundImage = "url(" + base64 + ")";
            };
            // console.log(xmlHTTP)
            xmlHTTP.send();
            mindfulBrowsing.saveSettings();
        }
		if ( mindfulBrowsing.isActive() ) {
			for (var i in websites) {
				if (href.indexOf(websites[i].url) != -1) {
					site_name = websites[i].url;

					match = true;
					// Check timeouts
					if (site_name in timeouts) {
						if (timeouts[site_name] < now.getTime()) {
							delete timeouts[site_name];
						} else {
							match = false;
							was_in_timeout = true;
							setTimeout(mindfulBrowsing.addOverlayIfActive, timeouts[site_name] - now.getTime());
						}
					}
					if (match) {
						
						break;
					}
				}
			}
			if (match) {
				mindfulBrowsing.addOverlay();
			}
		}
    }
})();
