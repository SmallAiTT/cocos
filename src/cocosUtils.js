var fs = require("fs");
var path = require("path");
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var url = require('url');
var publish = require("./plugins/publish");
var core4cc = require("./core4cc.js");

var URL_SERVER = "192.168.16.80";
var URL_DOWNLOADS = path.join(URL_SERVER, "download4cocos")

var URL_CORE_ZIP = path.join(URL_DOWNLOADS, "core.zip");

/**
 * Desc: 通用格式化方法
 * @param filePath
 * @param info
 */
function pubFrmt(filePath, info){
    var content = fs.readFileSync(filePath).toString();
    content = content.replace(/\[\%name\%\]/g, info.name);
    content = content.replace(/\[\%ccDir\%\]/g, info.ccDir);
    fs.writeFileSync(filePath, content);
}

/**
 * Desc: 文件格式化工具。
 * @type {{}}
 */
var fileFrmt = {};
fileFrmt["index.html"] = pubFrmt;
fileFrmt["release.html"] = pubFrmt;
fileFrmt["resCfg.js"] = pubFrmt;
fileFrmt["index.html"] = pubFrmt;
fileFrmt["cocos.json"] = pubFrmt;
fileFrmt["main.js"] = pubFrmt;

/**
 * Desc: 赋值文件到指定文件夹
 * @param srcDir
 * @param targetDir
 * @param opts
 * @private
 */
function _copyFiles(srcDir, targetDir, opts){
    var files = fs.readdirSync(srcDir);
    for(var i = 0, li = files.length; i < li; i++){
        var file = files[i];
        if(fs.statSync(path.join(srcDir, file)).isDirectory()){//如果是目录则创建目录
            var dir = path.join(targetDir, file + "/");
            fs.mkdirSync(dir);
            _copyFiles(path.join(srcDir, file + "/"), dir, opts);//继续递归
        }else{
            var filePath = path.join(targetDir, file);
            fs.writeFileSync(filePath, fs.readFileSync(path.join(srcDir, file)));//如果是文件则复制过去
            if(fileFrmt[file]) {
                fileFrmt[file](filePath, opts);
            }
        }
    }
}

/**
 * Desc: 初始化工程。
 * @param projName
 * @param opts
 * @returns {*}
 */
function init(projName, opts){
    var tempDir = path.join(__dirname, "../templates/", opts.tempName + "/");
    //判断模板是否存在
    if(!fs.existsSync(tempDir)) return console.error(tempDir + " not exists!");

    var projDir = path.join("./", opts.dir || projName);
    //目录已经存在就不允许再次创建
    if(fs.existsSync(projDir)) return console.error(projDir + " exists! Can not create again!");
    fs.mkdirSync(projDir);//创建项目目录

    opts.name = projName;

    _copyFiles(tempDir, projDir, opts);

    _checkCC(path.join(projDir, opts.ccDir), function(err){
        if(err) console.error(err);
    })
};

/**
 * Desc: 安装cocos模块。
 * @param projDir
 * @param opts
 */
function install(projDir, opts){
    if(arguments.length == 1){
        opts = projDir;
        projDir = "";
    }
    projDir = path.join(process.cwd(), projDir);
    var cocosJsonPath = path.join(projDir, "cocos.json");
    var cocosCfg = require(cocosJsonPath);
    _checkDependencies(path.join(projDir, cocosCfg.ccDir, "modules"), core4cc.getDependencies(cocosCfg.dependencies), 0, function(err){
        if(err) console.log(err);
        console.log("update success!");
    });
}

/**
 * Desc: 坚持cocos的基本是否存在。
 * @param ccDir
 * @param cb
 * @private
 */
function _checkCC(ccDir, cb){
    if(!fs.existsSync(ccDir)){//TODO  如果不存在则创建
        fs.mkdirSync(ccDir)
    }
    var modulesDir = path.join(ccDir, "modules");
    if(!fs.existsSync(modulesDir)) fs.mkdirSync(modulesDir);
    var coreDir = path.join(ccDir, "core");
    if(!fs.existsSync(coreDir)){
        fs.mkdirSync(coreDir)
        download(coreDir, URL_CORE_ZIP, function(err){
            if(err) return cb(err);
            var fileName = url.parse(URL_CORE_ZIP).pathname.split('/').pop();
            unzip(path.join(coreDir, fileName), coreDir, function(){
                if(err) return cb(err);
                fs.unlinkSync(path.join(coreDir, fileName));
                cb(null);
            });
        })
    }
};

function _checkDependencies(modulesDir, dependencies, index, cb){
    if(index >= dependencies.length){
        return cb(null);
    }
    var dependency = dependencies[index];
    var moduleDir = path.join(modulesDir, dependency.name);
    if(fs.existsSync(moduleDir)) return _checkDependencies(modulesDir, dependencies, index+1, cb);
    fs.mkdirSync(moduleDir);
    download(moduleDir, path.join(URL_DOWNLOADS, dependency.name + ".zip"), function(err){
        if(err) return cb(err);
        var moduleZip = path.join(moduleDir, dependency.name + ".zip");
        unzip(moduleZip, moduleDir, function(err){
            if(err) return cb(err);
            fs.unlinkSync(moduleZip);
            var cocosCfg = require(path.join(moduleDir, "cocos.json"));
            _checkDependencies(modulesDir, core4cc.getDependencies(cocosCfg.dependencies), 0, function(){
                _checkDependencies(modulesDir, dependencies, index+1, cb);
            });
        });
    });
}

/**
 * Desc: 解压缩
 * @param srcZip
 * @param targetDir
 * @param cb
 */
function unzip(srcZip, targetDir, cb){
    var execCode = "unzip " + srcZip + " -d " + targetDir;
    exec(execCode, function(err, data, info){
        if(err) return cb(err);
        else cb(null);
    });
};

/**
 * Desc: 下载。
 * @param downLoadDir
 * @param fileUrl
 * @param cb
 */
function download(downLoadDir, fileUrl, cb) {
    // extract the file name
    var fileName = url.parse(fileUrl).pathname.split('/').pop();
    // create an instance of writable stream
    var file = fs.createWriteStream(path.join(downLoadDir, fileName));
    // execute curl using child_process' spawn function
    var curl = spawn('curl', [fileUrl]);
    // add a 'data' event listener for the spawn instance
    curl.stdout.on('data', function(data) { file.write(data); });
    // add an 'end' event listener to close the writeable stream
    curl.stdout.on('end', function(data) {
        file.end();
        console.log(fileName + ' downloaded to ' + downLoadDir);
        cb(null);
    });
    // when the spawn child process exits, check if there were any errors and close the writeable stream
    curl.on('exit', function(code) {
        if (code != 0) {
            console.error('Failed: ' + code);
            cb("error")
        }
    });
};

module.exports = {
    init : init,
    install : install,
    download : download,
    publish : publish
};