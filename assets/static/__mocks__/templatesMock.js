const fs = require("fs");
const path = require("path");

function loadTemplates() {
    var templatesArr = [];
    const templateFiles = [
        "alertgroup.html",
        "errors.html",
        "modal.html",
        "silence.html",
        "summary.html",
    ];
    templateFiles.forEach(function(filename){
        var templatePath = path.join(__dirname, "../../templates/", filename);
        templatesArr.push(fs.readFileSync(templatePath, {encoding: "utf-8"}));
    });
    return templatesArr;
}

exports.loadTemplates = loadTemplates;
