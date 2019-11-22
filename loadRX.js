const fs=require("fs");
const csv=require("csv-parser");
const asyncLoop=require("node-async-loop");
const cheerio=require("cheerio");
var results={};
 fs.readdir("./csv/", (err, files) =>
    {
        asyncLoop(files,(fileName,next)=>
        {
            if(fileName.indexOf("RXQ")===0)
            {
            var dataName=fileName.substring(0,fileName.indexOf(".CSV"));
            results[dataName]=[];
            fs.createReadStream("./csv/"+fileName)
              .pipe(csv())
              .on('data', (data) => results[dataName].push(data))
              .on('end', () => {
                  next();
              });            
            }
            else
            {
                next();
            }


        },
        processResults);
    });

var metadata={};
fs.readdir("./data/", (err, files) =>
    {

        asyncLoop(files,(fileName,next)=>
        {                        
            if(fileName.indexOf("RXQ")===0)
            {

                var dataName=fileName.substring(0,fileName.indexOf(".htm"));
                if(dataName)
                {
                    
                    console.log(dataName);
                    var pathName="./data/"+dataName + ".htm";
                    var dataFile=fs.readFileSync(pathName);
                    var $=cheerio.load(dataFile);
                    var drugCodes = $("table caption:contains('Drug Class')").parent();
                    // C and later used external code books
                    if(drugCodes.length===1)
                    {
                        var codeMap={};
                        var codes=drugCodes.find("tr");
                        for(var codeIdx=0;codeIdx<codes.length;codeIdx++)
                        {
                            var curCodeMap =codes.eq(codeIdx);
                            var cells=curCodeMap.find("td");
                            var codeId=parseInt(cells.eq(0).text());
                            var codeDescription=cells.eq(1).text()
                            codeMap[codeId]=codeDescription.replace(/ /g,"_");
                        }
                        metadata[dataName]=codeMap;
                    }
                    
                }
                next();
            }
            else
            {
                next();
            }


            

        },
        processResults);
    });
var patients={};
var dataSetList=[];
function buildPatientMedLists()
{

    for(var dataSet in results)
    {
        var curMetaData=metadata[dataSet];
        if(curMetaData)
        {
            console.log(curMetaData);
        }
        dataSetList.push(dataSet);
        patients[dataSet]=[];
        var curSEQN=null;
        var curMed=null
        for(var idx=0;idx<results[dataSet].length;idx++)
        {
            
            var curRow=results[dataSet][idx];
            if(curSEQN!==curRow.SEQN)
            {
                curPatient={SEQN:curRow.SEQN};
                curPatient["medications"]=[];
                curSEQN=curRow.SEQN;
                
                patients[dataSet].push(curPatient);

            }
            if(curRow.RXD240B)
            {
                if((curRow.RXD240B != "55555") && (curRow.RXD240B != "77777") && (curRow.RXD240B != "99999"))
                {
                    if(curMed!==curRow.RXD240B)
                    {
                        var drugClass="";
                        if(curMetaData)
                        {
                            drugClass=curMetaData[parseInt(curRow.FDACODE1)]
                            if(!drugClass)
                            {
                                
                                if(curRow.FDACODE1==='99999')
                                {
                                    drugClass=curRow.RXD240B;
                                }
                                else
                                {
                                    console.log(curRow);
                                }

                            }
                        }
                        // need to commbine days taken > 365
                        var newMed={"name":curRow.RXD240B, nhcode: curRow.NHCODE, gencode:drugClass ,additionalEntries:[]};
                        curPatient["medications"].push(newMed)
                        curMed=curRow.RXD240B
                    }
                    else
                    {
                        newMed.additionalEntries.push(curRow);
                    }
                }

            }

        }
        console.log(patients[dataSet].length);

    }
}

var medGraph={};

function buildMedGraph(dataSet)
{
    
    var nodes={};
    var edges={};
    var classNodes={};
    var classEdges={};

    var curList=patients[dataSet];
    var curMetaData=metadata[dataSet];

    
    for(var patIdx=0;patIdx<curList.length;patIdx++)
    {
        var patSEQN=curList[patIdx].SEQN
        var meds=curList[patIdx].medications;
        var nodeList=[];
        var classNodeList=[];

        for(var medIdx=0;medIdx<meds.length;medIdx++)
        {
            var curMed=meds[medIdx];
            var curNode;
            var curClassNode;
            if(typeof nodes[curMed.name] ==="undefined")
            {
                curNode={name:curMed.name,weight:1}
                nodes[curMed.name]=curNode;
            }
            else
            {
                curNode=nodes[curMed.name];
                curNode.weight++;
            }
            if(typeof classNodes[curMed.gencode] ==="undefined")
            {
                curClassNode={name:curMed.gencode,code: curMed.gencode, weight:1}
                classNodes[curMed.gencode]=curClassNode;
            }
            else
            {
                curClassNode=classNodes[curMed.gencode];
                curClassNode.weight++;
            }
            nodeList.push(curNode);
            classNodeList.push(curClassNode);
        }
        // Built list of nodes, now create edges
        nodeList.sort(function(a,b){ return (a.name<b.name) ? -1 : 1;});
        classNodeList.sort(function(a,b){ return (a.code<b.code) ? -1 : 1;});
        for(var idx=0;idx<nodeList.length;idx++)
        {
            for(var idx2=idx+1;idx2<nodeList.length;idx2++)
            {
                var first=nodeList[idx];
                var second=nodeList[idx2];
                var edgeName=first.name+":"+second.name;
                if(typeof edges[edgeName] ==="undefined")
                {
                    var curEdge={name:edgeName,weight:1};
                    edges[edgeName]=curEdge;
                    curEdge.first=first;
                    curEdge.second=second;
                    curEdge.pats=[patSEQN];
                    
                }
                else
                {
                    curEdge=edges[edgeName];
                    curEdge.weight+=1;
                    curEdge.pats.push(patSEQN);
                }
            }
        }
        
        for(var idx=0;idx<classNodeList.length;idx++)
        {
            for(var idx2=idx+1;idx2<classNodeList.length;idx2++)
            {
                var first=classNodeList[idx];
                var second=classNodeList[idx2];
                var edgeName=first.code+":"+second.code;
                if(typeof classEdges[edgeName] ==="undefined")
                {
                    var curEdge={name:edgeName,weight:1};
                    classEdges[edgeName]=curEdge;
                    curEdge.first=first;
                    curEdge.second=second;
                    curEdge.pats=[patSEQN];
                    
                }
                else
                {
                    curEdge=classEdges[edgeName];
                    curEdge.weight+=1;
                    curEdge.pats.push(patSEQN);
                }
            }
        }
    }
    var curGraph={nodes:nodes,edges:edges,classNodes:classNodes,classEdges:classEdges};
    medGraph[dataSet]=curGraph;
    //console.log(curGraph);
    var edgeList=[];
    for(var name in edges)
    {

                edgeList.push(edges[name]);

    }
    edgeList.sort(function(a,b){
        return (a.weight<b.weight) ? 1 : -1;;}
    );
    
    var classEdgesList=[];
    for(var code in classEdges)
    {

                classEdgesList.push(classEdges[code]);

    }
    classEdgesList.sort(function(a,b){
        return (a.weight<b.weight) ? 1 : -1;;}
    );
    
    //console.log(buildDOT(edges)); 
    fs.writeFileSync("C:/dev/nhanes/graphs/drugs.gv",buildDOT(nodes,edges));
    fs.writeFileSync("C:/dev/nhanes/graphs/class.gv",buildDOT(classNodes,classEdges));
    
}

function buildDOT(nodes,edges)
{
    var DOTOutput ="";
    for(var nodeName in nodes)
    {
        DOTOutput += "node "+ "\""+nodeName + "\"" + "[label=\""+nodeName+"\"]\n";
                
    }
    for(var name in edges)
    {
        
        var curEdge=edges[name];
        if (curEdge.weight)
        {
            DOTOutput += "edge " + "\""+curEdge.first.name +"\""+ " -- " +"\""+ curEdge.second.name +"\""+ "[weight="+curEdge.weight+"];\n";
        }

    }
    return "graph myGraph {\n" + DOTOutput + "}";
}
function processResults()
{
    buildPatientMedLists();
    buildMedGraph(dataSetList[0]);
}