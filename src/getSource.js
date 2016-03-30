function DOMtoString(document_root) {
    var html = '',
        node = document_root.firstChild;
    while (node) {
        switch (node.nodeType) {
        case Node.ELEMENT_NODE:
            html += node.outerHTML;
            break;
        case Node.TEXT_NODE:
            html += node.nodeValue;
            break;
        case Node.CDATA_SECTION_NODE:
            html += '<![CDATA[' + node.nodeValue + ']]>';
            break;
        case Node.COMMENT_NODE:
            html += '<!--' + node.nodeValue + '-->';
            break;
        case Node.DOCUMENT_TYPE_NODE:
            // (X)HTML documents are identified by public identifiers
            html += "<!DOCTYPE " + node.name + (node.publicId ? ' PUBLIC "' + node.publicId + '"' : '') + (!node.publicId && node.systemId ? ' SYSTEM' : '') + (node.systemId ? ' "' + node.systemId + '"' : '') + '>\n';
            break;
        }
        node = node.nextSibling;
    }
    return html;
}

function getMode(document_root) {
	if (document_root.documentURI.search("/h/") > 0) {
		return "image";
	} else if (document_root.documentURI.search("/g/") > 0) {
		return "gallery";
	} else if (document_root.documentURI.search("/s/") > 0) {
		return "slide";
	} else if (document_root.documentURI.search("/?f") > 0) {
		return "search";
	} else {
		return "to_err_is_human";
	}
}

chrome.runtime.sendMessage({
    action: getMode(document),
    source: DOMtoString(document),
	link: document.documentURI
});