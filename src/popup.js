var lastKnown = "";
chrome.runtime.onMessage.addListener(function(request, sender) {
	if (request.action == "gallery") {
		//alert(request.action + "\n" + request.link);
		var str = request.source;
		var imgs = str.split("<td class=\"gdt1\">Length:</td>")[1].split(" pages</td>")[0].split(">")[1].trim();
		var pages = Math.ceil(imgs/40);
		lastKnown = str.split("<h1 id=\"gn\">")[1].split("</h1>")[0].replace(/[\|&;\$%@"<?:\*\\\/\!>\(\)\+,]/g, "").trim();
		var msg = "Last Known set to : " + lastKnown;
		log(msg);
		
		getImages(parsePage(str).split("><"));
		
		msg = request.action + " : " + request.link + "\n name : " + lastKnown + "\n Pages : " + imgs;
		log(msg);
	} else if (request.action == "slide") {
		//alert(request.action + "\n" + request.link);
		var l = request.source.split("<img id=\"img\" src=\"")[1].split("\" style=\"height:")[0];
		if (!(l.endsWith(".jpg") || l.endsWith(".jpeg") || l.endsWith(".png") || l.endsWith(".gif"))) {
			l = l.split("\" ")[0];
			if (!(l.endsWith(".jpg") || l.endsWith(".jpeg") || l.endsWith(".png") || l.endsWith(".gif"))) {
				l = l.split("%22%20")[0];
				if (!(l.endsWith(".jpg") || l.endsWith(".jpeg") || l.endsWith(".png") || l.endsWith(".gif"))) {
					l = l.split("style")[0].substring(0,l.length-6);
				}
			}
		}
		var msg = request.action + " parsed to get image : \n " + l + "\n";
		log(msg);
		getImg(l);
	} else if (request.action == "search") {
		//alert(request.action + "\n" + request.link);
		var str = request.source;
		var lnks = str.split("<a href=http://exhentai.org/g/");
		for (i = 0; i < lnks.length; i++) {
			lnks[i] = lnks[i].split("\"><img src=\"")[0].trim();
		}
		var msg = request.action + " : " + request.link + "\n Links : " + lnks;
		log(msg);
		getImages(lnks);
	} else {
		alert("ERROR : \n" + request.action + "\n" + request.link);
	}
});
/*
function sleep(sleepDuration){
    var now = new Date().getTime();
    while(new Date().getTime() < now + sleepDuration){} 
}
*/
var lg = "Log start \n ==================================== \n";
function log(string) {
	lg = lg + "\n" + string;
	message.innerText = lg;
}

function getImages(links) {
	links.forEach(function(entry) {
		if (entry.search("/h/") > 0) {
			getImg(entry);
		} else {
			get(entry);
		}
	});
}

function getImg(link) {
	var msg = "Downloading Image : " + link.split("/")[link.split("/").length-1] + "\n";
	log(msg);
	chrome.downloads.download({
		url : link,
		filename : lastKnown + "\\" + link.split("/")[link.split("/").length-1],
		conflictAction : "overwrite"
	}, function() {
		if (chrome.runtime.lastError) {
			var msg = "There was an error downloading image : \n" + chrome.runtime.lastError.message + "\n" + lastKnown + "\n" + link;
			log(msg);
		}
	});
}

function parsePage(page) {
	var ArrayAsString = "";
	var tmp = page.split("<div id=\"gdt\"><div class=\"gdtm\" style=\"height:");
	var tmp2 = tmp[1].split("</a></div></div><div class=\"c\"></div></div>");
	var tmp3 = tmp2[0].split("<a href=\"");
	tmp3[0] = "ParsingArtifact_PleaseIgnore";
	for (i = 0; i < tmp3.length; i++) { 
		ArrayAsString += tmp3[i].split("\"><img alt=\"")[0] + "><";
	}
	var msg = "Parsed Page as : \n" + ArrayAsString.replace(/></g, "\n");
	log(msg);
	return ArrayAsString;
}

function onWindowLoad() {
	var message = document.querySelector('#message');
	
	chrome.tabs.executeScript(null, {
		file: "getSource.js"
	}, function() {
		if (chrome.runtime.lastError) {
			var msg = "There was an error injecting script : \n" + chrome.runtime.lastError.message;
			log(msg);
		}
	});
}

function get(link) {
	if (link.search("extension:") > 0) {
		return;
	}
	chrome.tabs.create({
		url : link,
		active : false
	}, function(tab){
		chrome.tabs.executeScript(tab.id, {
			file: "getSource.js"
		}, function() {
			chrome.tabs.remove(tab.id, function() {
				if (chrome.runtime.lastError) {
					var msg = "There was an error closing tab : \n" + chrome.runtime.lastError.message;
					log(msg);
				}
			});
		});
		if (chrome.runtime.lastError) {
			var msg = "There was an error injecting script : \n" + chrome.runtime.lastError.message;
			log(msg);
		}
	});
}
window.onload = onWindowLoad;