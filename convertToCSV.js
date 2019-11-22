const fs=require("fs");
const asyncLoop=require("node-async-loop");
const exec = require('child_process').execFile;

function processFile(err,data,fileName,next)
{
    
    console.log(fileName);
    console.log(data);
    next();
}

const RExec="C:\\Program Files\\R\\R-3.6.1\\bin\\Rscript.exe";
const dataRoot = "C:\\dev\\nhanes\\data\\";
const csvRoot = "C:\\dev\\nhanes\\csv\\";


function convertToCSV(fileName,next)
{
    
    console.log(fileName);
    var RArgs=["C:\\dev\\nhanes\\loadSAS.R"];
    RArgs.push(dataRoot+fileName);
    var csvName=csvRoot + fileName.substring(0,fileName.indexOf(".XPT"))+".CSV";
    RArgs.push(csvName);
    exec(RExec,RArgs,function(err,res)
    {
        console.log(res);

    });
    next();
}
 fs.readdir("./data/", (err, files) =>
    {
        asyncLoop(files,(fileName,next)=>
        {
            if(fileName.indexOf(".XPT")>0)
            {
                convertToCSV(fileName,next);
                
            }
            else
            {
                next();
            }

        });
    });