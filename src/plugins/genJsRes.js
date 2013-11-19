var fs = require("fs");
var path = require("path");
var ResGen = require("../ResGen");
var cfg = require("../../cfg/cfg");

function gen(projDir, opts){
    if(arguments.length == 1){
        opts = projDir;
        projDir = "";
    }
    //初始化基础目录路径
    projDir = path.join(process.cwd(), projDir);//工程目录
    var cocosInfo = require(path.join(projDir, "cocos.json"));//读取cocos配置信息
    var cfg4JsRes = cfg.genJsRes;
    var resGen = new ResGen(cfg4JsRes.dirCfgs, cfg4JsRes.output);
    resGen.fileTypes = cfg4JsRes.fileTypes;
    resGen.startStr = "var js_" + cocosInfo.name + " = ";
    resGen.projDir = projDir;
    resGen.gen();
};
module.exports = gen;