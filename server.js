const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const port = process.env.PORT || 5000
const path = require('path')
const fs = require('fs')
const atob = require('atob')
const _ = require('lodash')
const moment = require('moment')
const {PythonShell} = require('python-shell')
var async = require('async')

app.use(bodyParser.urlencoded({extended: true}))//enable to parse json
app.use(bodyParser.json({limit: '50mb'}))//enable to parse json

//when you access localhost:5000/api./samples, page show json comntent
app.get('/api/samples', (req, res) => {
  var fs = require('fs')
  fs.readdir('./public/image', function(err, fileList){
    if (err) {throw(err)}
    fs.readdir('./public/mask', function(err, maskList){
      if (err) {throw(err)}
     res.json({fileList:fileList, maskList: maskList})
    })
  })
})


//when you post localhost:5000/api./samples, add posted body to json file
app.post('/api/save', (req, res) => {
    const base64 = req.body.image.split(',')[1]
    const decode = new Buffer.from(base64,'base64')
    const pathToDir = "./public/output/"
    const name = req.body.imageName
    const jsonPath = pathToDir + name.replace("jpg", "json").replace("png", "json")
    var fs = require('fs')
    if(!fs.existsSync(jsonPath)){
      fs.writeFileSync(//Sync:同期処理
        jsonPath,
        JSON.stringify({}, null, 2),
      )
    }
    const data = require(jsonPath)
    if(!data[name]){
      data[name] = []
    }
    const startTime = req.body.startTime
    const endTime = req.body.endTime
    const editLog = req.body.editLog
    const newData = {
      startTime : startTime,
      endTime : endTime,
      editLog : editLog
    }
    data[name].push(newData)
  fs.writeFileSync(//Sync:同期処理
    `public/mask/`+req.body.imageName,
    decode, 'base64',
  )
  fs.writeFileSync(//Sync:同期処理
    jsonPath,
    JSON.stringify(data, null, 2),
  )
  res.json({name:name})
})

app.post('/api/segmentation', (req, res) => {
  const imageNames=req.body.imageName
  var pyshell = new PythonShell('Segmentation.py')
  pyshell.send(imageNames)
  pyshell.on('message', function (data) {
    console.log(data)
  })
  pyshell.end(function (err,code,signal) {
    if (err) throw err;
    console.log('The exit code was: ' + code);
    console.log('The exit signal was: ' + signal);
    console.log('finished');
    res.json({maskPath:"FINISHED!"})
  })
})

if (process.env.NODE_ENV === 'production') {
  // Serve any static files
  app.use(express.static(path.join(__dirname, 'build')))
  // Handle React routing, return all requests to React app
  app.get('*', function(req, res) {
    res.sendFile(path.join(__dirname, 'build', 'index.html'))
  })
}

app.listen(port, () => console.log(`Listening on port ${port}`))
