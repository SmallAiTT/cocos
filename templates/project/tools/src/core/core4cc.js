/**
 * Created with JetBrains WebStorm.
 * User: Administrator
 * Date: 13-10-13
 * Time: 下午8:06
 * To change this template use File | Settings | File Templates.
 */

var fs = require("fs");
var path = require("path");

var core4cc = {};
module.exports = core4cc;

/**
 * Desc:将前端的js代码转换成nodejs可用模块。
 * @param src               前端js文件
 * @param targetDir         目标模块目录
 * @param requireArr        模块文件的依赖
 * @param name
 */
core4cc.trans2Module = function(src, targetDir, requireArr, name){
    if(!fs.existsSync(targetDir)) fs.mkdirSync(targetDir);
    var srcBaseName = path.basename(src);
    name = name || path.basename(src, ".js");
    var content = fs.readFileSync(src).toString();
    var requireStr = "";
    for(var i = 0, li = requireArr.length; i < li; ++i){
        var strs = requireArr[i].split("->");
        requireStr = requireStr + "var " + strs[0] + " = require('" + strs[1] + "');\r\n";
    }
    fs.writeFileSync(targetDir + srcBaseName, requireStr + content + "\r\nmodule.exports = " + name + ";");
};

/**
 * Desc:将多个前端的js代码合并并且转换成nodejs可用的模块。
 * @param srcs          前端js列表
 * @param target        目标模块文件
 * @param requireArr    模块文件的依赖
 * @param name
 */
core4cc.merge2Module = function(srcs, target, requireArr, name){
    var targetDir = path.dirname(target);
    if(!fs.existsSync(targetDir)) fs.mkdirSync(targetDir);
    var content = "";
    for(var i = 0, li = srcs.length; i < li; ++i){
        content += fs.readFileSync(srcs[i]).toString() + "\r\n";
    }
    var requireStr = "";
    for(var i = 0, li = requireArr.length; i < li; ++i){
        var strs = requireArr[i].split("->");
        requireStr = requireStr + "var " + strs[0] + " = require('" + strs[1] + "');\r\n";
    }
    fs.writeFileSync(target, requireStr + content + "\r\nmodule.exports = " + name + ";");
};

/**
 * dESC:根据文件名称将其转换为响应的key名称。
 * @param name
 * @returns {String}
 */
core4cc.getKeyName = function(name){
    var key = name.replace(/[.]/g, "_");
    key = key.replace(/[\-]/g, "_");
    var r = key.match(/^[0-9]/);
    if(r != null) key = "_" + key;
    return key;
};