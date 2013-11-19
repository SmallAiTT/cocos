/**
 * Created by small on 13-11-14.
 */

var path = require("path");
var core4cc = require("../core/core4cc.js");
var exec = require('child_process').exec;
var fs = require("fs");

var baseDir = path.join(__dirname, "../../../");
var cocosInfo = require(path.join(baseDir, "cocos.json"));
var ccDir = path.join(baseDir, cocosInfo.ccDir);
var modulesDir = path.join(ccDir, "modules/");
var toolsDir = path.join(__dirname, "../../");
var tempDir = path.join(toolsDir, "temp/");
var cfgDir = "cfg/";
var projName = cocosInfo.name;
var publishJs = path.join(baseDir, "projects/proj.html5/mini.js");
var resCfg4Publish = path.join(tempDir, "resCfg4Publish.js");

core4cc.trans2Module(path.join(ccDir, "core/src/cc.js"), tempDir, [], "cc");
core4cc.trans2Module(path.join(baseDir, cfgDir, "/res.js"), tempDir, [], "res");


var cc = require(path.join(tempDir, "cc.js"));

var res = require(path.join(tempDir, "res.js"));

var jsToMergeArr = [];
var mergeCache4Dependencies = {};
function mergeDependencies(dependencies){
    for(var i = 0, li = dependencies.length; i < li; i++){
        var itemi = dependencies[i];
        var pInfo = require(path.join(modulesDir, itemi+"/cocos.json"));
        mergeDependencies(getDependencies(pInfo.dependences));
        if(mergeCache4Dependencies[itemi]) continue;
        mergeCache4Dependencies[itemi] = true;
        console.log(itemi);
        jsToMergeArr.push(path.join(modulesDir, itemi + "/", cfgDir, "jsRes.js"));
        jsToMergeArr.push(path.join(modulesDir, itemi + "/", cfgDir, "resCfg.js"));
    }
}
function getDependencies(temp){
    var dependencies = [];
    for(var key in temp){
        dependencies.push(key);
    };
    return dependencies;
}

jsToMergeArr.push(path.join(baseDir, cfgDir, "res.js"));
jsToMergeArr.push(path.join(ccDir, "core/", cfgDir, "jsRes.js"));
jsToMergeArr.push(path.join(ccDir, "core/", cfgDir, "resCfg.js"));
mergeDependencies(getDependencies(cocosInfo.dependencies));
jsToMergeArr.push(path.join(baseDir, cfgDir, "jsRes.js"));
jsToMergeArr.push(path.join(baseDir, cfgDir, "resCfg.js"));

core4cc.merge2Module(jsToMergeArr, path.join(tempDir, "resCfg.js"), [], "resCfg");

/*var content = fs.readFileSync(path.join(tempDir, "resCfg.js")).toString();
var jsPathResult = content.match(/('[\[\]\%\w\d_\/]+\.js')|("[\[\]\%\w\d_\/]+\.js")/g)
console.log(jsPathResult);
if(jsPathResult && jsPathResult.length > 0){
    for(var i = 0, li = jsPathResult.length; i < li; i++){
        var itemi = jsPathResult[i];
        content = content.replace(itemi, "'_" + i + "'");
    }
}
content = content.replace("module.exports = resCfg;", "");
fs.writeFileSync(resCfg4Publish, content);*/

var resCfg = require(path.join(tempDir, "resCfg.js"));

var ws = fs.createWriteStream(resCfg4Publish);
function getLoadRes(cfgName, result){
    result = result || [];
    var cfg = resCfg[cfgName];
    if(cfg){
        if(cfg.ref){
            for(var i = 0, li = cfg.ref.length; i < li; i++){
                var itemi = cfg.ref[i];
                getLoadRes(itemi, result);
            }
        }
        if(cfg.res){
            for(var i = 0, li = cfg.res.length; i < li; i++){
                var itemi = cfg.res[i];
                result.push(itemi);
            }
        }
    };
    return result;
}
//ws.write("var cc = cc || {};")
var jsResTemp = {};
for(var i = 0, li = resCfg.gameModules.length; i < li; i++){
    var itemi = resCfg.gameModules[i];
    var result = getLoadRes(itemi);
    var results = itemi.match(/\[\%[\w_\d]+\%\]/);
    var moduleName = results[0].substring(2, results[0].length - 2);
    var map = jsResTemp[moduleName];
    if(!map) {
        map = jsResTemp[moduleName] = [];
    }
    map.push(core4cc.getKeyName(path.basename(itemi)));
}
var jsResCount = 0;
for (var key in jsResTemp) {
    if(!key) continue;
    var arr = jsResTemp[key];
    if(!arr) continue;
    ws.write("var js_" + key + "={");
    for(var i = 0, li = arr.length; i < li; i++){
        var itemi = arr[i];
        ws.write(arr[i] + ":'_" + jsResCount + "'");
        if(i < li - 1) ws.write(",");
        jsResCount++;
    }
    ws.write("};\r\n");
}
ws.write("cc.res4GameModules = {};\r\n");
for(var i = 0, li = resCfg.gameModules.length; i < li; i++){
    var itemi = resCfg.gameModules[i];
    var result = getLoadRes(itemi);
    var results = itemi.match(/\[\%[\w_\d]+\%\]/);
    var moduleName = results[0].substring(2, results[0].length - 2);
    ws.write("cc.res4GameModules[js_" + moduleName + "." + core4cc.getKeyName(path.basename(itemi)) + "]=[\r\n");
    for(var j = 0, lj = result.length; j < lj; j++){
        var itemj = result[j];
        ws.write("res." + core4cc.getKeyName(path.basename((itemj))));
        if(j < lj - 1) ws.write(",")
        ws.write("\r\n")
    }
    ws.write("]\r\n");
}
ws.end();

var jsArr = [];
var jsIgnoreMap = {
    "[%core%]/src/unit4cc.js" : true
};
var jsCache = {};
jsArr.push('[%core%]/src/cc4Publish.js');
jsArr.push('[%' + projName + '%]/cfg/res.js');
jsArr.push(resCfg4Publish);
function loadResCfg(cfgName){
    if(jsCache[cfgName]) return;
    var cfg = resCfg[cfgName];
    if(cfg && cfg.ref){
        for(var i = 0, li = cfg.ref.length; i < li; i++){
            var itemi = cfg.ref[i];
            loadResCfg(itemi);
        }
    }
    if(typeof  cfgName == "string" && cfgName.length > 3 && cfgName.indexOf(".js") == cfgName.length - 3){
        if(jsArr.indexOf(cfgName) < 0) jsArr.push(cfgName);
    }
    jsCache[cfgName] = true;
}
loadResCfg("core");
function loadModuleBase(dependencies){
    for(var i = 0, li = dependencies.length; i < li; i++){
        var itemi = dependencies[i];
        var pInfo = require(path.join(modulesDir, itemi+"/cocos.json"));
        loadModuleBase(getDependencies(pInfo.dependencies));
        loadResCfg(itemi);
    }
}
loadModuleBase(getDependencies(cocosInfo.dependencies));
loadResCfg(projName);

function loadGameModules(gameModules){
    for(var i = 0, li = gameModules.length; i < li; i++){
        var itemi = gameModules[i];
        loadResCfg(itemi);
    }
};
loadGameModules(resCfg.gameModules);
jsArr.push('[%' + projName + '%]/projects/proj.html5/main.js');

var execCode = "uglifyjs ";
for(var i = 0, li = jsArr.length; i < li; i++){
    var itemi = jsArr[i];
    if(jsIgnoreMap[itemi]) {
        continue;
    }
    var results = itemi.match(/\[\%[\w_\d]+\%\]/);
    if(results && results.length > 0){
        var moduleName = results[0].substring(2, results[0].length - 2);
        var dir = moduleName == "core" ? ccDir : modulesDir;
        dir += moduleName;
        if(moduleName == projName) dir = baseDir;
        var jsPath = itemi.replace(/\[\%[\w_\d]+\%\]/, dir);
        console.log(path.normalize(jsPath));
        execCode += path.normalize(jsPath) + " "
    }else{
        console.log(path.normalize(itemi));
        execCode += path.normalize(itemi) + " ";
    }
}
execCode += " -o " + publishJs + " -nm -c -d __PUBLISH=true -b ";
console.log(execCode);
exec(execCode, function(err, data, info){
    if(err) console.error(info);
    else console.log(info);
});