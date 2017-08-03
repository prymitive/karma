const $ = require("jquery");

// always returns true, indicating that every tested element is in viewport
function isInViewport() {
    return true;
}
$.extend($.expr[":"], {
    "in-viewport": $.expr.createPseudo
        ? $.expr.createPseudo(argsString => currElement => isInViewport(currElement, argsString))
        : (currObj, index, meta) => isInViewport(currObj, meta)
})
