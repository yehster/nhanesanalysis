
const request=require("request");
const cheerio=require("cheerio");
const fs=require("fs");

var startYear=1999;
var finishYear=2015;

var qbURL="https://wwwn.cdc.gov/nchs/nhanes/search/datapage.aspx?Component=Questionnaire&CycleBeginYear=";

var serverURL="https://wwwn.cdc.gov";

var qbData=[];
var qbDataMap={};

var dataSections=['Blood Pressure','Diabetes','Medical Conditions','Prescription Medications'];

function loadQBURL(year,callback)
{
    var fullURL=qbURL+year;
    var dataHandler=function(err,req,data,)
    {
        console.log(fn);
    }
    request(fullURL,function(err,req,data)
    {
        if(err)
        {
            callback(err);
            return;
        }
        var info={year:year,$:cheerio.load(data)};
        
        for(var idx=0;idx<dataSections.length;idx++)
        {
            var tr=info.$("tr:contains('"+dataSections[idx]+"')");
            console.log(tr.find("td").eq(0).text());
            var links=tr.find("a");
            var docFile = serverURL+links.eq(0).attr("href");
            var dataFile= serverURL+links.eq(1).attr("href");
            var docName=docFile.substring(dataFile.lastIndexOf("/")+1);
            var fileName=dataFile.substring(dataFile.lastIndexOf("/")+1);
            console.log(fileName);
            request(docFile,function(err,req,data)
            {
                //dconsole.log(data);
            }).pipe(fs.createWriteStream("data/"+docName));
            request(dataFile).pipe(fs.createWriteStream("data/"+fileName))

        }
        
        qbData.push(info);
        qbDataMap[year]=info;
        callback(null,data);
        
    })
    
}

for(var year=startYear; year <= finishYear;year+=2)
{
    loadQBURL(year,function(){});
}


