var http = require('http');
var PORT = process.env.PORT;
var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');

var topicList = [];
var topicDetail = {};
var currentId = 123;

function addTopic(tTitle, tText) {
  console.log("addTopic(" + tTitle + "," + tText + ")");
  var topicId = ++currentId;
  topicList.push({title: tTitle, id: topicId});
  topicDetail[topicId] = {title: tTitle, text: tText, comments: []};
  return topicId;
}
function addComment(topicId, text) {
  console.log("addComment(" + topicId + "," + text + ")");
  topicDetail[topicId].comments.push(text);
}

var id1 = addTopic("Topic 1","Topic 1 content");
var id2 = addTopic("Topic 2","Topic 2 content");
addComment(id1, "Good topic");
addComment(id2, "This is a comment");
addComment(id2, "This is another comment");

var server = http.createServer(function (request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  response.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  response.setHeader('Access-Control-Allow-Credentials', true);

  console.log('TopicList=' + JSON.stringify(topicList));
  console.log('TopicDetail=' + JSON.stringify(topicDetail));
  var requestBody = '';
  request.on('data', function (data) {
    requestBody += data;
  });
  request.on('end', function () {
    handleRequest(request, response, requestBody);
  });
});

function handleRequest(request, response, requestBody) {
  var res = {};
  console.log(request.method + ":" + request.url + ' >>' + requestBody);
  if (request.url == '/') {
    if (request.method == 'POST') {
      var jsonMsg = JSON.parse(requestBody);
      addTopic(jsonMsg.title, jsonMsg.text);
      response.end();
    } else {
      oracledb.getConnection(
      {
       user          : dbConfig.user,
       password      : dbConfig.password,
       connectString : dbConfig.connectString
      },
      function(err, connection)
      {
       if (err) {
        console.error(err.message);
       return;
      }
      connection.execute(
        "SELECT id, firstname, lastname FROM SYS.employee",
        function(err, result)
        {
         if (err) {
          console.error(err.message);
          doRelease(connection);
          return;
         }
         console.log(result.metaData);
         console.log(result.rows);
         //res[0] = { rows.toString() };
         //console.log(res);
         doRelease(connection);
         var id = addTopic(res[0][1],res[0][2]);
         addComment(id, res[0][0]);
         response.end(JSON.stringify(topicList));
         //response.end(JSON.stringify(result.rows));
        });
      });
    }
  } else {
    var topicId = request.url.substring(1);
    if (request.method == 'POST') {
      var jsonMsg = JSON.parse(requestBody);
      addComment(jsonMsg.topicId, jsonMsg.text);
      response.end();
    } else {
      response.end(JSON.stringify(topicDetail[topicId]));
    }
  }
}

server.listen(PORT, function () {
  console.log('Server running...');
});

function doRelease(connection)
{
  connection.release(
    function(err) {
      if (err) {
        console.error(err.message);
      }
    });
}