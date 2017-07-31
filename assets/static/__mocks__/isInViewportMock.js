const $ = require("jquery");

function isInViewport() {}
$.extend($.expr[":"], {
    "in-viewport": $.expr.createPseudo
        ? $.expr.createPseudo(argsString => currElement => isInViewport(currElement, argsString))
        : (currObj, index, meta) => isInViewport(currObj, meta)
})

function run() {}
$.fn.run = run
