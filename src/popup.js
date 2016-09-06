var lastKnown = "";
var tags = /\[.*?\]|\{.*?\}|\(.*?\)/g;
var events = /SC\d\d|C\d\d|\(C[0-9][0-9]?\)|\(COMIC.*?\)|\(SC.*?\)/g;
var eng = /\(eng.*?\)|\(ENG.*?\)|\(Eng.*?\)/g;
var identifier = /=.*=|~.*~/g;
var complete = / (Complete)/g;
var nonEng = /[^a-z,A-Z,\s,\-,\~,\d,\_]/g;
var ds = /\s{2,}/g;
var s2 = /\s+\./g;
var imgArr = [];
var pageArr = [];
var len = 0;
var curChng;
var maxView = 0;
var debug = true;

chrome.runtime.onMessage.addListener(function(request, sender) {
	if (request.action == "gallery") {
		var str = request.source;
		log("p","Beginning parsing of : " + request.link);
		len = str.match(/(?:class\=\"gdt2\"\>)([^pages]+)/g)[5].split("\>")[1].trim();
		log("p","Pages detected : " + len);
		
		maxView = str.match(/(?:ths nosel\"\>)([^rows]+)/g)[0].split("\>")[1].trim();
		maxView = maxView * 10;
		log("p","Pages viewable detected as : " + maxView + "\n");
		if (len > maxView && request.link.search(/\?p\=/) <= 0) {
			for (i=1; i <= Math.round(len/maxView);i++){
				pageArr.push(request.link + "?p=" + i);
			}
		}
		
		setLastKnown(str);
		getImages(parsePage(str));
	} else if (request.action == "slide") {
		var l = request.source.match(/(?:src=")([^"]+)/g)[4].replace("src=\"", "");
		var msg = "Slide parsed to get image at : \n " + l;
		log("p",msg);
		getImg(l);
	} else if (request.action == "search") {
		var str = request.source;
		var lnks = str.match(/http\:\/\/exhentai\.org\/g\//g);
		for (i = 0; i < lnks.length; i++) {
			lnks[i] = lnks[i].split("\"><img src=\"")[0].trim();
		}
		var msg = request.action + " : " + request.link + "\n Links : " + lnks;
		log("p",msg);
		getImages(lnks);
	} else {
		alert("ERROR : \n" + request.action + "\n" + request.link);
	}
});

chrome.tabs.onUpdated.addListener(function(id,chngs,tab){
	if (tab.id == id && id == curtabid && chngs.url == curChng) {
		log("p","Reloaded with page : " + chngs.url);
		chrome.tabs.executeScript(curtabid, {
			file: "getSource.js"
		});
	}
})

var lg = "Log start \n ==================================== \n";
var setTitle;
function log(level,string) {
	message.innerText = lg;
	if (lastKnown && !setTitle) {
		lg = lg + " Parsed Title as : " + lastKnown;
		setTitle = true;
	}
	
	if (debug) {
		lg = lg + "\n" + string;
	} else {
		var para = document.createElement(level);
		var node = document.createTextNode("\n" + string);
		para.appendChild(node);
		var element = document.getElementById("message");
		element.appendChild(para);
	}
}

function getImages(links) {
	log("p","\n" + pageArr.length + "\n");
	if (pageArr.length > 0) {
		links.forEach(function(entry) {
			if (entry) {
				imgArr.push(entry);
			}
		});
		get(pageArr.pop());
		return;
	}
	links.forEach(function(entry) {
		if (entry.search("/h/") > 0) {
			getImg(entry);
		} else if (entry) {
			imgArr.push(entry);
		}
	});
	log("p","Image Array Size : " + imgArr.length + " Number of Pages : " + len);
	if (imgArr.length >= len) {
		log("p","Popping first!\n");
		get(imgArr.pop());
	}
}

function getImg(link) {
	var msg = "Downloading Image : " + link.split("/")[link.split("/").length-1] + "\n";
	log("p",msg);
	chrome.downloads.download({
		url : link,
		filename : lastKnown + "\\" + link.split("/")[link.split("/").length-1],
		conflictAction : "overwrite"
	}, function() {
		if (imgArr.length != 0) {
			get(imgArr.pop());
		} else {
			chrome.tabs.remove(curtabid, function() {
				if (chrome.runtime.lastError) {
					var msg = "There was an error closing tab : \n" + chrome.runtime.lastError.message;
					log("err",msg);
				}
				chrome.downloads.setShelfEnabled(true);
			});
		}
		if (chrome.runtime.lastError) {
			var msg = "There was an error downloading image : \n" + chrome.runtime.lastError.message + "\n" + lastKnown + "\\" + link.split("/")[link.split("/").length-1];
			log("err",msg);
		}
	});
}

function parsePage(page) {
	page.match(/(?:http\:\/\/exhentai\.org\/s\/)([^"]+)|(?:https\:\/\/exhentai\.org\/s\/)([^"]+)/g).forEach(function(e){
		log("p",e);
	});
	return page.match(/(?:http\:\/\/exhentai\.org\/s\/)([^"]+)|(?:https\:\/\/exhentai\.org\/s\/)([^"]+)/g);
}

function onWindowLoad() {
	var message = document.querySelector('#message');
	log("p","Disabling Downloads Shelf.");
	chrome.downloads.setShelfEnabled(false);
	log("p","Injecting Scripts");
	chrome.tabs.executeScript(null, {
		file: "getSource.js"
	}, function() {
		if (chrome.runtime.lastError) {
			var msg = "There was an error injecting script : \n" + chrome.runtime.lastError.message;
			log("err",msg);
		}
	});
}

function setLastKnown(str) {
	lastKnown = str.split("<h1 id=\"gn\">")[1].split("</h1>")[0];
	lastKnown = lastKnown.replace(tags, "").replace("\.","_").replace(nonEng, "").replace(events, "").replace(eng, "").replace(identifier, "");
	lastKnown = lastKnown.replace(complete, "").replace(ds, "").replace(s2, "").trim();
	var msg = "Last Known set to : " + lastKnown;
	log("p",msg);
}

var curtabid = -1;
function get(link) {
	if (link.search("extension:") > 0 || !link) {
		return;
	}
	log("p","Getting : " + link);
	curChng = link;
	if (curtabid == -1) {
		chrome.tabs.create({
			url : link,
			active : false
		}, function(tab){
			curtabid = tab.id;
			if (chrome.runtime.lastError) {
				var msg = "There was an error injecting script : \n" + chrome.runtime.lastError.message;
				log("err",msg);
			};
		});
	} else {
		chrome.tabs.update(curtabid, {
			url : link,
			active : false
		});
	}
}
window.onload = onWindowLoad;
