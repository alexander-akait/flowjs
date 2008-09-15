/*
Namespace: The Query Namespace
	Cross-browser implementation of querySelector/querySelectorAll.

About: Version
	1.0.6
	
License:
	- Huge ups to Robert Nyman <http://robertnyman.com> for saving us the undertaking of RegExing to match the selectors API: <http://www.w3.org/TR/selectors-api/>.
	- Flow.Query is a direct port of Robert Nyman's DOMAssistant's selectors engine <http://code.google.com/p/domassistant/>
	- Licensed under The MIT License <http://www.opensource.org/licenses/mit-license.php>
	- All glory upon the Nyman (& team)
	
	- Flow is licensed under a Creative Commons Attribution-Share Alike 3.0 License <http://creativecommons.org/licenses/by-sa/3.0/us/>. You are free to share, modify and remix our code as long as you share alike.

Requires:
	Flow.js.
*/
new Flow.Plugin({
	name : "Query",
	version : "1.0.6",
	bind : true,
	
	constructor : function() {

		var F = Flow,
		    B = F.Browser,
		    X = F.Bind,
		    U = F.Utils;

		var doc = document,
		    that;

		return {

			/*
			Interface: Element
				These functions are bound to _elements_.
			*/
			document : {

				/*
				Property: querySelectorAll
					Match elements by CSS query

				Shorthand:
					queryAll

				Parameters:
					query - the query to match.

				Example:
					>var foo = document.querySelectorAll("div ul.foo"); // Matches all ul's with a class of "foo"
					>foo = document.queryAll("div ul.foo li"); // Shortcut. Returns all "li"s in foo.
				*/
				querySelectorAll : function() {
					
					if (doc.querySelectorAll) {
						return function(query) {
							var nodes = new U.liveNodeList(this._querySelectorAll(query));
							return X.extend(nodes);
						};
					}

					if (doc.evaluate) {
						return function (query, single) {
							var queries = query.replace(/\s*(,)\s*/g, "$1").split(",");
							var elm = [];
							var currentRule, identical, cssSelectors, xPathExpression, cssSelector, splitRule, nextTag, followingElm;
							
							// @MODIFIED: Added regex checks for [foo|=bar] and [foo~=bar]
							var cssSelectorRegExp =  /^(\w+)?(#[\w\-_]+|\*)?((\.[\w\-_]+)*)?((\[\w+(\^|\$|\*|\||\~)?=?[\w\-\_]+\]+)*)?(((:\w+[\w\-]*)(\((odd|even|\d+n?((\+|\-)\d+)?|\w+|((\w*\.[\w\-_]+)*)?|(\[#?\w+(\^|\$|\*)?=?[\w\-\_]+\]+))\))?)*)?(>|\+|~)?/;
							for (var i=0, il=queries.length; i<il; i++) {
								currentRule = queries[i];
								if (i > 0) {
									identical = false;
									for (var x=0, xl=i; x<xl; x++) {
										if (queries[i] === queries[x]) {
											identical = true;
											break;
										}
									}
									if (identical) {
										continue;
									}
								}
								cssSelectors = currentRule.split(" ");
								xPathExpression = ".";
								for (var j=0, jl=cssSelectors.length; j<jl; j++) {
									cssSelector = cssSelectorRegExp.exec(cssSelectors[j]);
									splitRule = {
										tag : (!cssSelector[1] || cssSelector[2] === "*")? "*" : cssSelector[1],
										id : (cssSelector[2] !== "*")?  cssSelector[2] : null,
										allClasses : cssSelector[3],
										allAttr : cssSelector[5],
										pseudoClass : cssSelector[10],
										pseudoValue : cssSelector[12],
										tagRelation : cssSelector[19]
									};
									if (splitRule.tagRelation) {
										switch (splitRule.tagRelation) {
											case ">":
												xPathExpression += "/child::";
												break;
											case "+":
												xPathExpression += "/following-sibling::*[1]/self::";
												break;
											case "~":
												xPathExpression += "/following-sibling::";
												break;
										}
									}
									else {
										xPathExpression += (j > 0 && (/(>|\+|~)/).test(cssSelectors[j-1]))? splitRule.tag : ("/descendant::" + splitRule.tag);
									}
									if (splitRule.id) {
										xPathExpression += "[@id = '" + splitRule.id.replace(/^#/, "") + "']";
									}
									if (splitRule.allClasses) {
										xPathExpression += splitRule.allClasses.replace(/\.([\w\-_]+)/g, "[contains(concat(' ', @class, ' '), ' $1 ')]");
									}
									if (splitRule.allAttr) {
										
										// @MODIFIED: Added regex checks for [foo|=bar] and [foo~=bar]
										xPathExpression += splitRule.allAttr.replace(/(\w+)(\^|\$|\*|\||\~)?=?([\w\-_]+)?/g, function (match, p1, p2, p3, p4) {
											var regExpReturn = match;
											switch (p2) {
												case "^":
													regExpReturn = "starts-with(@" + p1 + ", '" + p3 + "')";
													break;
												case "$":
													regExpReturn = "substring(@" + p1 + ", (string-length(@" + p1 + ") - " + (p3.length - 1) + "), 6) = '" + p3 + "'";
													break;
													
												// @MODIFIED: ~ is *virtually indentical to* *
												case "*":
												case "~":
													regExpReturn = "contains(concat(' ', @" + p1 + ", ' '), '" + p3 + "')";
													break;
												default :
													regExpReturn = "@" + p1 + ((p3) ? "='" + p3 + "'" : "");
													break;
											}
											return regExpReturn;
										});
									}
									if (splitRule.pseudoClass) {
										var pseudoValue = splitRule.pseudoValue;
										switch (splitRule.pseudoClass.replace(/^:/, "")) {
											case "first-child":
												xPathExpression += "[count(preceding-sibling::*) = 0]";
												break;
											case "first-of-type":
												xPathExpression += "[count(preceding-sibling::" + splitRule.tag + ") = 0]";
												break;
											case "last-child":
												xPathExpression += "[count(following-sibling::*) = 0]";
												break;
											case "last-of-type":
												xPathExpression += "[count(following-sibling::" + splitRule.tag + ") = 0]";
												break;
											case "only-child":
												xPathExpression += "[count(preceding-sibling::*) = 0 and count(following-sibling::*) = 0]";
												break;
											case "only-of-type":
												xPathExpression += "[count(preceding-sibling::" + splitRule.tag + ") = 0 and count(following-sibling::" + splitRule.tag + ") = 0]";
												break;		
											case "nth-of-type":
												xPathExpression += "[" + pseudoValue + "]";
												break;
											case "empty":
												xPathExpression += "[count(child::*) = 0 and string-length(text()) = 0]";
												break;
											case "contains":
												xPathExpression += "[contains(., '" + pseudoValue + "')]";
												break;	
											case "enabled":
												xPathExpression += "[not(@disabled)]";
												break;
											case "disabled":
												xPathExpression += "[@disabled]";
												break;
											case "checked":
												xPathExpression += "[@checked='checked']"; // Doesn't work in Opera 9.24
												break;
											case "nth-child":
												var pseudoSelection = "[";
												if (/^\d+$/.test(pseudoValue)) {
													pseudoSelection += "position() = " + pseudoValue;
												}
												else if (/^n$/.test(pseudoValue)) {
													pseudoSelection = "";
												}
												else{
													if (/^odd$/.test(pseudoValue)) {
														pseudoValue = "2n+1";
													}
													else if (/^even$/.test(pseudoValue)) {
														pseudoValue = "2n+0";
													}
													var pseudoSelector = /^(\d+)n((\+|\-)(\d+))?$/.exec(pseudoValue);
													var nthSelector = parseInt(pseudoSelector[1], 10);
													var nOperatorVal = 0;
													if (pseudoSelector[3] && pseudoSelector[4]) {
														nOperatorVal = parseInt((pseudoSelector[3] + pseudoSelector[4]), 10);
														if (nOperatorVal < 0) {
															nOperatorVal = nthSelector + nOperatorVal;
														}
													}
													pseudoSelection += "(count(./preceding-sibling::*) + 1)";
													if (nthSelector < nOperatorVal) {
														var nOperatorDiff = ((nOperatorVal - nthSelector) % 2 === 0)? 0 : 1;
														pseudoSelection += " mod " + nthSelector + " = " + nOperatorDiff + " and position() > " + nOperatorVal;
													}
													else if (nOperatorVal === nthSelector) {
														pseudoSelection += " mod " + nthSelector + " = 0";
													}
													else {
														pseudoSelection += " mod " + nthSelector + " = " + nOperatorVal;
													}
												}
												if (!(/^n$/).test(pseudoValue)) {
													pseudoSelection += "]";
												}
												xPathExpression += pseudoSelection;
												break;	
											case "not":
												pseudoValue = pseudoValue.replace(/^\[#([\w\-\_]+)\]$/, "[id=$1]");
												var notSelector = pseudoValue.replace(/^(\w+)/, "self::$1");
												notSelector = notSelector.replace(/\.([\w\-_]+)/g, "contains(concat(' ', @class, ' '), ' $1 ')");
												notSelector = notSelector.replace(/\[(\w+)(\^|\$|\*)?=?([\w\-_]+)?\]/g, function (match, p1, p2, p3, p4) {
													var regExpReturn = match;
													switch (p2) {
														case "^":
															regExpReturn = "starts-with(@" + p1 + ", '" + p3 + "')";
															break;
														case "$":
															regExpReturn = "substring(@" + p1 + ", (string-length(@" + p1 + ") - " + (p3.length - 1) + "), 6) = '" + p3 + "'";
															break;
														case "*":
															regExpReturn = "contains(concat(' ', @" + p1 + ", ' '), '" + p3 + "')";
															break;
														default :
															regExpReturn = "@" + p1 + ((p3)? "='" + p3 + "'" : "");
															break;
													}
													return regExpReturn;
												});
												xPathExpression += "[not(" + notSelector + ")]";
												break;
										}
									}	
								}
								var xPathNodes = this.evaluate(xPathExpression, this, null, 0, null);
								var node = xPathNodes.iterateNext();
								while(node) {
									elm.push(node);
									node = xPathNodes.iterateNext();
								}
							}
							elm = X.extend(elm);
							return single ? elm[0] : elm;
						};
					}
					
					return function (query, single) {
						var queries = query.replace(/\s*(,)\s*/g, "$1").split(",");
						var elm = [];
						var prevElm = [];
						var matchingElms = [];
						var prevParents, currentRule, identical, cssSelectors, childOrSiblingRef, nextTag, nextRegExp, refSeparator, refPrevElm, nextSib, refPrevElmFound, current, previous, prevParent, addElm, firstChild, lastChild, parentTagsByType, matchingChild, childrenNodes, childNodes;
						var childOrSiblingRefRegExp = /^(>|\+|~)$/;
						
						// @MODIFIED: Added regex checks for [foo|=bar] and [foo~=bar]
						var cssSelectorRegExp = /^(\w+)?(#[\w\-_]+|\*)?((\.[\w\-_]+)*)?((\[\w+(\^|\$|\*|\||\~)?=?[\w\-\_]+\]+)*)?(((:\w+[\w\-]*)(\((odd|even|\d*n?((\+|\-)\d+)?|\w+|((\w*\.[\w\-_]+)*)?|(\[#?\w+(\^|\$|\*)?=?[\w\-\_]+\]+))\))?)*)?/;
						var matchedObjects;
						function clearAdded() {
							for (var n=0, nl=prevElm.length; n<nl; n++) {
								prevElm[n].added = false;
							}
						}
						function clearChildElms () {
							for (var n=0, nl=prevParents.length; n<nl; n++) {
								prevParents[n].childElms = null;
							}
						}
						for (var a=0, al=queries.length; a<al; a++) {
							currentRule = queries[a];
							if (a > 0) {
								identical = false;
								for (var b=0, bl=a; b<bl; b++) {
									if (queries[a] === queries[b]) {
										identical = true;
										break;
									}
								}
								if (identical) {
									continue;
								}
							}
							cssSelectors = currentRule.split(" ");
							prevElm = [];
							prevElm.push(this);

							for (var i=0, il=cssSelectors.length; i<il; i++) {
								var rule = cssSelectors[i];
								matchingElms = [];
								if (i > 0 && childOrSiblingRefRegExp.test(rule)) {
									childOrSiblingRef = childOrSiblingRefRegExp.exec(rule);
									if (childOrSiblingRef) {
										
										// @MODIFIED: This change seems to allow: "div a[rel]". Previously returned "div a"
										// nextTag = /^\w+/.exec(cssSelectors[i+1]);
										nextTag = /^\S+/.exec(cssSelectors[i+1]);
										if (nextTag) {
											nextRegExp = new RegExp("(^|\\s)" + nextTag + "(\\s|$)", "i");
											refSeparator = childOrSiblingRef[0];
											if (refSeparator === ">") {
												for (var j=0, jl=prevElm.length, children; j<jl; j++) {
													children = prevElm[j].childNodes;
													for (var k=0, kl=children.length; k<kl; k++) {
														if (nextRegExp.test(children[k].nodeName)) {
															matchingElms.push(children[k]);
														}
													}
												}	
											}
											else if (refSeparator === "+") {
												for (var l=0, ll=prevElm.length; l<ll; l++) {
													nextSib = prevElm[l].nextSibling;
													while (nextSib && nextSib.nodeType !== 1) {
														nextSib = nextSib.nextSibling;
													}
													if (nextSib) {
														if (nextRegExp.test(nextSib.nodeName)) {
															matchingElms.push(nextSib);
														}
													}
												}	
											}
											else if (refSeparator === "~") {
												for (var m=0, ml=prevElm.length; m<ml; m++) {
													nextSib = prevElm[m].nextSibling;
													while (nextSib && nextSib.nodeType !== 1) {
														nextSib = nextSib.nextSibling;
													}
													while (nextSib) {
														if (!nextSib.added && nextRegExp.test(nextSib.nodeName)) {
															nextSib.added = true;
															matchingElms.push(nextSib);
														}
														nextSib = nextSib.nextSibling;
													}
												}
												clearAdded();
											}
										}
									}
									prevElm = matchingElms;
									i = i+1;
								}
								else {
									var cssSelector = cssSelectorRegExp.exec(rule);
									var splitRule = {
										tag : (!cssSelector[1] || cssSelector[2] === "*")? "*" : cssSelector[1],
										id : (cssSelector[2] !== "*")?  cssSelector[2] : null,
										allClasses : cssSelector[3],
										allAttr : cssSelector[5],
										pseudoClass : cssSelector[10],
										pseudoValue : cssSelector[12]
									};
									if (splitRule.id) {
										matchingElms.push(this.getElementById(splitRule.id.replace(/#/, "")));
										prevElm = matchingElms;
									}
									else if (splitRule.tag) {
										var tagCollectionMatches;
										for (var n=0, nl=prevElm.length; n<nl; n++) {
											tagCollectionMatches = prevElm[n].getElementsByTagName(splitRule.tag);
											for (var o=0, ol=tagCollectionMatches.length; o<ol; o++) {
												if (!tagCollectionMatches[o].added) {
													tagCollectionMatches[o].added = true;
													matchingElms.push(tagCollectionMatches[o]);
												}
											}
										}
										prevElm = matchingElms;
										clearAdded();
									}

									if (splitRule.allClasses) {
										splitRule.allClasses = splitRule.allClasses.replace(/^\./, "").split(".");
										var regExpClassNames = [];
										for (var qp=0, qpl=splitRule.allClasses.length, classToMatch, classMatch; qp<qpl; qp++) {
											regExpClassNames.push(new RegExp("(^|\\s)" + splitRule.allClasses[qp] + "(\\s|$)"));
										}
										var matchingClassElms = [];
										for (var p=0, pl=matchingElms.length, elmClass; p<pl; p++) {
											current = matchingElms[p];
											if (!current.added) {
												addElm = false;
												elmClass = current.className;
												for (var q=0, ql=regExpClassNames.length; q<ql; q++) {
													addElm = regExpClassNames[q].test(elmClass);
													if (!addElm) {
														break;
													}
												}
											}
											if (addElm) {
												current.added = true;
												matchingClassElms.push(current);
											}
										}
										clearAdded();
										matchingElms = matchingClassElms;
										prevElm = matchingElms;
									}
									if (splitRule.allAttr) {
										splitRule.allAttr = splitRule.allAttr.replace(/(\])(\[)/, "$1 $2").split(" ");
										var regExpAttributes = [];
										
										// @MODIFIED: Added regex checks for [foo|=bar] and [foo~=bar]
										var attributeMatchRegExp = /(\w+)(\^|\$|\*|\||\~)?=?([\w\-_]+)?/;
										for (var sp=0, spl=splitRule.allAttr.length, attributeMatch, attribute, attributeValue, attrVal, tag, substrMatchSelector; sp<spl; sp++) {
											attributeMatch = attributeMatchRegExp.exec(splitRule.allAttr[sp]);
											attributeValue = attributeMatch[3] || null;
											attrVal = (attributeValue)? ("^" + attributeValue + "$") : null;
											substrMatchSelector = attributeMatch[2] || null;
											if (typeof substrMatchSelector === "string") {
												switch (substrMatchSelector) {
													case "^":
														attrVal = ("^" + attributeValue);
														break;
													case "$":
														attrVal = (attributeValue + "$");
														break;

													// @MODIFIED: ~ is *virtually indentical to* *
													case "*":
													case "~":
														attrVal = (attributeValue);
														break;	
												}
											}
											regExpAttributes.push([((attrVal)? new RegExp(attrVal) : null), attributeMatch[1]]);
										}
										var matchingAttributeElms = [];
										for (var r=0, rl=matchingElms.length, currentAttr; r<rl; r++) {
											current = matchingElms[r];
											if (!current.added) {
												for (var s=0, sl=regExpAttributes.length, attributeRegExp; s<sl; s++) {
													addElm = false;
													attributeRegExp = regExpAttributes[s][0];
													
										        	currentAttr = current.getAttribute(regExpAttributes[s][1]);
														// Added strict check in case className is empty
											        if ((typeof currentAttr === "string") && (currentAttr.length > 0) && (currentAttr !== "")) {
														if (!attributeRegExp || typeof attributeRegExp === "undefined" || (attributeRegExp && attributeRegExp.test(currentAttr))) {
															addElm = true;
											            }
											        }
													if (!addElm) {
														break;
													} 
												}
												if (addElm) {
													current.added = true;
													matchingAttributeElms.push(current);
												}
											}
										}
										clearAdded();
										matchingElms = matchingAttributeElms;
										prevElm = matchingElms;
									}
									if (splitRule.pseudoClass) {
										var pseudoClass = splitRule.pseudoClass;
										var pseudoValue = splitRule.pseudoValue;
										var previousMatch = matchingElms;
										matchingElms = [];
										prevParents = [];
										if (/^:not$/.test(pseudoClass)) {
											pseudoValue = pseudoValue.replace(/^\[#([\w\-\_]+)\]$/, "[id=$1]");
											var notTag = /^(\w+)/.exec(pseudoValue);
											var notClass = /\.([\w\-_]+)/.exec(pseudoValue);
											var notAttr = /\[(\w+)(\^|\$|\*)?=?([\w\-_]+)?\]/.exec(pseudoValue);
											var notRegExp = new RegExp("(^|\\s)" + ((notTag)? notTag[1] : (notClass)? notClass[1] : "") + "(\\s|$)", "i");
											if (notAttr) {
												var notAttribute = notAttr[3];
												var notMatchingAttrVal = "^" + notAttr[3] + "$";
												var substrNoMatchSelector = notAttr[2];
												if (typeof substrNoMatchSelector === "string") {
													switch (substrNoMatchSelector) {
														case "^":
															notMatchingAttrVal = ("^" + notAttribute);
															break;
														case "$":
															notMatchingAttrVal = (notAttribute + "$");
															break;
														case "*":
															notMatchingAttrVal = (notAttribute);
															break;	
													}
												}
												notRegExp = new RegExp(notMatchingAttrVal, "i");
											}
											for (var t=0, tl=previousMatch.length, notElm; t<tl; t++) {
												notElm = previousMatch[t];
												addElm = null;
												if (notTag && !notRegExp.test(notElm.nodeName)) {
													addElm = notElm;
												}		
												else if (notClass && !notRegExp.test(notElm.className)) {
													addElm = notElm;
												}
												else if (notAttr) {
													if (!notElm.getAttribute(notAttr[1]) || !notRegExp.test(notElm.getAttribute(notAttr[1]))) {
														addElm = notElm;
													}
												}
												if (addElm && !addElm.added) {
													addElm.added = true;
													matchingElms.push(addElm);
												}
											}
											clearAdded();
											prevElm = matchingElms;
										}
										else {
											if (/first-child/.test(pseudoClass)) {
												for (var u=0, ul=previousMatch.length; u<ul; u++) {
													previous = previousMatch[u];
													prevParent = previous.parentNode;
													firstChild = prevParent.firstChild;
													while (firstChild.nodeType !== 1 && firstChild.nextSibling) {
														firstChild = firstChild.nextSibling;
													}
													if (firstChild === previous) {
														matchingElms.push(previous);
													}
												}
												prevElm = matchingElms;
											}
											else if (/last-child/.test(pseudoClass)) {
												for (var v=0, vl=previousMatch.length; v<vl; v++) {
													previous = previousMatch[v];
													prevParent = previous.parentNode;
													lastChild = prevParent.lastChild;
													while (lastChild.nodeType !== 1 && lastChild.previousSibling) {
														lastChild = lastChild.previousSibling;
													}
													if (lastChild === previous) {
														matchingElms.push(previous);
													}
												}
												prevElm = matchingElms;
											}
											else if (/only-child/.test(pseudoClass)) {
												for (var w=0, wl=previousMatch.length; w<wl; w++) {
													previous = previousMatch[w];
													prevParent = previous.parentNode;
													firstChild = prevParent.firstChild;
													while (firstChild.nodeType !== 1 && firstChild.nextSibling) {
														firstChild = firstChild.nextSibling;
													}
													lastChild = prevParent.lastChild;
													while (lastChild.nodeType !== 1 && lastChild.previousSibling) {
														lastChild = lastChild.previousSibling;
													}
													if (firstChild === previous && lastChild === previous) {
														matchingElms.push(previous);
													}
												}
												prevElm = matchingElms;
											}
											else if (/nth-child/.test(pseudoClass)) {
												if (/^\d+$/.test(pseudoValue)) {
													var nthChild = parseInt(pseudoValue, 10);
													for (var x=0, xl=previousMatch.length, childCounter; x<xl; x++) {
														childCounter = 0;
														previous = previousMatch[x];
														prevParent = previous.parentNode;
														matchingChild = prevParent.firstChild;
														if(matchingChild.nodeType === 1) {
															childCounter = childCounter + 1;
														}
														while (childCounter < nthChild && matchingChild.nextSibling) {
															matchingChild = matchingChild.nextSibling;
															if (matchingChild.nodeType === 1) {
																childCounter = childCounter + 1;
															}
														}

														if (childCounter === nthChild && matchingChild && !matchingChild.added && (matchingChild.nodeName === previous.nodeName)) {
															matchingChild.added = true;
															matchingElms.push(previous);
														}
													}
													clearAdded();
												}
												else if (/^n$/.test(pseudoValue)) {
													for (var y=0, yl=previousMatch.length; y<yl; y++) {
														matchingElms.push(previousMatch[y]);
													}
												}
												else{
													var pseudoSelector = /^(odd|even)|(\d+)n((\+|\-)(\d+))?$/.exec(pseudoValue);
													var nRepeat = parseInt(pseudoSelector[2], 10);
													var iteratorStart = (pseudoSelector[1] === "even")? 1 : 0;
													var iteratorAdd = 2;
													if (nRepeat > 0) {
														iteratorAdd = nRepeat;
														var nOperatorVal = (pseudoSelector[4])? parseInt((pseudoSelector[4] + pseudoSelector[5]), 10) : 0;
														iteratorStart = nOperatorVal - 1;
													}
													for (var z=0, zl=previousMatch.length; z<zl; z++) {
														previous = previousMatch[z];
														prevParent = previous.parentNode;
														if (!prevParent.childElms) {
															childrenNodes = prevParent.childNodes;
															childNodes = [];
															var childElm = prevParent.firstChild;
															if (childElm.nodeType === 1) {
																childNodes.push(childElm);
															}
															while (childElm && childElm.nextSibling) {
																childElm = childElm.nextSibling;
																if (childElm.nodeType === 1) {
																	childNodes.push(childElm);
																}
															}
															prevParent.childElms = childNodes;
															prevParents.push(prevParent);
														}
														else {
															childNodes = prevParent.childElms;
														}
														for (var zz=iteratorStart, zzl=childNodes.length; zz<zzl; zz=zz+iteratorAdd) {
															if (zz < 0) {
																continue;
															}
															current = childNodes[zz];
															if (!current.added && current.nodeName === previous.nodeName) {
																current.added = true;
																// @MODIFIED: Replaced pushing previous with current
																matchingElms.push(current);
															}
														}
													}
													clearAdded();
													clearChildElms();
												}
												prevElm = matchingElms;
											}
											else if (/first-of-type/.test(pseudoClass)) {
												for (var zFirst=0, zFirstL=previousMatch.length; zFirst<zFirstL; zFirst++) {
													previous = previousMatch[zFirst];
													prevParent = previous.parentNode;
													parentTagsByType = prevParent.getElementsByTagName(previous.nodeName);
													firstChild = parentTagsByType[0];
													if (firstChild === previous) {
														matchingElms.push(previous);
													}
												}
												prevElm = matchingElms;
											}
											else if (/last-of-type/.test(pseudoClass)) {
												for (var zLast=0, zLastL=previousMatch.length, lastElement; zLast<zLastL; zLast++) {
													previous = previousMatch[zLast];
													if (!previous.added) {
														prevParent = previous.parentNode;
														parentTagsByType = prevParent.getElementsByTagName(previous.nodeName);
														lastChild = parentTagsByType[parentTagsByType.length - 1];
														while (lastChild.parentNode !== prevParent) {
															lastChild = lastChild.parentNode;
														}
														if (lastChild === previous) {
															previous.added = true;
															matchingElms.push(previous);
														}
													}
												}
												clearAdded();
												prevElm = matchingElms;
											}
											else if (/only-of-type/.test(pseudoClass)) {
												for (var zOnly=0, zOnlyL=previousMatch.length; zOnly<zOnlyL; zOnly++) {
													previous = previousMatch[zOnly];
													prevParent = previous.parentNode;
													parentTagsByType = prevParent.getElementsByTagName(previous.nodeName);
													if (parentTagsByType.length === 1) {
														matchingElms.push(previous);
													}
												}
												prevElm = matchingElms;
											}
											else if (/nth-of-type/.test(pseudoClass)) {
												var nthIndex = parseInt(pseudoValue, 10);
												for (var zNth=0, zNthL=previousMatch.length; zNth<zNthL; zNth++) {
													previous = previousMatch[zNth];
													prevParent = previous.parentNode;
													childNodes = [];
													parentTagsByType = prevParent.childNodes;
													if (parentTagsByType.length >= nthIndex) {
														for (var zInnerNth=0, zInnerNthL=parentTagsByType.length, childNode; zInnerNth<zInnerNthL; zInnerNth++) {
															if (zInnerNth === nthIndex) {
																break;
															}
															childNode = parentTagsByType[zInnerNth];
															if (childNode.nodeName === previous.nodeName) {
																childNodes.push(childNode);
															}
														}
														current = childNodes[childNodes.length - 1];
														if (current && current === previous) {
															matchingElms.push(previous);
														}
													}
												}
												prevElm = matchingElms;
											}
											else if (/empty/.test(pseudoClass)) {
												for (var zEmpty=0, zEmptyL=previousMatch.length; zEmpty<zEmptyL; zEmpty++) {
													previous = previousMatch[zEmpty];
													prevParent = previous.parentNode;
													childrenNodes = prevParent.childNodes;
													if (childrenNodes.length === 0) {
														matchingElms.push(previous);
													}
												}
												prevElm = matchingElms;
											}
											else if (/enabled/.test(pseudoClass)) {
												for (var zEnabled=0, zEnabledL=previousMatch.length; zEnabled<zEnabledL; zEnabled++) {
													previous = previousMatch[zEnabled];
													if (!previous.disabled) {
														matchingElms.push(previous);
													}
												}
												prevElm = matchingElms;
											}
											else if (/disabled/.test(pseudoClass)) {
												for (var zDisabled=0, zDisabledL=previousMatch.length; zDisabled<zDisabledL; zDisabled++) {
													previous = previousMatch[zDisabled];
													if (previous.disabled) {
														matchingElms.push(previous);
													}
												}
												prevElm = matchingElms;
											}
											else if (/checked/.test(pseudoClass)) {
												for (var zChecked=0, zCheckedL=previousMatch.length; zChecked<zCheckedL; zChecked++) {
													previous = previousMatch[zChecked];
													if (previous.checked) {
														matchingElms.push(previous);
													}
												}
												prevElm = matchingElms;
											}
											else if (/contains/.test(pseudoClass)) {
												for (var zContains=0, zContainsL=previousMatch.length; zContains<zContainsL; zContains++) {
													previous = previousMatch[zContains];
													if (!previous.added) {
														if (new RegExp("(^|\\s)" + pseudoValue + "(\\s|$)").test(previous.innerHTML)) {
															previous.added = true;
															matchingElms.push(previous);
														}
													}
												}
												clearAdded();
												prevElm = matchingElms;
											}
										}
									}
								}
							}
							for (var iPrevElm=0, iPrevElmL=prevElm.length; iPrevElm<iPrevElmL; iPrevElm++) {
								elm.push(prevElm[iPrevElm]);
							}
						}
						elm = X.extend(elm);
						return single ? elm[0] : elm;
					};		
				}(),

				/*
				Property: querySelector
					Match a single element by CSS query

				Shorthand:
					query

				Parameters:
					query - the query to match.

				Example:
					>var foo = document.querySelector("div ul.foo"); // Returns the first ul.foo.
					>foo = document.query("div ul.foo li"); // Shortcut. Returns the first "li" in foo.
				*/
				querySelector : function() {

					if (doc.querySelector) {
						return function(query) {
							return X.extend(this._querySelector(query));
						};
					}

					return function(query) {
						return this.querySelectorAll(query, true);
					};
				}()

			}
		};
	}()
});
