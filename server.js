var http = require('http');
var PORT = process.env.PORT || 8080;
var oracledb = require('oracledb');
var dbConfig = require('./dbconfig.js');
var connection;

var topicList = [];
var topicDetail = {};
var currentId = 0;
var loaded = 0;

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

function load()
{
if(loaded)
return;
      loaded=1;
      oracledb.getConnection(
      {
       user          : dbConfig.user,
       password      : dbConfig.password,
       connectString : dbConfig.connectString
      },
      function(err, conn)
      {
       if (err) {
        console.error(err.message);
       return;
       }
       connection = conn;
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
         //doRelease(connection);
         for( var i=0, l=result.rows.length; i<l; i++ ) {
                console.log(result.rows[i] );
                res = result.rows[i];
                var id = addTopic(res[1],res[2]);
                addComment(id, res[0]);
          }
        }
       );
      }
      );
}

function insert(title, text)
{
	 connection.execute(
         'INSERT INTO SYS.EMPLOYEE (ID, FIRSTNAME, LASTNAME) VALUES(SYS.employee_seq.nextval, :fname, :lname)',
          [title, text], // Bind values
          function(err, result)
          {
           if (err) {
            console.error(err.message);
            doRelease(connection);
            return;
           } else {
             console.log("Rows inserted: " + result.rowsAffected);
           }
           connection.execute('commit');
          });
}

var server = http.createServer(function (request, response) {
  load();
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
      insert(jsonMsg.title, jsonMsg.text);
      response.end();
    } else {
      response.end(JSON.stringify(topicList));
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
