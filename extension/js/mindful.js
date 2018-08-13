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
	var delay = 10;
	var currentDelay = 0;
	var delayInterval;

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
        var ele = document.getElementById("mindfulBrowsingConfirm");
        ele.parentNode.removeChild(ele);
        var now = new Date();
        // Set for 10 minutes from now.
        var timeout_diff = (1*60000);
        timeouts[site_name] = now.getTime() + timeout_diff;
        mindfulBrowsing.saveSettings();
        was_in_timeout = true;
        setTimeout(mindfulBrowsing.addOverlay, timeout_diff);
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
                "websites": saveWebsites,
                "inspirations": saveInspirations,
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
    mindfulBrowsing.addOverlay = function() {
        inspiration = inspirations[Math.floor(Math.random() * inspirations.length)].title;
        var body = document.body;
        var html = document.documentElement;
        // console.log(currentPhoto)
        var height = Math.max( body.scrollHeight, body.offsetHeight,
            html.clientHeight, html.scrollHeight, html.offsetHeight );
        var go_verb = (was_in_timeout)? "stay on" : "spend time on";

        var ele = document.createElement("div");
        ele.id="mindfulBrowsingConfirm";
        ele.innerHTML = [
        "<div class='mindfulBrowsingHeading'>",
            "<h1>Do you want to " + go_verb + " " +site_name+"?</h1>",
            "<h2>"+inspiration+"</h2>",
        "</div>",
		"<div class='mindfulBrowsingBody'>",
			"<div class='timer' id='mindfulBrowsingDelayTimer'></div>",
			"<div class='options hidden' id='mindfulBrowsingOptions'>",
				"<a class='mindfulBtn' id='mindfulBrowsingContinue' href='#'>Yes, 10 minutes.</a>",
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
        
        btn = document.getElementById("mindfulBrowsingContinue");
        btn.onclick = mindfulBrowsing.confirmClicked;
		
		currentDelay = delay;		
		document.getElementById("mindfulBrowsingDelayTimer").classList.remove("hidden");
		document.getElementById("mindfulBrowsingOptions").classList.add("hidden");
		mindfulBrowsing.updateDelay();
		setTimeout(function() {		
			clearInterval(delayInterval);
			delayInterval = setInterval(mindfulBrowsing.updateDelay, 1000);
		}, 250);
    };
	mindfulBrowsing.updateDelay = function() {
		if(currentDelay > 0) {
			document.getElementById("mindfulBrowsingDelayTimer").innerHTML = currentDelay;
			currentDelay -= 1;
		} else {
			clearInterval(delayInterval);
			document.getElementById("mindfulBrowsingDelayTimer").classList.add("hidden");
			document.getElementById("mindfulBrowsingOptions").classList.remove("hidden");
		}
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
                        setTimeout(mindfulBrowsing.addOverlay, timeouts[site_name] - now.getTime());
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
})();
