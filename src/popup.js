var lastKnown = "";
var tags = /\[.*?\]|\{.*?\}|\(.*?\)/g;
var events = /SC\d\d|C\d\d|\(C[0-9][0-9]?\)|\(COMIC.*?\)|\(SC.*?\)/g;
var eng = /\(eng.*?\)|\(ENG.*?\)|\(Eng.*?\)/g;
var identifier = /=.*=|~.*~/g;
var complete = / (Complete)/g;
var nonEng = /[^a-z,A-Z,\s,\-,\d,\_]/g;
var ds = /\s{2,}/g;
var s2 = /\s+\./g;
var imgArr = [];
var pageArr = [];
var len = 0;
var curChng;
var maxView = 0;
var debug = false;
var time = 0;
var parody = "original";

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
		var l = request.source.match(/(?:"img" src=")([^"]+)/g)[0].split("\"")[3];
		var msg = "Slide parsed to get image at : \n " + l;
		log("p",msg);
		getImg(l);
	} else if (request.action == "search") {
		var str = request.source;
		var lnks = str.match(/https?\:\/\/(ex|g\.e-)hentai\.org\/g\/([a-z,A-Z,0-9]+)\/([a-z,A-Z,0-9]+)([^"])/g);
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

var lg = "Log start \n ==================================================";
function log(level,string) {
	var element = document.getElementById("message");
	if (maxView > 0) {
		var tem = 0;
		tem = 0.525 + (0.055 * (len/maxView));
		tem = Math.round(tem * len) + 1;
		approx.innerText = "Approx. time needed : " + tem;
	}
	
	var para = document.createElement(level);
	var node = document.createTextNode("****");
	
	if (level == "title") {
		lg = lg + "\n Parsed Title as : " + lastKnown;
	}
	
	if (level == "parody") {
		lg = lg + "\n" + string;
	}
	
	message.innerText = lg;
	
	if (debug) {
		lg = lg + "\n" + string;
	} else {
		node = document.createTextNode("\n Remaining pages : " + imgArr.length);
		para.appendChild(node);
		element.appendChild(para);
		
		para = document.createElement(level);
		node = document.createTextNode("\n" + string);
		para.appendChild(node);
		element.appendChild(para);
	}
}

function getImages(links) {
	log("p","\n" + pageArr.length + "\n");
	if (pageArr.length > 0) {
		links.forEach(function(entry) {
			if (entry && entry.search(/<|>/g) < 1 && imgArr.indexOf(entry) < 0) {
				imgArr.push(entry);
			}
		});
		get(pageArr.pop());
		return;
	}
	links.forEach(function(entry) {
		if (entry.search("/h/") > 0) {
			getImg(entry);
		} else if (entry && entry.search(/<|>/g) < 1 && imgArr.indexOf(entry) < 0) {
			imgArr.push(entry);
		}
	});
	log("p","Image Array Size : " + imgArr.length + " Number of Pages : " + len);
	if (imgArr.length >= len) {
		log("p","Popping first!\n");
		get(imgArr.pop());
	}
}
var temporary = 0;
var name;
function getImg(link) {
	var msg = "Downloading Image : " + link.split("/")[link.split("/").length-1] + "\n";
	log("p",msg);
	name = lastKnown + "\\" + link.split("/")[link.split("/").length-1];
	//if (parody) {
	//	name = parody + "\\" + name;
	//}
	chrome.downloads.download({
		url : link,
		filename : name,
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
				temporary = (new Date().getTime());
				temporary = temporary - time;
				temporary = temporary/1000;
				log("p",temporary);
				log("p","Elapsed time : "+temporary);
				time = 0;
			});
		}
		if (chrome.runtime.lastError) {
			var msg = "There was an error downloading image : \n" + chrome.runtime.lastError.message + "\n" + lastKnown + "\\" + link.split("/")[link.split("/").length-1];
			log("err",msg);
		}
	});
}

function parsePage(page) {
	page.match(/(?:https?\:\/\/(ex|g\.e-)hentai\.org\/s\/)([^"<>]+)/g).forEach(function(e){
		log("p",e);
	});
	return page.match(/(?:https?\:\/\/(ex|g\.e-)hentai\.org\/s\/)([^"<>]+)/g);
}

function onWindowLoad() {
	var message = document.querySelector('#message');
	var approx = document.querySelector('#approx');
	log("p","Disabling Downloads Shelf.");
	if (time == 0) {
		time = (new Date().getTime());
		log("p","Time set to : " + time);
	} else {log("p","ELSE" + time);}
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
	if (lastKnown.search("|") > 0) {
		lastKnown = lastKnown.split("|")[1];
	}
	lastKnown = lastKnown.replace(tags, "").replace(identifier, "").replace(nonEng, "").replace("\.","_").replace(events, "").replace(eng, "");
	lastKnown = lastKnown.replace(complete, "").replace(ds, "").replace(s2, "").trim();
	if (lastKnown.endsWith(".")) {
		lastKnown = lastKnown.substring(0,lastKnown.length-1)
	}
	log("title",lastKnown);
	if (str.match(/(?:ta_parody:)(?:[a-z,A-Z,0-9,_,-]+[^"])/g)) {
		parody = str.match(/(?:ta_parody:)(?:[a-z,A-Z,0-9,_,-]+[^"])/g)[0].split(":")[1];
		log("parody",parody);
	}
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